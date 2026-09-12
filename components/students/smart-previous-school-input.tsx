"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getSavedSchoolPresets,
  fetchSchoolPresetsFromDb,
  DEFAULT_SCHOOL_PRESETS,
} from "@/lib/utils/school-presets";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { School, Settings } from "lucide-react";

interface SmartPreviousSchoolInputProps {
  value?: string;
  onChange: (val: string) => void;
  error?: string;
}

export function SmartPreviousSchoolInput({
  value = "",
  onChange,
  error,
}: SmartPreviousSchoolInputProps) {
  const [schools, setSchools] = useState<string[]>(DEFAULT_SCHOOL_PRESETS);
  const [isCustom, setIsCustom] = useState(false);

  // Load presets & listen to reactive updates
  useEffect(() => {
    setSchools(getSavedSchoolPresets());
    fetchSchoolPresetsFromDb().then((data) => {
      setSchools(data);
    });

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setSchools(e.detail);
      }
    };

    window.addEventListener("sms_school_presets_updated", handleUpdate);
    return () => {
      window.removeEventListener("sms_school_presets_updated", handleUpdate);
    };
  }, []);

  // Determine if value matches a preset
  useEffect(() => {
    if (value) {
      const match = schools.some(
        (s) => s.trim().toLowerCase() === value.trim().toLowerCase()
      );
      if (!match) {
        setIsCustom(true);
      } else {
        setIsCustom(false);
      }
    }
  }, [value, schools]);

  const selectOptions = useMemo(() => {
    const list = schools.map((s) => ({ label: s, value: s }));
    if (value && !schools.some((s) => s.toLowerCase() === value.toLowerCase())) {
      list.push({ label: `✏️ Custom: ${value}`, value });
    }
    list.push({ label: "✏️ Other (Write Custom School...)", value: "__other__" });
    return list;
  }, [schools, value]);

  const handleSelectChange = (val: string) => {
    if (val === "__other__") {
      setIsCustom(true);
      onChange("");
    } else {
      setIsCustom(false);
      onChange(val);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <School className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          Previous School Name
        </Label>
        <a
          href="/settings?tab=presets"
          target="_blank"
          rel="noopener noreferrer"
          title="Configure School Presets in Settings"
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
        >
          <Settings className="h-3 w-3" />
        </a>
      </div>

      <CustomSelect
        value={isCustom ? "__other__" : value}
        onChange={handleSelectChange}
        options={selectOptions}
        placeholder="-- Select Previous / Feeder School --"
        searchable={selectOptions.length > 5}
        triggerClassName="h-9 py-1 text-xs rounded-xl"
      />

      {isCustom && (
        <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <Input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type custom school name..."
            className="text-xs h-8 rounded-lg bg-background border-blue-500/60 focus:border-blue-500 focus:ring-blue-500/20 text-foreground"
          />
        </div>
      )}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}
