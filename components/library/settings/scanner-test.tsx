"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/components/forms/form-layout";
import { apiFetch } from "@/lib/api/client";
import type { ScannerTestStudent } from "@/lib/library/db-library";
import { describeDiagnosis, diagnoseScan, showInvisible } from "@/lib/library/scan-code";

type Field = "school_id" | "pen";

function TestBox({ field, title }: { field: Field; title: string }) {
  const [typed, setTyped] = useState("");
  const [expected, setExpected] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const lookup = useQuery<{ normalized: string; students: ScannerTestStudent[] }>({
    queryKey: ["library", "scanner-test", field, submitted],
    queryFn: () => apiFetch(`/api/library/scanner-test?field=${field}&code=${encodeURIComponent(submitted ?? "")}`),
    enabled: submitted !== null && submitted !== "",
  });
  const data = lookup.data;
  const diagnosis = submitted && expected.trim() ? diagnoseScan(submitted, expected) : null;

  return (
    <div className="space-y-2 rounded-xl border p-3">
      <h3 className="text-sm font-bold">{title}</h3>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(typed);
          setTyped("");
        }}
      >
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Scan here" className="min-w-48 flex-1" autoComplete="off" spellCheck={false} />
        <Input value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Printed on card (optional)" className="min-w-48 flex-1" autoComplete="off" spellCheck={false} />
        <Button type="submit" variant="outline" disabled={!typed.trim()}>
          Test
        </Button>
      </form>

      {submitted !== null && (
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground">Scanner typed</dt>
            <dd className="break-all font-mono">{showInvisible(submitted)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground">Cleaned</dt>
            <dd className="break-all font-mono">{data?.normalized ?? "…"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground">Matched</dt>
            <dd>
              {lookup.isLoading ? (
                "…"
              ) : data?.students.length ? (
                <ul className="space-y-0.5">
                  {data.students.map((s) => (
                    <li key={s.id} className="font-semibold">
                      {s.name} <span className="font-normal text-muted-foreground">{[s.className, s.section, s.schoolId, s.pen].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-rose-600">No student matched</span>
              )}
            </dd>
          </div>
          {diagnosis && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-muted-foreground">Why</dt>
              <dd className={diagnosis.match ? "text-emerald-600" : "text-amber-600"}>{describeDiagnosis(diagnosis)}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

/** C2: check what the scanner really sends for School ID and PEN before relying on cards. */
export function ScannerTestSection() {
  return (
    <FormSection title="Scanner test" icon={<ScanLine className="h-4 w-4" />}>
      <div className="grid gap-3 lg:grid-cols-2">
        <TestBox field="school_id" title="School ID" />
        <TestBox field="pen" title="PEN" />
      </div>
    </FormSection>
  );
}
