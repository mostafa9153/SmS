"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import { getSavedAllocations, saveActiveAllocation, deleteAllocation } from "@/lib/ems/room-storage";
import { ExamType, getExamTypesForClasses, getExamTypeDisplayLabel } from "@/lib/ems/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Trash2, History, RotateCcw, Printer, GripVertical, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { normalizeClassCode } from "@/lib/ems/seat-arrangement-algorithm";
import { EmsClassMultiSelect } from "@/components/ems/master/ems-class-multi-select";
import type { EmsMasterState } from "./use-ems-master";

export function SessionStep({ ems }: { ems: EmsMasterState }) {
  const { academicYear, activeRoutineClass, confirm, currentClassRoutine, draggedRowIndex, examStartTime, examType, handleAddRoutineRow, handleAutoFillConsecutiveDates, handleCopyRoutineToAllClasses, handleMoveRow, handleProceedFromStep1, handleRemoveRoutineRow, handleResetToPresetSubjects, handleRoutineDateChange, handleRoutineSubjectText, markStepDone, routinesByClass, savedAllocations, selectedClasses, setAcademicYear, setActiveBlueprintRoomId, setActiveRoutineClass, setDraggedRowIndex, setExamStartTime, setExamType, setGeneratedAllocation, setRoutinesByClass, setSavedAllocations, setSelectedClasses, setSelectedRoomIds, setStep } = ems;
  return (
    <div className="space-y-5">
      {/* Session Details Box */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Examination Session Details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Academic Year *
            </label>
            <Input
              type="number"
              value={academicYear}
              onChange={(e) => setAcademicYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="h-10 text-xs font-mono font-bold rounded-xl bg-muted/50 opacity-100 cursor-not-allowed"
              disabled
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Participating Classes *
            </label>
            <EmsClassMultiSelect
              selectedClasses={selectedClasses}
              onChange={(newClasses) => {
                setSelectedClasses(newClasses);
                const validTypes = getExamTypesForClasses(newClasses);
                if (!validTypes.includes(examType)) {
                  setExamType(validTypes[0]);
                }
              }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Exam Type *
            </label>
            <CustomSelect
              value={examType}
              onChange={(val) => setExamType(val as ExamType)}
              options={getExamTypesForClasses(selectedClasses).map((t) => ({
                label: getExamTypeDisplayLabel(t),
                value: t,
              }))}
              searchable={false}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Exam Start Time *
            </label>
            <Input
              type="text"
              value={examStartTime}
              onChange={(e) => setExamStartTime(e.target.value)}
              placeholder="e.g. 11:00 AM"
              className="h-10 text-xs font-semibold rounded-xl bg-background"
            />
          </div>
        </div>
      </div>

      {/* Class-wise Examination Routine Builder */}
      {selectedClasses.length > 0 && (
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Class-wise Examination Routine
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoFillConsecutiveDates}
                className="h-7 text-xs font-semibold gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                title="Auto-fill consecutive exam dates skipping Sundays"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Auto-Fill Dates</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToPresetSubjects}
                className="h-7 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Reset to default preset subjects for this class"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Subjects</span>
              </Button>

              {selectedClasses.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRoutineToAllClasses}
                  className="h-7 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Copy current class routine dates to all participating classes"
                >
                  <span>Copy to All Classes</span>
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleAddRoutineRow}
                className="h-7 text-xs font-semibold gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subject</span>
              </Button>
            </div>
          </div>

          {/* Class Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedClasses.map((cls) => {
              const norm = normalizeClassCode(cls);
              const isSelected = activeRoutineClass === norm;
              const count = routinesByClass[norm]?.length || 0;
              return (
                <button
                  key={norm}
                  type="button"
                  onClick={() => setActiveRoutineClass(norm)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>Class {norm}</span>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.2 rounded font-bold",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Routine Table for Active Class */}
          {activeRoutineClass && (
            <div className="space-y-2">
              {currentClassRoutine.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    No subjects in routine for Class {activeRoutineClass}.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleResetToPresetSubjects}
                      className="text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Load Preset Subjects</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddRoutineRow}
                      className="text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Subject</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border/80 overflow-hidden bg-background">
                  <div className="flex items-center gap-2 p-2.5 bg-muted/50 border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="w-14 text-center shrink-0">Order</div>
                    <div className="w-36 sm:w-44 shrink-0">Date</div>
                    <div className="w-28 sm:w-36 shrink-0">Day</div>
                    <div className="flex-1 min-w-0">Subject (Auto-loaded)</div>
                    <div className="w-10 text-right shrink-0"></div>
                  </div>

                  <div className="divide-y divide-border/60">
                    {currentClassRoutine.map((item, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(idx));
                          setDraggedRowIndex(idx);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from =
                            draggedRowIndex !== null
                              ? draggedRowIndex
                              : parseInt(e.dataTransfer.getData("text/plain"), 10);
                          if (!isNaN(from) && from !== idx) {
                            handleMoveRow(from, idx);
                          }
                          setDraggedRowIndex(null);
                        }}
                        onDragEnd={() => setDraggedRowIndex(null)}
                        className={cn(
                          "flex items-center gap-2 p-2 sm:p-2.5 text-xs transition-colors group",
                          draggedRowIndex === idx
                            ? "opacity-40 bg-primary/10 border-dashed border-primary"
                            : "hover:bg-muted/30"
                        )}
                      >
                        {/* Drag Handle & Order Controls */}
                        <div className="w-14 flex items-center justify-center gap-0.5 shrink-0 text-muted-foreground">
                          <span
                            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted hover:text-foreground transition-colors"
                            title="Drag to reorder exam routine"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveRow(idx, idx - 1)}
                              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed leading-none"
                              title="Move up"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === currentClassRoutine.length - 1}
                              onClick={() => handleMoveRow(idx, idx + 1)}
                              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed leading-none"
                              title="Move down"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Date Input */}
                        <div className="w-36 sm:w-44 shrink-0">
                          <Input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleRoutineDateChange(idx, e.target.value)}
                            className="h-8 text-xs font-mono rounded-lg bg-background border-input"
                          />
                        </div>

                        {/* Auto Day Display */}
                        <div className="w-28 sm:w-36 shrink-0 flex items-center">
                          <span
                            className={cn(
                              "text-xs font-semibold px-2 py-1 rounded-md inline-block truncate",
                              item.day
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-muted-foreground italic"
                            )}
                          >
                            {item.day || "Select date"}
                          </span>
                        </div>

                        {/* Subject Direct Input (Preset Auto-Loaded, Editable) */}
                        <div className="flex-1 min-w-0">
                          <Input
                            type="text"
                            value={item.subject}
                            onChange={(e) => handleRoutineSubjectText(idx, e.target.value)}
                            placeholder="Subject name"
                            className="h-8 text-xs font-semibold rounded-lg bg-background border-input text-foreground"
                          />
                        </div>

                        {/* Remove Row Button */}
                        <div className="w-10 text-right shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRoutineRow(idx)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                            title="Remove exam day"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleProceedFromStep1}
              className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              Configure Classes & Students <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* When no classes selected yet, show proceed button inside box */}
      {selectedClasses.length === 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleProceedFromStep1}
            className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          >
            Configure Classes & Students <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Recent Exam Seating Plans History (Last 10 Saved Arrangements) */}
      {savedAllocations.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <History className="h-4 w-4 text-primary" />
              <span>Recent Exam Seating Plans History</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              Last {Math.min(10, savedAllocations.length)} Saved in Database
            </Badge>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {savedAllocations.slice(0, 10).map((plan, pIdx) => {
              return (
                <div
                  key={plan.id || `plan-${pIdx}`}
                  className="rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-colors p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs group"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20 mt-0.5 sm:mt-0 font-mono font-bold text-[11px] w-8 h-8 flex items-center justify-center">
                      #{pIdx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground flex flex-wrap items-center gap-2">
                        <span className="truncate">{plan.title || `${plan.examType} (${plan.academicYear})`}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono font-bold shrink-0">
                          {plan.summary?.totalStudents || 0} Students
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          • {plan.summary?.totalRooms || plan.roomAllocations?.length || 0} Room(s)
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>Saved on {new Date(plan.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(plan.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {plan.summary?.classesAllocated && plan.summary.classesAllocated.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                              Classes: {plan.summary.classesAllocated.join(", ")}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        saveActiveAllocation(plan);
                        setGeneratedAllocation(plan);
                        if (plan.academicYear) setAcademicYear(plan.academicYear);
                        if (plan.examType) setExamType(plan.examType);
                        if (plan.examStartTime) setExamStartTime(plan.examStartTime);
                        if (plan.routinesByClass) setRoutinesByClass(plan.routinesByClass);
                        const planClasses = plan.summary?.classesAllocated || (plan as any)?.classesConfig?.map((c: any) => c.class);
                        if (planClasses && planClasses.length > 0) {
                          const cleaned = planClasses
                            .map((c: string) => normalizeClassCode(c.split("-")[0].trim()))
                            .filter(Boolean);
                          setSelectedClasses(Array.from(new Set(cleaned)));
                        }
                        setActiveBlueprintRoomId(plan.roomAllocations[0]?.roomId || "");
                        setSelectedRoomIds(plan.roomAllocations.map((r) => r.roomId));
                        markStepDone(1);
                        markStepDone(2);
                        markStepDone(3);
                        markStepDone(4);
                        setStep(4);
                      }}
                      className="h-8 text-xs font-semibold gap-1.5 hover:border-primary/40 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-primary" /> View Blueprint
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        saveActiveAllocation(plan);
                        setGeneratedAllocation(plan);
                        if (plan.academicYear) setAcademicYear(plan.academicYear);
                        if (plan.examType) setExamType(plan.examType);
                        if (plan.examStartTime) setExamStartTime(plan.examStartTime);
                        if (plan.routinesByClass) setRoutinesByClass(plan.routinesByClass);
                        const planClasses = plan.summary?.classesAllocated || (plan as any)?.classesConfig?.map((c: any) => c.class);
                        if (planClasses && planClasses.length > 0) {
                          const cleaned = planClasses
                            .map((c: string) => normalizeClassCode(c.split("-")[0].trim()))
                            .filter(Boolean);
                          setSelectedClasses(Array.from(new Set(cleaned)));
                        }
                        setActiveBlueprintRoomId(plan.roomAllocations[0]?.roomId || "");
                        setSelectedRoomIds(plan.roomAllocations.map((r) => r.roomId));
                        markStepDone(1);
                        markStepDone(2);
                        markStepDone(3);
                        markStepDone(4);
                        setStep(5);
                      }}
                      className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-xs hover:scale-[1.01] active:scale-[0.98] transition-all"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print Suite
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await confirm({ title: "Are you sure you want to delete this saved seating plan?", destructive: true })) {
                          await deleteAllocation(plan.id);
                          const remaining = getSavedAllocations();
                          setSavedAllocations(remaining);
                        }
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                      title="Delete saved plan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
