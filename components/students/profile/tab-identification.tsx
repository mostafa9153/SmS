"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MaskedAadhaar } from "@/components/students/masked-aadhaar";
import { InfoField, SectionTitle } from "@/components/students/profile/info-primitives";
import type { StudentProfileState } from "./use-student-profile";

export function IdentificationTab({ profile }: { profile: StudentProfileState }) {
  const { student } = profile;
  if (!student) return null;
  return (
    <TabsContent value="identification" className="mt-4">
      <div className="rounded-xl border bg-card p-5">
        <SectionTitle>Government Identifiers</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <InfoField label="PEN (Permanent Education Number)" value={student.pen} copyable />
          <InfoField label="DISE Code" value={student.diseCode} copyable />
          <InfoField label="Health ID" value={student.healthId} copyable />
          <InfoField label="Student Unique Code" value={student.studentUniqueCode} copyable />
          {(student.gender === "Female" || Boolean(student.kanyashreeId)) && (
            <InfoField label="Kanyashree ID / Applicant ID" value={student.kanyashreeId} copyable />
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Aadhaar Available? (Yes/No)
            </p>
            {student.aadhaar && student.aadhaar.trim() !== "" ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs px-2 py-0.5 font-medium">
                ✓ Yes (Aadhaar Recorded)
              </Badge>
            ) : (
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs px-2 py-0.5 font-medium">
                ✕ No (Not Available)
              </Badge>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Aadhaar Number
            </p>
            <MaskedAadhaar aadhaar={student.aadhaar} />
            {student.aadhaar && (
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Click the eye icon to reveal. Access is logged in production.
              </p>
            )}
          </div>
          {student.nameAsPerAadhaar && (
            <InfoField label="Name (as per Aadhaar)" value={student.nameAsPerAadhaar} />
          )}
        </div>
      </div>
    </TabsContent>
  );
}
