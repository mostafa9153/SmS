"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { normalizeClassToCode } from "@/lib/routine/routine-sync";
import { isSubjectLab, isDefaultLabSubject } from "@/lib/utils/marks-config";
import { detectSubjectStream } from "@/lib/routine/routine-helpers";
import { Spinner } from "@/components/ui/spinner";

import type { RoutineSubjectsState } from "./use-routine-subjects";

export function SubjectDialog({ tab }: { tab: RoutineSubjectsState }) {
  const { activeClassPresets, configuredStreamsForActive, currentClassSubjects, dialogMode, dlgAllowMulti, dlgFormStream, dlgIsLab, dlgLabSessions, dlgMaxPerDay, dlgName, dlgPeriodFormat, dlgPeriodsPerWeek, dlgTheoryPeriods, dlgTimePref, editDialogOpen, editGroup, handleDlgClose, handleDlgSubmit, isCurrentClassHs, isDlgSubmitting, isLab, marksSchemes, setDlgAllowMulti, setDlgFormStream, setDlgIsCommon, setDlgIsLab, setDlgLabSessions, setDlgMaxPerDay, setDlgName, setDlgPeriodFormat, setDlgPeriodsPerWeek, setDlgTheoryPeriods, setDlgTimePref, targetClassForForm } = tab;
  return (
    <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) handleDlgClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            {dialogMode === "add" ? (
              <><Plus className="w-4 h-4 text-primary" />Add Subject to {targetClassForForm}</>
            ) : (
              <><Edit2 className="w-4 h-4 text-primary" />{editGroup ? "Edit Group" : "Edit Subject"}</>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleDlgSubmit} className="space-y-4">
          {/* Subject Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Subject Name *</Label>
            {dialogMode === "add" ? (
              <Select
                value={dlgName || ""}
                onValueChange={(val) => {
                  if (!val) return;
                  setDlgName(val);
                  const lower = val.toLowerCase();
                  const detected = detectSubjectStream(val);
                  setDlgFormStream(detected);
                  setDlgIsCommon(detected === "Common");

                  const matchingScheme = marksSchemes.find(
                    (sc) => normalizeClassToCode(sc.classCode) === normalizeClassToCode(targetClassForForm)
                  );
                  const isLabPreset = matchingScheme ? isSubjectLab(matchingScheme, val) : isDefaultLabSubject(val);

                  if (isLabPreset) {
                    setDlgPeriodFormat("both");
                    setDlgIsLab(true);
                    setDlgTheoryPeriods(4);
                    setDlgLabSessions(2);
                    setDlgPeriodsPerWeek(6);
                    setDlgAllowMulti(true);
                  } else if (lower.includes("lab") || lower.includes("practical")) {
                    setDlgPeriodFormat("lab");
                    setDlgIsLab(true);
                    setDlgTheoryPeriods(0);
                    setDlgLabSessions(2);
                    setDlgPeriodsPerWeek(2);
                  } else if (lower.includes("physical education") || lower.includes("work education") || lower.includes("environmental")) {
                    setDlgPeriodFormat("single");
                    setDlgIsLab(false);
                    setDlgTheoryPeriods(2);
                    setDlgLabSessions(0);
                    setDlgPeriodsPerWeek(2);
                  } else {
                    setDlgPeriodFormat("single");
                    setDlgIsLab(false);
                    setDlgTheoryPeriods(5);
                    setDlgLabSessions(0);
                    setDlgPeriodsPerWeek(5);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs font-medium bg-background">
                  <SelectValue placeholder="Choose Subject from Presets" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 sticky top-0 z-10">
                    {targetClassForForm} Presets
                  </div>
                  {activeClassPresets.map((sub) => {
                    const isAdded = currentClassSubjects.some(
                      (s) => s.name.trim().toLowerCase() === sub.trim().toLowerCase()
                    );
                    const matchingScheme = marksSchemes.find(
                      (sc) => normalizeClassToCode(sc.classCode) === normalizeClassToCode(targetClassForForm)
                    );
                    const isSubLabPreset = matchingScheme ? isSubjectLab(matchingScheme, sub) : isDefaultLabSubject(sub);

                    return (
                      <SelectItem key={sub} value={sub} className="text-xs">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="flex items-center gap-1.5">
                            <span>{sub}</span>
                            {isSubLabPreset && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200">
                                Lab
                              </Badge>
                            )}
                          </span>
                          {isAdded && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">(Added)</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={dlgName}
                onChange={(e) => setDlgName(e.target.value)}
                disabled={Boolean(editGroup)}
                className="h-8 text-xs font-medium"
                required
              />
            )}
          </div>

          {/* Period Format Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Period Format</Label>
            <Select
              value={dlgPeriodFormat}
              onValueChange={(val: any) => {
                setDlgPeriodFormat(val);
                const isLab = val === "both" || val === "lab";
                setDlgIsLab(isLab);
                if (val === "both") {
                  const th = dlgTheoryPeriods > 0 ? dlgTheoryPeriods : 4;
                  const lbSessions = dlgLabSessions > 0 ? dlgLabSessions : 1;
                  setDlgTheoryPeriods(th);
                  setDlgLabSessions(lbSessions);
                  const tot = th + (lbSessions * 2);
                  setDlgPeriodsPerWeek(tot);
                  if (tot >= 6) setDlgAllowMulti(true);
                } else if (val === "single") {
                  const th = dlgTheoryPeriods > 0 ? dlgTheoryPeriods : 5;
                  setDlgTheoryPeriods(th);
                  setDlgPeriodsPerWeek(th);
                  if (th >= 6) setDlgAllowMulti(true);
                } else if (val === "lab") {
                  const lbSessions = dlgLabSessions > 0 ? dlgLabSessions : 1;
                  setDlgLabSessions(lbSessions);
                  setDlgPeriodsPerWeek(lbSessions * 2);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs font-medium bg-background">
                <SelectValue placeholder="Format">
                  {dlgPeriodFormat === "both"
                    ? "Theory + Practical Lab (1 Th + 2 Lab Slots)"
                    : dlgPeriodFormat === "lab"
                    ? "Practical Lab Only (2 Slots per Class)"
                    : "Single Period (1 Slot / Theory)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single" className="text-xs">
                  Single Period (1 Slot / Theory)
                </SelectItem>
                <SelectItem value="both" className="text-xs">
                  Theory + Practical Lab (1 Th + 2 Lab Slots)
                </SelectItem>
                <SelectItem value="lab" className="text-xs">
                  Practical Lab Only (2 Slots per Class)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Period Inputs depending on Format */}
          {dlgPeriodFormat === "both" ? (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border bg-blue-500/5 border-blue-500/20">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Theory Periods / Week</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={dlgTheoryPeriods}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setDlgTheoryPeriods(val);
                    const tot = val + (dlgLabSessions * 2);
                    setDlgPeriodsPerWeek(tot);
                    if (tot >= 6) setDlgAllowMulti(true);
                  }}
                  className="h-8 text-xs font-mono font-semibold"
                  required
                />
                <span className="text-[10px] text-muted-foreground">{dlgTheoryPeriods} Single Slot(s)</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Lab Classes / Week</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  step={1}
                  value={dlgLabSessions}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setDlgLabSessions(val);
                    const tot = dlgTheoryPeriods + (val * 2);
                    setDlgPeriodsPerWeek(tot);
                    if (tot >= 6) setDlgAllowMulti(true);
                  }}
                  className="h-8 text-xs font-mono font-semibold"
                  required
                />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {dlgLabSessions} × 2 = {dlgLabSessions * 2} Slots (Double Period)
                </span>
              </div>

              <div className="col-span-2 pt-1.5 border-t border-blue-500/20 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Total Weekly Timetable Slots:</span>
                <Badge variant="outline" className="font-mono text-xs font-bold bg-background text-primary border-primary/30">
                  {dlgTheoryPeriods + (dlgLabSessions * 2)} p/wk ({dlgTheoryPeriods} Th + {dlgLabSessions * 2} Lab)
                </Badge>
              </div>
            </div>
          ) : dlgPeriodFormat === "lab" ? (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border bg-blue-500/5 border-blue-500/20">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lab Classes / Week *</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  step={1}
                  value={dlgLabSessions}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setDlgLabSessions(val);
                    setDlgPeriodsPerWeek(val * 2);
                  }}
                  className="h-8 text-xs font-mono font-semibold"
                  required
                />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {dlgLabSessions} × 2 = {dlgLabSessions * 2} Slots (Double Period)
                </span>
              </div>
              <div className="col-span-2 pt-1.5 border-t border-blue-500/20 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Total Weekly Timetable Slots:</span>
                <Badge variant="outline" className="font-mono text-xs font-bold bg-background text-primary border-primary/30">
                  {dlgLabSessions * 2} p/wk ({dlgLabSessions} Lab Class{dlgLabSessions > 1 ? "es" : ""})
                </Badge>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Periods / Week *</Label>
                <Input
                  type="number"
                  min={1}
                  max={18}
                  value={dlgTheoryPeriods}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setDlgTheoryPeriods(val);
                    setDlgPeriodsPerWeek(val);
                    if (val >= 6) {
                      setDlgAllowMulti(true);
                      if (dlgMaxPerDay < 2) setDlgMaxPerDay(2);
                    }
                  }}
                  className="h-8 text-xs font-mono font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end pb-1.5">
                <span className="text-[11px] text-muted-foreground font-mono font-medium">
                  = {dlgTheoryPeriods} Single Periods / wk
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Time Window */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Time Window</Label>
              <Select
                value={dlgTimePref}
                onValueChange={(val) => setDlgTimePref(val as "any" | "morning" | "afternoon")}
              >
                <SelectTrigger className="h-8 text-xs font-medium bg-background">
                  <SelectValue placeholder="Time Window">
                    {dlgTimePref === "morning" ? "Morning (Before Tiffin)" : dlgTimePref === "afternoon" ? "Afternoon (After Tiffin)" : "Flexible (Anytime)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any" className="text-xs">Flexible (Anytime)</SelectItem>
                  <SelectItem value="morning" className="text-xs">Morning (Before Tiffin)</SelectItem>
                  <SelectItem value="afternoon" className="text-xs">Afternoon (After Tiffin)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stream (HS only) */}
            {isCurrentClassHs && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Stream</Label>
                <Select
                  value={dlgFormStream}
                  onValueChange={(val: any) => { setDlgFormStream(val); setDlgIsCommon(val === "Common"); }}
                >
                  <SelectTrigger className="h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="Stream" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Common" className="text-xs">Common (Languages & Core)</SelectItem>
                    {configuredStreamsForActive.includes("Science") && <SelectItem value="Science" className="text-xs">Science</SelectItem>}
                    {configuredStreamsForActive.includes("Commerce") && <SelectItem value="Commerce" className="text-xs">Commerce</SelectItem>}
                    {configuredStreamsForActive.includes("Arts") && <SelectItem value="Arts" className="text-xs">Arts / Humanities</SelectItem>}
                    <SelectItem value="General" className="text-xs">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Allow Multi-Period */}
          <div className="space-y-1">
            <label className={cn("flex items-center gap-2 text-xs font-medium select-none", (!dlgIsLab && dlgPeriodsPerWeek >= 7) ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
              <input
                type="checkbox"
                checked={dlgAllowMulti}
                onChange={(e) => setDlgAllowMulti(e.target.checked)}
                disabled={!dlgIsLab && dlgPeriodsPerWeek >= 7}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span>Allow multiple periods in the same day</span>
            </label>
            {(!dlgIsLab && dlgPeriodsPerWeek >= 7) && (
              <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium ml-6">Required lock: 7+ periods exceeds 6 working days.</p>
            )}
            {(!dlgIsLab && dlgPeriodsPerWeek === 6) && (
              <p className="text-[10px] text-muted-foreground ml-6">Recommended: 6 periods usually requires 2/day because Saturday is a half-day.</p>
            )}
          </div>

          {dlgAllowMulti && (
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium whitespace-nowrap">Max Periods / Day:</Label>
              <div className="w-28">
                <Select value={String(dlgMaxPerDay)} onValueChange={(val) => setDlgMaxPerDay(Number(val) || 2)}>
                  <SelectTrigger className="h-7 text-xs font-semibold bg-background">
                    <SelectValue>{dlgMaxPerDay} Periods</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2" className="text-xs">2 Periods / day</SelectItem>
                    <SelectItem value="3" className="text-xs">3 Periods / day</SelectItem>
                    <SelectItem value="4" className="text-xs">4 Periods / day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleDlgClose} className="h-8 text-xs px-3">
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isDlgSubmitting || !dlgName.trim()} className="h-8 text-xs font-semibold px-4 gap-1.5">
              {isDlgSubmitting ? (
                <><Spinner className="h-3.5 w-3.5" /><span>Saving...</span></>
              ) : dialogMode === "add" ? (
                <><Plus className="h-3.5 w-3.5" /><span>Add Subject</span></>
              ) : (
                <><Check className="h-3.5 w-3.5" /><span>Save Changes</span></>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
