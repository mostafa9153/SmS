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
      if (p.student_name_bengali || p.studentNameBengali) updatePayload.student_name_bengali = p.student_name_bengali || p.studentNameBengali;
      if (p.photo_url || p.photoUrl) updatePayload.photo_url = p.photo_url || p.photoUrl;
      if (p.mobile || p.student_contact || p.studentContact || p.contactNumber) {
        updatePayload.mobile = p.mobile || p.student_contact || p.studentContact || p.contactNumber;
      }
      if (p.alt_mobile !== undefined || p.altMobile !== undefined) {
        updatePayload.alt_mobile = p.alt_mobile !== undefined ? p.alt_mobile : p.altMobile;
      }
      if (p.email !== undefined) updatePayload.email = p.email;
      if (p.father_name !== undefined || p.fatherName !== undefined) {
        updatePayload.father_name = p.father_name !== undefined ? p.father_name : p.fatherName;
      }
      if (p.father_name_bengali !== undefined || p.fatherNameBengali !== undefined) {
        updatePayload.father_name_bengali = p.father_name_bengali !== undefined ? p.father_name_bengali : p.fatherNameBengali;
      }
      if (p.father_occupation !== undefined || p.fatherOccupation !== undefined) {
        updatePayload.father_occupation = p.father_occupation !== undefined ? p.father_occupation : p.fatherOccupation;
      }
      if (p.mother_name !== undefined || p.motherName !== undefined) {
        updatePayload.mother_name = p.mother_name !== undefined ? p.mother_name : p.motherName;
      }
      if (p.mother_name_bengali !== undefined || p.motherNameBengali !== undefined) {
        updatePayload.mother_name_bengali = p.mother_name_bengali !== undefined ? p.mother_name_bengali : p.motherNameBengali;
      }
      if (p.mother_occupation !== undefined || p.motherOccupation !== undefined) {
        updatePayload.mother_occupation = p.mother_occupation !== undefined ? p.mother_occupation : p.motherOccupation;
      }
      if (p.guardian_name !== undefined || p.guardianName !== undefined) {
        updatePayload.guardian_name = p.guardian_name !== undefined ? p.guardian_name : p.guardianName;
      }
      if (p.guardian_occupation !== undefined || p.guardianOccupation !== undefined) {
        updatePayload.guardian_occupation = p.guardian_occupation !== undefined ? p.guardian_occupation : p.guardianOccupation;
      }
      if (p.guardian_qualification !== undefined || p.guardianQualification !== undefined) {
        updatePayload.guardian_qualification = p.guardian_qualification !== undefined ? p.guardian_qualification : p.guardianQualification;
      }
      if (p.relationship_with_guardian !== undefined || p.relationshipWithGuardian !== undefined || p.relationship !== undefined) {
        updatePayload.relationship_with_guardian = p.relationship_with_guardian || p.relationshipWithGuardian || p.relationship;
      }
      if (p.aadhaar !== undefined || p.aadhaar_no !== undefined || p.aadhaarNo !== undefined) {
        updatePayload.aadhaar = p.aadhaar !== undefined ? p.aadhaar : (p.aadhaar_no !== undefined ? p.aadhaar_no : p.aadhaarNo);
      }
      if (p.name_as_per_aadhaar !== undefined || p.nameAsPerAadhaar !== undefined) {
        updatePayload.name_as_per_aadhaar = p.name_as_per_aadhaar || p.nameAsPerAadhaar;
      }
      if (p.pen !== undefined) updatePayload.pen = p.pen;
      if (p.dob !== undefined || p.dateOfBirth !== undefined || p.date_of_birth !== undefined) {
        updatePayload.dob = p.dob || p.dateOfBirth || p.date_of_birth;
      }
      if (p.gender !== undefined) updatePayload.gender = p.gender;
      if (p.blood_group !== undefined || p.bloodGroup !== undefined) {
        updatePayload.blood_group = p.blood_group !== undefined ? p.blood_group : p.bloodGroup;
      }
      if (p.religion !== undefined) updatePayload.religion = p.religion;
      if (p.social_category !== undefined || p.socialCategory !== undefined || p.caste !== undefined) {
        updatePayload.social_category = p.social_category || p.socialCategory || p.caste;
      }
      if (p.minority_group !== undefined || p.minorityGroup !== undefined) {
        updatePayload.minority_group = p.minority_group || p.minorityGroup;
      }
      if (p.mother_tongue !== undefined || p.motherTongue !== undefined) {
        updatePayload.mother_tongue = p.mother_tongue || p.motherTongue;
      }
      if (p.address !== undefined || p.presentVillage !== undefined || p.vill_town !== undefined || p.present_village !== undefined) {
        updatePayload.address = p.address || p.presentVillage || p.vill_town || p.present_village;
      }
      if (p.gram_panchayat !== undefined || p.presentPanchayat !== undefined || p.present_panchayat !== undefined) {
        updatePayload.gram_panchayat = p.gram_panchayat || p.presentPanchayat || p.present_panchayat;
      }
      if (p.block !== undefined || p.presentBlock !== undefined || p.present_block !== undefined) {
        updatePayload.block = p.block || p.presentBlock || p.present_block;
      }
      if (p.pincode !== undefined || p.pin_code !== undefined || p.pinCode !== undefined || p.presentPincode !== undefined) {
        updatePayload.pincode = p.pincode || p.pin_code || p.pinCode || p.presentPincode;
      }
      if (p.bank_account_no !== undefined || p.bankAccountNo !== undefined) {
        updatePayload.bank_account_no = p.bank_account_no !== undefined ? p.bank_account_no : p.bankAccountNo;
      }
      if (p.bank_ifsc !== undefined || p.bankIfsc !== undefined) {
        updatePayload.bank_ifsc = p.bank_ifsc !== undefined ? p.bank_ifsc : p.bankIfsc;
      }
      if (p.bank_name !== undefined || p.bankName !== undefined) {
        updatePayload.bank_name = p.bank_name !== undefined ? p.bank_name : p.bankName;
      }
      if (p.bank_branch !== undefined || p.bankBranch !== undefined) {
        updatePayload.bank_branch = p.bank_branch !== undefined ? p.bank_branch : p.bankBranch;
      }
      if (p.bpl_status !== undefined || p.bplStatus !== undefined) {
        updatePayload.bpl_status = p.bpl_status !== undefined ? p.bpl_status : p.bplStatus;
      }
      if (p.bpl_no !== undefined || p.bplNo !== undefined) {
        updatePayload.bpl_no = p.bpl_no !== undefined ? p.bpl_no : p.bplNo;
      }
      if (p.kanyashree_id !== undefined || p.kanyashreeId !== undefined) {
        updatePayload.kanyashree_id = p.kanyashree_id !== undefined ? p.kanyashree_id : p.kanyashreeId;
      }
      if (p.birth_registration_no !== undefined || p.birthRegistrationNo !== undefined) {
        updatePayload.birth_registration_no = p.birth_registration_no || p.birthRegistrationNo;
      }
      if (p.identification_mark !== undefined || p.identificationMark !== undefined) {
        updatePayload.identification_mark = p.identification_mark || p.identificationMark;
      }
      if (p.height_cm !== undefined || p.heightCm !== undefined) {
        updatePayload.height_cm = p.height_cm || p.heightCm;
      }
      if (p.weight_kg !== undefined || p.weightKg !== undefined) {
        updatePayload.weight_kg = p.weight_kg || p.weightKg;
      }
      if (p.academic_stream !== undefined || p.academicStream !== undefined) {
        updatePayload.academic_stream = p.academic_stream || p.academicStream;
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
