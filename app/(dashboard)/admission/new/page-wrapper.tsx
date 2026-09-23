"use client";
import React, { useState } from "react";
import { NewAdmissionWizard } from "@/components/admission/new-admission-wizard";
import { NewAdmissionDashboard } from "@/components/admission/new-admission-dashboard";

export function PageWrapper() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <>
      {showDashboard ? (
        <NewAdmissionDashboard onClose={() => setShowDashboard(false)} />
      ) : (
        <NewAdmissionWizard onOpenDashboard={() => setShowDashboard(true)} />
      )}
    </>
  );
}
