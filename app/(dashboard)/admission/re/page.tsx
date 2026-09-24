"use client";

import React, { Suspense } from "react";
import { ReAdmissionWizard } from "@/components/admission/re-admission/re-admission-wizard";
import { Loader2 } from "lucide-react";

export default function ReAdmissionPage() {
  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-2 sm:p-6 pt-2 sm:pt-4">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <ReAdmissionWizard />
      </Suspense>
    </div>
  );
}
