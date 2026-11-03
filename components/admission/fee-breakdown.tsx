"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { getFeeCategoryForClass, getSavedFeeStructure } from "@/lib/utils/fee-config";
import { FEE_CONCESSIONS, feeCharge, type FeeCharge, type FeeConcession } from "@/lib/admission/fee-concession";

/** The class fee structure and the concession picked for one student. */
export function useFeeCharge(className: string, initial: FeeConcession = "full") {
  const [concession, setConcession] = useState<FeeConcession>(initial);
  const structure = useMemo(() => getSavedFeeStructure(getFeeCategoryForClass(className)), [className]);
  const charge = useMemo(() => feeCharge(structure, concession), [structure, concession]);
  return { concession, setConcession, structure, charge };
}

/** What the admit APIs take: the items as charged, so the invoice keeps the concession. */
export const feeChargePayload = (charge: FeeCharge) => ({
  feeAmount: charge.total,
  feeItems: charge.items,
  feeConcession: charge.concession,
  feeGrossAmount: charge.gross,
});

const CONCESSION_TONE: Record<FeeConcession, string> = {
  full: "text-muted-foreground",
  half: "text-amber-700 bg-amber-500/10 border-amber-500/30 dark:text-amber-300",
  free: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-300",
};

/** Collapsed invoice breakdown with the Full / Half / Free choice. */
export function FeeBreakdown({
  structure,
  charge,
  onConcessionChange,
}: {
  structure: { id: string; name: string; amount: number }[];
  charge: FeeCharge;
  onConcessionChange: (c: FeeConcession) => void;
}) {
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
              {charge.concession === "half" ? "Half" : "Free"}
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
            onChange={onConcessionChange}
            options={FEE_CONCESSIONS}
            size="sm"
            className="w-full [&>button]:flex-1"
          />
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
