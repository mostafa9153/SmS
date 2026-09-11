"use client";

import React, { useState, useEffect, useRef } from "react";
import { CustomSelect } from "@/components/ui/custom-select";

const RELATIONSHIP_OPTIONS = [
  { label: "Father", value: "Father" },
  { label: "Mother", value: "Mother" },
  { label: "Custom", value: "Custom" },
];

interface GuardianRelationshipSelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function GuardianRelationshipSelect({
  value = "",
  onChange,
  disabled = false,
}: GuardianRelationshipSelectProps) {
  // Determine initial mode: Father, Mother, Custom, or empty
  const getInitialMode = (val?: string) => {
    if (!val) return "";
    if (val === "Father") return "Father";
    if (val === "Mother") return "Mother";
    return "Custom";
  };

  const [selectedMode, setSelectedMode] = useState<string>(() => getInitialMode(value));
  const [customText, setCustomText] = useState<string>(() => {
    if (!value || value === "Father" || value === "Mother") return "";
    return value === "Custom" ? "" : value;
  });

  const customInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when value changes externally (e.g. form reset on data fetch)
  useEffect(() => {
    if (!value) {
      if (selectedMode !== "Custom") {
        setSelectedMode("");
      }
      return;
    }

    if (value === "Father") {
      setSelectedMode("Father");
    } else if (value === "Mother") {
      setSelectedMode("Mother");
    } else {
      setSelectedMode("Custom");
      if (value !== "Custom") {
        setCustomText(value);
      }
    }
  }, [value]);

  const handleSelectChange = (newMode: string) => {
    setSelectedMode(newMode);

    if (newMode === "Father") {
      onChange("Father");
    } else if (newMode === "Mother") {
      onChange("Mother");
    } else if (newMode === "Custom") {
      const textToUse = customText.trim() || "Custom";
      onChange(textToUse);
      setTimeout(() => {
        customInputRef.current?.focus();
      }, 50);
    } else {
      onChange("");
    }
  };

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomText(text);
    onChange(text.trim() ? text : "Custom");
  };

  return (
    <div className="space-y-1.5 w-full">
      <CustomSelect
        value={selectedMode}
        onChange={handleSelectChange}
        options={RELATIONSHIP_OPTIONS}
        placeholder="Select relationship..."
        disabled={disabled}
        searchable={false}
      />
      {selectedMode === "Custom" && (
        <div className="pt-0.5 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <input
            ref={customInputRef}
            type="text"
            value={customText}
            onChange={handleCustomTextChange}
            disabled={disabled}
            placeholder="Type relationship (e.g. Uncle, Grandfather)..."
            className="w-full rounded-xl border border-border/90 bg-background px-3 py-1.5 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all placeholder:text-muted-foreground shadow-2xs"
          />
        </div>
      )}
    </div>
  );
}
