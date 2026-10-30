"use client";

import { CheckCircle2, ClipboardList, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ALL_CLASSES, ALL_SECTIONS } from "@/components/teachers/management/constants";
import type { TeacherManagementState } from "./use-teacher-management";

export function AssignTaskDialog({ tm }: { tm: TeacherManagementState }) {
  const { createTaskModal, handleCreateTask, selectedTeacherIdsForTask, setCreateTaskModal, setSelectedTeacherIdsForTask, setTaskDescription, setTaskDueDate, setTaskTargetClass, setTaskTargetSection, setTaskTitle, setTaskType, submitting, taskDescription, taskDueDate, taskTargetClass, taskTargetSection, taskTitle, taskType, teachers } = tm;
  return (
    <Dialog open={createTaskModal} onOpenChange={setCreateTaskModal}>
      <DialogContent className="rounded-3xl max-w-3xl p-0 overflow-hidden border-0">
        <div className="flex flex-col md:flex-row w-full h-[600px] max-h-[85vh]">
          {/* Left Panel - Form */}
          <div className="w-full md:w-2/3 flex flex-col bg-card">
            <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 p-6 pb-4 rounded-tl-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-background/50 rounded-xl backdrop-blur-sm">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    Delegate Task
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-1">
                    Assign operational tasks to one or more teachers.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="create-task-form" onSubmit={handleCreateTask} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Task Title</Label>
                  <Input
                    placeholder="e.g. Handle Class 5 Section A Re-admission"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="h-11 text-base font-medium rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Task Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "RE_ADMISSION", label: "Re-Admission", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50" },
                      { id: "MARKSHEET", label: "Marksheet", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50" },
                      { id: "INVOICE_COLLECTION", label: "Fee Collection", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50" },
                      { id: "GENERAL", label: "General", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" }
                    ].map((type) => {
                      const isSelected = taskType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setTaskType(type.id as any)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${type.color} ${
                            isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-70"
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Due Date</Label>
                    <Input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="h-10 rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Target Class</Label>
                    <Select value={taskTargetClass} onValueChange={(val) => setTaskTargetClass(val || "V")}>
                      <SelectTrigger className="w-full h-10 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_CLASSES.map((c) => (
                          <SelectItem key={c} value={c}>Class {c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Section</Label>
                    <Select value={taskTargetSection} onValueChange={(val) => setTaskTargetSection(val || "ALL")}>
                      <SelectTrigger className="w-full h-10 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>Section {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Instructions / Notes</Label>
                  <Textarea
                    placeholder="Specific instructions for assigned teachers..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="rounded-2xl min-h-[80px] resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-border/40 bg-card">
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateTaskModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="create-task-form"
                  disabled={submitting || selectedTeacherIdsForTask.length === 0}
                  className="font-bold rounded-xl px-6"
                >
                  {submitting ? "Assigning..." : "Assign Task"}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Teacher Selection */}
          <div className="w-full md:w-1/3 bg-muted/50 flex flex-col border-l border-border/40">
            <div className="p-4 border-b border-border/40 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Assign Teachers</h3>
                {selectedTeacherIdsForTask.length > 0 && (
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {selectedTeacherIdsForTask.length} selected
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  className="pl-9 h-9 text-xs rounded-xl bg-background border-border/60"
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase();
                    const rows = document.querySelectorAll('.teacher-card-row');
                    rows.forEach((row) => {
                      const name = row.getAttribute('data-name')?.toLowerCase() || '';
                      if (name.includes(val)) {
                        (row as HTMLElement).style.display = 'flex';
                      } else {
                        (row as HTMLElement).style.display = 'none';
                      }
                    });
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {teachers.map((t) => {
                const isSelected = selectedTeacherIdsForTask.includes(t.id);
                const initials = t.fullName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
                
                return (
                  <div
                    key={t.id}
                    data-name={t.fullName}
                    className={`teacher-card-row flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 border ${
                      isSelected 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-background border-transparent hover:border-border/60"
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTeacherIdsForTask(
                          selectedTeacherIdsForTask.filter((id) => id !== t.id)
                        );
                      } else {
                        setSelectedTeacherIdsForTask([...selectedTeacherIdsForTask, t.id]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                        {initials}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold truncate">{t.fullName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{t.designation || "Teacher"}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>

            {selectedTeacherIdsForTask.length > 0 && (
              <div className="p-3 border-t border-border/40 bg-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setSelectedTeacherIdsForTask([])}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
