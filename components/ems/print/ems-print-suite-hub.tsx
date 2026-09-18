"use client";

import React from "react";
import { EmsPrintStudio, EmsPrintStudioProps } from "./ems-print-studio";

export type EmsPrintSuiteHubProps = EmsPrintStudioProps;

export function EmsPrintSuiteHub(props: EmsPrintSuiteHubProps) {
  return <EmsPrintStudio {...props} />;
}
