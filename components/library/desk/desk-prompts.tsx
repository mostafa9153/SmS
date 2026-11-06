"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DeskChoice, DeskNotice, DeskPrompt } from "@/lib/library/use-desk";

/** Inline questions and notices. Never a modal: a scanner's Enter must not be able to confirm one (W4). */
export function DeskNoticeBar({
  notice,
  onPassOn,
  onRestore,
  onDismiss,
}: {
  notice: DeskNotice;
  onPassOn: (n: Extract<DeskNotice, { kind: "pass_on" }>) => void;
  onRestore: (copyId: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <span className="flex-1 font-medium">{notice.text}</span>
      {notice.kind === "pass_on" && notice.toName && (
        <Button size="sm" onClick={() => onPassOn(notice)}>
          Issue to {notice.toName}
        </Button>
      )}
      {notice.kind === "withdrawn" && (
        <Button size="sm" variant="outline" onClick={() => onRestore(notice.copyId)}>
          Back to shelf
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onDismiss}>
        ✕
      </Button>
    </div>
  );
}

export function DeskChoices({ choices, onPick }: { choices: DeskChoice[]; onPick: (c: DeskChoice) => void }) {
  return (
    <div className="space-y-1.5 rounded-xl border bg-card p-3">
      <p className="text-sm font-semibold">Multiple matches, pick one</p>
      {choices.map((c) => (
        <Button key={c.key} variant="outline" className="w-full justify-between" onClick={() => onPick(c)}>
          <span>{c.name}</span>
          <span className="text-xs text-muted-foreground">{c.detail}</span>
        </Button>
      ))}
    </div>
  );
}

export function DeskPromptBar({
  prompt,
  onFound,
  onDamaged,
  onCancel,
}: {
  prompt: DeskPrompt;
  onFound: (source: "borrower" | "library") => void;
  onDamaged: (amount: number, withdraw: boolean) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [withdraw, setWithdraw] = useState(false);
  const value = Number(amount);

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
      {prompt.kind === "found" ? (
        <>
          <p className="text-sm font-semibold">{prompt.title} was lost. Where was it found?</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onFound("borrower")}>
              Returned by borrower
            </Button>
            <Button size="sm" variant="outline" onClick={() => onFound("library")}>
              Was in the library
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">{prompt.title} damaged</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="₹ amount"
              className="h-9 w-32"
            />
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={withdraw} onChange={(e) => setWithdraw(e.target.checked)} />
              Withdraw
            </label>
            <Button size="sm" disabled={!Number.isFinite(value) || value <= 0} onClick={() => onDamaged(value, withdraw)}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
