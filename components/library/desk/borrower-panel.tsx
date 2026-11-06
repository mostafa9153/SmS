"use client";

import { RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LIBRARY_ERRORS } from "@/lib/library/errors";
import { libraryToday } from "@/lib/library/dates";
import { PANEL_WARN_MS } from "@/lib/library/use-panel-timer";
import type { BorrowerSummary, OpenLoanView } from "@/lib/library/db-library";
import type { DeskChip } from "@/lib/library/use-desk";

const DAY_MS = 86_400_000;

/** Green: fine, amber: due within 2 days, red: overdue. */
function loanTone(dueOn: string, today: string) {
  const days = Math.round((Date.parse(dueOn) - Date.parse(today)) / DAY_MS);
  if (days < 0) return { cls: "border-l-rose-500 bg-rose-500/5", text: `${-days} দিন overdue`, textCls: "text-rose-600" };
  if (days <= 2) return { cls: "border-l-amber-500 bg-amber-500/5", text: days === 0 ? "আজ due" : `${days} দিনে due`, textCls: "text-amber-600" };
  return { cls: "border-l-emerald-500 bg-emerald-500/5", text: `due ${dueOn}`, textCls: "text-muted-foreground" };
}

function LoanRow({
  loan,
  active,
  today,
  onSelect,
  onRenew,
}: {
  loan: OpenLoanView;
  active: boolean;
  today: string;
  onSelect: () => void;
  onRenew: () => void;
}) {
  const tone = loanTone(loan.dueOn, today);
  const quote = loan.renew;
  return (
    <div
      onClick={onSelect}
      className={cn("flex cursor-pointer items-center gap-3 rounded-lg border border-l-4 px-3 py-2", tone.cls, active && "ring-2 ring-primary")}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{loan.title}</p>
        <p className="text-xs text-muted-foreground">
          {loan.code} · <span className={tone.textCls}>{tone.text}</span>
          {loan.accruing > 0 && <span className="text-rose-600"> · fine ₹{loan.accruing}</span>}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={!quote.ok}
        title={quote.ok ? "Alt+R" : LIBRARY_ERRORS[quote.reason][1]}
        onClick={(e) => {
          e.stopPropagation();
          onRenew();
        }}
      >
        <RefreshCw /> {quote.ok ? `Renew → ${quote.newDue}` : "Renew"}
      </Button>
    </div>
  );
}

export function BorrowerPanel({
  summary,
  openedBy,
  chip,
  selected,
  leftMs,
  idleMs,
  onSelect,
  onRenew,
  onIssueChip,
  onClose,
}: {
  summary: BorrowerSummary;
  openedBy: "card" | "return";
  chip: DeskChip | null;
  selected: number;
  leftMs: number;
  idleMs: number;
  onSelect: (i: number) => void;
  onRenew: (loan: OpenLoanView) => void;
  onIssueChip: () => void;
  onClose: () => void;
}) {
  const { profile, openLoans, issue, balance, maxBooks } = summary;
  const today = libraryToday();
  const canIssue = openedBy === "card" && issue.ok;
  const info =
    profile.type === "student"
      ? [profile.className, profile.section, profile.roll && `Roll ${profile.roll}`, profile.schoolId]
      : [profile.designation, profile.uniqueId];

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-4">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- stored photo, shown large so the holder can be recognised
            <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <User className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">{info.filter(Boolean).join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">আর {Math.max(0, maxBooks - openLoans.length)}টা নিতে পারবে</span>
            <span className={cn("rounded-full px-2.5 py-0.5 font-medium", balance.total > 0 ? "bg-rose-500/10 text-rose-600" : "bg-muted")}>
              বাকি ₹{balance.total}
            </span>
            {!profile.active && <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 font-medium text-rose-600">Inactive</span>}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Esc
        </Button>
      </div>

      {!issue.ok && openedBy === "card" && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
          {issue.reasons.map((r) => LIBRARY_ERRORS[r][1]).join(" ")}
        </div>
      )}

      {chip && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{chip.title}</p>
            <p className="text-xs text-muted-foreground">{chip.code}</p>
          </div>
          <Button size="sm" onClick={onIssueChip} disabled={!canIssue} title="Alt+I">
            দিন
          </Button>
        </div>
      )}

      {openLoans.length ? (
        <div className="space-y-1.5">
          {openLoans.map((loan, i) => (
            <LoanRow key={loan.loanId} loan={loan} today={today} active={i === selected} onSelect={() => onSelect(i)} onRenew={() => onRenew(loan)} />
          ))}
        </div>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">হাতে কোনো বই নেই</p>
      )}

      {leftMs <= PANEL_WARN_MS && (
        <div className="h-1 overflow-hidden rounded bg-muted">
          <div className="h-full bg-amber-500 transition-[width] duration-200" style={{ width: `${(leftMs / Math.min(idleMs, PANEL_WARN_MS)) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
