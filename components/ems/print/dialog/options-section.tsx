"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Calendar, Layers, Settings2, X, Sliders, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { EmsPrintDialogState } from "./use-ems-print-dialog";

export function OptionsSection({ studio }: { studio: EmsPrintDialogState }) {
  const { activeClass, activeClassConfig, activeDoc, admitCardsPerPage, availableSubjects, benchSlipsPerPage, classSubjectsConfig, getClassesForSubject, handleActiveAddSubject, handleActiveDateChange, handleActiveFillConsecutiveDates, handleActiveHeaderChange, handleActiveRemoveSubject, handleActiveResetSubjects, includeBackSideRoutine, issueDate, orientation, schoolProfile, setAdmitCardsPerPage, setBenchSlipsPerPage, setClassSubjectsConfig, setIncludeBackSideRoutine, setIssueDate, setOrientation, setSelectedClassTab, setShowAdmitSignature, setTodayDate, showAdmitSignature, uniqueClasses } = studio;
  return (
    <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Settings2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>
          {activeDoc === "admit"
            ? "Admit Card Options"
            : activeDoc === "attendance"
              ? "Attendance Table Headers"
              : "Bench Slip Layout"}
        </span>
      </span>

      {/* Admit Cards: Orientation, Issue Date & Headmaster Signature */}
      {activeDoc === "admit" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Cards Per Page Selector */}
          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Cards / Page
              </span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {admitCardsPerPage === 8 ? "8 Cards" : "Mini"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdmitCardsPerPage(8)}
                className={cn(
                  "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  admitCardsPerPage === 8
                    ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span>8 / Page</span>
              </button>
              <button
                type="button"
                onClick={() => setAdmitCardsPerPage(21)}
                className={cn(
                  "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  admitCardsPerPage !== 8
                    ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span>Mini ({orientation === "landscape" ? "20" : "21"})</span>
              </button>
            </div>
          </div>

          {/* Page Orientation Selector */}
          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Orientation
              </span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {admitCardsPerPage === 8
                  ? (orientation === "landscape" ? "4×2 Grid (8/A4)" : "2×4 Grid (8/A4)")
                  : (orientation === "landscape" ? "4×5 Grid (20/A4)" : "3×7 Grid (21/A4)")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={cn(
                  "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  orientation === "portrait"
                    ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span>Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={cn(
                  "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  orientation === "landscape"
                    ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span>Landscape</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Issue Date
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={setTodayDate}
                className="h-5 text-[10px] px-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                Today
              </Button>
            </div>
            <Input
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="h-7 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold text-xs text-slate-800 dark:text-neutral-200 block">
                Head Signature
              </span>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 truncate block">
                {schoolProfile.headmasterName || "Headmaster"}
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={showAdmitSignature}
                onChange={(e) => setShowAdmitSignature(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-slate-300 dark:bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold text-xs text-slate-800 dark:text-neutral-200 block">
                Back Routine
              </span>
              <span className="text-[10px] text-slate-500 dark:text-neutral-400 truncate block">
                Both-side duplex print
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={includeBackSideRoutine}
                onChange={(e) => setIncludeBackSideRoutine(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-slate-300 dark:bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* Bench Slips: Layout & Cutting Space */}
      {activeDoc === "slips" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-foreground">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                <span>Slips / Page</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {benchSlipsPerPage === 33 || benchSlipsPerPage === 32 ? "33 Slips (3×11)" : benchSlipsPerPage === 24 ? "24 Slips (3×8)" : "57 Mini"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBenchSlipsPerPage(33)}
                className={cn(
                  "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                  benchSlipsPerPage === 33 || benchSlipsPerPage === 32
                    ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                33 / Page
              </button>
              <button
                type="button"
                onClick={() => setBenchSlipsPerPage(24)}
                className={cn(
                  "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                  benchSlipsPerPage === 24
                    ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                24 / Page
              </button>
              <button
                type="button"
                onClick={() => setBenchSlipsPerPage(57)}
                className={cn(
                  "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                  benchSlipsPerPage === 57
                    ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                57 Mini
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-foreground">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                <span>Orientation</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {orientation === "landscape" ? "Landscape" : "Portrait"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={cn(
                  "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                  orientation === "portrait"
                    ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-muted-foreground hover:text-foreground"
                  )}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={cn(
                  "py-1 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center",
                  orientation === "landscape"
                    ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Landscape
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0">
              <span className="font-bold text-xs text-foreground block">
                Cutting Space
              </span>
              <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                {benchSlipsPerPage === 33 || benchSlipsPerPage === 32 || benchSlipsPerPage === 24 ? "3mm Cut Margins & Dashed Lines" : "Compact Zero-Margin"}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-md">
              ✂ Ready
            </span>
          </div>
        </div>
      )}

      {/* Attendance Sheet: Dynamic Headers & Dates per Class */}
      {activeDoc === "attendance" && (
        <div className="p-3.5 bg-slate-50/90 dark:bg-slate-950/70 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xs">
          {/* Class Tabs Switcher if Multiple Classes */}
          {uniqueClasses.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wider">
                Select Class:
              </span>
              {uniqueClasses.map((cls) => {
                const isSelected = activeClass === cls;
                const count = classSubjectsConfig[cls]?.headers?.length || 0;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClassTab(cls)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200/80 dark:border-indigo-800/80"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                    )}
                  >
                    <span>Class {cls}</span>
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded font-bold",
                        isSelected
                          ? "bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {count} subs
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Class {activeClass} Subjects ({activeClassConfig.headers.length})</span>
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Auto-loaded from presets. Each class prints its own subject columns & dates.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleActiveAddSubject}
                disabled={activeClassConfig.headers.length >= 10}
                className="h-7 text-[10px] font-bold px-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 cursor-pointer rounded-lg gap-1"
                title="Add Subject Column"
              >
                <span>+ Add Subject</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleActiveResetSubjects}
                className="h-7 text-[10px] font-bold px-2 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-lg gap-1"
                title="Reset to default subjects for this class"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleActiveFillConsecutiveDates(0)}
                className="h-7 text-[10px] font-bold px-2 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 cursor-pointer rounded-lg gap-1"
                title="Fill consecutive exam dates starting today"
              >
                <Calendar className="w-3 h-3 text-emerald-500" />
                <span>Dates (Today+)</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setClassSubjectsConfig((prev) => ({
                    ...prev,
                    [activeClass]: {
                      headers: Array(activeClassConfig.headers.length).fill(""),
                      dates: Array(activeClassConfig.dates.length).fill(""),
                    },
                  }));
                }}
                className="h-7 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 cursor-pointer rounded-lg"
                title="Clear subjects and dates for this class"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Dynamic Columns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {activeClassConfig.headers.map((headerVal, idx) => {
              const sharedClasses = getClassesForSubject(headerVal);
              const classBadgeText = sharedClasses.length > 0 ? sharedClasses.join(", ") : activeClass;

              return (
                <div
                  key={`header-box-${activeClass}-${idx}`}
                  className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 space-y-1.5 shadow-2xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 select-none">
                      Sub {idx + 1}
                    </span>

                    {/* Class Badge: Shows which classes have this subject! */}
                    <span
                      className="text-[9px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 px-1.5 py-0.5 rounded truncate max-w-[110px]"
                      title={`Assigned to: Class ${classBadgeText}`}
                    >
                      Class {classBadgeText}
                    </span>

                    {activeClassConfig.headers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleActiveRemoveSubject(idx)}
                        className="text-muted-foreground hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                        title="Remove this subject column"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Subject Selector */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">
                      Subject
                    </span>
                    <Select
                      value={headerVal || ""}
                      onValueChange={(val: string | null) => {
                        handleActiveHeaderChange(idx, val || "");
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs bg-muted/30 hover:bg-muted/50 focus-visible:bg-background border-border/60 rounded-md px-2 py-0.5 text-foreground font-semibold">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl min-w-44 z-[60]">
                        {availableSubjects.map((sub) => (
                          <SelectItem key={sub} value={sub} className="text-xs">
                            {sub}
                          </SelectItem>
                        ))}
                        {headerVal && !availableSubjects.includes(headerVal) && (
                          <SelectItem value={headerVal} className="text-xs">
                            {headerVal}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Input */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground/80 tracking-wider block">
                      Date
                    </span>
                    <input
                      type="text"
                      value={activeClassConfig.dates[idx] || ""}
                      onChange={(e) => handleActiveDateChange(idx, e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full text-xs bg-muted/30 hover:bg-muted/50 focus:bg-background rounded-md px-1.5 py-1 border border-border/60 outline-none text-foreground font-mono text-[11px] placeholder:text-muted-foreground/60 transition-colors"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bench Slips: Orientation & Layout Specifications */}
      {activeDoc === "slips" && (
        <div className="space-y-2">
          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500" /> Page Orientation & Grid
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {orientation === "landscape" ? "4×14 Grid (56 Slips/A4)" : "3×19 Grid (57 Slips/A4)"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={cn(
                  "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  orientation === "portrait"
                    ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span>Portrait (3×19 • 57 Slips)</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={cn(
                  "py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  orientation === "landscape"
                    ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span>Landscape (4×14 • 56 Slips)</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50/90 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {orientation === "landscape" ? "56 Desk Slips / A4 Sheet (4×14 Grid)" : "57 Desk Slips / A4 Sheet (3×19 Grid)"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Pre-aligned scissor cutting lines, school watermark, bold student roll numbers, and column-bench desk placement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
