"use client";

import { useQuery } from "@tanstack/react-query";
import { SportsEvent } from "./types";

export const SPORTS_CLASS_OPTIONS = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function useSportsEvents() {
  return useQuery<SportsEvent[]>({
    queryKey: ["sports-events"],
    queryFn: async () => {
      const res = await fetch("/api/sports/events");
      const json = await res.json();
      return json.data || [];
    },
  });
}

export type SportsEventStatus = "empty" | "enrolled" | "scoring" | "completed";

export function getEventStatus(event: SportsEvent): SportsEventStatus {
  if (!event.participantCount) return "empty";
  if (event.podiumCount && event.podiumCount > 0) return "completed";
  if (event.scoredCount && event.scoredCount > 0) return "scoring";
  return "enrolled";
}

export const EVENT_STATUS_META: Record<SportsEventStatus, { label: string; className: string }> = {
  empty: { label: "No entries", className: "bg-muted text-muted-foreground" },
  enrolled: { label: "Enrolled", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  scoring: { label: "Scoring", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  completed: { label: "Podium set", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

export const CATEGORY_BADGE_CLASS: Record<string, string> = {
  Track: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Field: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Fun: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Team: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

// "V – XII" for a contiguous run, otherwise a comma list
export function formatClassRange(classes: string[]): string {
  if (!classes || classes.length === 0) return "All classes";
  const idx = classes
    .map((c) => SPORTS_CLASS_OPTIONS.indexOf(c))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (idx.length === 0) return classes.join(", ");
  if (idx.length === SPORTS_CLASS_OPTIONS.length) return "All classes";
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && idx.length > 1) {
    return `${SPORTS_CLASS_OPTIONS[idx[0]]} – ${SPORTS_CLASS_OPTIONS[idx[idx.length - 1]]}`;
  }
  return idx.map((i) => SPORTS_CLASS_OPTIONS[i]).join(", ");
}

export function getUnitSuffix(measurementUnit?: string): string {
  if (!measurementUnit) return "";
  if (measurementUnit.includes("(s)")) return "s";
  if (measurementUnit.includes("(m)")) return "m";
  if (measurementUnit === "Points") return " pts";
  return "";
}

// Time → lower is better; distance/height/points → higher is better
export function isLowerBetter(measurementUnit?: string): boolean {
  return Boolean(measurementUnit?.includes("(s)"));
}

export const GENDER_LABEL: Record<string, string> = {
  All: "Co-ed",
  Boys: "Boys only",
  Girls: "Girls only",
};
