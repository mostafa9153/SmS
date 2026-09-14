"use client";

import React, { useState, useEffect, useRef } from "react";
import { CustomSelect } from "@/components/ui/custom-select";

import { GUARDIAN_RELATIONSHIP_OPTIONS } from "@/lib/constants/student-options";

const PREDEFINED_RELATIONSHIPS = ["Father", "Mother", "Uncle", "Grandfather", "Grandmother"];

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
  // Determine initial mode: Predefined option, Custom, or empty
  const getInitialMode = (val?: string) => {
    if (!val) return "";
    const matched = PREDEFINED_RELATIONSHIPS.find(
      (r) => r.toLowerCase() === val.toLowerCase()
    );
    if (matched) return matched;
    return "Custom";
  };

  const [selectedMode, setSelectedMode] = useState<string>(() => getInitialMode(value));
  const [customText, setCustomText] = useState<string>(() => {
    if (!value) return "";
    const isPredefined = PREDEFINED_RELATIONSHIPS.some(
      (r) => r.toLowerCase() === value.toLowerCase()
    );
    if (isPredefined) return "";
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

    const matched = PREDEFINED_RELATIONSHIPS.find(
      (r) => r.toLowerCase() === value.toLowerCase()
    );

    if (matched) {
      setSelectedMode(matched);
    } else {
      setSelectedMode("Custom");
      if (value !== "Custom") {
        setCustomText(value);
      }
    }
  }, [value]);

  const handleSelectChange = (newMode: string) => {
    setSelectedMode(newMode);

    if (PREDEFINED_RELATIONSHIPS.includes(newMode)) {
      onChange(newMode);
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
        options={GUARDIAN_RELATIONSHIP_OPTIONS}
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
