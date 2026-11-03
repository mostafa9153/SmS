import type { FeeItem } from "@/lib/utils/fee-config";

/** How much of the class fee structure a student pays: all of it, half, or nothing (poor students). */
export type FeeConcession = "full" | "half" | "free";

export const FEE_CONCESSIONS: Array<{ value: FeeConcession; label: string }> = [
  { value: "full", label: "Full" },
  { value: "half", label: "Half" },
  { value: "free", label: "Free" },
];

export const isFeeConcession = (v: unknown): v is FeeConcession => v === "full" || v === "half" || v === "free";

const amountOf = (item: FeeItem) => Math.max(0, Math.round(Number(item.amount) || 0));

/**
 * The items a student is charged. Half halves each item in whole rupees and puts the rounding
 * remainder on the largest item, so the items always add up to round(gross / 2): the invoice
 * total, the printed slip and every report then agree.
 */
export function applyConcession(items: FeeItem[], concession: FeeConcession): FeeItem[] {
  if (concession === "full") return items.map((i) => ({ ...i, amount: amountOf(i) }));
  if (concession === "free") return items.map((i) => ({ ...i, amount: 0 }));
  const gross = items.reduce((s, i) => s + amountOf(i), 0);
  const charged = items.map((i) => ({ ...i, amount: Math.floor(amountOf(i) / 2) }));
  const remainder = Math.round(gross / 2) - charged.reduce((s, i) => s + i.amount, 0);
  if (remainder > 0 && charged.length) {
    const largest = items.reduce((best, i, idx) => (amountOf(i) > amountOf(items[best]) ? idx : best), 0);
    charged[largest] = { ...charged[largest], amount: charged[largest].amount + remainder };
  }
  return charged;
}

export interface FeeCharge {
  concession: FeeConcession;
  /** Items as charged (already reduced) */
  items: FeeItem[];
  /** Fee structure total before the concession */
  gross: number;
  /** Amount charged: always the sum of `items` */
  total: number;
}

export function feeCharge(structure: FeeItem[], concession: FeeConcession): FeeCharge {
  const items = applyConcession(structure, concession);
  return {
    concession,
    items,
    gross: structure.reduce((s, i) => s + amountOf(i), 0),
    total: items.reduce((s, i) => s + i.amount, 0),
  };
}

/**
 * Reads the fee an admit request sends: `feeItems` (as charged), `feeConcession`, `feeGrossAmount`.
 * Returns null for an older client that sends only `feeAmount`, or the reason the fee is invalid.
 * Presets live in the browser, so the server checks the numbers agree with each other.
 */
export function readFeeCharge(body: Record<string, unknown>): FeeCharge | { error: string } | null {
  if (!Array.isArray(body.feeItems)) return null;
  const concession = body.feeConcession ?? "full";
  if (!isFeeConcession(concession)) return { error: "Unknown fee concession" };
  const items: FeeItem[] = [];
  for (const raw of body.feeItems as unknown[]) {
    const r = raw as Partial<FeeItem> | null;
    const amount = Number(r?.amount);
    if (!r || typeof r.name !== "string" || !Number.isFinite(amount) || amount < 0) return { error: "Invalid fee item" };
    items.push({ id: String(r.id ?? r.name), name: r.name.slice(0, 120), amount: Math.round(amount) });
  }
  if (items.length > 50) return { error: "Too many fee items" };
  const total = items.reduce((s, i) => s + i.amount, 0);
  const gross = Math.round(Number(body.feeGrossAmount ?? total));
  if (!Number.isFinite(gross) || gross < total) return { error: "Fee total is above the fee structure" };
  if (body.feeAmount !== undefined && Math.round(Number(body.feeAmount)) !== total) {
    return { error: "Fee amount does not match the fee items" };
  }
  if (concession === "full" && total !== gross) return { error: "Full fee must equal the fee structure" };
  if (concession === "half" && total !== Math.round(gross / 2)) return { error: "Half fee must be half the fee structure" };
  if (concession === "free" && total !== 0) return { error: "A free admission has no fee" };
  return { concession, items, gross, total };
}

export const concessionLabel = (c: FeeConcession | null | undefined) =>
  c === "half" ? "Half fee" : c === "free" ? "Free" : "Full fee";

const CONCESSION_COLUMNS = ["concession_type", "gross_amount", "fee_concession", "fee_gross_amount"];

/**
 * Runs a write with the concession columns, and once more without them when the database has not
 * had the 20261103_admission_fee_concession migration yet: the fee itself must still be saved.
 */
export async function writeWithConcession<R extends Record<string, unknown>, T extends { error: { message: string } | null }>(
  rows: R | R[],
  run: (rows: R | R[]) => PromiseLike<T>
): Promise<T> {
  const first = await run(rows);
  if (!first.error || !CONCESSION_COLUMNS.some((c) => first.error!.message.includes(c))) return first;
  const strip = (r: R) => Object.fromEntries(Object.entries(r).filter(([k]) => !CONCESSION_COLUMNS.includes(k))) as R;
  return run(Array.isArray(rows) ? rows.map(strip) : strip(rows));
}
