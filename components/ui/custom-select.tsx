"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  label: string;
  value: string | number;
  icon?: string;
  category?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value?: string | number;
  onChange: (value: any) => void;
  options: (CustomSelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
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
  searchable = true,
  className,
  triggerClassName,
  dropdownClassName,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options
  const normalizedOptions: CustomSelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { label: opt, value: opt };
      }
      return opt;
    });
  }, [options]);

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.category && opt.category.toLowerCase().includes(q)) ||
        String(opt.value).toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen, searchable]);

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
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
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
          "w-full flex items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2 text-xs sm:text-sm font-medium text-left transition-all duration-200 outline-none select-none cursor-pointer shadow-2xs",
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
        <span className="truncate flex items-center gap-1.5">
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          <span>
            {selectedOption && selectedOption.value !== ""
              ? selectedOption.label
              : placeholder}
          </span>
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
            "absolute left-0 top-full mt-1.5 w-full min-w-[220px] max-h-72 overflow-hidden rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl p-1.5 shadow-xl shadow-black/10 z-50 animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col",
            dropdownClassName
          )}
        >
          {/* Search Input Box */}
          {searchable && normalizedOptions.length > 5 && (
            <div className="p-1 pb-1.5 border-b border-border/60 mb-1">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search field..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-muted/60 hover:bg-muted/90 rounded-lg border-0 outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/40 transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="space-y-0.5 overflow-y-auto max-h-60 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching field found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const prevOpt = idx > 0 ? filteredOptions[idx - 1] : null;
                const showCategoryHeader = opt.category && (!prevOpt || prevOpt.category !== opt.category);

                return (
                  <React.Fragment key={String(opt.value) + idx}>
                    {showCategoryHeader && (
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 pt-2 pb-1 bg-muted/40 rounded-md my-1">
                        {opt.category}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-medium text-left transition-all duration-150 cursor-pointer",
                        opt.disabled && "opacity-40 cursor-not-allowed",
                        isSelected
                          ? "bg-primary/15 text-primary font-bold shadow-2xs"
                          : "text-foreground hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <span className="truncate flex items-center gap-2">
                        {opt.icon && <span className="text-sm shrink-0">{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0 ml-1.5" />
                      )}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

