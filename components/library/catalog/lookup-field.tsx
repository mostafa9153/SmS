"use client";

import { useState } from "react";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";

const CUSTOM = "__custom__";

/** Dropdown of common values plus a "Custom" option that reveals a free-text input. */
export function LookupField({
  value,
  onChange,
  options,
  placeholder,
  customPlaceholder,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder: string;
  customPlaceholder: string;
  id?: string;
}) {
  // A saved value outside the list (e.g. an older book) opens in custom mode so it stays editable.
  const [custom, setCustom] = useState(() => value !== "" && !options.includes(value));
  const selected = custom ? CUSTOM : value;
  const choices = [
    ...options.map((o) => ({ label: o, value: o })),
    { label: "Custom…", value: CUSTOM },
  ];

  return (
    <div className="space-y-2">
      <CustomSelect
        id={id}
        value={selected}
        placeholder={placeholder}
        searchable={false}
        options={choices}
        onChange={(v: string) => {
          if (v === CUSTOM) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(v);
          }
        }}
      />
      {custom && (
        <Input
          value={value}
          maxLength={300}
          placeholder={customPlaceholder}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
