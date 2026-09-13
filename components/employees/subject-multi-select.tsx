"use client";

import React, { useState } from "react";
import { Plus, X, BookOpen, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STANDARD_SCHOOL_SUBJECTS } from "@/components/employees/class-multi-select-dropdown";

interface SubjectMultiSelectProps {
  subjects: string[];
  onChange: (subjects: string[]) => void;
  availableSubjects?: string[];
  label?: string;
}

export function SubjectMultiSelect({
  subjects = [],
  onChange,
  availableSubjects = STANDARD_SCHOOL_SUBJECTS,
  label = "Teaching Subjects",
}: SubjectMultiSelectProps) {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const handleAddSubject = () => {
    const subjectToAdd = isCustomMode
      ? customSubject.trim()
      : selectedSubject.trim();

    if (!subjectToAdd) return;

    if (!subjects.includes(subjectToAdd)) {
      onChange([...subjects, subjectToAdd]);
    }

    // Reset controls
    setSelectedSubject("");
    setCustomSubject("");
    setIsCustomMode(false);
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    onChange(subjects.filter((s) => s !== subjectToRemove));
  };

  const handleSetPrimary = (subjectToPrimary: string) => {
    if (subjects[0] === subjectToPrimary) return;
    const remaining = subjects.filter((s) => s !== subjectToPrimary);
    onChange([subjectToPrimary, ...remaining]);
  };

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          {label}
        </label>
        <span className="text-[11px] font-mono text-muted-foreground">
          {subjects.length} {subjects.length === 1 ? "subject" : "subjects"} assigned
        </span>
      </div>

      {/* List of Added Subjects */}
      {subjects.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border/80 bg-muted/20">
          {subjects.map((sub, index) => {
            const isPrimary = index === 0;
            return (
              <div
                key={sub}
                className={cn(
                  "inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-xl text-xs font-medium border shadow-2xs transition-all",
                  isPrimary
                    ? "bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-200 ring-1 ring-indigo-500/20"
                    : "bg-card border-border text-foreground hover:bg-muted/60"
                )}
              >
                <span className="font-semibold">{sub}</span>

                {isPrimary ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-800/60 text-indigo-800 dark:text-indigo-200">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(sub)}
                    className="text-[10px] text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                    title="Make this the primary subject"
                  >
                    Set as Primary
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveSubject(sub)}
                  className="rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-destructive transition-colors ml-1 cursor-pointer"
                  title={`Remove ${sub}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
          No teaching subjects assigned yet. Select or type a subject below and click "Add Subject".
        </div>
      )}

      {/* Add Subject Input Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
        {!isCustomMode ? (
          <div className="flex-1 flex gap-2">
            <select
              value={selectedSubject}
              onChange={(e) => {
                if (e.target.value === "CUSTOM") {
                  setIsCustomMode(true);
                  setSelectedSubject("");
                } else {
                  setSelectedSubject(e.target.value);
                }
              }}
              className="flex-1 h-9 rounded-xl border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">Select subject to add...</option>
              {availableSubjects
                .filter((sub) => !subjects.includes(sub))
                .map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              <option value="CUSTOM">+ Other Subject (Type custom)</option>
            </select>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Type subject name (e.g. Environmental Studies)..."
              className="h-9 text-xs rounded-xl flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubject();
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCustomMode(false);
                setCustomSubject("");
              }}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        )}

        <Button
          type="button"
          onClick={handleAddSubject}
          disabled={isCustomMode ? !customSubject.trim() : !selectedSubject}
          size="sm"
          className="h-9 px-4 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Subject
        </Button>
      </div>
    </div>
  );
}
