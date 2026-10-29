"use client";



import { SecondarySchemesCard } from "@/components/settings/marks-scheme/secondary-schemes-card";
import { HigherSecondaryCard } from "@/components/settings/marks-scheme/higher-secondary-card";
import { SubjectBankCard } from "@/components/settings/marks-scheme/subject-bank-card";
import { PromotionPolicyCard } from "@/components/settings/marks-scheme/promotion-policy-card";
import { EditSchemeDialog } from "@/components/settings/marks-scheme/edit-scheme-dialog";
import { useMarksScheme } from "@/components/settings/marks-scheme/use-marks-scheme";

export function MarksSchemeTab() {
  const ms = useMarksScheme();

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* 1. Secondary Classes (V - X) 3-Summative Evaluation Table Card */}
      <SecondarySchemesCard ms={ms} />

      {/* 2. Higher Secondary (XI & XII) Semester Marks Scheme Table Card */}
      <HigherSecondaryCard ms={ms} />

      {/* Card 3: Subject Curriculum & Bank Manager */}
      <SubjectBankCard ms={ms} />

      {/* Card 4: Promotion & Pass Criteria Policy */}
      <PromotionPolicyCard ms={ms} />

      {/* EDIT MARKS SCHEME MODAL */}
      <EditSchemeDialog ms={ms} />
    </div>
  );
}
