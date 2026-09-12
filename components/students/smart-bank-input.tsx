"use client";

import React, { useState, useEffect, useMemo, useId } from "react";
import {
  getSavedBankPresets,
  fetchBankPresetsFromDb,
  BankPresetItem,
  DEFAULT_BANK_PRESETS,
} from "@/lib/utils/bank-presets";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { Landmark, Settings, CheckCircle2 } from "lucide-react";

interface SmartBankInputProps {
  accountNumberValue: string;
  onAccountNumberChange: (val: string) => void;
  ifscValue: string;
  onIfscChange: (val: string) => void;
  accountNumberError?: string;
  ifscError?: string;
}

export function SmartBankInput({
  accountNumberValue,
  onAccountNumberChange,
  ifscValue,
  onIfscChange,
  accountNumberError,
  ifscError,
}: SmartBankInputProps) {
  const uid = useId();
  const [bankPresets, setBankPresets] = useState<BankPresetItem[]>(DEFAULT_BANK_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [customBankName, setCustomBankName] = useState("");

  // Load presets & listen to reactive updates
  useEffect(() => {
    setBankPresets(getSavedBankPresets());
    fetchBankPresetsFromDb().then((data) => {
      setBankPresets(data);
    });

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setBankPresets(e.detail);
      }
    };

    window.addEventListener("sms_bank_presets_updated", handleUpdate);
    return () => {
      window.removeEventListener("sms_bank_presets_updated", handleUpdate);
    };
  }, []);

  // Match existing IFSC to a preset on mount or ifsc change
  useEffect(() => {
    if (ifscValue) {
      const match = bankPresets.find(
        (b) => b.ifsc.trim().toUpperCase() === ifscValue.trim().toUpperCase()
      );
      if (match) {
        setSelectedPresetId(match.id);
        setIsCustomBank(false);
      } else if (!selectedPresetId) {
        setIsCustomBank(true);
      }
    }
  }, [ifscValue, bankPresets]);

  // Dropdown options
  const dropdownOptions = useMemo(() => {
    const list = bankPresets.map((b) => ({
      label: `${b.bankName} - ${b.branchName} (${b.ifsc})`,
      value: b.id,
    }));
    list.push({ label: "✏️ Other (Custom Bank / Branch...)", value: "__other__" });
    return list;
  }, [bankPresets]);

  const handleDropdownChange = (val: string) => {
    if (val === "__other__") {
      setIsCustomBank(true);
      setSelectedPresetId("__other__");
    } else {
      setIsCustomBank(false);
      setSelectedPresetId(val);
      const chosen = bankPresets.find((b) => b.id === val);
      if (chosen) {
        onIfscChange(chosen.ifsc);
      }
    }
  };

  return (
    <div className="sm:col-span-2 md:col-span-3 space-y-3 rounded-2xl border border-border/80 bg-card/60 p-3.5 sm:p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-foreground">Bank & Account Details</span>
        </div>

        <a
          href="/settings?tab=presets"
          target="_blank"
          rel="noopener noreferrer"
          title="Configure Bank Presets in Settings"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Grid: Bank Selector, IFSC, Account Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
        {/* 1. Bank & Branch Dropdown */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-muted-foreground">
            Select Bank & Branch
          </Label>
          <CustomSelect
            value={isCustomBank ? "__other__" : selectedPresetId}
            onChange={handleDropdownChange}
            options={dropdownOptions}
            placeholder="-- Select Local Bank Branch --"
            searchable={dropdownOptions.length > 5}
            triggerClassName="h-9 py-1 text-xs rounded-xl"
          />
          {isCustomBank && (
            <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <Input
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                placeholder="Bank name & branch (optional)"
                className="text-xs h-8 rounded-lg bg-background border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20"
              />
            </div>
          )}
        </div>

        {/* 2. IFSC Code */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`ifsc-${uid}`} className="text-[11px] font-semibold text-muted-foreground">
              Bank IFSC Code
            </Label>
            {ifscValue && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                <CheckCircle2 className="h-3 w-3" /> Auto-filled
              </span>
            )}
          </div>
          <Input
            id={`ifsc-${uid}`}
            value={ifscValue}
            onChange={(e) => onIfscChange(e.target.value.toUpperCase())}
            maxLength={11}
            placeholder="e.g. SBIN0001234"
            className="text-xs h-9 rounded-xl bg-background border-border/80 font-mono tracking-wider font-semibold uppercase"
          />
          {ifscError && <p className="text-xs text-destructive font-medium">{ifscError}</p>}
        </div>

        {/* 3. Account Number */}
        <div className="space-y-1.5">
          <Label htmlFor={`ac-${uid}`} className="text-[11px] font-semibold text-muted-foreground">
            Bank Account Number
          </Label>
          <Input
            id={`ac-${uid}`}
            value={accountNumberValue}
            onChange={(e) => onAccountNumberChange(e.target.value)}
            placeholder="Enter Bank Account Number"
            className="text-xs h-9 rounded-xl bg-background border-border/80 font-mono font-medium"
          />
          {accountNumberError && (
            <p className="text-xs text-destructive font-medium">{accountNumberError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
