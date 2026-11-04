import type { FeeItem } from "@/lib/utils/fee-config";

/**
 * How much of the class fee structure a student pays: all of it, half, nothing (poor students),
 * or a custom percentage off.
 */
export type FeeConcession = "full" | "half" | "free" | "custom";

export const FEE_CONCESSIONS: Array<{ value: FeeConcession; label: string }> = [
  { value: "full", label: "Full" },
  { value: "half", label: "Half" },
  { value: "free", label: "Free" },
  { value: "custom", label: "% Off" },
];

export const isFeeConcession = (v: unknown): v is FeeConcession =>
  v === "full" || v === "half" || v === "free" || v === "custom";

/** Percent off the fee structure. Custom is 1-99; 0 and 100 are Full and Free. */
export function concessionPercent(concession: FeeConcession, custom?: number | null): number {
  if (concession === "half") return 50;
  if (concession === "free") return 100;
  if (concession === "custom") return Math.min(99, Math.max(1, Math.round(Number(custom) || 0)));
  return 0;
}

const amountOf = (item: FeeItem) => Math.max(0, Math.round(Number(item.amount) || 0));

/** What a fee structure costs after `percentOff`, in whole rupees */
export const chargedTotal = (gross: number, percentOff: number) => Math.round((gross * (100 - percentOff)) / 100);

/**
 * The items a student is charged, in whole rupees, adding up to chargedTotal(gross) so the invoice
 * total, the printed slip and every report agree. Each item is floored and the rupees left over go
 * one at a time to the items with the largest fractions (larger items first on a tie): every item
 * stays within one rupee of its exact share and never above its own amount.
 */
export function applyConcession(items: FeeItem[], percentOff: number): FeeItem[] {
  if (percentOff <= 0) return items.map((i) => ({ ...i, amount: amountOf(i) }));
  if (percentOff >= 100) return items.map((i) => ({ ...i, amount: 0 }));
  const exact = items.map((i) => (amountOf(i) * (100 - percentOff)) / 100);
  const charged = items.map((i, idx) => ({ ...i, amount: Math.floor(exact[idx]) }));
  const gross = items.reduce((s, i) => s + amountOf(i), 0);
  let remainder = chargedTotal(gross, percentOff) - charged.reduce((s, i) => s + i.amount, 0);
  const order = items
    .map((i, idx) => ({ idx, frac: exact[idx] - Math.floor(exact[idx]), amount: amountOf(i) }))
    .sort((a, b) => b.frac - a.frac || b.amount - a.amount);
  for (const { idx, amount } of order) {
    if (remainder <= 0) break;
    if (charged[idx].amount >= amount) continue;
    charged[idx] = { ...charged[idx], amount: charged[idx].amount + 1 };
    remainder--;
  }
  return charged;
}

export interface FeeCharge {
  concession: FeeConcession;
  /** Percent off the fee structure (0 Full, 50 Half, 100 Free, 1-99 custom) */
  percent: number;
  /** Items as charged (already reduced) */
  items: FeeItem[];
  /** Fee structure total before the concession */
  gross: number;
  /** Amount charged: always the sum of `items` */
  total: number;
}

export function feeCharge(structure: FeeItem[], concession: FeeConcession, customPercent?: number | null): FeeCharge {
  const percent = concessionPercent(concession, customPercent);
  const items = applyConcession(structure, percent);
  return {
    concession,
    percent,
    items,
    gross: structure.reduce((s, i) => s + amountOf(i), 0),
    total: items.reduce((s, i) => s + i.amount, 0),
  };
}

/**
 * Reads the fee an admit request sends: `feeItems` (as charged), `feeConcession`,
 * `feeConcessionPercent` (custom only) and `feeGrossAmount`. Returns null for an older client that
 * sends only `feeAmount`, or the reason the fee is invalid. Presets live in the browser, so the
 * server checks the numbers agree with each other.
 */
export function readFeeCharge(body: Record<string, unknown>): FeeCharge | { error: string } | null {
  if (!Array.isArray(body.feeItems)) return null;
  const concession = body.feeConcession ?? "full";
  if (!isFeeConcession(concession)) return { error: "Unknown fee concession" };
  const requested = Number(body.feeConcessionPercent);
  if (concession === "custom" && !(Number.isInteger(requested) && requested >= 1 && requested <= 99)) {
    return { error: "Concession percent must be a whole number from 1 to 99" };
  }
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
  const percent = concessionPercent(concession, requested);
  if (total !== chargedTotal(gross, percent)) {
    return { error: `Fee must be ${100 - percent}% of the fee structure (Rs ${chargedTotal(gross, percent)})` };
  }
  return { concession, percent, items, gross, total };
}

/** "Full fee", "Half fee", "Free", "25% off" */
export function concessionLabel(c: FeeConcession | null | undefined, percent?: number | null): string {
  if (c === "half") return "Half fee";
  if (c === "free") return "Free";
  if (c === "custom" && percent) return `${percent}% off`;
  return "Full fee";
}

const CONCESSION_COLUMNS = [
  "concession_type",
  "concession_percent",
  "gross_amount",
  "fee_concession",
  "fee_concession_percent",
  "fee_gross_amount",
];

/**
 * Runs a write with the concession columns, and once more without them when the database has not
 * had the 20261103_admission_fee_concession migration yet: the fee itself must still be saved.
 */
export async function writeWithConcession<R extends Record<string, unknown>, T extends { error: { message: string } | null }>(
  rows: R | R[],
  run: (rows: R | R[]) => PromiseLike<T>
): Promise<T> {
  let current = rows;
  let result = await run(current);
  // A missing column, or the old check constraint rejecting "custom", names the column: drop only
  // the columns named, so a database that has the older concession columns still gets them
  for (let attempt = 0; attempt < CONCESSION_COLUMNS.length && result.error; attempt++) {
    const message = result.error.message;
    // Longest names first: "fee_concession_percent" also contains "fee_concession"
    const named = [...CONCESSION_COLUMNS].sort((a, b) => b.length - a.length).filter((c) => message.includes(c));
    const drop = named.filter((c, i) => !named.slice(0, i).some((longer) => longer.includes(c)));
    if (!drop.length) break;
    const strip = (r: R) => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k))) as R;
    current = Array.isArray(current) ? current.map(strip) : strip(current);
    result = await run(current);
  }
  return result;
}
