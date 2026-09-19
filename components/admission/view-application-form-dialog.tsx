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

  const targetClass = application.admittedClass || application.targetClass || "V";
  const isClassXIorXII = targetClass === "XI" || targetClass === "XII" || targetClass === "11" || targetClass === "12";

  // Map application to Form V-IX data
  const formVIxData: AdmissionFormVIxData = {
    formNo: application.applicationNo || "MHS/AF/26/0001",
    academicYear: application.academicYear || "2026",
    admissionType: application.admissionType || "new",
    officeUse: {
      slNo: application.applicationNo,
      class: application.admittedClass || application.targetClass || "",
      sec: application.admittedSection || application.targetSection || "",
      rollNo: application.admittedRoll ? String(application.admittedRoll) : application.targetRoll ? String(application.targetRoll) : "",
    },
    basicInfo: {
      nameEng: application.studentName || "",
      dob: application.dob || "",
      gender: (application.gender?.toUpperCase() as any) || "MALE",
      socialCategory: application.socialCategory || "General",
      religion: application.religion || "Islam",
      nationality: "INDIAN",
      aadhaarNo: application.aadhaar || "",
      bloodGroup: application.bloodGroup || "",
      studentId: application.schoolId || application.admittedStudentId || "",
    },
    educationalInfo: {
      presentClass: application.admittedClass || application.targetClass || "",
      presentSection: application.admittedSection || application.targetSection || "",
      presentRoll: application.admittedRoll ? String(application.admittedRoll) : application.targetRoll ? String(application.targetRoll) : "",
      previousSchool: application.previousSchool || "",
      previousClass: application.previousClass || "",
      previousRoll: application.previousRoll || "",
    } as any,
    contactInfo: {
      village: application.village || application.address || "",
      district: application.district || "SOUTH 24 PARGANAS",
      postOffice: application.postOffice || "",
      policeStation: application.policeStation || "",
      pinCode: application.pincode || "",
      contactNo: application.studentContact || application.altMobile || "",
      email: application.email || "",
    },
    bankDetails: {
      bankName: application.bankName || "",
      ifsc: application.bankIfsc || "",
      accountNumber: application.bankAccountNo || "",
    },
    guardianDetails: {
      fatherNameEng: application.fatherName || "",
      motherNameEng: application.motherName || "",
      guardianNameEng: application.guardianName || application.fatherName || "",
      relationship: application.guardianName === application.fatherName ? "Father" : application.guardianName === application.motherName ? "Mother" : "Guardian",
    },
    guardianContact: {
      village: application.village || application.address || "",
      district: application.district || "SOUTH 24 PARGANAS",
      postOffice: application.postOffice || "",
      policeStation: application.policeStation || "",
      pinCode: application.pincode || "",
      contactNo: application.studentContact || application.altMobile || "",
      email: application.email || "",
    },
    otherInfo: {
      bplStatus: "NO",
      cwsnStatus: "NO",
    },
  };

  // Map application to Form XI data
  const formXIData: AdmissionFormXIData = {
    formNo: application.applicationNo || "MHS/AF/26/0001",
    academicYear: application.academicYear || "2026",
    admissionType: application.admissionType || "new",
    officeUse: {
      doa: application.admissionDate || (application.admittedAt ? application.admittedAt.split("T")[0] : ""),
      slNo: application.applicationNo,
      class: application.admittedClass || application.targetClass || "XI",
      sec: application.admittedSection || application.targetSection || "A",
      rollNo: application.admittedRoll ? String(application.admittedRoll) : application.targetRoll ? String(application.targetRoll) : "",
    },
    basicInfo: {
      nameEng: application.studentName || "",
      dob: application.dob || "",
      gender: (application.gender?.toUpperCase() as any) || "MALE",
      socialCategory: application.socialCategory || "General",
      religion: application.religion || "Islam",
      nationality: "INDIAN",
      aadhaarNo: application.aadhaar || "",
      bloodGroup: application.bloodGroup || "",
      studentId: application.schoolId || application.admittedStudentId || "",
    },
    educationalInfo: {
      previousSchoolName: application.previousSchool || "",
      marksObtained: application.previousMarks || "",
    },
    contactInfo: {
      village: application.village || application.address || "",
      district: application.district || "SOUTH 24 PARGANAS",
      postOffice: application.postOffice || "",
      policeStation: application.policeStation || "",
      pinCode: application.pincode || "",
      contactNo: application.studentContact || application.altMobile || "",
      email: application.email || "",
    },
    bankDetails: {
      bankName: application.bankName || "",
      ifsc: application.bankIfsc || "",
      accountNumber: application.bankAccountNo || "",
    },
    guardianDetails: {
      fatherNameEng: application.fatherName || "",
      motherNameEng: application.motherName || "",
      guardianNameEng: application.guardianName || application.fatherName || "",
      relationship: application.guardianName === application.fatherName ? "Father" : application.guardianName === application.motherName ? "Mother" : "Guardian",
    },
    guardianContact: {
      village: application.village || application.address || "",
      district: application.district || "SOUTH 24 PARGANAS",
      postOffice: application.postOffice || "",
      policeStation: application.policeStation || "",
      pinCode: application.pincode || "",
      contactNo: application.studentContact || application.altMobile || "",
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

        {/* Form Container */}
        <div className="bg-slate-100 dark:bg-slate-900/50 p-2 sm:p-4 rounded-2xl overflow-x-auto flex justify-center print:bg-white print:p-0">
          <div className="bg-white shadow-xl rounded-xl overflow-hidden print:shadow-none print:m-0 print:p-0">
            {isClassXIorXII ? (
              <AdmissionFormXIPrintableView data={formXIData} school={schoolInfo} activePage="all" />
            ) : (
              <AdmissionFormVIxPrintableView data={formVIxData} school={schoolInfo} activePage="all" />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
