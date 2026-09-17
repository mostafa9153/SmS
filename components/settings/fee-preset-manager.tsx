"use client";

import React, { useState, useEffect } from "react";
import {
  type FeeItem,
  type FeeCategory,
  FEE_SECTIONS,
  getSavedFeeStructure,
  saveFeeStructure,
  resetFeeStructure,
  calculateFeeTotal,
  numberToWordsINR,
} from "@/lib/utils/fee-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast-banner";
import {
  Plus,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeePresetManagerProps {
  initialCategory?: FeeCategory;
  onApplyToInvoice?: (category: FeeCategory, items: FeeItem[]) => void;
  showApplyButton?: boolean;
  className?: string;
}

export function FeePresetManager({
  initialCategory = "V-VIII",
  onApplyToInvoice,
  showApplyButton = false,
  className,
}: FeePresetManagerProps) {
  const [activeCategory, setActiveCategory] = useState<FeeCategory>(initialCategory);
  const [feeItemsMap, setFeeItemsMap] = useState<Record<FeeCategory, FeeItem[]>>({
    "V-VIII": [],
    "IX-X": [],
    "XI-XII": [],
  });

  // Load all presets on mount and listen for external changes
  const loadAllPresets = () => {
    setFeeItemsMap({
      "V-VIII": getSavedFeeStructure("V-VIII"),
      "IX-X": getSavedFeeStructure("IX-X"),
      "XI-XII": getSavedFeeStructure("XI-XII"),
    });
  };

  useEffect(() => {
    loadAllPresets();
    const handleUpdated = () => loadAllPresets();
    window.addEventListener("sms_fee_structure_updated", handleUpdated);
    return () => window.removeEventListener("sms_fee_structure_updated", handleUpdated);
  }, []);

  useEffect(() => {
    if (initialCategory && initialCategory !== activeCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  const currentItems = feeItemsMap[activeCategory] || [];
  const currentSection = FEE_SECTIONS.find((s) => s.id === activeCategory) || FEE_SECTIONS[0];
  const grandTotal = calculateFeeTotal(currentItems);

  function handleNameChange(idx: number, newName: string) {
    const updated = [...currentItems];
    updated[idx] = { ...updated[idx], name: newName };
    setFeeItemsMap((prev) => ({ ...prev, [activeCategory]: updated }));
  }

  function handleAmountChange(idx: number, newAmount: number) {
    const updated = [...currentItems];
    updated[idx] = { ...updated[idx], amount: isNaN(newAmount) ? 0 : newAmount };
    setFeeItemsMap((prev) => ({ ...prev, [activeCategory]: updated }));
  }

  function handleAddItem() {
    const newItem: FeeItem = {
      id: `fee-${Date.now()}`,
      name: "New Fee Head",
      amount: 50,
    };
    const updated = [...currentItems, newItem];
    setFeeItemsMap((prev) => ({ ...prev, [activeCategory]: updated }));
  }

  function handleRemoveItem(idx: number) {
    const updated = currentItems.filter((_, i) => i !== idx);
    setFeeItemsMap((prev) => ({ ...prev, [activeCategory]: updated }));
  }

  function handleSaveCurrent() {
    saveFeeStructure(activeCategory, currentItems);
    showToast({
      type: "success",
      title: "Preset Saved",
      description: `Default fee breakdown for ${currentSection.label} updated successfully.`,
    });
    if (onApplyToInvoice) {
      onApplyToInvoice(activeCategory, currentItems);
    }
  }

  function handleResetCurrent() {
    const resetItems = resetFeeStructure(activeCategory);
    setFeeItemsMap((prev) => ({ ...prev, [activeCategory]: resetItems }));
    showToast({
      type: "info",
      title: "Defaults Restored",
      description: `Official standard fee structure restored for ${currentSection.label}.`,
    });
    if (onApplyToInvoice) {
      onApplyToInvoice(activeCategory, resetItems);
    }
  }

  function handleApply() {
    saveFeeStructure(activeCategory, currentItems);
    if (onApplyToInvoice) {
      onApplyToInvoice(activeCategory, currentItems);
      showToast({
        type: "success",
        title: "Applied to Active Invoice",
        description: `Loaded ${currentSection.shortLabel} preset (₹${grandTotal}).`,
      });
    }
  }

  return (
    <Card className={cn("border border-border/80 shadow-xs rounded-2xl overflow-hidden", className)}>
      <CardHeader className="p-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Receipt className="h-4 w-4 text-primary" />
              <span>Admission &amp; Annual Fee Structure Presets</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Configure 3 separate fee presets. Re-admissions will auto-fetch their exact class tier.
            </CardDescription>
          </div>

          {/* Section 1, 2, 3 Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {FEE_SECTIONS.map((sec) => {
              const total = calculateFeeTotal(feeItemsMap[sec.id] || []);
              return (
                <span
                  key={sec.id}
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold",
                    activeCategory === sec.id
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {sec.shortLabel}: ₹{total}
                </span>
              );
            })}
          </div>
        </div>

        {/* 3 Section Tabs / Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60 mt-3 text-xs">
          {FEE_SECTIONS.map((sec) => {
            const isSelected = activeCategory === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setActiveCategory(sec.id);
                  if (onApplyToInvoice) {
                    onApplyToInvoice(sec.id, feeItemsMap[sec.id] || getSavedFeeStructure(sec.id));
                  }
                }}
                className={cn(
                  "py-2 px-2.5 rounded-lg font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer",
                  isSelected
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      sec.id === "V-VIII"
                        ? "bg-emerald-500"
                        : sec.id === "IX-X"
                        ? "bg-blue-500"
                        : "bg-purple-500"
                    )}
                  />
                  <span className="truncate">{sec.shortLabel}</span>
                </div>
                <span className="text-[10px] font-normal opacity-80 font-mono">
                  Classes {sec.classRange}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Section Info Banner */}
        <div className="p-3 rounded-xl bg-muted/40 border flex items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{currentSection.label}</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {currentSection.badge}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {currentSection.description}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="h-7 text-xs font-semibold gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>Add Fee Head</span>
          </Button>
        </div>

        {/* Fee Items List */}
        <div className="divide-y max-h-72 overflow-y-auto pr-1 border rounded-xl bg-background">
          {currentItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No fee heads configured for this section. Click &ldquo;Add Fee Head&rdquo; or restore defaults.
            </div>
          ) : (
            currentItems.map((item, idx) => (
              <div key={item.id || idx} className="p-2.5 flex items-center gap-2 hover:bg-muted/20 transition-colors">
                <span className="text-[10px] font-mono text-muted-foreground w-5 text-center font-bold">
                  {idx + 1}.
                </span>
                <Input
                  value={item.name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  placeholder="Fee Head Description (e.g. Science Laboratory Fund)"
                  className="text-xs h-8 flex-1 font-medium bg-background"
                />
                <div className="flex items-center gap-1 w-28">
                  <span className="text-xs text-muted-foreground font-semibold">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={item.amount}
                    onChange={(e) => handleAmountChange(idx, parseFloat(e.target.value))}
                    className="text-xs font-mono font-bold h-8 text-right bg-background"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  title="Remove fee head"
                  className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Grand Total & Words */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground uppercase tracking-wider">
              {currentSection.shortLabel} Total Preset:
            </span>
            <span className="text-base font-mono text-primary font-black">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium italic">
            {numberToWordsINR(grandTotal)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetCurrent}
            className="h-8 text-xs font-semibold gap-1.5 text-muted-foreground cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restore Standard Defaults</span>
          </Button>

          <div className="flex items-center gap-2">
            {showApplyButton && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApply}
                className="h-8 text-xs font-bold gap-1.5 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Apply to Invoice</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleSaveCurrent}
              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Preset ({currentSection.shortLabel})</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
