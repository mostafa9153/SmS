import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import { dbCreateStudent } from "@/lib/supabase/db-students";
import type { Student, StudentStatus } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await req.json();

    const { applicationIds, className, academicYear } = body;

    let query = supabase
      .from("admission_applications")
      .select("*")
      .eq("status", "admitted")
      .eq("is_transferred_to_active", false);

    if (Array.isArray(applicationIds) && applicationIds.length > 0) {
      query = query.in("id", applicationIds);
    } else if (className && className !== "all") {
      query = query.or(`admitted_class.eq.${className},target_class.eq.${className}`);
    }

    if (academicYear && academicYear !== "all") {
      query = query.eq("academic_year", academicYear);
    }

    const { data: admittedApps, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!admittedApps || admittedApps.length === 0) {
      return NextResponse.json({
        success: true,
        transferredCount: 0,
        message: "No untransferred admitted applications found matching criteria.",
      });
    }

    const transferredStudents: Array<{ id: string; name: string; schoolId: string; class: string; roll: number }> = [];
    const skippedWarnings: Array<{ id: string; name: string; reason: string }> = [];
    const currentYear = new Date().getFullYear();

    for (const app of admittedApps) {
      const extra = app.ai_extracted_data && typeof app.ai_extracted_data === "object" ? app.ai_extracted_data : {};
      
      // Validation of mandatory fields
      const studentName = app.student_name?.trim();
      const guardianName = app.guardian_name?.trim() || app.father_name?.trim() || app.mother_name?.trim();
      const dob = app.date_of_birth;
      const gender = app.gender;
      const assignedClass = app.admitted_class || app.target_class;
      const assignedSection = app.admitted_section || app.target_section || "A";
      const assignedRoll = app.admitted_roll ? Number(app.admitted_roll) : app.target_roll ? Number(app.target_roll) : null;

      if (!studentName) {
        skippedWarnings.push({ id: app.id, name: app.student_name || "Unknown", reason: "Missing Student Name" });
        continue;
      }
      if (!guardianName) {
        skippedWarnings.push({ id: app.id, name: studentName, reason: "Missing Guardian / Father Name" });
        continue;
      }
      if (!dob) {
        skippedWarnings.push({ id: app.id, name: studentName, reason: "Missing Date of Birth" });
        continue;
      }
      if (!assignedRoll || assignedRoll <= 0) {
        skippedWarnings.push({ id: app.id, name: studentName, reason: "Missing or Invalid Assigned Roll Number" });
        continue;
      }

      try {
        const studentInput: Omit<Student, "id"> = {
          schoolId: "", // Auto generated
          name: studentName,
          photoUrl: app.photo_url || undefined,
          gender: (gender as "Male" | "Female" | "Other") || "Male",
          dob: dob,
          fatherName: app.father_name || guardianName,
          fatherOccupation: extra.fatherOccupation || undefined,
          motherName: app.mother_name || "N/A",
          motherOccupation: extra.motherOccupation || undefined,
          guardianName: guardianName,
          relationshipWithGuardian: extra.relationshipWithGuardian || undefined,
          guardianOccupation: extra.guardianOccupation || undefined,
          guardianQualification: extra.guardianQualification || undefined,
          annualFamilyIncome: extra.annualFamilyIncome ? Number(extra.annualFamilyIncome) : undefined,

          studentContact: app.student_contact || undefined,
          altMobile: app.alt_mobile || undefined,
          email: app.email || undefined,
          address: app.address || app.village || "Vill",
          pincode: app.pincode || undefined,
          religion: app.religion || "Islam",
          socialCategory: app.social_category || "General",
          casteCertificateNo: app.caste_certificate_no || undefined,
          minorityGroup: extra.minorityGroup || undefined,
          isAay: !!extra.isAay,
          isEws: !!extra.isEws,
          isOutOfSchool: !!extra.isOutOfSchool,
          mainstreamedDate: extra.mainstreamedDate || undefined,

          isCwsn: !!extra.isCwsn,
          impairmentType: extra.impairmentType || undefined,
          hasDisabilityCertificate: !!extra.hasDisabilityCertificate,
          disabilityPercentage: extra.disabilityPercentage ? Number(extra.disabilityPercentage) : undefined,
          sldType: extra.sldType || undefined,
          motherTongue: extra.motherTongue || "Bengali",
          indianNationality: extra.indianNationality !== false,
          bloodGroup: app.blood_group || extra.bloodGroup || undefined,
          heightCm: extra.heightCm ? Number(extra.heightCm) : undefined,
          weightKg: extra.weightKg ? Number(extra.weightKg) : undefined,
          birthRegistrationNo: extra.birthRegistrationNo || undefined,
          identificationMark: extra.identificationMark || undefined,

          aadhaar: app.aadhaar || extra.aadhaar || undefined,
          nameAsPerAadhaar: extra.nameAsPerAadhaar || undefined,
          pen: extra.pen || undefined,
          diseCode: extra.diseCode || undefined,
          healthId: extra.healthId || undefined,
          studentUniqueCode: extra.studentUniqueCode || undefined,
          kanyashreeId: app.kanyashree_id || extra.kanyashreeId || undefined,

          previousSchool: app.previous_school || extra.previousSchool || undefined,
          previousClass: app.previous_class || extra.previousClass || undefined,
          previousSection: extra.previousSection || undefined,
          previousStream: extra.previousStream || undefined,
          previousRollNo: extra.previousRollNo ? Number(extra.previousRollNo) : undefined,
          previousAppearedForExams: !!extra.previousAppearedForExams,
          previousResult: extra.previousResult || undefined,
          previousMarksPercent: extra.previousMarksPercent ? Number(extra.previousMarksPercent) : undefined,
          previousDaysAttended: extra.previousDaysAttended ? Number(extra.previousDaysAttended) : undefined,
          rteSection12C: !!extra.rteSection12C,
          rteAmountClaimed: extra.rteAmountClaimed ? Number(extra.rteAmountClaimed) : undefined,

          facilitiesProvided: extra.facilitiesProvided || undefined,
          cwsnFacilities: extra.cwsnFacilities || undefined,
          ncc: !!extra.ncc,
          nss: !!extra.nss,
          scoutsGuides: !!extra.scoutsGuides,
          distanceToSchool: extra.distanceToSchool ? Number(extra.distanceToSchool) : undefined,
          highestEducationParents: extra.highestEducationParents || undefined,

          presentClass: assignedClass,
          presentSection: assignedSection,
          presentRoll: assignedRoll,
          mediumOfInstruction: extra.mediumOfInstruction || "Bengali",
          academicStream: app.stream || extra.academicStream || undefined,
          bankAccountNo: app.bank_account_no || extra.bankAccountNo || undefined,
          bankIfsc: app.bank_ifsc || extra.bankIfsc || undefined,

          currentStatus: "Continuing" as StudentStatus,
          admissionYear: Number(app.academic_year) || currentYear,
          admissionDate: app.admission_date || new Date().toISOString().split("T")[0],
          presentClassAdmissionDate: new Date().toISOString().split("T")[0],
          reAdmissionStatus: "admitted",
          reAdmittedAt: new Date().toISOString(),
          reAdmittedSession: String(app.academic_year || currentYear),
          isInvoiceQueued: true,

          academicHistory: [
            {
              year: Number(app.academic_year) || currentYear,
              class: assignedClass,
              section: assignedSection,
              roll: assignedRoll,
              status: "Continuing" as StudentStatus,
            },
          ],
        };

        const createdStudent = await dbCreateStudent(studentInput);

        // Update application record
        await supabase
          .from("admission_applications")
          .update({
            is_transferred_to_active: true,
            transferred_to_active_at: new Date().toISOString(),
            admitted_student_id: createdStudent.id,
            school_id: createdStudent.schoolId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", app.id);

        // Update invoice record with created student's schoolId
        if (app.payment_receipt_no) {
          try {
            await supabase
              .from("admission_invoices")
              .update({
                student_id: createdStudent.schoolId || createdStudent.id,
                updated_at: new Date().toISOString(),
              })
              .eq("invoice_number", app.payment_receipt_no);
          } catch (invErr) {
            console.warn("Could not link invoice to created student:", invErr);
          }
        }

        transferredStudents.push({
          id: createdStudent.id,
          name: createdStudent.name,
          schoolId: createdStudent.schoolId,
          class: assignedClass,
          roll: assignedRoll,
        });
      } catch (err: any) {
        console.error(`Error transferring student ${studentName}:`, err);
        skippedWarnings.push({ id: app.id, name: studentName, reason: err.message || "Database insert error" });
      }
    }

    return NextResponse.json({
      success: true,
      transferredCount: transferredStudents.length,
      transferredStudents,
      skippedCount: skippedWarnings.length,
      skippedWarnings,
      message: `Successfully transferred ${transferredStudents.length} student(s) to the Active Directory.`,
    });
  } catch (err: any) {
    console.error("Error in transfer-to-active route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
