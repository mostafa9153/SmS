"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { addDays, libraryToday } from "./dates";
import type { LibraryReports } from "./db-library-reports";

/** Reports page: the date range (default last 90 days) and its data. */
export function useReports() {
  const [to, setTo] = useState(libraryToday());
  const [from, setFrom] = useState(addDays(libraryToday(), -90));
  const valid = Boolean(from && to && from <= to);
  const report = useQuery<LibraryReports>({
    queryKey: ["library", "reports", from, to],
    queryFn: () => apiFetch<LibraryReports>(`/api/library/reports?from=${from}&to=${to}`),
    enabled: valid,
  });
  return { from, to, setFrom, setTo, valid, report };
}
