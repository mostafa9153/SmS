"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AdmissionApplicationForm, AdmissionFormData } from "@/components/admission/admission-application-form";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Step3ReviewProps {
  appData: any;
  onBack: () => void;
  onNext: (updatedData: any) => void;
}

export function Step3Review({ appData, onBack, onNext }: Step3ReviewProps) {
  const [checklist, setChecklist] = useState({
    checkAadhaar: false,
    checkBankPassbook: false,
    checkMotherVoter: false,
    checkOriginalTcMarksheet: false,
    checkBirthCert: false,
    checkPhoto: false,
  });

  const handleFormSubmit = (data: AdmissionFormData) => {
    onNext({
      ...appData,
      ...data,
      studentName: data.studentName,
      targetClass: data.presentClass,
      address: `${data.presentVillage}, ${data.presentPostOffice}, ${data.presentPoliceStation}, ${data.presentDistrict} - ${data.presentPincode}`,
      village: data.presentVillage,
      postOffice: data.presentPostOffice,
      policeStation: data.presentPoliceStation,
      district: data.presentDistrict,
      pincode: data.presentPincode,
      verifiedDocuments: [
        checklist.checkAadhaar ? "Aadhaar Card" : null,
        checklist.checkBankPassbook ? "Bank Passbook" : null,
        checklist.checkMotherVoter ? "Mother's Voter ID" : null,
        checklist.checkOriginalTcMarksheet ? "Original TC & Marksheet" : null,
        checklist.checkBirthCert ? "Birth Certificate" : null,
        checklist.checkPhoto ? "Passport Photos (2 Copies)" : null,
      ].filter(Boolean),
    });
  };

  const checklistBlock = (
    <div className="rounded-2xl border bg-card p-3.5 sm:p-5 space-y-3 shadow-xs">
      <p className="text-xs sm:text-sm font-bold border-b pb-2 text-foreground">
        Document Verification Checklist
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
        <label className="flex items-center space-x-2.5 p-2.5 sm:p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox
            id="doc-aadhaar"
            checked={checklist.checkAadhaar}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkAadhaar: c }))}
          />
          <span className="text-xs font-medium leading-none">Aadhaar Card</span>
        </label>
        <label className="flex items-center space-x-2.5 p-2.5 sm:p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox
            id="doc-bank"
            checked={checklist.checkBankPassbook}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkBankPassbook: c }))}
          />
          <span className="text-xs font-medium leading-none">Bank Passbook</span>
        </label>
        <label className="flex items-center space-x-2.5 p-2.5 sm:p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox
            id="doc-voter"
            checked={checklist.checkMotherVoter}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkMotherVoter: c }))}
          />
          <span className="text-xs font-medium leading-none">Mother&apos;s Voter ID</span>
        </label>
        <label className="flex items-center space-x-2.5 p-2.5 sm:p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer transition-colors">
          <Checkbox
            id="doc-tc-marks"
            checked={checklist.checkOriginalTcMarksheet}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkOriginalTcMarksheet: c }))}
          />
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-none">Original TC & Marksheet</span>
        </label>
        <label className="flex items-center space-x-2.5 p-2.5 sm:p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox
            id="doc-birth"
            checked={checklist.checkBirthCert}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkBirthCert: c }))}
          />
          <span className="text-xs font-medium leading-none">Birth Certificate</span>
        </label>
        <label className="flex items-center space-x-2.5 p-2.5 sm:p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox
            id="doc-photo"
            checked={checklist.checkPhoto}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkPhoto: c }))}
          />
          <span className="text-xs font-medium leading-none">2 Passport Photos</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">Review & Verify Application</h2>
            {appData?.applicationNo && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {appData.applicationNo}
              </Badge>
            )}
            {appData?.id && !appData?.applicationNo && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {appData.id.slice(0, 8)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <AdmissionApplicationForm
        initialData={appData}
        onSubmit={handleFormSubmit}
        submitButtonText="Save & Proceed to Finalize (Step 4)"
        mode="review"
        checklist={checklistBlock}
      />
    </div>
  );
}
