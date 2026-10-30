"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Search box with icon and clear button. With `debounceMs`, typing updates the
 * field at once and calls `onChange` after the pause (for server-side search).
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 0,
  size = "md",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  /** `sm` for dialogs, tables and dense toolbars. */
  size?: "sm" | "md";
  className?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastValue, setLastValue] = useState(value);

  // Follow outside changes (e.g. a filter reset) without an effect-driven setState.
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  // An outside change wins over a still-pending debounced emit.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
  }, [value]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const emit = (next: string) => {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    if (debounceMs > 0 && next) timer.current = setTimeout(() => onChange(next), debounceMs);
    else onChange(next);
  };

  return (
    <div className={cn("relative group", className)}>
      <Search
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none",
          size === "sm" ? "left-2.5 h-3.5 w-3.5" : "left-3 h-4 w-4"
        )}
      />
      <input
        type="search"
        value={text}
        onChange={(e) => emit(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className={cn(
          "w-full rounded-xl border border-input bg-background pr-8 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow [&::-webkit-search-cancel-button]:hidden",
          // text-base below sm keeps iOS from zooming into the field
          size === "sm" ? "h-9 sm:h-8 pl-8 text-base sm:text-xs" : "h-10 sm:h-9 pl-9 text-base sm:text-sm"
        )}
      />
      {text && (
        <button
          type="button"
          onClick={() => emit("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
