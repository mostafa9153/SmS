"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface WorkloadRuleFieldProps {
  label: string;
  /** 0 = rule off */
  value: number;
  max: number;
  /** Value used when the rule is switched back on without a remembered one */
  defaultOn: number;
  onChange: (value: number) => void;
}

/** A teacher workload limit with an Active switch. Off is stored as 0, which the solver treats as no limit. */
export function WorkloadRuleField({ label, value, max, defaultOn, onChange }: WorkloadRuleFieldProps) {
  const active = value > 0;
  // Remembers the value to restore when the rule is switched back on
  const lastOn = React.useRef(active ? value : defaultOn);
  const id = React.useId();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className={cn("text-xs font-medium", !active && "text-muted-foreground")}>
          {label}
        </Label>
        <Switch
          checked={active}
          onCheckedChange={(on) => {
            if (!on && active) lastOn.current = value;
            onChange(on ? lastOn.current : 0);
          }}
          aria-label={`${label}: ${active ? "active" : "off"}`}
          className="scale-90"
        />
      </div>
      <Input
        id={id}
        type="number"
        min={1}
        max={max}
        disabled={!active}
        value={active ? value : ""}
        placeholder="Off"
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(1, n)));
        }}
        className="h-9 text-xs disabled:opacity-60"
      />
    </div>
  );
}
