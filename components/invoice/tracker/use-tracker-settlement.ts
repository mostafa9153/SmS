"use client";

import { apiFetch } from "@/lib/api/client";
import { useMemo, useCallback } from "react";
import { showToast } from "@/components/ui/toast-banner";
import { toastWithUndo } from "@/lib/undo/client";
import { DBInvoiceRow } from "@/lib/supabase/db-invoices";
import { getLocalCachedInvoices } from "@/lib/utils/invoice-registry";
import type { TrackerCoreState } from "./use-tracker-core";

export function useTrackerSettlement(ctx: TrackerCoreState) {
  const { admissionCategoryFilter, classFilter, currentSession, dateFilterPreset, endDate, invoicesList, loadRegistryData, modeFilter, selectedSettlementTeacher, sessionFilter, setInvoicesList, setIsLoadingTeacher, setIsSubmittingSettlement, setSettlementDecisions, setTeacherInvoices, settlementDecisions, startDate, statusFilter, tableSearch, typeFilter } = ctx;
  // Load teacher's invoices when selection changes
  const loadTeacherInvoices = useCallback(
    async (teacher: string) => {
      if (!teacher) {
        setTeacherInvoices([]);
        setSettlementDecisions({});
        return;
      }
      setIsLoadingTeacher(true);
      try {
        let invs: DBInvoiceRow[] = [];
        try {
          const data = await apiFetch<DBInvoiceRow[]>(`/api/invoices/teacher-assignments?teacher=${encodeURIComponent(teacher)}`);
          if (Array.isArray(data) && data.length > 0) {
            invs = data;
          }
        } catch (err) {
          console.warn("Error loading teacher invoices from API:", err);
        }

        if (invs.length === 0) {
          const source = invoicesList.length > 0 ? invoicesList : getLocalCachedInvoices();
          if (teacher === "Unassigned Blank Slips") {
            invs = source.filter((i) => i.is_blank && !i.assigned_to);
          } else {
            invs = source.filter((i) => i.assigned_to?.trim().toLowerCase() === teacher.trim().toLowerCase());
          }
        }

        setTeacherInvoices(invs);

        const decisions: Record<string, { status: "active" | "cancelled" | "pending"; amount: number }> = {};
        invs.forEach((inv) => {
          const st = (inv as any).invoice_status as string;
          decisions[inv.invoice_number] = {
            status: st === "active" ? "active" : st === "cancelled" ? "cancelled" : "pending",
            amount: Number(inv.total_amount) || 0,
          };
        });
        setSettlementDecisions(decisions);
      } catch (err) {
        console.warn("Error loading teacher invoices:", err);
      } finally {
        setIsLoadingTeacher(false);
      }
    },
    [invoicesList]
  );

  const settlementSummary = useMemo(() => {
    const used = Object.values(settlementDecisions).filter((d) => d.status === "active");
    const cancelled = Object.values(settlementDecisions).filter((d) => d.status === "cancelled");
    const pending = Object.values(settlementDecisions).filter((d) => d.status === "pending");
    const netAmount = used.reduce((sum, d) => sum + d.amount, 0);
    return {
      usedCount: used.length,
      cancelledCount: cancelled.length,
      pendingCount: pending.length,
      netAmount,
    };
  }, [settlementDecisions]);

  async function handleSubmitSettlement() {
    const pending = Object.values(settlementDecisions).some((d) => d.status === "pending");
    if (pending) {
      showToast({
        type: "error",
        title: "Unsettled Invoices",
        description: "Please mark all invoices as Used or Cancelled before submitting.",
      });
      return;
    }

    const updates = Object.entries(settlementDecisions).map(([invoiceNumber, dec]) => ({
      invoice_number: invoiceNumber,
      status: dec.status as "active" | "cancelled",
      amount: dec.status === "active" ? dec.amount : 0,
    }));

    if (updates.length === 0) {
      showToast({ type: "info", title: "Nothing to settle", description: "No changes to submit." });
      return;
    }

    setIsSubmittingSettlement(true);
    try {
      const localInvs = getLocalCachedInvoices();
      const updateMap = new Map(updates.map((u) => [u.invoice_number.toUpperCase(), u]));

      const updatedLocal = localInvs.map((inv) => {
        const upd = updateMap.get(inv.invoice_number.toUpperCase());
        if (upd) {
          return {
            ...inv,
            invoice_status: upd.status,
            total_amount: upd.status === "active" ? (upd.amount ?? inv.total_amount) : 0,
            payment_status: upd.status === "cancelled" ? "Cancelled" : "Paid",
            updated_at: new Date().toISOString(),
          };
        }
        return inv;
      });
      localStorage.setItem("sms_cached_invoices_registry_v1", JSON.stringify(updatedLocal));

      setInvoicesList((prev) =>
        prev.map((inv) => {
          const upd = updateMap.get(inv.invoice_number.toUpperCase());
          if (upd) {
            return {
              ...inv,
              invoice_status: upd.status,
              total_amount: upd.status === "active" ? (upd.amount ?? inv.total_amount) : 0,
              payment_status: upd.status === "cancelled" ? "Cancelled" : "Paid",
              updated_at: new Date().toISOString(),
            };
          }
          return inv;
        })
      );

      let apiSynced = false;
      let settleUndoId: string | null = null;
      try {
        const data = await apiFetch<{ undoId?: string | null }>("/api/invoices/settle", { method: "POST", json: { updates } });
        apiSynced = true;
        settleUndoId = data.undoId ?? null;
      } catch (err) {
        console.warn("Could not sync settlement to backend, saved to local ledger:", err);
      }

      if (apiSynced && settleUndoId) {
        toastWithUndo(`${updates.length} invoices settled and synced to database.`, settleUndoId, () => {
          void loadRegistryData();
          void loadTeacherInvoices(selectedSettlementTeacher);
        });
      } else {
        showToast({
          type: "success",
          title: "Settlement Completed!",
          description: apiSynced
            ? `${updates.length} invoices settled and synced to database.`
            : `${updates.length} invoices settled in local registry.`,
        });
      }

      await loadRegistryData();
      await loadTeacherInvoices(selectedSettlementTeacher);
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Settlement Error",
        description: err?.message || "Failed to submit settlement",
      });
    } finally {
      setIsSubmittingSettlement(false);
    }
  }

  // Filter count active check
  const isFiltered =
    Boolean(tableSearch.trim()) ||
    sessionFilter !== currentSession ||
    typeFilter !== "ALL" ||
    modeFilter !== "ALL" ||
    classFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    admissionCategoryFilter !== "ALL" ||
    dateFilterPreset !== "ALL" ||
    Boolean(startDate) ||
    Boolean(endDate);

  return {
    handleSubmitSettlement,
    isFiltered,
    loadTeacherInvoices,
    settlementSummary,
  };
}