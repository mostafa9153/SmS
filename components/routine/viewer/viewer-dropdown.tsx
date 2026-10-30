"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";


export function ViewerDropdown({
  value,
  onChange,
  options,
  icon,
  labelPrefix,
  placeholder = "Select...",
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  labelPrefix?: string;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-8 px-2.5 rounded-md border border-input bg-background hover:bg-muted/40 text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs select-none cursor-pointer",
          isOpen && "ring-1 ring-primary border-primary",
          className
        )}
      >
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {labelPrefix && (
          <span className="text-muted-foreground text-[11px] font-normal">{labelPrefix}:</span>
        )}
        <span className="truncate max-w-[130px] font-semibold text-foreground">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-0.5",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 min-w-[140px] max-w-[240px] rounded-lg border border-border bg-popover text-popover-foreground p-1 shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-[260px] overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
