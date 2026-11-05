"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { getFeeCategoryForClass, getSavedFeeStructure } from "@/lib/utils/fee-config";
import { FEE_CONCESSIONS, feeCharge, type FeeCharge, type FeeConcession } from "@/lib/admission/fee-concession";

/** The class fee structure and the concession picked for one student. */
export function useFeeCharge(className: string) {
  const [concession, setConcession] = useState<FeeConcession>("full");
  // Percent off for the custom choice; kept while switching so it is not retyped
  const [customPercent, setCustomPercent] = useState(10);
  const structure = useMemo(() => getSavedFeeStructure(getFeeCategoryForClass(className)), [className]);
  const charge = useMemo(() => feeCharge(structure, concession, customPercent), [structure, concession, customPercent]);
  return { concession, setConcession, customPercent, setCustomPercent, structure, charge };
}

export type FeeChargeState = ReturnType<typeof useFeeCharge>;

/** What the admit APIs take: the items as charged, so the invoice keeps the concession. */
export const feeChargePayload = (charge: FeeCharge) => ({
  feeAmount: charge.total,
  feeItems: charge.items,
  feeConcession: charge.concession,
  feeConcessionPercent: charge.concession === "custom" ? charge.percent : undefined,
  feeGrossAmount: charge.gross,
});

/** Short label for the chip and badges: Half, Free, 25% off */
export const concessionChip = (charge: Pick<FeeCharge, "concession" | "percent">) =>
  charge.concession === "half" ? "Half" : charge.concession === "free" ? "Free" : `${charge.percent}% off`;

const CONCESSION_TONE: Record<FeeConcession, string> = {
  full: "text-muted-foreground",
  half: "text-amber-700 bg-amber-500/10 border-amber-500/30 dark:text-amber-300",
  custom: "text-sky-700 bg-sky-500/10 border-sky-500/30 dark:text-sky-300",
  free: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-300",
};

/**
 * Whole percent 1–99. The text is kept while typing (clearing the box or typing "2" on the way to
 * "25" must not snap to another value); only a valid number changes the fee.
 */
function PercentInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      max={99}
      step={1}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= 1 && n <= 99) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      className="h-7 w-16 text-right text-xs font-bold tabular-nums"
      aria-label="Percent off"
    />
  );
}

/** Collapsed invoice breakdown with the Full / Half / Free / % Off choice. */
export function FeeBreakdown({ fee }: { fee: FeeChargeState }) {
  const { structure, charge, setConcession, customPercent, setCustomPercent } = fee;
  const [open, setOpen] = useState(false);
  const reduced = charge.concession !== "full";

  return (
    <div className="rounded-lg border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-foreground"
      >
        <span className="flex items-center gap-2">
          Fee Breakdown
          {reduced && (
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", CONCESSION_TONE[charge.concession])}>
              {concessionChip(charge)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 tabular-nums">
          {reduced && <span className="text-muted-foreground line-through font-medium">₹{charge.gross}</span>}
          <span>₹{charge.total}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="border-t px-3 py-2.5 space-y-2.5 animate-in fade-in duration-150">
          <SegmentedControl
            value={charge.concession}
            onChange={setConcession}
            options={FEE_CONCESSIONS}
            size="sm"
            className="w-full [&>button]:flex-1"
          />
          {charge.concession === "custom" && (
            <label className="flex items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground">
              Percent off
              <span className="flex items-center gap-1.5">
                <PercentInput value={customPercent} onChange={setCustomPercent} />
                <span>%</span>
              </span>
            </label>
          )}
          <table className="w-full text-[11px]">
            <tbody>
              {structure.map((item, idx) => {
                const charged = charge.items[idx]?.amount ?? 0;
                return (
                  <tr key={item.id} className="border-b border-border/40 last:border-0">
                    <td className="py-1 pr-2 text-muted-foreground">{item.name}</td>
                    <td className="py-1 text-right tabular-nums">
                      {reduced && charged !== Number(item.amount) && (
                        <span className="mr-1.5 text-muted-foreground line-through">₹{Number(item.amount) || 0}</span>
                      )}
                      <span className="font-semibold">₹{charged}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td className="pt-1.5 font-bold">Total</td>
                <td className="pt-1.5 text-right font-bold tabular-nums text-primary">₹{charge.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
