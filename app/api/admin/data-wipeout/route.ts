import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Get logged in user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { adminPassword, confirmationPhrase, wipeoutScope = "ALL_DATA" } = body;

    if (!adminPassword) {
      return NextResponse.json({ error: "Admin login password is required to authorize data wipeout." }, { status: 400 });
    }

    if (confirmationPhrase !== "WIPE ALL STUDENT DATA") {
      return NextResponse.json({
        error: "Confirmation phrase does not match. You must type 'WIPE ALL STUDENT DATA'.",
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

    if (roleData && roleData.role !== "Admin") {
      return NextResponse.json({
        error: "Forbidden: Only users with the 'Admin' role can perform system data wipeout.",
      }, { status: 403 });
    }

    let deletedStudentsCount = 0;
    let deletedResultsCount = 0;
    let deletedHistoryCount = 0;

    if (wipeoutScope === "ALL_DATA") {
      // 1. Delete all student_results
      const { count: resultsCount } = await adminClient
        .from("student_results")
        .delete({ count: "exact" })
        .not("id", "is", null);
      deletedResultsCount = resultsCount || 0;

      // 2. Delete all academic_history
      const { count: historyCount } = await adminClient
        .from("academic_history")
        .delete({ count: "exact" })
        .not("id", "is", null);
      deletedHistoryCount = historyCount || 0;

      // 3. Delete all students
      const { count: studentsCount } = await adminClient
        .from("students")
        .delete({ count: "exact" })
        .not("id", "is", null);
      deletedStudentsCount = studentsCount || 0;

    } else if (wipeoutScope === "EXAM_RESULTS_ONLY") {
      // Delete all exam results only
      const { count: resultsCount } = await adminClient
        .from("student_results")
        .delete({ count: "exact" })
        .not("id", "is", null);
      deletedResultsCount = resultsCount || 0;

    } else if (wipeoutScope === "CURRENT_STUDENTS_ONLY") {
      // Find current/continuing students
      const { data: currentStudents } = await adminClient
        .from("students")
        .select("id")
        .eq("current_status", "Continuing");

      const currentIds = (currentStudents || []).map((s) => s.id);

      if (currentIds.length > 0) {
        // Delete their exam results
        await adminClient.from("student_results").delete().in("student_id", currentIds);
        // Delete their history
        await adminClient.from("academic_history").delete().in("student_id", currentIds);
        // Delete the students
        const { count: studentsCount } = await adminClient
          .from("students")
          .delete({ count: "exact" })
          .in("id", currentIds);
        deletedStudentsCount = studentsCount || 0;
      }

    } else if (wipeoutScope === "OLD_STUDENTS_ONLY") {
      // Find old/archived students
      const { data: oldStudents } = await adminClient
        .from("students")
        .select("id")
        .neq("current_status", "Continuing");

      const oldIds = (oldStudents || []).map((s) => s.id);

      if (oldIds.length > 0) {
        // Delete their exam results
        await adminClient.from("student_results").delete().in("student_id", oldIds);
        // Delete their history
        await adminClient.from("academic_history").delete().in("student_id", oldIds);
        // Delete the students
        const { count: studentsCount } = await adminClient
          .from("students")
          .delete({ count: "exact" })
          .in("id", oldIds);
        deletedStudentsCount = studentsCount || 0;
      }
    }

    // 5. Insert security audit log for the wipeout
    await adminClient.from("audit_log").insert({
      performed_by: user.id,
      action: "SYSTEM_DATA_WIPEOUT",
      table_name: "students",
      metadata: {
        scope: wipeoutScope,
        deleted_students: deletedStudentsCount,
        deleted_results: deletedResultsCount,
        deleted_history: deletedHistoryCount,
        admin_email: user.email,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data wipeout operation completed successfully.",
      summary: {
        deletedStudentsCount,
        deletedResultsCount,
        deletedHistoryCount,
        scope: wipeoutScope,
      },
    });
  } catch (error: any) {
    console.error("Data wipeout error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute data wipeout" }, { status: 500 });
  }
}
