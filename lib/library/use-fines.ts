"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toastWithUndo } from "@/lib/undo/client";
import { libraryToday } from "./dates";
import type { BorrowerLedger, DayReport, FineDebtor } from "./db-library-fines";
import { collectLines } from "./fine-report";
import type { BorrowerKey } from "./types";
import { libraryWrite, useRefreshLibrary } from "./use-catalog";

export type Ledger = BorrowerLedger & { canWaive: boolean };

export function useDebtors(q: string) {
  return useQuery<FineDebtor[]>({
    queryKey: ["library", "fines", "debtors", q],
    queryFn: () => apiFetch<FineDebtor[]>(`/api/library/fines?q=${encodeURIComponent(q)}`),
    placeholderData: (prev) => prev,
  });
}

export function useLedger(key: BorrowerKey | null) {
  return useQuery<Ledger>({
    queryKey: ["library", "fines", "ledger", key],
    queryFn: () => apiFetch<Ledger>(`/api/library/fines/borrowers/${encodeURIComponent(key!)}`),
    enabled: key !== null,
  });
}

export function useDayReport(day: string) {
  return useQuery<DayReport>({
    queryKey: ["library", "fines", "report", day],
    queryFn: () => apiFetch<DayReport>(`/api/library/fines/report?day=${day}`),
  });
}

export const COLLECT_ERRORS = { none: "No fine selected.", too_much: "Cannot pay more than due.", invalid: "Invalid amount." } as const;

/** State and handlers for the Fines page: pick a borrower, collect, waive, refund, void. */
export function useFines() {
  const refresh = useRefreshLibrary();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"due" | "day">("due");
  const [day, setDay] = useState(libraryToday());
  const params = useSearchParams();
  const fromUrl = params.get("borrower");
  const [selected, setSelected] = useState<BorrowerKey | null>(
    fromUrl && /^(student|staff):[0-9a-f-]{36}$/i.test(fromUrl) ? (fromUrl as BorrowerKey) : null,
  );
  const [picks, setPicks] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<number | null>(null);

  const debtors = useDebtors(q.trim());
  const ledger = useLedger(selected);
  const report = useDayReport(day);

  const select = (key: BorrowerKey | null) => {
    setSelected(key);
    setPicks({});
    setLastReceipt(null);
  };

  const togglePick = (fineId: string, outstanding: number) =>
    setPicks((p) => ({ ...p, [fineId]: p[fineId] === undefined ? String(outstanding) : undefined }));
  const setPickAmount = (fineId: string, value: string) => setPicks((p) => ({ ...p, [fineId]: value }));

  const outstandingFines = (ledger.data?.fines ?? []).filter((f) => f.outstanding > 0);
  const collect = collectLines(outstandingFines, picks);

  /** True when the write went through; forms close only then. */
  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  // A waiver or refund changes what is outstanding, so an old pick amount would be wrong.
  const unpick = (fineId: string) => setPicks((p) => ({ ...p, [fineId]: undefined }));

  const pay = () => {
    if (collect.error) {
      toast.error(COLLECT_ERRORS[collect.error]);
      return;
    }
    return run(async () => {
      const r = await libraryWrite<{ receiptNo: number; total: number }>("/api/library/fines", "POST", { action: "pay", lines: collect.lines });
      setPicks({});
      setLastReceipt(r.data.receiptNo);
      toastWithUndo(`Receipt #${r.data.receiptNo}: ₹${r.data.total} collected`, r.undoId, refresh);
    });
  };

  const waive = (fineId: string, mode: "full" | "half" | "custom", reason: string, custom?: number) =>
    run(async () => {
      const r = await libraryWrite<{ amount: number }>("/api/library/fines/waive", "POST", { fineId, mode, custom, reason });
      unpick(fineId);
      toastWithUndo(`₹${r.data.amount} waived`, r.undoId, refresh);
    });

  const refund = (fineId: string, amount: number, note: string) =>
    run(async () => {
      const r = await libraryWrite<{ receiptNo: number; amount: number }>("/api/library/fines", "POST", {
        action: "refund",
        fineId,
        amount,
        note: note.trim() || undefined,
      });
      unpick(fineId);
      setLastReceipt(r.data.receiptNo);
      toastWithUndo(`Refund receipt #${r.data.receiptNo}: ₹${r.data.amount}`, r.undoId, refresh);
    });

  /** R13: a receipt entered by mistake. Not undoable, so it is confirmed first. */
  const voidReceipt = async (receiptNo: number, reason: string) => {
    const ok = await confirm({ title: `Void receipt #${receiptNo}?`, confirmLabel: "Void", destructive: true });
    if (!ok) return false;
    return run(async () => {
      await libraryWrite("/api/library/fines", "POST", { action: "void", receiptNo, reason });
      toast.success(`Receipt #${receiptNo} voided`);
    });
  };

  return {
    q,
    setQ,
    tab,
    setTab,
    day,
    setDay,
    selected,
    select,
    debtors,
    ledger,
    report,
    picks,
    togglePick,
    setPickAmount,
    collect,
    hasPicks: Object.values(picks).some((v) => v !== undefined),
    busy,
    lastReceipt,
    pay,
    waive,
    refund,
    voidReceipt,
  };
}
