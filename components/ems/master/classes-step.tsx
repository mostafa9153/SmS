"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Plus, Trash2, RotateCcw, AlertTriangle, Users, X, GraduationCap, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { getClassColorStyle } from "@/components/ems/seat-card";
import { isHigherSecondaryClass } from "@/lib/ems/seat-arrangement-algorithm";
import { calculateHsStudentStats } from "@/components/ems/auto-allocation-wizard";
import { calculateSectionStudentStats, getSectionsForClass } from "@/components/ems/master/class-groups";
import { MissingRollsWarningButton } from "@/components/ems/master/missing-rolls-warning-button";
import type { EmsMasterState } from "./use-ems-master";

export function ClassesStep({ ems }: { ems: EmsMasterState }) {
  const { allStudents, classGroups, classes, dragOverSectionKey, draggedSectionKey, handleAddAllSectionsToGroup, handleAddSectionToGroup, handleMoveSection, handleOpenRosterForHs, handleOpenRosterForSection, handleProceedFromStep2, handleRemoveClassGroup, handleRemoveSection, handleReorderSections, handleResetGroupRolls, handleResetHsRegNos, handleResetSectionRoll, handleUpdateHsGroup, handleUpdateSectionRoll, hsConfiguredStreams, setDragOverSectionKey, setDraggedSectionKey, setStep, totalStudentsExpected } = ems;
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
      {/* Step 2 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              <span>Participating Classes & Roll Ranges</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs font-semibold px-2.5 py-1 border-border/80 bg-muted/40 text-foreground font-mono"
          >
            {classGroups.length} Classes • {classes.length} Sections • {totalStudentsExpected} Students
          </Badge>
        </div>
      </div>

      {/* Group-based Class Cards */}
      <div className="space-y-3.5">
        {classGroups.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-2xl space-y-3 bg-muted/10">
            <p className="text-xs text-muted-foreground font-medium">
              No classes selected. Please choose participating classes in Step 1.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setStep(1)}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 1
            </Button>
          </div>
        ) : (
          classGroups.map((g, gIdx) => {
            const isHs = isHigherSecondaryClass(g.class);
            const availSecs = !isHs ? getSectionsForClass(g.class, allStudents) : [];
            const selectedSecNames = new Set(g.sections.map((s) => s.section));
            const unselectedSecs = !isHs ? availSecs.filter((s) => !selectedSecNames.has(s)) : [];

            const hsStats = isHs
              ? calculateHsStudentStats(
                  allStudents,
                  g.class,
                  g.stream || "ALL",
                  g.gender || "ALL",
                  g.regNoFrom,
                  g.regNoTo,
                  g.excludedStudentIds || []
                )
              : null;

            const groupTotalStudents = isHs
              ? hsStats?.count || 0
              : g.sections.reduce((sum, s) => sum + s.enrolledCount, 0);

            const classStyle = getClassColorStyle(g.class);

            // Check if any section or HS range has modified values compared to DB stats
            const hasModifiedRolls = isHs
              ? Boolean(
                  (g.regNoFrom && hsStats && g.regNoFrom !== hsStats.minRegNo) ||
                  (g.regNoTo && hsStats && g.regNoTo !== hsStats.maxRegNo)
                )
              : g.sections.some((sec) => {
                  const stats = calculateSectionStudentStats(allStudents, g.class, sec.section);
                  return (
                    stats.totalEnrolled > 0 &&
                    (sec.rollFrom !== stats.rollFrom || sec.rollTo !== stats.rollTo)
                  );
                });

            return (
              <div
                key={g.id}
                style={{ zIndex: 40 - gIdx }}
                className={cn(
                  "relative p-3.5 sm:p-4.5 rounded-2xl border transition-all shadow-2xs space-y-3 bg-card/90 backdrop-blur-xs focus-within:z-50",
                  classStyle ? classStyle.border : "border-border/80"
                )}
              >
                {/* Class Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/40 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "h-7 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center font-mono border shadow-2xs",
                        classStyle
                          ? `${classStyle.bg} ${classStyle.textRoll} ${classStyle.border}`
                          : "bg-primary/10 text-primary border-primary/20"
                      )}
                    >
                      #{gIdx + 1}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground tracking-tight">
                        Class {g.class}
                      </span>
                    </div>

                    <Badge
                      variant="secondary"
                      className="text-[11px] font-semibold bg-muted/50 text-foreground border border-border/50 gap-1.5 py-0.5 px-2.5 h-7"
                    >
                      <Users className="h-3 w-3 text-primary" />
                      <span>
                        {isHs
                          ? `HS Board Exam • ${groupTotalStudents} Students`
                          : `${g.sections.length} Section${g.sections.length !== 1 ? "s" : ""} • ${groupTotalStudents} Students`}
                      </span>
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {hasModifiedRolls && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] text-muted-foreground hover:text-foreground rounded-lg gap-1 px-2 cursor-pointer font-medium border-border/70"
                        onClick={() => (isHs ? handleResetHsRegNos(g.id) : handleResetGroupRolls(g.id))}
                        title={
                          isHs
                            ? "Reset registration number range to default database values"
                            : "Reset all sections in this class to default database roll ranges"
                        }
                      >
                        <RotateCcw className="h-3 w-3 text-primary" />
                        <span>{isHs ? "Reset Reg Nos" : "Reset Rolls"}</span>
                      </Button>
                    )}

                    {classGroups.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1 px-2 cursor-pointer font-medium"
                        onClick={() => handleRemoveClassGroup(g.id)}
                        title={`Remove Class ${g.class}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Class</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Class Controls / Rows */}
                {isHs && hsStats ? (
                  /* Higher Secondary (Class 11 & 12) Stream & Registration Number Controls */
                  <div className="px-3.5 py-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                      {/* Stream Selector */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <GraduationCap className="h-3 w-3 text-primary" /> Stream
                        </label>
                        <CustomSelect
                          value={g.stream || "ALL"}
                          onChange={(val) => handleUpdateHsGroup(g.id, { stream: String(val) })}
                          options={[
                            { label: "All Streams", value: "ALL" },
                            ...hsConfiguredStreams.map((s) => ({ label: s, value: s })),
                          ]}
                          searchable={false}
                          className="text-xs font-medium h-8"
                        />
                      </div>

                      {/* Gender Selector */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3 text-primary" /> Gender
                        </label>
                        <CustomSelect
                          value={g.gender || "ALL"}
                          onChange={(val) => handleUpdateHsGroup(g.id, { gender: String(val) })}
                          options={[
                            { label: "All Genders", value: "ALL" },
                            { label: "Boys Only", value: "Boys" },
                            { label: "Girls Only", value: "Girls" },
                          ]}
                          searchable={false}
                          className="text-xs font-medium h-8"
                        />
                      </div>

                      {/* Board Reg No Range */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[11px] font-semibold text-muted-foreground block">
                          Board Reg No Range
                        </label>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 flex-1 bg-background/90 border border-input rounded-xl p-0.5 shadow-2xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                            <Input
                              type="text"
                              value={g.regNoFrom ?? hsStats.minRegNo}
                              onChange={(e) => handleUpdateHsGroup(g.id, { regNoFrom: e.target.value })}
                              className="h-7 text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 px-2 flex-1"
                              placeholder={hsStats.minRegNo || "From Reg No"}
                            />
                            <span className="text-muted-foreground/50 text-xs px-0.5 select-none">—</span>
                            <Input
                              type="text"
                              value={g.regNoTo ?? hsStats.maxRegNo}
                              onChange={(e) => handleUpdateHsGroup(g.id, { regNoTo: e.target.value })}
                              className="h-7 text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 px-2 flex-1"
                              placeholder={hsStats.maxRegNo || "To Reg No"}
                            />
                          </div>

                          {hasModifiedRolls && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md shrink-0 cursor-pointer"
                              onClick={() => handleResetHsRegNos(g.id)}
                              title="Reset Registration Number Range to Database Defaults"
                            >
                              <RotateCcw className="h-3 w-3 text-primary" />
                            </Button>
                          )}

                          <Badge
                            variant="secondary"
                            onClick={() => handleOpenRosterForHs(g)}
                            className={cn(
                              "h-8 px-2.5 text-[11px] font-mono font-bold border shrink-0 flex items-center gap-1.5 transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 shadow-2xs",
                              hsStats.count > 0
                                ? "border-border/70 bg-background text-foreground"
                                : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            )}
                            title="Click to view full roster and select/deselect candidates"
                          >
                            <Users className="h-3 w-3 text-primary" />
                            <span>{hsStats.count} Candidates</span>
                            {g.excludedStudentIds && g.excludedStudentIds.length > 0 && (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold text-[10px]">
                                ({g.excludedStudentIds.length} Excluded)
                              </span>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {hsStats.missingRegCount > 0 && (
                      <div className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          {hsStats.missingRegCount} student(s) in this class do not have a Board Registration Number in the database (temporary fallback to Roll No).
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Junior Classes (5-10): Standard Section Rows */
                  <div className="space-y-2">
                    {g.sections.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center space-y-2.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          All sections removed for Class {g.class}.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {availSecs.map((sec) => (
                            <Button
                              key={sec}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddSectionToGroup(g.id, sec)}
                              className="h-7 text-[11px] font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            >
                              <Plus className="h-3 w-3" /> Add Section {sec}
                            </Button>
                          ))}
                          {availSecs.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              onClick={() => handleAddAllSectionsToGroup(g.id, availSecs)}
                              className="h-7 text-[11px] font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <Plus className="h-3 w-3" /> Add All ({availSecs.length})
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      g.sections.map((sec, secIdx) => {
                        const dbStats = calculateSectionStudentStats(allStudents, g.class, sec.section);
                        const isModified =
                          dbStats.totalEnrolled > 0 &&
                          (sec.rollFrom !== dbStats.rollFrom || sec.rollTo !== dbStats.rollTo);
                        const itemKey = `${g.id}-${sec.section}`;
                        const isDraggingThis = draggedSectionKey === itemKey;
                        const isDragOverThis = dragOverSectionKey === itemKey;

                        return (
                          <div
                            key={sec.section}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", JSON.stringify({ groupId: g.id, index: secIdx }));
                              e.dataTransfer.effectAllowed = "move";
                              setDraggedSectionKey(itemKey);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (dragOverSectionKey !== itemKey) {
                                setDragOverSectionKey(itemKey);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverSectionKey === itemKey) {
                                setDragOverSectionKey(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                const raw = e.dataTransfer.getData("text/plain");
                                const parsed = JSON.parse(raw);
                                if (parsed && parsed.groupId === g.id && typeof parsed.index === "number" && parsed.index !== secIdx) {
                                  handleReorderSections(g.id, parsed.index, secIdx);
                                }
                              } catch {}
                              setDraggedSectionKey(null);
                              setDragOverSectionKey(null);
                            }}
                            onDragEnd={() => {
                              setDraggedSectionKey(null);
                              setDragOverSectionKey(null);
                            }}
                            className={cn(
                              "px-3.5 py-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative group",
                              isDraggingThis && "opacity-40 scale-[0.99] border-dashed border-primary shadow-inner",
                              isDragOverThis && "ring-2 ring-primary ring-offset-1 bg-primary/10 border-primary scale-[1.01] shadow-xs"
                            )}
                          >
                            {/* Left: Drag Handle, Quick Up/Down, Section Badge & Database Info */}
                            <div className="flex items-center gap-2 min-w-[200px] flex-wrap">
                              {/* Drag Handle & Up/Down Controls */}
                              <div className="flex items-center gap-0.5 shrink-0 mr-0.5">
                                <div
                                  title="Drag to reorder section priority"
                                  className="p-1 -ml-1 text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>

                                {g.sections.length > 1 && (
                                  <div className="flex items-center -space-x-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      disabled={secIdx === 0}
                                      onClick={() => handleMoveSection(g.id, secIdx, "up")}
                                      className="p-0.5 text-muted-foreground/60 hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground/60 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                      title={`Move Section ${sec.section} Up`}
                                    >
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={secIdx === g.sections.length - 1}
                                      onClick={() => handleMoveSection(g.id, secIdx, "down")}
                                      className="p-0.5 text-muted-foreground/60 hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground/60 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                      title={`Move Section ${sec.section} Down`}
                                    >
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              <span className="px-2.5 py-0.5 rounded-md bg-primary/12 text-primary border border-primary/20 font-bold text-xs font-mono">
                                Section {sec.section}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                {dbStats.totalEnrolled > 0 ? (
                                  <>
                                    <span
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full shrink-0 shadow-2xs",
                                        isModified ? "bg-amber-500" : "bg-emerald-500"
                                      )}
                                    />
                                    <span className="text-foreground font-semibold">
                                      {dbStats.totalEnrolled} in DB
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground/70">
                                      (Roll {dbStats.minRoll}–{dbStats.maxRoll})
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span>0 Active in DB</span>
                                  </>
                                )}
                              </div>

                              <MissingRollsWarningButton
                                classNameCode={g.class}
                                section={sec.section}
                                rollFrom={sec.rollFrom}
                                rollTo={sec.rollTo}
                                enrolledCount={sec.enrolledCount}
                                totalEnrolledInDb={dbStats.totalEnrolled}
                                missingRolls={dbStats.missingRolls}
                                missingFormatted={dbStats.missingFormatted}
                              />
                            </div>

                            {/* Right: Roll Range Inputs, Student Count Badge & Actions */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <span>Roll:</span>
                                <div className="flex items-center gap-1 bg-background/90 border border-input rounded-xl p-0.5 shadow-2xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={sec.rollFrom}
                                    onChange={(e) =>
                                      handleUpdateSectionRoll(
                                        g.id,
                                        sec.section,
                                        "rollFrom",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="h-7 w-16 text-center text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
                                    placeholder="1"
                                  />
                                  <span className="text-muted-foreground/50 text-xs px-0.5 select-none">—</span>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={sec.rollTo}
                                    onChange={(e) =>
                                      handleUpdateSectionRoll(
                                        g.id,
                                        sec.section,
                                        "rollTo",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="h-7 w-16 text-center text-xs font-mono font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
                                    placeholder="35"
                                  />
                                </div>

                                {isModified && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6.5 w-6.5 text-muted-foreground hover:text-foreground rounded-md shrink-0 cursor-pointer"
                                    onClick={() => handleResetSectionRoll(g.id, sec.section)}
                                    title={`Reset Section ${sec.section} to Roll ${dbStats.minRoll}–${dbStats.maxRoll}`}
                                  >
                                    <RotateCcw className="h-3 w-3 text-primary" />
                                  </Button>
                                )}
                              </div>

                              <Badge
                                variant="secondary"
                                onClick={() => handleOpenRosterForSection(g, sec)}
                                className={cn(
                                  "h-7 px-2.5 text-[11px] font-mono font-bold border shrink-0 flex items-center gap-1.5 transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 shadow-2xs",
                                  sec.enrolledCount > 0
                                    ? "border-border/70 bg-background text-foreground"
                                    : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                )}
                                title="Click to view full roster and select/deselect candidates"
                              >
                                <Users className="h-3 w-3 text-primary" />
                                <span>{sec.enrolledCount} Candidates</span>
                                {sec.excludedStudentIds && sec.excludedStudentIds.length > 0 && (
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold text-[10px]">
                                    ({sec.excludedStudentIds.length} Excluded)
                                  </span>
                                )}
                              </Badge>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 cursor-pointer"
                                onClick={() => handleRemoveSection(g.id, sec.section)}
                                title={`Remove Section ${sec.section}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Unselected Sections Quick-Add Bar (Junior Classes only) */}
                {!isHs && unselectedSecs.length > 0 && (
                  <div className="pt-2 border-t border-border/30 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground font-medium text-[11px]">
                      + Add Section:
                    </span>
                    {unselectedSecs.map((secName) => {
                      const secStats = calculateSectionStudentStats(allStudents, g.class, secName);
                      return (
                        <button
                          key={secName}
                          type="button"
                          onClick={() => handleAddSectionToGroup(g.id, secName)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-[11px] transition-colors cursor-pointer"
                          title={`Add Section ${secName} (${secStats.count} students in database)`}
                        >
                          <Plus className="h-2.5 w-2.5" />
                          <span>
                            Section {secName}
                            {secStats.count > 0 && (
                              <span className="text-[10px] opacity-75 ml-0.5 font-mono">
                                ({secStats.count})
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                    {unselectedSecs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleAddAllSectionsToGroup(g.id, unselectedSecs)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] transition-colors cursor-pointer ml-auto"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        <span>Add All ({unselectedSecs.length})</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Total Students to Seat:</span>
        <span className="font-bold text-sm sm:text-base text-foreground font-mono">
          {totalStudentsExpected} Students
        </span>
      </div>

      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(1)}
          className="text-xs font-semibold gap-1 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Button
          size="sm"
          onClick={handleProceedFromStep2}
          className="text-xs font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
        >
          Configure Rooms & Benches <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
