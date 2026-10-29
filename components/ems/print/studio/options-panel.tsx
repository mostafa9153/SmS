"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, SlidersHorizontal, X, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { EmsPrintStudioState } from "./use-ems-print-studio";

export function OptionsPanel({ studio }: { studio: EmsPrintStudioState }) {
  const { activeClass, activeClassConfig, activeDoc, admitCardsPerPage, availableSubjects, benchSlipsPerPage, classSubjectsConfig, getClassesForSubject, handleActiveAddSubject, handleActiveDateChange, handleActiveHeaderChange, handleActiveRemoveSubject, handleActiveResetSubjects, includeBackSideRoutine, isOptionsOpen, issueDate, orientation, schoolProfile, setAdmitCardsPerPage, setBenchSlipsPerPage, setIncludeBackSideRoutine, setIssueDate, setOrientation, setSelectedClassTab, setShowAdmitSignature, setTodayDate, showAdmitSignature, uniqueClasses } = studio;
  return (
    <>
      {isOptionsOpen && (
        <div className="pt-3 border-t border-border/70 rounded-xl bg-muted/25 p-3.5 sm:p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* FOR ADMIT CARDS */}
          {activeDoc === "admit" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-foreground">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Cards / Page</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {admitCardsPerPage === 8 ? "8 Cards" : "Mini"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setAdmitCardsPerPage(8)}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      admitCardsPerPage === 8
                        ? "bg-background text-indigo-600 dark:text-indigo-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    8 / Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdmitCardsPerPage(21)}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      admitCardsPerPage !== 8
                        ? "bg-background text-indigo-600 dark:text-indigo-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Mini ({orientation === "landscape" ? "20" : "21"})
                  </button>
                </div>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-foreground">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Orientation</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {admitCardsPerPage === 8
                      ? (orientation === "landscape" ? "4×2 Grid (8/A4)" : "2×4 Grid (8/A4)")
                      : (orientation === "landscape" ? "4×5 Grid (20/A4)" : "3×7 Grid (21/A4)")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      orientation === "portrait"
                        ? "bg-background text-indigo-600 dark:text-indigo-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      orientation === "landscape"
                        ? "bg-background text-indigo-600 dark:text-indigo-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-foreground">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Issue Date</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={setTodayDate}
                    className="h-5 text-[10px] px-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-muted font-bold"
                  >
                    Today
                  </Button>
                </div>
                <Input
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="h-8 text-xs bg-muted/30 border-border font-mono rounded-lg"
                />
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0">
                  <span className="font-bold text-xs text-foreground block">
                    Headmaster Signature
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                    {schoolProfile.headmasterName || "Authorized Signatory"}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={showAdmitSignature}
                    onChange={(e) => setShowAdmitSignature(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0">
                  <span className="font-bold text-xs text-foreground block">
                    Back Routine
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
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
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* FOR BENCH SLIPS */}
          {activeDoc === "slips" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-foreground">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Slips / Page</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {benchSlipsPerPage === 33 || benchSlipsPerPage === 32 ? "33 Slips (3×11)" : benchSlipsPerPage === 24 ? "24 Slips (3×8)" : "57 Mini"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setBenchSlipsPerPage(33)}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      benchSlipsPerPage === 33 || benchSlipsPerPage === 32
                        ? "bg-background text-emerald-600 dark:text-emerald-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    33 / Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setBenchSlipsPerPage(24)}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      benchSlipsPerPage === 24
                        ? "bg-background text-emerald-600 dark:text-emerald-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    24 / Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setBenchSlipsPerPage(57)}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      benchSlipsPerPage === 57
                        ? "bg-background text-emerald-600 dark:text-emerald-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    57 Mini
                  </button>
                </div>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-foreground">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Orientation</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {orientation === "landscape" ? "Landscape" : "Portrait"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      orientation === "portrait"
                        ? "bg-background text-emerald-600 dark:text-emerald-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      orientation === "landscape"
                        ? "bg-background text-emerald-600 dark:text-emerald-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 flex items-center justify-between gap-2 shadow-2xs">
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

          {/* FOR ATTENDANCE SHEET */}
          {activeDoc === "attendance" && (
            <div className="space-y-3">
              {/* Class Tabs Switcher if Multiple Classes */}
              {uniqueClasses.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/70 rounded-xl border border-border/70">
                  <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase tracking-wider">
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
                            ? "bg-background text-indigo-600 dark:text-indigo-300 shadow-xs border border-border/80"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        <span>Class {cls}</span>
                        <span
                          className={cn(
                            "text-[10px] font-mono px-1.5 py-0.2 rounded font-bold",
                            isSelected
                              ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {count} subs
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    Subject Columns - Class {activeClass} ({activeClassConfig.headers.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Auto-loaded from presets. Each class gets its own exact subjects on printed sheets.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleActiveAddSubject}
                    disabled={activeClassConfig.headers.length >= 10}
                    className="h-7 text-xs font-bold gap-1 rounded-lg border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                  >
                    <span>+ Add Subject</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleActiveResetSubjects}
                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Reset Defaults
                  </Button>
                </div>
              </div>

              {/* Dynamic Subject Columns Grid for Active Class */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-6 gap-2">
                {activeClassConfig.headers.map((headerVal, idx) => {
                  const sharedClasses = getClassesForSubject(headerVal);
                  const classBadgeText = sharedClasses.length > 0 ? sharedClasses.join(", ") : activeClass;

                  return (
                    <div
                      key={`header-box-${activeClass}-${idx}`}
                      className="rounded-xl border border-border bg-card p-2 space-y-1.5 shadow-2xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 select-none">
                          Sub {idx + 1}
                        </span>

                        {/* Class Badge: Shows which classes have this subject! */}
                        <span
                          className="text-[9.5px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 px-1.5 py-0.5 rounded truncate max-w-[110px]"
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

          {/* FOR BENCH SLIPS */}
          {activeDoc === "slips" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-foreground">
              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-foreground">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Orientation</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {orientation === "landscape" ? "4×14 Grid (56/A4)" : "3×19 Grid (57/A4)"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      orientation === "portrait"
                        ? "bg-background text-emerald-600 dark:text-emerald-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Portrait (57)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={cn(
                      "py-1 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center",
                      orientation === "landscape"
                        ? "bg-background text-emerald-600 dark:text-emerald-300 shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Landscape (56)
                  </button>
                </div>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {orientation === "landscape" ? "56 Desk Slips / A4 Sheet (4×14 Grid)" : "57 Desk Slips / A4 Sheet (3×19 Grid)"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Designed for rapid scissor cutting with micro cut lines, institutional crest, and student roll numbers.
                </p>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Physical Desk Coordinates</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Includes Column Index, Bench Index, and Seat Position (S1/S2/S3) for orderly anti-copying placement.
                </p>
              </div>
            </div>
          )}

          {/* FOR GATE NOTICE */}
          {activeDoc === "gate" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-foreground">
              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>2D Seating Floor Plan / Gate Notice (1 Page Per Room)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Official door poster showing blackboard, columns, benches, seat positions, student roll numbers, and entrance door.
                </p>
              </div>

              <div className="p-3 bg-card rounded-xl border border-border/90 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Desk-by-Desk Visual Blueprint</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Provides candidates and invigilators with an immediate, unambiguous visual map of every desk inside the examination hall.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
