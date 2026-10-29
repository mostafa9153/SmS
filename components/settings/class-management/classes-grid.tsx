"use client";

import { GraduationCap, Plus, Edit2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getClassStreamList } from "@/lib/utils/school-profile";
import { getClassSectionTeacherItems, getSectionTeacher, isHigherSecondaryClass } from "@/components/settings/class-management/helpers";
import type { ClassManagementState } from "./use-class-management";

export function ClassesGrid({ cm }: { cm: ClassManagementState }) {
  const { classes, handleDeleteClass, handleOpenEditClass, handleQuickAddSection, handleQuickAddStreamSection, handleQuickRemoveSection, handleQuickRemoveStreamSection, setIsAddClassOpen } = cm;
  return (
    <div className="rounded-2xl border bg-card/90 shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Configured Classes &amp; Sections
          </h3>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setIsAddClassOpen(true)}
          className="rounded-xl text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add New Class</span>
        </Button>
      </div>

      <div className="divide-y">
        {classes.map((cls) => {
          const isHs = isHigherSecondaryClass(cls.code, cls.name);
          const activeStreams = isHs ? getClassStreamList(cls.stream) : [];

          return (
            <div
              key={cls.id}
              className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
            >
              {/* Left: Class identity & Code */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-[200px]">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary font-mono shrink-0 shadow-2xs">
                  {cls.code}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">{cls.name}</h4>
                    {cls.isAutoPass && (
                      <Badge variant="outline" className="text-[10px] bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200">
                        Auto-Pass
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>Room: {cls.roomNo || "Not set"}</span>
                    <span>•</span>
                    <span>Cap: {cls.capacity || 100}</span>
                  </div>
                </div>
              </div>

              {/* Middle: Sections or Stream Sections */}
              <div className="flex-1 min-w-[280px]">
                {isHs && activeStreams.length > 0 ? (
                  <div className="space-y-2">
                    {activeStreams.map((st) => {
                      const sList = (cls.streamSections && cls.streamSections[st]) || cls.sections || ["A"];
                      return (
                        <div key={st} className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-semibold text-muted-foreground min-w-[65px]">{st}:</span>
                          {sList.map((sec) => {
                            const tName = getSectionTeacher(cls, sec, st);
                            return (
                              <span
                                key={sec}
                                title={`Sec ${sec} (${st}) • Class Teacher: ${tName || "Not Assigned"}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-foreground border text-[11px] font-mono font-medium hover:border-primary/40 transition-colors"
                              >
                                Sec {sec}
                                <button
                                  type="button"
                                  onClick={() => handleQuickRemoveStreamSection(cls.id, st, sec)}
                                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                                  title="Remove section"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => handleQuickAddStreamSection(cls.id, st)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-primary/40 text-primary hover:bg-primary/5 text-[11px] font-medium transition-colors"
                            title="Add section"
                          >
                            <Plus className="h-2.5 w-2.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-muted-foreground mr-1">Sections:</span>
                    {cls.sections.map((sec) => {
                      const tName = getSectionTeacher(cls, sec);
                      return (
                        <span
                          key={sec}
                          title={`Section ${sec} • Class Teacher: ${tName || "Not Assigned"}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border text-xs font-mono font-medium hover:border-primary/40 transition-colors"
                        >
                          Section {sec}
                          <button
                            type="button"
                            onClick={() => handleQuickRemoveSection(cls.id, sec)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                            title="Remove section"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleQuickAddSection(cls.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-primary/40 text-primary hover:bg-primary/5 text-xs font-medium transition-colors"
                      title="Add section"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Section</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Section Class Teachers & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 shrink-0">
                {(() => {
                  const secTeacherItems = getClassSectionTeacherItems(cls);
                  return (
                    <div className="text-left sm:text-right text-xs">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-1">
                        {secTeacherItems.length > 1 ? "Class Teachers" : "Class Teacher"}
                      </span>
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        {secTeacherItems.map((st) => (
                          <div key={st.key} className="flex items-center gap-1.5 text-xs">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-semibold border">
                              {st.label}
                            </span>
                            <span
                              className={cn(
                                "font-semibold text-xs",
                                st.teacher ? "text-foreground" : "text-muted-foreground/60 italic font-normal text-[11px]"
                              )}
                            >
                              {st.teacher || "Not Assigned"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditClass(cls)}
                    className="h-8 px-2.5 text-xs font-semibold rounded-xl hover:bg-muted"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClass(cls.id, cls.name)}
                    className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
