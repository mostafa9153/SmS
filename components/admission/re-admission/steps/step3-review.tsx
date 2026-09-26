"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { AdmissionApplicationForm, type AdmissionFormData } from "@/components/admission/admission-application-form";

interface Step3ReviewProps {
  onBack: () => void;
  onNext: (updatedData: any) => void;
  mode: "online" | "offline";
  initialData: any;
}

export function Step3Review({ onBack, onNext, mode, initialData }: Step3ReviewProps) {
  const isOnline = mode === "online";

  // Pre-fill all fields from the student record / application
  const mappedInitialData = useMemo(() => {
    if (!initialData) return {};
    return {
      studentName: initialData.name || initialData.studentName || "",
      studentNameBengali: initialData.student_name_bengali || initialData.studentNameBengali || "",
      dob: initialData.dob || initialData.dateOfBirth || initialData.date_of_birth || "",
      gender: initialData.gender || "Male",
      bloodGroup: initialData.blood_group || initialData.bloodGroup || "Unknown / জানা নেই",
      religion: initialData.religion || "Islam / ইসলাম",
      motherTongue: initialData.mother_tongue || initialData.motherTongue || "Bengali / বাংলা",
      socialCategory: initialData.social_category || initialData.caste || initialData.socialCategory || "General",
      casteCertificateNo: initialData.caste_certificate_no || initialData.casteCertificateNo || "",
      minorityGroup: initialData.minority_group || initialData.minorityGroup || "Muslim / মুসলিম",
      isAay: initialData.is_aay ?? initialData.isAay ?? false,
      isCwsn: initialData.is_cwsn ?? initialData.isCwsn ?? false,
      impairmentType: initialData.impairment_type || initialData.impairmentType || "",
      hasDisabilityCertificate: initialData.has_disability_certificate ?? initialData.hasDisabilityCertificate ?? false,
      disabilityCertificateNo: initialData.disability_certificate_no || initialData.disabilityCertificateNo || "",
      disabilityPercentage: initialData.disability_percentage || initialData.disabilityPercentage || null,
      sldType: initialData.sld_type || initialData.sldType || "",
      birthRegistrationNo: initialData.birth_registration_no || initialData.birthRegistrationNo || "",
      identificationMark: initialData.identification_mark || initialData.identificationMark || "",
      heightCm: initialData.height_cm || initialData.heightCm || null,
      weightKg: initialData.weight_kg || initialData.weightKg || null,
      indianNationality: initialData.indian_nationality ?? true,

      // Family
      fatherName: initialData.father_name || initialData.fatherName || "",
      fatherNameBengali: initialData.father_name_bengali || initialData.fatherNameBengali || "",
      fatherOccupation: initialData.father_occupation || initialData.fatherOccupation || "Farmer / কৃষি কাজ",
      motherName: initialData.mother_name || initialData.motherName || "",
      motherNameBengali: initialData.mother_name_bengali || initialData.motherNameBengali || "",
      motherOccupation: initialData.mother_occupation || initialData.motherOccupation || "Homemaker / গৃহিণী",
      guardianName: initialData.guardian_name || initialData.guardianName || initialData.father_name || "",
      relationshipWithGuardian: initialData.relationship_with_guardian || initialData.relationship || "Father / পিতা",
      guardianOccupation: initialData.guardian_occupation || initialData.guardianOccupation || "Farmer / কৃষি কাজ",
      guardianQualification: initialData.guardian_qualification || initialData.guardianQualification || "Secondary / মাধ্যমিক (Class IX-X)",
      annualFamilyIncome: initialData.annual_family_income || initialData.annualFamilyIncome || null,

      // Contact
      studentContact: initialData.mobile || initialData.student_contact || initialData.studentContact || "",
      altMobile: initialData.alt_mobile || initialData.altMobile || "",
      email: initialData.email || "",

      // Address
      presentVillage: initialData.vill_town || initialData.present_village || initialData.presentVillage || initialData.address || "",
      presentPanchayat: initialData.gram_panchayat || initialData.present_panchayat || initialData.presentPanchayat || "",
      presentBlock: initialData.block || initialData.present_block || initialData.presentBlock || "",
      presentPostOffice: initialData.post_office || initialData.present_post_office || initialData.presentPostOffice || "",
      presentPoliceStation: initialData.police_station || initialData.present_police_station || initialData.presentPoliceStation || "",
      presentDistrict: initialData.dist || initialData.district || initialData.present_district || initialData.presentDistrict || "Murshidabad",
      presentPincode: initialData.pincode || initialData.pin_code || initialData.present_pincode || initialData.presentPincode || "",
      sameAsPresentAddress: true,
      permVillage: initialData.vill_town || initialData.perm_village || initialData.permVillage || initialData.address || "",
      permPanchayat: initialData.gram_panchayat || initialData.perm_panchayat || initialData.permPanchayat || "",
      permBlock: initialData.block || initialData.perm_block || initialData.permBlock || "",
      permPostOffice: initialData.post_office || initialData.perm_post_office || initialData.permPostOffice || "",
      permPoliceStation: initialData.police_station || initialData.perm_police_station || initialData.permPoliceStation || "",
      permDistrict: initialData.dist || initialData.district || initialData.perm_district || initialData.permDistrict || "Murshidabad",
      permPincode: initialData.pincode || initialData.pin_code || initialData.perm_pincode || initialData.permPincode || "",

      // Academic
      presentClass: initialData.present_class || initialData.presentClass || initialData.targetClass || "VI",
      presentSection: initialData.present_section || initialData.presentSection || initialData.targetSection || "A",
      presentRoll: initialData.present_roll || initialData.presentRoll || 1,
      admissionType: "Re-Admission / পুনঃভর্তি",
      mediumOfInstruction: initialData.medium_of_instruction || "Bengali / বাংলা",
      academicStream: initialData.academic_stream || initialData.academicStream || "Arts / কলা বিভাগ",

      // Bank & IDs
      bankName: initialData.bank_name || initialData.bankName || "",
      bankBranch: initialData.bank_branch || initialData.bankBranch || "",
      bankIfsc: initialData.bank_ifsc || initialData.bankIfsc || "",
      bankAccountNo: initialData.bank_account_no || initialData.bankAccountNo || "",
      bplStatus: initialData.bpl_status || initialData.bplStatus || "NO",
      bplNo: initialData.bpl_no || initialData.bplNo || "",
      pen: initialData.pen || "",
      healthId: initialData.health_id || initialData.healthId || "",
      studentUniqueCode: initialData.student_unique_code || initialData.studentUniqueCode || "",
      hasAadhaar: (initialData.aadhaar || initialData.aadhaar_no || initialData.aadhaarNo) ? "Yes" : "No",
      aadhaar: initialData.aadhaar || initialData.aadhaar_no || initialData.aadhaarNo || "",
      nameAsPerAadhaar: initialData.name_as_per_aadhaar || initialData.nameAsPerAadhaar || "",
      kanyashreeId: initialData.kanyashree_id || initialData.kanyashreeId || "",
      photoUrl: initialData.photo_url || initialData.photoUrl || null,
    };
  }, [initialData]);

  const handleFormSubmit = (submittedData: AdmissionFormData) => {
    // Merge updated form fields with original student identifiers
    const mergedData = {
      ...initialData,
      ...submittedData,
      id: initialData?.id,
      schoolId: initialData?.schoolId || initialData?.school_id,
      applicationId: isOnline ? initialData?.id : undefined,
    };
    onNext(mergedData);
  };

  const studentDisplayName = initialData?.name || initialData?.studentName || "Student";
  const studentTargetClass = initialData?.present_class || initialData?.presentClass || "VI";
  const studentTargetSection = initialData?.present_section || initialData?.presentSection || "A";

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto py-2 px-2 sm:px-4 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0" title="Back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {isOnline ? "Online Application Verification" : "Profile Verification"}
            </span>
            <Badge variant="outline" className="text-[10px] font-semibold">
              {studentDisplayName} • Class {studentTargetClass} ({studentTargetSection})
            </Badge>
          </div>
        </div>
      </div>

      {/* Complete Admission Form with All 9 Pre-filled Sections */}
      <div className="bg-card rounded-xl border p-3 sm:p-5 shadow-xs">
        <AdmissionApplicationForm
          initialData={mappedInitialData}
          onSubmit={handleFormSubmit}
          mode="review"
          submitButtonText="Verify & Proceed to Finalize"
        />
      </div>
    </div>
  );
}
