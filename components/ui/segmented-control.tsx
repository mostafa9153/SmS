"use client";

import type React from "react";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-lg border bg-muted/40 p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md font-medium transition-all disabled:cursor-not-allowed disabled:opacity-35",
              size === "sm" ? "h-6 min-w-7 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
