"use client";

import React from "react";
import { ExamAllocation } from "@/lib/ems/types";
import { EmsPrintStudio, PrintDocType } from "./ems-print-studio";

export interface EmsPrintSuiteHubProps {
  allocation: ExamAllocation;
  onBackToStep4: () => void;
  onViewBlueprint?: () => void;
  defaultRoomId?: string;
  defaultDoc?: PrintDocType;
}

/**
 * EmsPrintSuiteHub now directly forwards to the embedded full-page EmsPrintStudio
 */
export function EmsPrintSuiteHub({
  allocation,
  onBackToStep4,
  onViewBlueprint,
  defaultRoomId = "ALL",
  defaultDoc = "admit",
}: EmsPrintSuiteHubProps) {
  return (
    <EmsPrintStudio
      allocation={allocation}
      defaultRoomId={defaultRoomId}
      defaultDoc={defaultDoc}
      onBackToStep4={onBackToStep4}
      onViewBlueprint={onViewBlueprint}
      isDialog={false}
    />
  );
}
