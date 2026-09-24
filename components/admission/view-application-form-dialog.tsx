"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X, FileText, CheckCircle2 } from "lucide-react";
import type { AdmissionApplication } from "@/lib/types";
import { AdmissionFormVIxPrintableView } from "@/components/admission-form/admission-form-v-ix-printable";
import { AdmissionFormXIPrintableView } from "@/components/admission-form/admission-form-xi-printable";
import {
  AdmissionFormVIxData,
  AdmissionFormXIData,
  DEFAULT_SCHOOL_INFO,
  schoolProfileToSchoolInfo,
} from "@/components/admission-form/types";
import { getSavedSchoolProfile } from "@/lib/utils/school-profile";
import { PinchZoomViewer } from "@/components/ui/pinch-zoom-viewer";

interface ViewApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: AdmissionApplication | null;
}

export function ViewApplicationFormDialog({
  open,
  onOpenChange,
  application,
}: ViewApplicationFormDialogProps) {
  if (!application) return null;

  const schoolProfile = getSavedSchoolProfile();
  const schoolInfo = schoolProfileToSchoolInfo(schoolProfile);

  const targetClass = application.admittedClass || (application as any).admitted_class || application.targetClass || (application as any).target_class || "V";
  const isClassXIorXII = targetClass === "XI" || targetClass === "XII" || targetClass === "11" || targetClass === "12";

  const formNumber = (application as any).formNo || (application as any).form_no || application.applicationNo || (application as any).application_no || "MHS/AF/26/0001";
  const studentName = application.studentName || (application as any).student_name || "";
  const fatherName = application.fatherName || (application as any).father_name || "";
  const motherName = application.motherName || (application as any).mother_name || "";
  const guardianName = application.guardianName || (application as any).guardian_name || fatherName || motherName || "";
  const studentContact = application.studentContact || (application as any).student_contact || (application as any).contact_number || (application as any).primary_mobile || application.altMobile || "";
  const studentDob = application.dob || (application as any).date_of_birth || "";
  const studentGender = (application.gender || (application as any).gender || "Male").toUpperCase();
  const studentAadhaar = application.aadhaar || (application as any).aadhaar_no || "";
  const studentSchoolId = application.schoolId || (application as any).school_id || application.admittedStudentId || (application as any).admitted_student_id || (application as any).student_id || "";
  const studentClass = application.admittedClass || (application as any).admitted_class || application.targetClass || (application as any).target_class || "";
  const studentSection = application.admittedSection || (application as any).admitted_section || application.targetSection || (application as any).target_section || "";
  const studentRoll = application.admittedRoll || (application as any).admitted_roll || application.targetRoll || (application as any).target_roll ? String(application.admittedRoll || (application as any).admitted_roll || application.targetRoll || (application as any).target_roll) : "";
  const studentVillage = application.village || (application as any).present_village || application.address || "";
  const studentDistrict = application.district || (application as any).present_district || "SOUTH 24 PARGANAS";
  const studentPostOffice = application.postOffice || (application as any).present_post_office || (application as any).post_office || "";
  const studentPoliceStation = application.policeStation || (application as any).present_police_station || (application as any).police_station || "";
  const studentPincode = application.pincode || (application as any).present_pincode || "";
  const studentBankName = application.bankName || (application as any).bank_name || "";
  const studentBankIfsc = application.bankIfsc || (application as any).bank_ifsc || (application as any).ifsc_code || "";
  const studentBankAccount = application.bankAccountNo || (application as any).bank_account_no || (application as any).bank_account || "";
  const studentPhoto = application.photoUrl || (application as any).photo_url || (application as any).photo || "";

  // Map application to Form V-IX data
  const formVIxData: AdmissionFormVIxData = {
    formNo: formNumber,
    academicYear: application.academicYear || (application as any).academic_year || "2026",
    admissionType: application.admissionType || (application as any).admission_type || "new",
    officeUse: {
      slNo: formNumber,
      class: studentClass,
      sec: studentSection,
      rollNo: studentRoll,
    },
    basicInfo: {
      nameEng: studentName,
      dob: studentDob,
      gender: studentGender as any,
      socialCategory: application.socialCategory || (application as any).social_category || "General",
      religion: application.religion || (application as any).religion || "Islam",
      nationality: "INDIAN",
      aadhaarNo: studentAadhaar,
      bloodGroup: application.bloodGroup || (application as any).blood_group || "",
      studentId: studentSchoolId,
    },
    educationalInfo: {
      presentClass: studentClass,
      presentSection: studentSection,
      presentRoll: studentRoll,
      previousSchool: application.previousSchool || (application as any).previous_school || (application as any).prev_school || "",
      previousClass: application.previousClass || (application as any).previous_class || (application as any).prev_class || "",
      previousRoll: application.previousRoll || (application as any).previous_roll_no || (application as any).previous_roll || "",
    } as any,
    contactInfo: {
      village: studentVillage,
      district: studentDistrict,
      postOffice: studentPostOffice,
      policeStation: studentPoliceStation,
      pinCode: studentPincode,
      contactNo: studentContact,
      email: application.email || "",
    },
    bankDetails: {
      bankName: studentBankName,
      ifsc: studentBankIfsc,
      accountNumber: studentBankAccount,
    },
    guardianDetails: {
      fatherNameEng: fatherName,
      motherNameEng: motherName,
      guardianNameEng: guardianName,
      relationship: guardianName === fatherName ? "Father" : guardianName === motherName ? "Mother" : "Guardian",
    },
    guardianContact: {
      village: studentVillage,
      district: studentDistrict,
      postOffice: studentPostOffice,
      policeStation: studentPoliceStation,
      pinCode: studentPincode,
      contactNo: studentContact,
      email: application.email || "",
    },
    otherInfo: {
      bplStatus: "NO",
      cwsnStatus: "NO",
    },
  };

  // Map application to Form XI data
  const formXIData: AdmissionFormXIData = {
    formNo: formNumber,
    academicYear: application.academicYear || (application as any).academic_year || "2026",
    admissionType: application.admissionType || (application as any).admission_type || "new",
    officeUse: {
      doa: application.admissionDate || (application.admittedAt ? application.admittedAt.split("T")[0] : ""),
      slNo: formNumber,
      class: studentClass || "XI",
      sec: studentSection || "A",
      rollNo: studentRoll,
    },
    basicInfo: {
      nameEng: studentName,
      dob: studentDob,
      gender: studentGender as any,
      socialCategory: application.socialCategory || (application as any).social_category || "General",
      religion: application.religion || (application as any).religion || "Islam",
      nationality: "INDIAN",
      aadhaarNo: studentAadhaar,
      bloodGroup: application.bloodGroup || (application as any).blood_group || "",
      studentId: studentSchoolId,
    },
    educationalInfo: {
      previousSchoolName: application.previousSchool || (application as any).previous_school || (application as any).prev_school || "",
      marksObtained: application.previousMarks || (application as any).previous_marks_percent || (application as any).previous_marks || "",
    },
    contactInfo: {
      village: studentVillage,
      district: studentDistrict,
      postOffice: studentPostOffice,
      policeStation: studentPoliceStation,
      pinCode: studentPincode,
      contactNo: studentContact,
      email: application.email || "",
    },
    bankDetails: {
      bankName: studentBankName,
      ifsc: studentBankIfsc,
      accountNumber: studentBankAccount,
    },
    guardianDetails: {
      fatherNameEng: fatherName,
      motherNameEng: motherName,
      guardianNameEng: guardianName,
      relationship: guardianName === fatherName ? "Father" : guardianName === motherName ? "Mother" : "Guardian",
    },
    guardianContact: {
      village: studentVillage,
      district: studentDistrict,
      postOffice: studentPostOffice,
      policeStation: studentPoliceStation,
      pinCode: studentPincode,
      contactNo: studentContact,
      email: application.email || "",
    },
    otherInfo: {
      bplStatus: "NO",
      cwsnStatus: "NO",
    },
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[98vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                Official Filled Admission Form ({application.targetClass || "General"})
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Application No: <span className="font-mono font-bold text-foreground">{application.applicationNo}</span> &bull; Status: <span className="uppercase font-bold text-emerald-600">{application.status}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Form (2 Pages)</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Form Container with Pinch Zoom */}
        <div className="p-2 sm:p-4 rounded-2xl overflow-hidden flex justify-center print:bg-white print:p-0">
          <PinchZoomViewer
            minScale={0.5}
            maxScale={2.5}
            canvasClassName="bg-slate-100 dark:bg-slate-900/50 p-2 sm:p-4 rounded-2xl"
          >
            <div className="bg-white shadow-xl rounded-xl overflow-hidden print:shadow-none print:m-0 print:p-0">
              {isClassXIorXII ? (
                <AdmissionFormXIPrintableView data={formXIData} school={schoolInfo} activePage="all" />
              ) : (
                <AdmissionFormVIxPrintableView data={formVIxData} school={schoolInfo} activePage="all" />
              )}
            </div>
          </PinchZoomViewer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
