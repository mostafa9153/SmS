"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LIBRARY_ERRORS } from "@/lib/library/errors";
import { daysUntil, dueStatus } from "@/lib/library/my-books";
import type { OpenLoanView } from "@/lib/library/db-library";

const TONE = {
  overdue: "border-l-rose-500 bg-rose-500/5",
  soon: "border-l-amber-500 bg-amber-500/5",
  ok: "border-l-emerald-500 bg-emerald-500/5",
} as const;

function dueText(dueOn: string, today: string) {
  const d = daysUntil(dueOn, today);
  if (d < 0) return { text: `${-d} days overdue`, cls: "text-rose-600" };
  if (d === 0) return { text: "Due today", cls: "text-amber-600" };
  return { text: `Due in ${d} days (${dueOn})`, cls: d <= 2 ? "text-amber-600" : "text-muted-foreground" };
}

/** R9: Renew shows the new due date before you press it; when it is not allowed, it says why. */
function renewHint(loan: OpenLoanView, blocked: boolean): string | undefined {
  const q = loan.renew;
  if (q.ok) {
    if (blocked) return undefined;
    // R10: renewing while overdue records the fine accrued so far.
    return loan.accruing > 0 ? `Renewing adds a ₹${loan.accruing} fine` : undefined;
  }
  if (q.reason === "too_early") return `Renew opens on ${q.opensOn}`;
  return LIBRARY_ERRORS[q.reason][1];
}

export function MyBooksList({
  loans,
  today,
  busy,
  blockedReason,
  onRenew,
}: {
  loans: OpenLoanView[];
  today: string;
  busy: string | null;
  /** Renew is refused for every book (inactive, or unpaid fines over the limit). */
  blockedReason: string | null;
  onRenew: (loanId: string, title: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {loans.map((loan) => {
        const due = dueText(loan.dueOn, today);
        const hint = blockedReason ?? renewHint(loan, false);
        return (
          <li key={loan.loanId} className={cn("space-y-1.5 rounded-xl border border-l-4 px-3 py-2.5", TONE[dueStatus(loan.dueOn, today)])}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{loan.title}</p>
                <p className="text-xs text-muted-foreground">
                  {loan.author && <>{loan.author} · </>}
                  {loan.code} · <span className={due.cls}>{due.text}</span>
                  {loan.accruing > 0 && <span className="text-rose-600"> · fine ₹{loan.accruing}</span>}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!loan.renew.ok || blockedReason !== null || busy === loan.loanId}
                onClick={() => onRenew(loan.loanId, loan.title)}
              >
                <RefreshCw /> {loan.renew.ok ? `New due: ${loan.renew.newDue}` : "Renew"}
              </Button>
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </li>
        );
      })}
    </ul>
  );
}
