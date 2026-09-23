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
    checkBirthCert: false,
    checkMarksheet: false,
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
        checklist.checkBirthCert ? "Birth Certificate" : null,
        checklist.checkMarksheet ? "Marksheet / TC" : null,
      ].filter(Boolean),
    });
  };

  const checklistBlock = (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3.5 shadow-xs">
      <p className="text-xs sm:text-sm font-bold border-b pb-2 text-foreground">
        J. Physical Document Verification Checklist (আসল নথিপত্র যাচাইকরণ)
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="flex items-center space-x-2.5 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox
            id="doc-aadhaar"
            checked={checklist.checkAadhaar}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkAadhaar: c }))}
          />
          <span className="text-xs font-medium leading-none">Aadhaar Card Verified</span>
        </label>
        <label className="flex items-center space-x-2.5 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox
            id="doc-birth"
            checked={checklist.checkBirthCert}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkBirthCert: c }))}
          />
          <span className="text-xs font-medium leading-none">Birth Certificate Verified</span>
        </label>
        <label className="flex items-center space-x-2.5 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox
            id="doc-marks"
            checked={checklist.checkMarksheet}
            onCheckedChange={(c: boolean) => setChecklist((prev) => ({ ...prev, checkMarksheet: c }))}
          />
          <span className="text-xs font-medium leading-none">Marksheet / TC Verified</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">Review & Verify Application</h2>
            {appData?.applicationNo && (
              <Badge variant="secondary" className="font-mono text-xs">
                {appData.applicationNo}
              </Badge>
            )}
            {appData?.id && !appData?.applicationNo && (
              <Badge variant="secondary" className="font-mono text-xs">
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
