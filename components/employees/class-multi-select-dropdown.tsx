"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X, BookOpen, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DEFAULT_SCHOOL_CLASSES = [
  "Class V",
  "Class VI",
  "Class VII",
  "Class VIII",
  "Class IX",
  "Class X",
  "Class XI",
  "Class XII",
];

export const STANDARD_SCHOOL_SUBJECTS = [
  "Bengali (1st Language)",
  "English (2nd Language)",
  "Mathematics",
  "Physical Science",
  "Life Science",
  "History",
  "Geography",
  "Sanskrit",
  "Arabic",
  "Work Education",
  "Physical Education",
  "Computer Application / IT",
  "Pure Science",
  "Bio Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Political Science",
  "Philosophy",
  "Economics",
  "Education",
  "Sociology",
  "Nutrition",
  "Music",
  "Visual Arts",
];

interface ClassMultiSelectDropdownProps {
  selectedClasses: string[];
  onChange: (classes: string[]) => void;
  availableClasses?: string[];
  label?: string;
  placeholder?: string;
}

export function ClassMultiSelectDropdown({
  selectedClasses = [],
  onChange,
  availableClasses = DEFAULT_SCHOOL_CLASSES,
  label = "Assigned Classes (কোন কোন ক্লাসের ক্লাস নেন)",
  placeholder = "Select classes from dropdown...",
}: ClassMultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleClass = (cls: string) => {
    if (selectedClasses.includes(cls)) {
      onChange(selectedClasses.filter((c) => c !== cls));
    } else {
      onChange([...selectedClasses, cls]);
    }
  };

  const removeClass = (cls: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedClasses.filter((c) => c !== cls));
  };

  const selectSecondary = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const secondary = ["Class V", "Class VI", "Class VII", "Class VIII", "Class IX", "Class X"];
    const combined = Array.from(new Set([...selectedClasses, ...secondary]));
    onChange(combined);
  };

  const selectHS = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hs = ["Class XI", "Class XII"];
    const combined = Array.from(new Set([...selectedClasses, ...hs]));
    onChange(combined);
  };

  const selectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([...availableClasses]);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="space-y-1.5 w-full" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            {label}
          </label>
          <span className="text-[11px] font-mono text-muted-foreground">
            {selectedClasses.length} selected
          </span>
        </div>
      )}

      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full min-h-9 px-3 py-1.5 rounded-xl border border-input bg-background text-left text-xs transition-all flex items-center justify-between gap-2 shadow-2xs hover:border-primary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20",
            isOpen && "ring-2 ring-primary/20 border-primary"
          )}
        >
          <div className="flex-1 truncate">
            {selectedClasses.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span className="font-medium text-foreground">
                {selectedClasses.join(", ")}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </button>

        {/* Dropdown Content */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-popover/95 p-2 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
            {/* Quick Presets Bar */}
            <div className="flex items-center gap-1 pb-2 mb-1.5 border-b border-border/60 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-1">
                Quick:
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                All
              </button>
              <button
                type="button"
                onClick={selectSecondary}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                V - X
              </button>
              <button
                type="button"
                onClick={selectHS}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                XI - XII
              </button>
              {selectedClasses.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition-colors ml-auto cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Class Options List */}
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto pr-1">
              {availableClasses.map((cls) => {
                const isSelected = selectedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClass(cls)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer",
                      isSelected
                        ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span>{cls}</span>
                    <div
                      className={cn(
                        "h-4 w-4 rounded-sm border flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Class Chips / Badges below */}
      {selectedClasses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedClasses.map((cls) => (
            <Badge
              key={cls}
              variant="secondary"
              className="text-[11px] font-semibold pl-2.5 pr-1 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1"
            >
              <span>{cls}</span>
              <button
                type="button"
                onClick={(e) => removeClass(cls, e)}
                className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 transition-colors"
                title={`Remove ${cls}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
