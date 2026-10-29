"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { evaluateStudentScholarships } from "@/lib/utils/welfare-logic";
import { InfoField, InfoGrid, SectionTitle } from "@/components/students/profile/info-primitives";
import type { StudentProfileState } from "./use-student-profile";

export function BankTab({ profile }: { profile: StudentProfileState }) {
  const { student } = profile;
  if (!student) return null;
  return (
    <TabsContent value="bank" className="mt-4 space-y-4">
      {/* Active Welfare & Scholarship Eligibility Card */}
      {(() => {
        const welfareResult = evaluateStudentScholarships(student);
        const hasBankAccount = !!(student.bankAccountNo && student.bankAccountNo.trim() !== "");
        const hasIfsc = !!(student.bankIfsc && student.bankIfsc.trim() !== "");
        const isDbtReady = hasBankAccount && hasIfsc;

        return (
          <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <SectionTitle>Government Welfare & Scholarship Eligibility</SectionTitle>
                <p className="text-xs text-muted-foreground">
                  Dynamic evaluation based on West Bengal Govt rules (Gender, Age, Class, Caste, Religion, Academic Marks).
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {isDbtReady ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs px-2.5 py-1 font-semibold gap-1">
                    <Check className="h-3.5 w-3.5" />
                    <span>DBT Bank Ready</span>
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 text-xs px-2.5 py-1 font-semibold gap-1">
                    <span>⚠️ Incomplete Bank Info for DBT</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Eligible Schemes Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground">
                Qualified Schemes ({welfareResult.eligibleSchemes.length}):
              </span>
              {welfareResult.eligibleSchemes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {welfareResult.eligibleSchemes.map((scheme) => (
                    <div
                      key={scheme.id}
                      className="rounded-xl border p-3 bg-muted/20 hover:bg-muted/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${scheme.colorBadge}`}>
                          {scheme.shortCode}
                        </span>
                        <span className="text-xs font-mono font-bold text-primary">
                          {scheme.amount}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{scheme.name}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {scheme.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic p-3 rounded-lg border bg-muted/10">
                  No matching state welfare schemes based on current profile.
                </p>
              )}
            </div>

            {/* Conflict / Notes if any */}
            {welfareResult.conflicts.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-0.5">ℹ️ State Multi-Scholarship Rule:</p>
                <p>{welfareResult.conflicts[0]}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Bank Account Details Card */}
      <div className="rounded-xl border bg-card p-5">
        <SectionTitle>Scholarship & General Bank Account Details</SectionTitle>
        <p className="text-xs text-muted-foreground mb-5">
          These details are used for BPL entitlements, minority scholarships, and other direct benefit transfers (DBT).
        </p>
        <InfoGrid>
          <InfoField label="Bank A/C Number" value={student.bankAccountNo} copyable />
          <InfoField label="Bank IFS Code" value={student.bankIfsc} copyable />
        </InfoGrid>
      </div>
    </TabsContent>
  );
}
