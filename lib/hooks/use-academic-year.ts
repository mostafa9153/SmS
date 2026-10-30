"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdmissionSettings } from "@/lib/data/admission";
import { currentYearIST } from "@/lib/utils/academic-year";

/**
 * The school's current academic year ("2026") from admission settings, or the
 * IST calendar year until the settings load (or when they fail).
 */
export function useAcademicYear(): string {
  const { data } = useQuery({
    queryKey: ["admission-settings"],
    queryFn: getAdmissionSettings,
    staleTime: 5 * 60_000,
  });
  return String(data?.currentAcademicYear || currentYearIST());
}
