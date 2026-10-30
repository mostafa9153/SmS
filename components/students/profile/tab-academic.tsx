"use client";

import { TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/students/status-badge";
import { formatDate } from "@/lib/utils";
import { InfoField, InfoGrid, SectionTitle } from "@/components/students/profile/info-primitives";
import type { StudentProfileState } from "./use-student-profile";

export function AcademicTab({ profile }: { profile: StudentProfileState }) {
  const { student } = profile;
  if (!student) return null;
  return (
    <TabsContent value="academic" className="mt-4">
      <div className="rounded-xl border bg-card p-5 space-y-6">
        <div>
          <SectionTitle>Present Enrolment Details</SectionTitle>
          <InfoGrid>
            <InfoField
              label="Current Status"
              value={<StatusBadge status={student.currentStatus || "Continuing"} size="sm" />}
            />
            <InfoField label="Class" value={student.presentClass} />
            <InfoField label="Section" value={student.presentSection} />
            <InfoField label="Roll Number" value={String(student.presentRoll)} />
            {student.presentSemester && <InfoField label="Semester" value={student.presentSemester} />}
            {student.detentionCount ? <InfoField label="Detention Count" value={String(student.detentionCount)} /> : null}
            {student.tcIssued && <InfoField label="TC Issued Date" value={student.tcDate ? formatDate(student.tcDate) : "Yes"} />}
            {student.tcReason && <InfoField label="TC Reason" value={student.tcReason} />}
            <InfoField label="Admission Number" value={student.admissionNo} />
            <InfoField label="Admission Date" value={student.admissionDate ? formatDate(student.admissionDate) : undefined} />
            <InfoField label="Admission Type" value={student.admissionType} />
            <InfoField label="Academic Year" value={student.academicYear} />
            <InfoField label="Medium of Instruction" value={student.mediumOfInstruction || "Bengali"} />
            <InfoField label="Present Class Admission Date" value={student.presentClassAdmissionDate ? formatDate(student.presentClassAdmissionDate) : undefined} />
            {student.academicStream && <InfoField label="Academic Stream (HS)" value={student.academicStream} />}
            {student.boardRegistrationNo && (
              <InfoField label="Board Registration No" value={student.boardRegistrationNo} copyable />
            )}
            {student.boardRollNo && (
              <InfoField label="Board Roll No" value={student.boardRollNo} copyable />
            )}
          </InfoGrid>
        </div>

        <div>
          <SectionTitle>Subjects & Languages Enrolled</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Languages Studied</p>
              <div className="flex flex-wrap gap-1">
                {student.languageGroup && student.languageGroup.length > 0 ? (
                  student.languageGroup.map((lang) => (
                    <span key={lang} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                      {lang}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs italic">No languages added</span>
                )}
              </div>
            </div>
            {student.foreignLanguage && (
              <InfoField label="Foreign Language" value={student.foreignLanguage} />
            )}
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Mandatory / General Subjects</p>
              <div className="flex flex-wrap gap-1">
                {student.mandatorySubjects && student.mandatorySubjects.length > 0 ? (
                  student.mandatorySubjects.map((sub) => (
                    <span key={sub} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                      {sub}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs italic">No mandatory subjects listed</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Additional Subjects</p>
              <div className="flex flex-wrap gap-1">
                {student.additionalSubjects && student.additionalSubjects.length > 0 ? (
                  student.additionalSubjects.map((sub) => (
                    <span key={sub} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                      {sub}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs italic">None</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Co-Curricular Subjects</p>
              <div className="flex flex-wrap gap-1">
                {student.coCurricularSubjects && student.coCurricularSubjects.length > 0 ? (
                  student.coCurricularSubjects.map((sub) => (
                    <span key={sub} className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                      {sub}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs italic">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Previous Academic Year Records</SectionTitle>
          <InfoGrid>
            <InfoField label="Schooling Status" value={student.previousStatus} />
            <InfoField label="Previous Grade/Class" value={student.previousClass} />
            <InfoField label="Previous Section" value={student.previousSection} />
            <InfoField label="Previous Stream" value={student.previousStream} />
            <InfoField label="Previous Roll No" value={student.previousRollNo ? String(student.previousRollNo) : undefined} />
            <InfoField label="Appeared for Examinations" value={student.previousAppearedForExams ? "Yes" : "No"} />
            <InfoField label="Result of Exam" value={student.previousResult} />
            <InfoField label="Marks Obtained (%)" value={student.previousMarksPercent ? `${student.previousMarksPercent}%` : undefined} />
            <InfoField label="Days Attended" value={student.previousDaysAttended ? `${student.previousDaysAttended} days` : undefined} />
          </InfoGrid>
        </div>

        <div>
          <SectionTitle>RTE Entitlement Information</SectionTitle>
          <InfoGrid>
            <InfoField label="Admitted under Section 12C of RTE" value={student.rteSection12C ? "Yes" : "No"} />
            {student.rteSection12C && (
              <InfoField label="Amount Claimed from Government" value={student.rteAmountClaimed ? `₹${student.rteAmountClaimed.toLocaleString("en-IN")}` : undefined} />
            )}
          </InfoGrid>
        </div>
      </div>
    </TabsContent>
  );
}
