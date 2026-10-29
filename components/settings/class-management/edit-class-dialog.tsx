"use client";

import { GraduationCap, Plus, BookOpen, X, FlaskConical, Landmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import { getClassStreamList } from "@/lib/utils/school-profile";
import { getNextAvailableLetter } from "@/components/settings/class-management/helpers";
import type { ClassManagementState } from "./use-class-management";

export function EditClassDialog({ cm }: { cm: ClassManagementState }) {
  const { editAutoPass, editCapacity, editClassCode, editClassName, editNextLetter, editRoom, editSectionTeachers, editSections, editStream, editStreamSections, editingClass, handleAddEditModalStreamSection, handleAddEditSection, handleRemoveEditModalStreamSection, handleRemoveEditSection, handleSaveEditClass, isEditingHs, setEditAutoPass, setEditCapacity, setEditRoom, setEditSectionTeachers, setEditStream, setEditStreamSections, setEditingClass, staffList, toggleEditStream } = cm;
  return (
    <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
      <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Edit Class Details: {editClassName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSaveEditClass} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Class Name (Locked)</Label>
              <Input value={editClassName} disabled className="text-xs h-9 bg-muted/60" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Class Code (Locked)</Label>
              <Input value={editClassCode} disabled className="text-xs h-9 bg-muted/60" />
            </div>
          </div>

          {/* HS Streams & Sections Configuration */}
          {isEditingHs ? (
            <div className="space-y-4 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Higher Secondary Academic Streams (Science, Arts, Commerce)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Choose which streams are active for this class and manage their sections
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <CustomSelect
                    value={editStream}
                    onChange={(val) => {
                      setEditStream(val);
                      const list = getClassStreamList(val);
                      setEditStreamSections((prev) => {
                        const next = { ...prev };
                        list.forEach((st) => {
                          if (!next[st] || next[st].length === 0) next[st] = ["A"];
                        });
                        return next;
                      });
                    }}
                    options={[
                      { label: "Arts Only", value: "Arts" },
                      { label: "Science Only", value: "Science" },
                      { label: "Commerce Only", value: "Commerce" },
                      { label: "Science & Arts", value: "Science / Arts" },
                      { label: "Commerce & Arts", value: "Commerce / Arts" },
                      { label: "Science & Commerce", value: "Science / Commerce" },
                      { label: "Arts / Science / Commerce (All 3 Streams)", value: "Arts / Science / Commerce" },
                    ]}
                  />
                </div>
              </div>

              {/* 3 Stream Interactive Toggle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    name: "Science",
                    label: "Science Stream",
                    icon: FlaskConical,
                    badgeBg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300",
                    activeBorder: "border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/10",
                  },
                  {
                    name: "Arts",
                    label: "Arts (Humanities)",
                    icon: BookOpen,
                    badgeBg: "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300",
                    activeBorder: "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10",
                  },
                  {
                    name: "Commerce",
                    label: "Commerce Stream",
                    icon: Landmark,
                    badgeBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300",
                    activeBorder: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10",
                  },
                ].map((streamItem) => {
                  const activeList = getClassStreamList(editStream);
                  const isChecked = activeList.includes(streamItem.name);
                  const Icon = streamItem.icon;
                  return (
                    <button
                      key={streamItem.name}
                      type="button"
                      onClick={() => toggleEditStream(streamItem.name as any)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                        isChecked
                          ? streamItem.activeBorder
                          : "bg-background border-border/80 hover:border-foreground/30 hover:bg-muted/30 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border shrink-0", streamItem.badgeBg)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">{streamItem.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {isChecked ? "Active in Curriculum" : "Disabled / Off"}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                        isChecked ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background"
                      )}>
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Per-Stream Sections Config */}
              <div className="space-y-2.5 pt-1">
                <Label className="text-xs font-semibold text-foreground">Active Sections by Stream:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {getClassStreamList(editStream).map((st) => {
                    const secs = (editStreamSections[st] && editStreamSections[st].length > 0)
                      ? editStreamSections[st]
                      : ["A"];
                    const nextLetter = getNextAvailableLetter(secs);
                    const isSci = st === "Science";
                    const isArts = st === "Arts";
                    return (
                      <div key={st} className="p-3 rounded-xl border bg-background space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                            isSci ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200"
                            : isArts ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200"
                          )}>
                            {st} Sections
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {secs.length} {secs.length === 1 ? "Section" : "Sections"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {secs.map((sec) => (
                            <span
                              key={sec}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium border"
                            >
                              Sec {sec}
                              <button
                                type="button"
                                onClick={() => handleRemoveEditModalStreamSection(st, sec)}
                                className="text-muted-foreground hover:text-destructive ml-0.5 cursor-pointer"
                                title={`Remove Section ${sec}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddEditModalStreamSection(st, nextLetter)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed text-primary text-xs font-medium hover:bg-primary/5 cursor-pointer"
                            title={`Add Section ${nextLetter}`}
                          >
                            <Plus className="h-3 w-3" /> Add {nextLetter}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-Stream Section Teachers */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <Label className="text-xs font-bold text-foreground">Section Class Teachers by Stream</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {getClassStreamList(editStream).flatMap((st) => {
                    const secs = (editStreamSections[st] && editStreamSections[st].length > 0)
                      ? editStreamSections[st]
                      : ["A"];
                    return secs.map((sec) => {
                      const key = `${st} - ${sec}`;
                      const currentTeacher =
                        editSectionTeachers[key] ||
                        editSectionTeachers[`${st}::${sec}`] ||
                        editSectionTeachers[`${sec} (${st})`] ||
                        editSectionTeachers[sec] ||
                        "";
                      return (
                        <div key={key} className="space-y-1 p-2.5 rounded-xl bg-background border">
                          <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                            <span>{st}</span>
                            <span className="text-muted-foreground font-mono">Sec {sec}:</span>
                          </span>
                          <CustomSelect
                            value={currentTeacher}
                            onChange={(val) =>
                              setEditSectionTeachers((prev) => ({
                                ...prev,
                                [key]: val,
                                [`${st}::${sec}`]: val,
                                [`${sec} (${st})`]: val,
                              }))
                            }
                            options={[
                              { label: "Select Teacher...", value: "" },
                              ...staffList.map((stf) => ({
                                label: `${stf.full_name}${stf.designation ? ` (${stf.designation})` : ""}`,
                                value: stf.full_name,
                              })),
                            ]}
                          />
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Non-HS Classes (Class V - X) regular sections and teachers */
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Active Sections</Label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {editSections.map((sec) => (
                    <span
                      key={sec}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium border"
                    >
                      Sec {sec}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditSection(sec)}
                        className="text-muted-foreground hover:text-destructive ml-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddEditSection(editNextLetter)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed text-primary text-xs font-medium hover:bg-primary/5 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add {editNextLetter}
                  </button>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-muted/20 rounded-xl border">
                <Label className="text-xs font-bold text-foreground">Section Class Teachers</Label>
                <div className="space-y-2">
                  {editSections.map((sec) => (
                    <div key={sec} className="flex items-center gap-2 text-xs">
                      <span className="w-24 font-mono font-semibold text-muted-foreground">Section {sec}:</span>
                      <CustomSelect
                        value={editSectionTeachers[sec] || editSectionTeachers[`Section ${sec}`] || ""}
                        onChange={(val) =>
                          setEditSectionTeachers((prev) => ({
                            ...prev,
                            [sec]: val,
                            [`Section ${sec}`]: val,
                          }))
                        }
                        options={[
                          { label: "Select Teacher (Unassigned)...", value: "" },
                          ...staffList.map((st) => ({
                            label: `${st.full_name}${st.designation ? ` (${st.designation})` : ""}`,
                            value: st.full_name,
                          })),
                        ]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Room No</Label>
              <Input
                value={editRoom}
                onChange={(e) => setEditRoom(e.target.value)}
                placeholder="e.g. 101"
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Capacity</Label>
              <Input
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">RTE Auto-Pass</Label>
              <CustomSelect
                value={editAutoPass}
                onChange={(val) => setEditAutoPass(val)}
                options={[
                  { label: "No (Merit / Marks)", value: "false" },
                  { label: "Yes (RTE Auto-Pass)", value: "true" },
                ]}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingClass(null)}
              className="text-xs h-8.5 cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs h-8.5 bg-primary text-primary-foreground font-semibold cursor-pointer">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
