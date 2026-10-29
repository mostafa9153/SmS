import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_ADDRESS_PRESETS_CONFIG } from "@/lib/utils/preset-addresses";
import { DEFAULT_MARKS_SCHEMES } from "@/lib/utils/marks-config";
import { DEFAULT_STUDENT_ENTRY_PRESETS } from "@/lib/utils/student-entry-presets";
import { notify, notifyAdminsOfError } from "@/lib/notifications/notify";
import { mustWrite, softWrite } from "@/lib/supabase/write";
import { requireRole } from "@/lib/api/guard";

function getClassVariations(cls: string): string[] {
  const clean = cls.trim().replace(/^Class\s+/i, "");
  const romanToDigit: Record<string, string> = {
    V: "5", VI: "6", VII: "7", VIII: "8", IX: "9", X: "10", XI: "11", XII: "12"
  };
  const digitToRoman: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII"
  };
  const set = new Set<string>([cls, clean, `Class ${clean}`]);
  if (romanToDigit[clean.toUpperCase()]) {
    const d = romanToDigit[clean.toUpperCase()];
    set.add(d);
    set.add(`Class ${d}`);
  }
  if (digitToRoman[clean]) {
    const r = digitToRoman[clean];
    set.add(r);
    set.add(`Class ${r}`);
  }
  return Array.from(set);
}

const ID_CHUNK = 200;
type Admin = ReturnType<typeof createAdminClient>;

/**
 * Delete students and their child rows, children first. Every delete is checked and the run
 * stops at the first failure with what was already removed, so a partial wipe is never reported
 * as complete. Ids go in chunks: one `.in()` with thousands of ids overflows the request URL.
 */
async function wipeStudents(admin: Admin, ids: string[] | "ALL") {
  const counts = { deletedStudentsCount: 0, deletedResultsCount: 0, deletedHistoryCount: 0 };
  const steps: [table: string, column: string, key?: keyof typeof counts][] = [
    ["student_results", "student_id", "deletedResultsCount"],
    ["student_marks", "student_id"],
    ["student_attendance", "student_id"],
    ["academic_history", "student_id", "deletedHistoryCount"],
    ["students", "id", "deletedStudentsCount"],
  ];
  const chunks: (string[] | null)[] = ids === "ALL" ? [null] : [];
  if (ids !== "ALL") for (let i = 0; i < ids.length; i += ID_CHUNK) chunks.push(ids.slice(i, i + ID_CHUNK));

  for (const [table, column, key] of steps) {
    for (const chunk of chunks) {
      const base = admin.from(table).delete({ count: "exact" });
      const { count, error } = await (chunk ? base.in(column, chunk) : base.not("id", "is", null));
      // A table from a migration that is not applied yet has nothing to delete.
      if (error?.code === "42P01" && table !== "students") break;
      if (error) {
        throw new Error(
          `Wipeout stopped at ${table}: ${error.message}. Already removed: ${counts.deletedResultsCount} results, ${counts.deletedHistoryCount} history rows, ${counts.deletedStudentsCount} students.`,
        );
      }
      if (key) counts[key] += count || 0;
    }
  }
  return counts;
}

