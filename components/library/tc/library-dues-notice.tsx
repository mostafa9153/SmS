"use client";

import { BookX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { StudentDues } from "@/lib/library/tc";

/** Books out / money owed per student, shown before a TC (plan T12). */
export function LibraryDuesNotice({ dues, tone = "warn" }: { dues: StudentDues[]; tone?: "warn" | "block" }) {
  if (!dues.length) return null;
  const color =
    tone === "block"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  return (
    <div className={`rounded-xl border p-2.5 text-xs space-y-1 ${color}`}>
      <p className="flex items-center gap-1.5 font-semibold">
        <BookX className="h-4 w-4 shrink-0" />
        Library dues
      </p>
      <ul className="space-y-0.5">
        {dues.map((d) => (
          <li key={d.studentId} className="flex justify-between gap-2">
            <span className="truncate">{d.name}</span>
            <span className="shrink-0 tabular-nums">
              {d.openBooks > 0 && `${d.openBooks} book${d.openBooks > 1 ? "s" : ""}`}
              {d.openBooks > 0 && d.balance > 0 && " · "}
              {d.balance > 0 && `₹${d.balance}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fetches and shows dues for the given students; nothing while loading or clear. */
export function LibraryDuesWarning({ studentIds }: { studentIds: string[] }) {
  const key = [...studentIds].sort().slice(0, 200).join(",");
  const { data } = useQuery({
    queryKey: ["library-dues", key],
    queryFn: () => apiFetch<{ mode: string; dues: StudentDues[] }>(`/api/library/dues?studentIds=${key}`),
    enabled: key.length > 0,
    staleTime: 30_000,
  });
  return <LibraryDuesNotice dues={data?.dues ?? []} />;
}

interface ClassDues {
  className: string;
  students: number;
  books: number;
}

/** Promotion / session-close warning (T-c): books still out per class. `className` narrows to one class. */
export function LibraryClassWarning({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["library-dues-by-class"],
    queryFn: () => apiFetch<{ mode: string; classes: ClassDues[] }>("/api/library/dues?byClass=1"),
    staleTime: 60_000,
  });
  if (!data || data.mode === "off") return null;
  const rows = data.classes.filter((c) => !className || c.className === className);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 p-2.5 text-xs flex items-start gap-1.5">
      <BookX className="h-4 w-4 shrink-0 mt-0.5" />
      <span>
        Library books out:{" "}
        {rows.map((c) => `Class ${c.className} — ${c.books} book${c.books > 1 ? "s" : ""} (${c.students} student${c.students > 1 ? "s" : ""})`).join(" · ")}
      </span>
    </div>
  );
}
