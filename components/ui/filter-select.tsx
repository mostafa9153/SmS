"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Pill-style toolbar filter. With `allLabel` it adds an "All …" option and a
 * Reset link that set the value to "".
 */
export function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  allLabel,
  highlight = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: FilterOption[];
  allLabel?: string;
  /** Emphasize the trigger (e.g. the primary filter of a page). */
  highlight?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const item = (key: string, label: string, isSelected: boolean, onClick: () => void, muted = false) => (
    <button
      key={key}
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer",
        isSelected
          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
          : muted
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "text-foreground hover:bg-primary/10 hover:text-primary"
      )}
    >
      <span className="truncate">{label}</span>
      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1.5" />}
    </button>
  );

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all outline-none select-none cursor-pointer shadow-2xs",
          highlight || (allLabel && value)
            ? "border-primary/60 bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
            : value
              ? "border-primary/40 bg-primary/5 text-foreground font-semibold"
              : "border-border/90 bg-card hover:bg-background text-foreground/80 hover:text-foreground hover:border-primary/40",
          open && "ring-2 ring-primary/25 border-primary"
        )}
      >
        <span suppressHydrationWarning className="truncate max-w-[170px]">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open ? "rotate-180 text-primary" : "text-muted-foreground/80")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-[240px] sm:w-[260px] rounded-2xl border border-border/90 bg-popover text-popover-foreground p-2 shadow-2xl z-[100] animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 mb-1.5 border-b border-border/60 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 rounded-xl">
            <span>{placeholder}</span>
            {allLabel && value && (
              <button type="button" onClick={() => pick("")} className="text-rose-500 hover:text-rose-600 font-semibold hover:underline capitalize cursor-pointer">
                Reset
              </button>
            )}
          </div>
          <div id={listId} role="listbox" className="max-h-[280px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
            {allLabel && item("__all", allLabel, !value, () => pick(""), true)}
            {options.map((o) => item(String(o.value), o.label, String(o.value) === String(value), () => pick(o.value)))}
          </div>
        </div>
      )}
    </div>
  );
}
