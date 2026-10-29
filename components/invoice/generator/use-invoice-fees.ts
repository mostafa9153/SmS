"use client";

import { type FeeItem, type FeeCategory, getSavedFeeStructure, saveFeeStructure, resetFeeStructure, calculateFeeTotal, FEE_SECTIONS } from "@/lib/utils/fee-config";
import { showToast } from "@/components/ui/toast-banner";
import type { InvoiceCore } from "./use-invoice-core";

export function useInvoiceFees(ctx: InvoiceCore) {
  const { activeFeeCategory, invoice, setActiveFeeCategory, setInvoice } = ctx;
  function handleFeeNameChange(idx: number, newName: string) {
    setInvoice((prev) => {
      const nextItems = [...prev.feeItems];
      nextItems[idx] = { ...nextItems[idx], name: newName };
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleFeeAmountChange(idx: number, newAmount: number) {
    setInvoice((prev) => {
      const nextItems = [...prev.feeItems];
      nextItems[idx] = { ...nextItems[idx], amount: isNaN(newAmount) ? 0 : newAmount };
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleAddFeeItem() {
    const newItem: FeeItem = {
      id: `fee-${Date.now()}`,
      name: "New Fee Head",
      amount: 50,
    };
    setInvoice((prev) => ({
      ...prev,
      feeItems: [...prev.feeItems, newItem],
    }));
  }

  function handleRemoveFeeItem(idx: number) {
    setInvoice((prev) => {
      const nextItems = prev.feeItems.filter((_, i) => i !== idx);
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleCategoryTabChange(category: FeeCategory) {
    setActiveFeeCategory(category);
    const items = getSavedFeeStructure(category);
    setInvoice((prev) => ({
      ...prev,
      feeItems: items,
    }));
    const sec = FEE_SECTIONS.find((s) => s.id === category);
    showToast({
      type: "info",
      title: "Fee Preset Switched",
      description: `Loaded ${sec?.label || category} preset breakdown.`,
    });
  }

  function handleSaveAsDefaultFeeStructure() {
    saveFeeStructure(activeFeeCategory, invoice.feeItems);
    const sec = FEE_SECTIONS.find((s) => s.id === activeFeeCategory);
    showToast({
      type: "success",
      title: "Saved as School Default",
      description: `Default fee breakdown for ${sec?.label || activeFeeCategory} updated successfully.`,
    });
  }

  function handleResetDefaultFees() {
    const resetItems = resetFeeStructure(activeFeeCategory);
    setInvoice((prev) => ({
      ...prev,
      feeItems: resetItems,
    }));
    const sec = FEE_SECTIONS.find((s) => s.id === activeFeeCategory);
    showToast({
      type: "info",
      title: "Defaults Restored",
      description: `Fee structure reset to official standard for ${sec?.label || activeFeeCategory}.`,
    });
  }

  const grandTotal = calculateFeeTotal(invoice.feeItems);

  return {
    grandTotal,
    handleAddFeeItem,
    handleCategoryTabChange,
    handleFeeAmountChange,
    handleFeeNameChange,
    handleRemoveFeeItem,
    handleResetDefaultFees,
    handleSaveAsDefaultFeeStructure,
  };
}

export type InvoiceFees = ReturnType<typeof useInvoiceFees>;
