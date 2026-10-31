"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { normalizeClassToCode } from "@/lib/routine/routine-sync";
import { isSubjectLab, isDefaultLabSubject } from "@/lib/utils/marks-config";
import { detectSubjectStream } from "@/lib/routine/routine-helpers";
import { Spinner } from "@/components/ui/spinner";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SubjectScheduleSection } from "./subject-schedule-section";

import type { RoutineSubjectsState } from "./use-routine-subjects";

export function SubjectDialog({ tab }: { tab: RoutineSubjectsState }) {
  const { activeClassPresets, configuredStreamsForActive, currentClassSubjects, dialogMode, dlgFormStream, dlgLabSessions, dlgName, dlgPeriodFormat, dlgPeriodsPerWeek, dlgTheoryPeriods, editDialogOpen, editGroup, handleDlgClose, handleDlgSubmit, isCurrentClassHs, isDlgSubmitting, marksSchemes, schedule, setDlgFormStream, setDlgIsCommon, setDlgIsLab, setDlgLabSessions, setDlgName, setDlgPeriodFormat, setDlgPeriodsPerWeek, setDlgTheoryPeriods, targetClassForForm } = tab;

  const changeFormat = (val: "single" | "both" | "lab") => {
    setDlgPeriodFormat(val);
    setDlgIsLab(val !== "single");
    if (val === "both") {
      const th = dlgTheoryPeriods > 0 ? dlgTheoryPeriods : 4;
      const lb = dlgLabSessions > 0 ? dlgLabSessions : 1;
      setDlgTheoryPeriods(th);
      setDlgLabSessions(lb);
      setDlgPeriodsPerWeek(th + lb * 2);
    } else if (val === "single") {
      const th = dlgTheoryPeriods > 0 ? dlgTheoryPeriods : 5;
      setDlgTheoryPeriods(th);
      setDlgPeriodsPerWeek(th);
    } else {
      const lb = dlgLabSessions > 0 ? dlgLabSessions : 1;
      setDlgLabSessions(lb);
      setDlgPeriodsPerWeek(lb * 2);
    }
  };
  return (
    <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) handleDlgClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-3.5">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 pr-6">
            {dialogMode === "add" ? (
              <><Plus className="w-4 h-4 text-primary" />Add Subject to {targetClassForForm}</>
            ) : (
              <><Edit2 className="w-4 h-4 text-primary" />{editGroup ? "Edit Group" : "Edit Subject"}</>
            )}
            <Badge variant="outline" className="ml-auto text-[10px] font-mono">{targetClassForForm}</Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleDlgSubmit} className="flex max-h-[85vh] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
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

          {/* Format + Stream */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Format</Label>
              <SegmentedControl
                value={dlgPeriodFormat}
                onChange={changeFormat}
                options={[
                  { value: "single", label: "Theory" },
                  { value: "both", label: "Theory + Lab" },
                  { value: "lab", label: "Lab" },
                ]}
              />
            </div>
            {isCurrentClassHs && (
              <div className="space-y-1.5 min-w-40 flex-1">
                <Label className="text-xs font-semibold">Stream</Label>
                <Select
                  value={dlgFormStream}
                  onValueChange={(val) => { if (!val) return; setDlgFormStream(val); setDlgIsCommon(val === "Common"); }}
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

          {/* Weekly load */}
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-3">
            {dlgPeriodFormat !== "lab" && (
              <LoadField
                label={dlgPeriodFormat === "both" ? "Theory / Week" : "Periods / Week"}
                value={dlgTheoryPeriods}
                max={dlgPeriodFormat === "both" ? 12 : 18}
                onChange={(val) => {
                  setDlgTheoryPeriods(val);
                  setDlgPeriodsPerWeek(dlgPeriodFormat === "both" ? val + dlgLabSessions * 2 : val);
                }}
              />
            )}
            {dlgPeriodFormat !== "single" && (
              <LoadField
                label="Lab Classes / Week"
                value={dlgLabSessions}
                max={6}
                suffix="× 2"
                onChange={(val) => {
                  setDlgLabSessions(val);
                  setDlgPeriodsPerWeek(dlgPeriodFormat === "both" ? dlgTheoryPeriods + val * 2 : val * 2);
                }}
              />
            )}
            <Badge variant="outline" className="ml-auto h-8 px-3 font-mono text-xs font-bold bg-background text-primary border-primary/30">
              {dlgPeriodsPerWeek} p/wk
            </Badge>
          </div>

          <div className="border-t pt-4">
            <SubjectScheduleSection tab={tab} />
          </div>
          </div>

          <DialogFooter className="m-0 rounded-none border-t bg-muted/30 px-5 py-3">
            <Button type="button" variant="outline" size="sm" onClick={handleDlgClose} className="h-8 text-xs px-3">
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isDlgSubmitting || !dlgName.trim() || schedule.blocked} className="h-8 text-xs font-semibold px-4 gap-1.5">
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

function LoadField({ label, value, max, suffix, onChange }: { label: string; value: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={1}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(1, parseInt(e.target.value, 10) || 1)))}
          className="h-8 w-20 text-xs font-mono font-semibold"
          required
        />
        {suffix && <span className="text-[11px] font-mono text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
