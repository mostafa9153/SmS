import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import { parseSchoolId, buildSchoolId } from "@/lib/utils/school-id";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const {
      studentId,
      action,
      newClass,
      newSection,
      newRoll,
      feePaid = true,
      feeAmount,
      paymentReceiptNo,
      photoUrl,
      updatedProfile,
      applicationId,
    } = body;

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch current student with multi-key fallback
    let student: any = null;

    const { data: studentById } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();

    student = studentById;

    if (!student) {
      const { data: studentBySchoolId } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", studentId)
        .maybeSingle();
      student = studentBySchoolId;
    }

    if (!student && applicationId) {
      const { data: appRow } = await supabase
        .from("admission_applications")
        .select("*")
        .eq("id", applicationId)
        .maybeSingle();

      if (appRow) {
        if (appRow.admitted_student_id) {
          const { data: s } = await supabase.from("students").select("*").eq("id", appRow.admitted_student_id).maybeSingle();
          if (s) student = s;
        }
        if (!student && appRow.pen) {
          const { data: s } = await supabase.from("students").select("*").eq("pen", appRow.pen).maybeSingle();
          if (s) student = s;
        }
        if (!student && appRow.aadhaar) {
          const { data: s } = await supabase.from("students").select("*").eq("aadhaar_no", appRow.aadhaar).maybeSingle();
          if (s) student = s;
        }
      }
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found in active directory" }, { status: 404 });
    }

    const currentYear = new Date().getFullYear();

    if (action === "not_admitted") {
      const { data: updated, error } = await supabase
        .from("students")
        .update({
          previous_status: student.current_status,
          re_admission_status: "not_admitted",
          current_status: "Not Admitted",
          is_invoice_queued: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", student.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "not_admitted",
        message: `${student.name} marked as Not Admitted`,
        student: updated,
      });
    }

    if (action === "reset") {
      const restoredStatus =
        student.previous_status && student.previous_status !== "Continuing"
          ? student.previous_status
          : "Promoted But Not Admitted";

      const { data: updated, error } = await supabase
        .from("students")
        .update({
          current_status: restoredStatus,
          re_admission_status: "pending",
          is_invoice_queued: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", student.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "reset",
        message: `Status reset for ${student.name}`,
        student: updated,
      });
    }

    // Default action is 'admit'
    const targetClass = newClass || student.present_class;
    const targetSection = newSection || student.present_section;
    const targetRoll = newRoll ? parseInt(String(newRoll)) : (student.present_roll || 1);
    const todayDateStr = new Date().toISOString().split("T")[0];

    // Check teacher permissions
    if (auth.role === "Teacher") {
      const perms = auth.permissions;
      if (perms && perms.can_handle_readmission === false) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to process re-admissions." },
          { status: 403 }
        );
      }
      if (perms?.allowed_classes && perms.allowed_classes.length > 0 && !perms.allowed_classes.includes(targetClass)) {
        return NextResponse.json(
          { error: `Forbidden: You are not assigned to handle re-admissions for Class ${targetClass}.` },
          { status: 403 }
        );
      }
    }

    const updatePayload: Record<string, any> = {
      present_class: targetClass,
      present_section: targetSection,
      present_roll: targetRoll,
      present_class_admission_date: todayDateStr,
      current_status: "Continuing",
      re_admission_status: "admitted",
      re_admitted_at: new Date().toISOString(),
      re_admitted_session: String(currentYear),
      is_invoice_queued: true,
      updated_at: new Date().toISOString(),
    };

    if (photoUrl) {
      updatePayload.photo_url = photoUrl;
    }

    // Merge updated profile fields if supplied (support both camelCase and snake_case)
    if (updatedProfile && typeof updatedProfile === "object") {
      const p = updatedProfile;
      if (p.name || p.studentName) updatePayload.name = p.name || p.studentName;
      if (p.photo_url || p.photoUrl) updatePayload.photo_url = p.photo_url || p.photoUrl;
      if (p.student_contact || p.contactNumber || p.studentContact) {
        updatePayload.student_contact = p.student_contact || p.contactNumber || p.studentContact;
      }
      if (p.alt_mobile !== undefined || p.altMobile !== undefined) {
        updatePayload.alt_mobile = p.alt_mobile !== undefined ? p.alt_mobile : p.altMobile;
      }
      if (p.email !== undefined) updatePayload.email = p.email;
      if (p.father_name !== undefined || p.fatherName !== undefined) {
        updatePayload.father_name = p.father_name !== undefined ? p.father_name : p.fatherName;
      }
      if (p.mother_name !== undefined || p.motherName !== undefined) {
        updatePayload.mother_name = p.mother_name !== undefined ? p.mother_name : p.motherName;
      }
      if (p.guardian_name !== undefined || p.guardianName !== undefined) {
        updatePayload.guardian_name = p.guardian_name !== undefined ? p.guardian_name : p.guardianName;
      }
      if (p.relationship !== undefined) updatePayload.relationship = p.relationship;
      if (p.aadhaar_no !== undefined || p.aadhaar !== undefined || p.aadhaarNo !== undefined) {
        updatePayload.aadhaar_no = p.aadhaar_no !== undefined ? p.aadhaar_no : (p.aadhaar !== undefined ? p.aadhaar : p.aadhaarNo);
      }
      if (p.dob !== undefined || p.dateOfBirth !== undefined || p.date_of_birth !== undefined) {
        updatePayload.dob = p.dob || p.dateOfBirth || p.date_of_birth;
      }
      if (p.gender !== undefined) updatePayload.gender = p.gender;
      if (p.blood_group !== undefined || p.bloodGroup !== undefined) {
        updatePayload.blood_group = p.blood_group !== undefined ? p.blood_group : p.bloodGroup;
      }
      if (p.religion !== undefined) updatePayload.religion = p.religion;
      if (p.caste !== undefined || p.socialCategory !== undefined || p.social_category !== undefined) {
        updatePayload.caste = p.caste || p.socialCategory || p.social_category;
      }
      if (p.address !== undefined) updatePayload.address = p.address;
      if (p.vill_town !== undefined || p.villTown !== undefined || p.village !== undefined) {
        updatePayload.vill_town = p.vill_town !== undefined ? p.vill_town : (p.villTown !== undefined ? p.villTown : p.village);
      }
      if (p.post_office !== undefined || p.postOffice !== undefined) {
        updatePayload.post_office = p.post_office !== undefined ? p.post_office : p.postOffice;
      }
      if (p.police_station !== undefined || p.policeStation !== undefined) {
        updatePayload.police_station = p.police_station !== undefined ? p.police_station : p.policeStation;
      }
      if (p.pin_code !== undefined || p.pinCode !== undefined || p.pincode !== undefined) {
        updatePayload.pin_code = p.pin_code !== undefined ? p.pin_code : (p.pinCode !== undefined ? p.pinCode : p.pincode);
      }
      if (p.dist !== undefined || p.district !== undefined) {
        updatePayload.dist = p.dist !== undefined ? p.dist : p.district;
      }
      if (p.state !== undefined) updatePayload.state = p.state;
      if (p.bank_account_no !== undefined || p.bankAccountNo !== undefined) {
        updatePayload.bank_account_no = p.bank_account_no !== undefined ? p.bank_account_no : p.bankAccountNo;
      }
      if (p.bank_ifsc !== undefined || p.bankIfsc !== undefined) {
        updatePayload.bank_ifsc = p.bank_ifsc !== undefined ? p.bank_ifsc : p.bankIfsc;
      }
      if (p.bank_name !== undefined || p.bankName !== undefined) {
        updatePayload.bank_name = p.bank_name !== undefined ? p.bank_name : p.bankName;
      }
      if (p.bpl_status !== undefined || p.bplStatus !== undefined) {
        updatePayload.bpl_status = p.bpl_status !== undefined ? p.bpl_status : p.bplStatus;
      }
      if (p.kanyashree_id !== undefined || p.kanyashreeId !== undefined) {
        updatePayload.kanyashree_id = p.kanyashree_id !== undefined ? p.kanyashree_id : p.kanyashreeId;
      }
      if (p.shikshashree_id !== undefined || p.shikshashreeId !== undefined) {
        updatePayload.shikshashree_id = p.shikshashree_id !== undefined ? p.shikshashree_id : p.shikshashreeId;
      }
      if (p.oasis_id !== undefined || p.oasisId !== undefined) {
        updatePayload.oasis_id = p.oasis_id !== undefined ? p.oasis_id : p.oasisId;
      }
      if (p.aikyashree_id !== undefined || p.aikyashreeId !== undefined) {
        updatePayload.aikyashree_id = p.aikyashree_id !== undefined ? p.aikyashree_id : p.aikyashreeId;
      }
      if (p.taruner_swapna_id !== undefined || p.tarunerSwapnaId !== undefined) {
        updatePayload.taruner_swapna_id = p.taruner_swapna_id !== undefined ? p.taruner_swapna_id : p.tarunerSwapnaId;
      }
      if (p.svmcs_id !== undefined || p.svmcsId !== undefined) {
        updatePayload.svmcs_id = p.svmcs_id !== undefined ? p.svmcs_id : p.svmcsId;
      }
    }

    if (student.school_id) {
      const parsed = parseSchoolId(student.school_id);
      if (!parsed.isLegacyFormat) {
        updatePayload.school_id = buildSchoolId(
          targetClass,
          parsed.year || student.admission_year || currentYear,
          parsed.registerNo || student.admission_no || "01",
          parsed.prefix
        );
      }
    }

    updatePayload.previous_status = student.current_status;

    if (targetClass !== student.present_class) {
      updatePayload.previous_class = student.present_class;
      updatePayload.previous_section = student.present_section;
      updatePayload.previous_roll_no = student.present_roll;
    }

    // Parallel DB operations for highest speed
    const dbPromises: Promise<any>[] = [];

    // 1. Update Student Table
    const studentUpdatePromise = (async () => {
      return await supabase
        .from("students")
        .update(updatePayload)
        .eq("id", student.id)
        .select()
        .single();
    })();
    dbPromises.push(studentUpdatePromise);

    // 2. Academic History
    const historyPromise = (async () => {
      try {
        if (targetClass !== student.present_class) {
          const { data: prevRecord } = await supabase
            .from("academic_history")
            .select("id")
            .eq("student_id", student.id)
            .eq("year", currentYear - 1)
            .maybeSingle();

          if (!prevRecord) {
            await supabase.from("academic_history").insert({
              student_id: student.id,
              year: currentYear - 1,
              class: student.present_class,
              section: student.present_section,
              roll: student.present_roll,
              status: "Continuing",
            });
          }
        }

        const { data: currRecord } = await supabase
          .from("academic_history")
          .select("id")
          .eq("student_id", student.id)
          .eq("year", currentYear)
          .maybeSingle();

        if (currRecord) {
          await supabase
            .from("academic_history")
            .update({
              class: targetClass,
              section: targetSection,
              roll: targetRoll,
              status: "Continuing",
            })
            .eq("id", currRecord.id);
        } else {
          await supabase.from("academic_history").insert({
            student_id: student.id,
            year: currentYear,
            class: targetClass,
            section: targetSection,
            roll: targetRoll,
            status: "Continuing",
          });
        }
      } catch (histErr) {
        console.warn("Could not record academic_history:", histErr);
      }
    })();
    dbPromises.push(historyPromise);

    // 3. Invoice & Teacher Activity Log
    const invTotal = Number(feeAmount) || 0;
    const invPromise = (async () => {
      try {
        if (paymentReceiptNo && typeof paymentReceiptNo === "string" && paymentReceiptNo.trim()) {
          await supabase.from("admission_invoices").upsert(
            {
              invoice_number: paymentReceiptNo.trim(),
              academic_session: `${currentYear} – ${currentYear + 1}`,
              issue_date: new Date().toISOString().split("T")[0],
              issue_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
              student_id: updatePayload.school_id || student.school_id || student.id,
              student_name: updatePayload.name || student.name,
              student_class: targetClass,
              section: targetSection,
              roll_no: String(targetRoll),
              guardian_name: updatePayload.father_name || updatePayload.guardian_name || student.father_name || student.guardian_name || null,
              contact_number: updatePayload.student_contact || student.student_contact || student.alt_mobile || null,
              pen_number: student.pen || null,
              total_amount: invTotal,
              payment_mode: "Cash",
              payment_status: feePaid ? "Paid" : "Due",
              remarks: `Re-admission Fee (${currentYear})`,
              generator_mode: "single",
              copy_type: "both",
              is_blank: false,
              invoice_status: "active",
              collected_by: auth.user?.id || null,
              collector_name: auth.fullName || "Staff",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "invoice_number" }
          );

          await supabase.from("teacher_activity_logs").insert({
            user_id: auth.user?.id || null,
            teacher_id: auth.staffId || null,
            teacher_name: auth.fullName || "Staff",
            action_type: "RE_ADMISSION",
            target_student_id: updatePayload.school_id || student.school_id || student.id,
            target_student_name: updatePayload.name || student.name,
            student_class: targetClass,
            section: targetSection,
            amount_collected: invTotal,
            metadata: {
              receipt_no: paymentReceiptNo.trim(),
              payment_status: feePaid ? "Paid" : "Due",
            },
          });
        } else {
          await supabase.from("teacher_activity_logs").insert({
            user_id: auth.user?.id || null,
            teacher_id: auth.staffId || null,
            teacher_name: auth.fullName || "Staff",
            action_type: "RE_ADMISSION",
            target_student_id: updatePayload.school_id || student.school_id || student.id,
            target_student_name: updatePayload.name || student.name,
            student_class: targetClass,
            section: targetSection,
            amount_collected: 0,
            metadata: { fee_paid: feePaid },
          });
        }
      } catch (invErr) {
        console.warn("Could not log invoice / teacher activity:", invErr);
      }
    })();
    dbPromises.push(invPromise);

    // 4. Update online admission application status if present
    if (applicationId) {
      const appUpdatePromise = (async () => {
        return await supabase
          .from("admission_applications")
          .update({
            status: "admitted",
            admitted_student_id: student.id,
            admitted_class: targetClass,
            admitted_section: targetSection,
            admitted_roll: targetRoll,
            admitted_at: new Date().toISOString(),
            is_transferred_to_active: true,
            transferred_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
      })();
      dbPromises.push(appUpdatePromise);
    }

    const [studentUpdateResult] = await Promise.all(dbPromises);

    if (studentUpdateResult?.error) {
      return NextResponse.json({ error: studentUpdateResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: "admit",
      message: `${updatePayload.name || student.name} successfully Re-Admitted to Class ${targetClass} (${targetSection})!`,
      student: studentUpdateResult?.data || updatePayload,
      targetClass,
      targetSection,
      targetRoll,
      schoolId: updatePayload.school_id || student.school_id,
      receiptNo: paymentReceiptNo || null,
    });
  } catch (err: any) {
    console.error("Error in re-admission admit:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
