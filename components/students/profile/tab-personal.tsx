"use client";

import { TabsContent } from "@/components/ui/tabs";
import { formatDate, calculateDetailedAge } from "@/lib/utils";
import { InfoField, InfoGrid, SectionTitle } from "@/components/students/profile/info-primitives";
import type { StudentProfileState } from "./use-student-profile";

export function PersonalTab({ profile }: { profile: StudentProfileState }) {
  const { student } = profile;
  if (!student) return null;
  return (
    <TabsContent value="personal" className="mt-4">
      <div className="rounded-xl border bg-card p-5 space-y-6">
        <div>
          <SectionTitle>Student Demographics</SectionTitle>
          <InfoGrid>
            <InfoField label="Full Name" value={student.name} copyable />
            <InfoField label="Date of Birth" value={formatDate(student.dob)} copyable />
            <InfoField
              label="Exact Age (Y / M / D)"
              value={(() => {
                const dAge = calculateDetailedAge(student.dob);
                return dAge ? dAge.formattedLong : undefined;
              })()}
            />
            <InfoField label="Gender" value={student.gender} />
            <InfoField label="Mother Tongue" value={student.motherTongue} />
            <InfoField label="Religion" value={student.religion} />
            <InfoField label="Indian Nationality" value={student.indianNationality !== false ? "Yes" : "No"} />
            <InfoField label="Blood Group" value={student.bloodGroup} />
            <InfoField label="Height" value={student.heightCm ? `${student.heightCm} cm` : undefined} />
            <InfoField label="Weight" value={student.weightKg ? `${student.weightKg} kg` : undefined} />
            <InfoField label="Birth Registration Number" value={student.birthRegistrationNo} />
            <InfoField label="Identification Mark" value={student.identificationMark} />
          </InfoGrid>
        </div>

        <div>
          <SectionTitle>Social & Eligibility Categories</SectionTitle>
          <InfoGrid>
            <InfoField label="Social Category" value={student.socialCategory} />
            {student.casteCertificateNo && (
              <InfoField label="Category / Caste Cert. No." value={student.casteCertificateNo} copyable />
            )}
            <InfoField label="Minority Group" value={student.minorityGroup} />
            <InfoField label="AAY Beneficiary" value={student.isAay ? "Yes" : "No"} />
            <InfoField label="EWS / Disadvantaged Group" value={student.isEws ? "Yes" : "No"} />
            <InfoField label="Out-of-School Child" value={student.isOutOfSchool ? "Yes" : "No"} />
            {student.isOutOfSchool && (
              <InfoField label="Mainstreamed Date" value={student.mainstreamedDate ? formatDate(student.mainstreamedDate) : "Not Mainstreamed"} />
            )}
          </InfoGrid>
        </div>

        <div>
          <SectionTitle>CWSN (Children With Special Needs)</SectionTitle>
          <InfoGrid>
            <InfoField label="CWSN Status" value={student.isCwsn ? "Yes" : "No"} />
            {student.isCwsn && (
              <>
                <InfoField label="Type of Impairment" value={student.impairmentType} />
                <InfoField label="Disability Certificate" value={student.hasDisabilityCertificate ? "Yes" : "No"} />
                {student.hasDisabilityCertificate && (
                  <InfoField label="Disability Percentage" value={student.disabilityPercentage ? `${student.disabilityPercentage}%` : undefined} />
                )}
              </>
            )}
            {student.sldType && <InfoField label="Specific Learning Disability (SLD)" value={student.sldType} />}
          </InfoGrid>
        </div>

        <div>
          <SectionTitle>Family & Contact Information</SectionTitle>
          <InfoGrid>
            <InfoField label="Father's Name" value={student.fatherName} />
            <InfoField label="Father's Occupation" value={student.fatherOccupation} />
            <InfoField label="Mother's Name" value={student.motherName} />
            <InfoField label="Mother's Occupation" value={student.motherOccupation} />
            <InfoField label="Guardian's Name" value={student.guardianName} />
            <InfoField label="Relationship with Guardian" value={student.relationshipWithGuardian} />
            <InfoField label="Guardian's Occupation" value={student.guardianOccupation} />
            <InfoField label="Guardian's Qualification" value={student.guardianQualification} />
            <InfoField label="Annual Family Income" value={student.annualFamilyIncome ? `₹${student.annualFamilyIncome.toLocaleString("en-IN")}` : undefined} />
            <InfoField label="Primary Mobile" value={student.studentContact} copyable />
            <InfoField label="Guardian Contact No" value={student.altMobile} copyable />
            <InfoField label="Email ID" value={student.email} />
            <InfoField label="Address" value={student.address} full />
            <InfoField label="Pincode" value={student.pincode} />
          </InfoGrid>
        </div>
      </div>
    </TabsContent>
  );
}
