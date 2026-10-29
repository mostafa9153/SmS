"use client";

import { CheckCircle2, Calendar, X, CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function MarkAbsenceDialog({ gen }: { gen: TeacherDashboardState }) {
  const { COMMON_LEAVE_REASONS, absenceReason, absenceSuccessMsg, calViewMonth, calViewYear, customAbsenceReason, formatYMD, handleRecordAbsence, handleSetQuickDate, handleToggleAbsenceDate, isMarkAbsenceOpen, selectedAbsenceDates, setAbsenceReason, setCalViewMonth, setCalViewYear, setCustomAbsenceReason, setIsMarkAbsenceOpen, submittingAbsence, todayStr } = gen;
  return (
    <Dialog open={isMarkAbsenceOpen} onOpenChange={setIsMarkAbsenceOpen}>
      <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <CalendarX className="h-5 w-5 text-rose-500" />
            Report Teacher Absence / Leave
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select one or multiple days using instant shortcuts or click directly on the interactive calendar.
          </DialogDescription>
        </DialogHeader>

        {absenceSuccessMsg ? (
          <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
            <p className="text-sm font-bold text-foreground">{absenceSuccessMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleRecordAbsence} className="space-y-4 pt-2">
            {/* Quick Preset Shortcut Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Quick Date Presets</span>
                <span className="text-[10px] lowercase text-muted-foreground/80 font-normal">
                  {selectedAbsenceDates.length} day(s) selected
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("today")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedAbsenceDates.length === 1 && selectedAbsenceDates[0] === formatYMD(new Date())
                      ? "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-2xs font-bold"
                      : "bg-muted/40 border-border/70 text-foreground hover:bg-muted"
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => handleSetQuickDate("yesterday")}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/40 border border-border/70 text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  Yesterday
                </button>

                <button
                  type="button"
                  onClick={() => handleSetQuickDate("tomorrow")}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/40 border border-border/70 text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  Tomorrow
                </button>

                {selectedAbsenceDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate("clear")}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer ml-auto"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Calendar Month Picker */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
              {/* Calendar Month & Year Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-rose-500" />
                  <span className="text-xs font-bold text-foreground">
                    {new Date(calViewYear, calViewMonth).toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (calViewMonth === 0) {
                        setCalViewMonth(11);
                        setCalViewYear((y) => y - 1);
                      } else {
                        setCalViewMonth((m) => m - 1);
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setCalViewYear(now.getFullYear());
                      setCalViewMonth(now.getMonth());
                    }}
                    className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground rounded cursor-pointer"
                  >
                    Current
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (calViewMonth === 11) {
                        setCalViewMonth(0);
                        setCalViewYear((y) => y + 1);
                      } else {
                        setCalViewMonth((m) => m + 1);
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const firstDayIndex = new Date(calViewYear, calViewMonth, 1).getDay();
                  const totalDaysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
                  const cells = [];

                  // Leading empty slots
                  for (let i = 0; i < firstDayIndex; i++) {
                    cells.push(<div key={`empty-${i}`} className="h-8" />);
                  }

                  // Days of month
                  const todayStr = formatYMD(new Date());
                  for (let day = 1; day <= totalDaysInMonth; day++) {
                    const dateObj = new Date(calViewYear, calViewMonth, day);
                    const dateStr = formatYMD(dateObj);
                    const isSelected = selectedAbsenceDates.includes(dateStr);
                    const isToday = dateStr === todayStr;

                    cells.push(
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleToggleAbsenceDate(dateStr)}
                        className={`h-8 w-full rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${
                          isSelected
                            ? "bg-rose-600 text-white font-bold shadow-xs scale-105"
                            : isToday
                            ? "border border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/20"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {day}
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white ring-2 ring-rose-600" />
                        )}
                      </button>
                    );
                  }

                  return cells;
                })()}
              </div>
            </div>

            {/* Selected Dates Display Badges */}
            {selectedAbsenceDates.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Selected Dates ({selectedAbsenceDates.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 rounded-xl bg-muted/20 border border-border/50">
                  {[...selectedAbsenceDates].sort().map((d) => (
                    <span
                      key={d}
                      onClick={() => handleToggleAbsenceDate(d)}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-rose-500/25"
                      title="Click to remove"
                    >
                      {d} <X className="h-3 w-3" />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reason Selection Dropdown & Custom Reason */}
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Reason for Leave / Absence</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Select preset or custom</span>
                </label>
                <Select value={absenceReason} onValueChange={(val) => setAbsenceReason(val || COMMON_LEAVE_REASONS[0])}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background font-medium">
                    <SelectValue placeholder="Choose a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_LEAVE_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Reason Textarea if "Other / Custom Reason" is selected */}
              {absenceReason === "Other / Custom Reason" && (
                <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Specify Custom Reason:
                  </label>
                  <Textarea
                    placeholder="Please describe your specific reason for leave..."
                    value={customAbsenceReason}
                    onChange={(e) => setCustomAbsenceReason(e.target.value)}
                    className="bg-background text-xs rounded-xl min-h-[60px]"
                    required
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMarkAbsenceOpen(false)}
                className="text-xs text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAbsence || selectedAbsenceDates.length === 0}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer gap-1.5 shadow-xs"
              >
                {submittingAbsence ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <CalendarX className="h-3.5 w-3.5" />
                )}
                <span>
                  Submit {selectedAbsenceDates.length > 0 ? `(${selectedAbsenceDates.length} Days)` : ""} &amp; Notify Admin
                </span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
