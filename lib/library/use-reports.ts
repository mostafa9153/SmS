"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { addDays, libraryToday, subtractMonths } from "./dates";
import type { LibraryReports } from "./db-library-reports";

/** Period presets for the reports page; "to" is always today. */
export const REPORT_RANGES = [
  { value: "1d", label: "1 day" },
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "1m", label: "1 month" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
];

function rangeStart(key: string, to: string): string {
  switch (key) {
    case "1d":
      return to;
    case "1w":
      return addDays(to, -6);
    case "2w":
      return addDays(to, -13);
    case "6m":
      return subtractMonths(to, 6);
    case "1y":
      return subtractMonths(to, 12);
    default:
      return subtractMonths(to, 1);
  }
}

/** Reports page: a period preset or a custom date range, and its data. */
export function useReports() {
  const [range, setRange] = useState<string | null>("1m");
  const [to, setToDate] = useState(libraryToday());
  const [from, setFromDate] = useState(rangeStart("1m", libraryToday()));
  const valid = Boolean(from && to && from <= to);
  const report = useQuery<LibraryReports>({
    queryKey: ["library", "reports", from, to],
    queryFn: () => apiFetch<LibraryReports>(`/api/library/reports?from=${from}&to=${to}`),
    enabled: valid,
  });

  const pickRange = (key: string) => {
    const today = libraryToday();
    setRange(key);
    setToDate(today);
    setFromDate(rangeStart(key, today));
  };
  // Typing a date leaves the preset and makes it a custom range.
  const setFrom = (v: string) => {
    setRange(null);
    setFromDate(v);
  };
  const setTo = (v: string) => {
    setRange(null);
    setToDate(v);
  };

  return { from, to, range, pickRange, setFrom, setTo, valid, report };
}
