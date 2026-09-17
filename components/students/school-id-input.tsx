"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  parseSchoolId, 
  buildSchoolId,
  getSchoolPrefix,
  normalizeClassForId,
  DEFAULT_SCHOOL_PREFIX,
} from "@/lib/utils/school-id";
import { Lock, Unlock, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SchoolIdInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  defaultPrefix?: string;
  presentClass?: string;
  admissionYear?: number | string;
  admissionNo?: string | number;
  autoSync?: boolean;
}

/**
 * Modern School Student ID Input with One-Click Lock/Unlock and Dynamic Auto-Sync.
 * 
 * Format: [SCHOOL_CODE] / [CLASS] / [ADMISSION_YEAR] / [REGISTER_NUMBER]
 * Example: MHS/IX/2024/105
 */
export function SchoolIdInput({
  value = "",
  onChange,
  disabled = false,
  className,
  defaultPrefix = DEFAULT_SCHOOL_PREFIX,
  presentClass,
  admissionYear,
  admissionNo,
  autoSync = true,
}: SchoolIdInputProps) {
  // Lock state: default is locked for automated derivation
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [internalValue, setInternalValue] = useState<string>(value);

  // Sync internal value when external prop changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Compute derived auto-ID
  const computeAutoId = () => {
    const cls = presentClass ? normalizeClassForId(presentClass) : "V";
    const year = admissionYear || new Date().getFullYear();
    const reg = admissionNo ? String(admissionNo).trim() : "01";
    const prefix = getSchoolPrefix(defaultPrefix);
    return buildSchoolId(cls, year, reg, prefix);
  };

  // Auto-sync when locked and related fields change
  useEffect(() => {
    if (isLocked && autoSync && (presentClass || admissionYear || admissionNo)) {
      const generated = computeAutoId();
      if (generated && generated !== internalValue) {
        setInternalValue(generated);
        onChange?.(generated);
      }
    }
  }, [isLocked, autoSync, presentClass, admissionYear, admissionNo, defaultPrefix]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalValue(val);
    onChange?.(val);
  };

  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    if (nextLocked) {
      // Re-sync on re-lock
      const generated = computeAutoId();
      setInternalValue(generated);
      onChange?.(generated);
    }
  };

  const handleResync = () => {
    const generated = computeAutoId();
    setInternalValue(generated);
    onChange?.(generated);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-foreground",
          isLocked
            ? "bg-muted/40 border-border/80 shadow-2xs focus-within:border-primary/60"
            : "bg-amber-500/5 border-amber-500/30 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20",
          disabled && "opacity-60 bg-muted cursor-not-allowed"
        )}
      >
        {/* Lock / Unlock Icon Badge */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleLock}
          title={isLocked ? "Click to Unlock and edit ID manually" : "Click to Lock and auto-generate ID"}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none shrink-0",
            isLocked
              ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              : "bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
          )}
        >
          {isLocked ? (
            <>
              <Lock className="h-3.5 w-3.5" />
              <span className="text-[11px]">Locked</span>
            </>
          ) : (
            <>
              <Unlock className="h-3.5 w-3.5" />
              <span className="text-[11px]">Unlocked</span>
            </>
          )}
        </button>

        {/* Input Field */}
        <input
          type="text"
          disabled={disabled}
          readOnly={isLocked}
          value={internalValue}
          onChange={handleManualChange}
          placeholder="e.g. MHS/IX/2024/105"
          className={cn(
            "flex-1 bg-transparent border-none p-0 text-xs sm:text-sm font-mono font-bold focus:outline-hidden text-foreground placeholder:text-muted-foreground/40",
            isLocked ? "cursor-default select-all" : "cursor-text text-amber-900 dark:text-amber-200"
          )}
        />

        {/* Quick Re-sync action when unlocked */}
        {!isLocked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResync}
            title="Re-sync with Form fields (Class, Admission Year, Register No)"
            className="h-7 px-2 text-[11px] font-semibold gap-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Re-sync</span>
          </Button>
        )}
      </div>

      {/* Helper text explaining auto derivation */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          {isLocked ? (
            <>
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
              <span>Auto-synced: <strong>Code / Class / Year / Reg#</strong></span>
            </>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Manual Edit Mode: Type any custom School ID. Click Lock to re-sync.
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

