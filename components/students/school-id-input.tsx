"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  formatRegisterNo, 
  formatRollNo, 
  parseSchoolId, 
  buildSchoolId,
  SCHOOL_PREFIX,
} from "@/lib/utils/school-id";

export interface SchoolIdInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  defaultPrefix?: string;
}

/**
 * Segmented School ID Input Component:
 * Format: [PREFIX] / [YEAR] / [REGISTER_NO] / [CLASS] / [SECTION] / [ROLL_NO]
 * 
 * Guarantees that slashes "/" and format are permanently fixed,
 * prevents invalid spaces, and only allows editing values inside the segments.
 */
export function SchoolIdInput({
  value = "",
  onChange,
  disabled = false,
  className,
  defaultPrefix = "MHS",
}: SchoolIdInputProps) {
  // Parse incoming value into segments
  const parseValue = (val: string) => {
    if (!val || typeof val !== "string") {
      const currentYear = String(new Date().getFullYear());
      return {
        prefix: defaultPrefix,
        year: currentYear,
        registerNo: "01",
        classStr: "V",
        sectionStr: "A",
        rollStr: "001",
      };
    }

    // Try slash separated format: MHS/2026/01/V/A/001
    const parts = val.split("/").map((p) => p.trim());
    if (parts.length >= 6) {
      return {
        prefix: parts[0] || defaultPrefix,
        year: parts[1] || String(new Date().getFullYear()),
        registerNo: parts[2] || "01",
        classStr: parts[3] || "V",
        sectionStr: parts[4] || "A",
        rollStr: parts[5] || "001",
      };
    } else if (parts.length === 5) {
      // Missing prefix or older format: YYYY/REG/CLASS/SEC/ROLL
      return {
        prefix: defaultPrefix,
        year: parts[0] || String(new Date().getFullYear()),
        registerNo: parts[1] || "01",
        classStr: parts[2] || "V",
        sectionStr: parts[3] || "A",
        rollStr: parts[4] || "001",
      };
    }

    // Fallback for hyphenated format: MHS-2026-0036
    const hyphenParts = val.split("-").map((p) => p.trim());
    if (hyphenParts.length >= 3) {
      return {
        prefix: hyphenParts[0] || defaultPrefix,
        year: hyphenParts[1] || String(new Date().getFullYear()),
        registerNo: "01",
        classStr: "V",
        sectionStr: "A",
        rollStr: hyphenParts[2] || "001",
      };
    }

    return {
      prefix: defaultPrefix,
      year: String(new Date().getFullYear()),
      registerNo: "01",
      classStr: "V",
      sectionStr: "A",
      rollStr: "001",
    };
  };

  const initial = parseValue(value);
  const [prefix, setPrefix] = useState(initial.prefix);
  const [year, setYear] = useState(initial.year);
  const [registerNo, setRegisterNo] = useState(initial.registerNo);
  const [classStr, setClassStr] = useState(initial.classStr);
  const [sectionStr, setSectionStr] = useState(initial.sectionStr);
  const [rollStr, setRollStr] = useState(initial.rollStr);

  // Sync internal state when external value changes
  useEffect(() => {
    const parsed = parseValue(value);
    setPrefix(parsed.prefix);
    setYear(parsed.year);
    setRegisterNo(parsed.registerNo);
    setClassStr(parsed.classStr);
    setSectionStr(parsed.sectionStr);
    setRollStr(parsed.rollStr);
  }, [value]);

  // Combine and fire onChange
  const updateCombinedValue = (
    y: string,
    reg: string,
    cls: string,
    sec: string,
    roll: string
  ) => {
    const cleanPrefix = prefix.trim().toUpperCase() || defaultPrefix;
    const cleanYear = y.replace(/\D/g, "").slice(0, 4) || String(new Date().getFullYear());
    const cleanReg = reg.replace(/\D/g, "") || "01";
    const cleanCls = cls.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "V";
    const cleanSec = sec.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2) || "A";
    const cleanRoll = roll.replace(/\D/g, "") || "001";

    const combined = `${cleanPrefix}/${cleanYear}/${cleanReg}/${cleanCls}/${cleanSec}/${cleanRoll}`;
    onChange?.(combined);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYear(val);
    updateCombinedValue(val, registerNo, classStr, sectionStr, rollStr);
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
    setRegisterNo(val);
    updateCombinedValue(year, val, classStr, sectionStr, rollStr);
  };

  const handleRegisterBlur = () => {
    const formatted = formatRegisterNo(registerNo);
    setRegisterNo(formatted);
    updateCombinedValue(year, formatted, classStr, sectionStr, rollStr);
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
    setClassStr(val);
    updateCombinedValue(year, registerNo, val, sectionStr, rollStr);
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
    setSectionStr(val);
    updateCombinedValue(year, registerNo, classStr, val, rollStr);
  };

  const handleRollChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setRollStr(val);
    updateCombinedValue(year, registerNo, classStr, sectionStr, val);
  };

  const handleRollBlur = () => {
    const formatted = formatRollNo(rollStr);
    setRollStr(formatted);
    updateCombinedValue(year, registerNo, classStr, sectionStr, formatted);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-background text-foreground transition-all",
        "border-input shadow-2xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary",
        disabled && "opacity-60 bg-muted cursor-not-allowed",
        className
      )}
    >
      {/* 1. School Prefix (Locked Badge) */}
      <span
        title="School Prefix (Locked)"
        className="bg-primary/10 text-primary font-bold font-mono px-1.5 py-0.5 rounded text-[11px] select-none shrink-0"
      >
        {prefix || defaultPrefix}
      </span>

      {/* Locked Slash */}
      <span className="text-muted-foreground/60 font-bold select-none text-xs">/</span>

      {/* 2. Admission Year Input */}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={year}
        onChange={handleYearChange}
        placeholder="YYYY"
        title="Admission Year (e.g. 2026)"
        className="w-12 text-center bg-transparent border-none p-0 text-xs font-mono font-medium focus:outline-hidden text-foreground placeholder:text-muted-foreground/40"
      />

      {/* Locked Slash */}
      <span className="text-muted-foreground/60 font-bold select-none text-xs">/</span>

      {/* 3. Register Number Input */}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={registerNo}
        onChange={handleRegisterChange}
        onBlur={handleRegisterBlur}
        placeholder="Reg"
        title="School Hard Copy Register No (min 2 digits, e.g. 01, 105)"
        className="w-9 text-center bg-transparent border-none p-0 text-xs font-mono font-medium focus:outline-hidden text-foreground placeholder:text-muted-foreground/40"
      />

      {/* Locked Slash */}
      <span className="text-muted-foreground/60 font-bold select-none text-xs">/</span>

      {/* 4. Class Input */}
      <input
        type="text"
        disabled={disabled}
        value={classStr}
        onChange={handleClassChange}
        placeholder="Class"
        title="Class (e.g. V, IX, XI)"
        className="w-8 text-center bg-transparent border-none p-0 text-xs font-mono font-medium uppercase focus:outline-hidden text-foreground placeholder:text-muted-foreground/40"
      />

      {/* Locked Slash */}
      <span className="text-muted-foreground/60 font-bold select-none text-xs">/</span>

      {/* 5. Section Input */}
      <input
        type="text"
        disabled={disabled}
        value={sectionStr}
        onChange={handleSectionChange}
        placeholder="Sec"
        title="Section (e.g. A, B)"
        className="w-6 text-center bg-transparent border-none p-0 text-xs font-mono font-medium uppercase focus:outline-hidden text-foreground placeholder:text-muted-foreground/40"
      />

      {/* Locked Slash */}
      <span className="text-muted-foreground/60 font-bold select-none text-xs">/</span>

      {/* 6. Roll Number Input */}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={rollStr}
        onChange={handleRollChange}
        onBlur={handleRollBlur}
        placeholder="Roll"
        title="Roll Number (e.g. 001, 045)"
        className="w-10 text-center bg-transparent border-none p-0 text-xs font-mono font-bold text-primary focus:outline-hidden placeholder:text-muted-foreground/40"
      />
    </div>
  );
}
