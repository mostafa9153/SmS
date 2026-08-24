"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value?: string | number;
  onChange: (value: any) => void;
  options: (CustomSelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className,
  triggerClassName,
  dropdownClassName,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions: CustomSelectOption[] = options.map((opt) => {
    if (typeof opt === "string") {
      return { label: opt, value: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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

  // Handle key navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-xl border bg-background px-3.5 py-2 text-xs sm:text-sm font-medium text-left transition-all duration-200 outline-none select-none cursor-pointer shadow-2xs",
          disabled
            ? "opacity-50 cursor-not-allowed bg-muted/30 border-border"
            : "hover:border-primary/40 hover:bg-muted/10 border-border/90",
          isOpen && "ring-2 ring-primary/25 border-primary shadow-xs",
          selectedOption && selectedOption.value !== ""
            ? "text-foreground font-semibold"
            : "text-muted-foreground",
          triggerClassName
        )}
      >
        <span className="truncate">
          {selectedOption && selectedOption.value !== ""
            ? selectedOption.label
            : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground/80 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Floating Animated Popover */}
      {isOpen && !disabled && (
        <div
          className={cn(
            "absolute left-0 top-full mt-1.5 w-full min-w-[180px] max-h-64 overflow-y-auto rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl p-1.5 shadow-xl shadow-black/10 z-50 animate-in fade-in-0 zoom-in-95 duration-150",
            dropdownClassName
          )}
        >
          <div className="space-y-0.5">
            {normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-left transition-all duration-150 cursor-pointer",
                    opt.disabled && "opacity-40 cursor-not-allowed",
                    isSelected
                      ? "bg-primary/15 text-primary font-bold shadow-2xs"
                      : "text-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