// undo: n/a — irreversible by design; guarded by the admin password and a typed confirmation phrase
export async function POST(req: Request) {
  try {
    const gate = await requireRole(["Admin"]);
    if (!gate.ok) return gate.response;
    const supabase = await createClient();

    // 1. Get logged in user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const {
      adminPassword,
      confirmationPhrase,
      wipeoutScope = "ALL_DATA",
      targetClass,
      subScope = "ALL",
      presetTarget = "ALL_PRESETS",
    } = body;

    if (!adminPassword) {
      return NextResponse.json({ error: "Admin login password is required to authorize data wipeout." }, { status: 400 });
    }

    if (confirmationPhrase !== "PERMANENT WIPE" && confirmationPhrase !== "WIPE ALL STUDENT DATA") {
      return NextResponse.json({
        error: "Confirmation phrase does not match. You must type 'PERMANENT WIPE'.",
      }, { status: 400 });
    }

    // 3. Verify Admin's login password with Supabase Auth
    const { error: passwordVerifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: adminPassword,
    });

    if (passwordVerifyError) {
      return NextResponse.json({
        error: "Invalid admin password. Authorization failed.",
      }, { status: 401 });
    }

    // 4. Verify user has Admin role in user_roles
    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "Admin") {
      return NextResponse.json({
        error: "Forbidden: Only users with the 'Admin' role can perform system data wipeout.",
      }, { status: 403 });
    }

    let deletedStudentsCount = 0;
    let deletedResultsCount = 0;
    let deletedHistoryCount = 0;
    let deletedInvoicesCount = 0;
    let deletedCertificatesCount = 0;
    let clearedRoutineCount = 0;
    let presetsResetCount = 0;
    let operationSummaryMessage = "Data wipeout operation completed successfully.";

    // ==========================================
    // DOMAIN 1: STUDENT & ACADEMIC DATA WIPEOUT
    // ==========================================
    if (wipeoutScope === "ALL_DATA") {
      const counts = await wipeStudents(adminClient, "ALL");
      ({ deletedStudentsCount, deletedResultsCount, deletedHistoryCount } = counts);
      operationSummaryMessage = `Master reset completed: Removed ${deletedStudentsCount} students and ${deletedResultsCount} results.`;

    } else if (wipeoutScope === "CURRENT_STUDENTS_ONLY" || wipeoutScope === "OLD_STUDENTS_ONLY" || wipeoutScope === "CLASS_SPECIFIC") {
      if (wipeoutScope === "CLASS_SPECIFIC" && !targetClass) {
        return NextResponse.json({ error: "Target class is required for class-specific wipeout." }, { status: 400 });
      }

      let idQuery = adminClient.from("students").select("id");
      if (wipeoutScope === "OLD_STUDENTS_ONLY") {
        idQuery = idQuery.neq("current_status", "Continuing");
      } else {
        idQuery = idQuery.eq("current_status", "Continuing");
        if (wipeoutScope === "CLASS_SPECIFIC") idQuery = idQuery.in("present_class", getClassVariations(targetClass));
      }
      const { data: targetStudents, error: idError } = await idQuery;
      if (idError) throw new Error(`Could not list students to wipe: ${idError.message}`);

      const counts = await wipeStudents(adminClient, (targetStudents || []).map((s) => s.id));
      ({ deletedStudentsCount, deletedResultsCount, deletedHistoryCount } = counts);
      operationSummaryMessage =
        wipeoutScope === "CURRENT_STUDENTS_ONLY"
          ? `Purged ${deletedStudentsCount} active continuing students.`
          : wipeoutScope === "OLD_STUDENTS_ONLY"
            ? `Purged ${deletedStudentsCount} archived/alumni students.`
            : `Purged ${deletedStudentsCount} active students in Class ${targetClass}.`;
    // ==========================================
    // DOMAIN 2: GENERATED REGISTRY WIPEOUT
    // ==========================================
    } else if (wipeoutScope === "INVOICES_REGISTRY") {
      let query = adminClient.from("admission_invoices").delete({ count: "exact" });
      if (subScope === "BLANK_ONLY") {
        query = query.eq("is_blank", true);
      } else if (subScope === "REGULAR_ONLY") {
        query = query.eq("is_blank", false);
      } else {
        query = query.not("id", "is", null);
      }
      const { count: invCount, error: invErr } = await query;
      if (invErr) throw invErr;
      deletedInvoicesCount = invCount || 0;
      operationSummaryMessage = `Purged ${deletedInvoicesCount} invoice/fee receipts from registry.`;

    } else if (wipeoutScope === "CERTIFICATES_REGISTRY") {
      let query = adminClient.from("certificates_registry").delete({ count: "exact" });
      if (subScope && subScope !== "ALL") {
        query = query.eq("certificate_type", subScope);
      } else {
        query = query.not("id", "is", null);
      }
      const { count: certCount, error: certErr } = await query;
      if (certErr) throw certErr;
      deletedCertificatesCount = certCount || 0;
      operationSummaryMessage = `Purged ${deletedCertificatesCount} certificate records from registry.`;

    } else if (wipeoutScope === "ROUTINE_AND_EMS_CACHE") {
      const { count: cacheCount } = await mustWrite(
        adminClient.from("routine_generated_cache").delete({ count: "exact" }).not("id", "is", null),
        "routine_generated_cache delete",
      );
      const { count: assignCount } = await mustWrite(
        adminClient.from("routine_assignments").delete({ count: "exact" }).not("id", "is", null),
        "routine_assignments delete",
      );
      await mustWrite(adminClient.from("system_config").delete().eq("key", "ems_allocations"), "system_config delete");

      clearedRoutineCount = (cacheCount || 0) + (assignCount || 0);
      operationSummaryMessage = `Cleared routine timetable allocations and EMS exam seat arrangements.`;

    // ==========================================
    // DOMAIN 3: PRESETS FACTORY RESET
    // ==========================================
    } else if (wipeoutScope === "PRESETS_RESET") {
      const nowIso = new Date().toISOString();

      if (presetTarget === "FEE_PRESETS" || presetTarget === "ALL_PRESETS") {
        await mustWrite(adminClient.from("system_config").delete().eq("key", "sms_admission_fee_structure"), "system_config delete");
        presetsResetCount++;
      }
      if (presetTarget === "ADDRESS_PRESETS" || presetTarget === "ALL_PRESETS") {
        await mustWrite(adminClient.from("system_config").upsert({
          key: "address_presets_config",
          value: DEFAULT_ADDRESS_PRESETS_CONFIG,
          updated_at: nowIso,
        }), "system_config upsert");
        presetsResetCount++;
      }
      if (presetTarget === "MARKS_SCHEMES" || presetTarget === "ALL_PRESETS") {
        await mustWrite(adminClient.from("system_config").upsert({
          key: "marks_schemes",
          value: DEFAULT_MARKS_SCHEMES,
          updated_at: nowIso,
        }), "system_config upsert");
        presetsResetCount++;
      }
      if (presetTarget === "STUDENT_ENTRY_DEFAULTS" || presetTarget === "ALL_PRESETS") {
        await mustWrite(adminClient.from("system_config").upsert({
          key: "student_entry_presets",
          value: DEFAULT_STUDENT_ENTRY_PRESETS,
          updated_at: nowIso,
        }), "system_config upsert");
        presetsResetCount++;
      }
      operationSummaryMessage = `System presets successfully restored to factory defaults.`;

    } else {
      return NextResponse.json({ error: "Invalid wipeout scope specified." }, { status: 400 });
    }

    // 5. Insert security audit log for the wipeout
    await softWrite(adminClient.from("audit_log").insert({
      performed_by: user.id,
      action: "SYSTEM_DATA_WIPEOUT",
      table_name: wipeoutScope,
      metadata: {
        scope: wipeoutScope,
        target_class: targetClass || null,
        sub_scope: subScope || null,
        preset_target: presetTarget || null,
        deleted_students: deletedStudentsCount,
        deleted_results: deletedResultsCount,
        deleted_history: deletedHistoryCount,
        deleted_invoices: deletedInvoicesCount,
        deleted_certificates: deletedCertificatesCount,
        cleared_routine_slots: clearedRoutineCount,
        presets_reset: presetsResetCount,
        admin_email: user.email,
        timestamp: new Date().toISOString(),
      },
    }), "audit_log insert");

    await notify({ roles: ["Admin"], severity: "warning", title: "Data wipeout executed", message: operationSummaryMessage, link: "/admin-hub", source: "admin.wipeout", push: true });

    return NextResponse.json({
      success: true,
      message: operationSummaryMessage,
      summary: {
        deletedStudentsCount,
        deletedResultsCount,
        deletedHistoryCount,
        deletedInvoicesCount,
        deletedCertificatesCount,
        clearedRoutineCount,
        presetsResetCount,
        scope: wipeoutScope,
        targetClass,
      },
    });
  } catch (error: any) {
    console.error("Data wipeout error:", error);
    await notifyAdminsOfError("admin.wipeout", "Data wipeout failed", error, "/admin-hub");
    return NextResponse.json({ error: error.message || "Failed to execute data wipeout" }, { status: 500 });
  }
}
