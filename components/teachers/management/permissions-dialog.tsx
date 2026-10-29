"use client";

import { ApiError, apiFetch } from "@/lib/api/client";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ClassScopePanel } from "@/components/teachers/class-scope-panel";
import { Switch } from "@/components/ui/switch";
import { toastWithUndo } from "@/lib/undo/client";
import { Spinner } from "@/components/ui/spinner";
import { PERMISSION_SECTIONS } from "@/components/teachers/management/permissions";
import type { TeacherManagementState } from "./use-teacher-management";

export function PermissionsDialog({ tm }: { tm: TeacherManagementState }) {
  const { assignments, configureTeacher, expandedSections, loadData, pendingPerms, reloadAssignments, savingPerms, setConfigureTeacher, setErrorMsg, setPendingPerms, setSavingPerms, toggleAllPendingGlobally, toggleAllPendingInSection, toggleSectionExpand } = tm;
  return (
    <Dialog open={!!configureTeacher} onOpenChange={(open) => { if (!open) { setConfigureTeacher(null); setPendingPerms(null); } }}>
      <DialogContent className="rounded-3xl max-w-3xl p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-0 shadow-2xl">
        <div className="flex flex-col md:flex-row min-h-[620px] max-h-[85vh]">
          {/* Left: Permissions Accordion Panel */}
          <div className="flex-1 flex flex-col bg-card overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-border/60 bg-gradient-to-r from-primary/10 via-indigo-600/5 to-violet-600/10 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm ring-1 ring-indigo-500/20 shrink-0">
                    {configureTeacher?.fullName?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                      <span>{configureTeacher?.fullName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-normal">
                        {configureTeacher?.uniqueId}
                      </span>
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{configureTeacher?.designation || "Teaching Staff"}</p>
                  </div>
                </div>

                {/* Global Quick Actions */}
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllPendingGlobally(true)}
                    className="h-7 text-[11px] rounded-lg border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer font-semibold px-2.5"
                  >
                    Enable All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllPendingGlobally(false)}
                    className="h-7 text-[11px] rounded-lg border-border hover:bg-muted text-muted-foreground cursor-pointer font-semibold px-2.5"
                  >
                    Disable All
                  </Button>
                </div>
              </div>
            </div>

            {/* Accordion Permission Sections */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {PERMISSION_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isExpanded = !!expandedSections[sec.id];
                const activeCount = sec.items.filter((item) => !!(pendingPerms as any)?.[item.key]).length;
                const totalCount = sec.items.length;
                const isAllActive = activeCount === totalCount && totalCount > 0;
                const isPartiallyActive = activeCount > 0 && !isAllActive;

                return (
                  <div
                    key={sec.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? "bg-card border-primary/40 shadow-xs"
                        : "bg-muted/20 border-border/60 hover:border-border"
                    }`}
                  >
                    {/* Section Header */}
                    <div
                      onClick={() => toggleSectionExpand(sec.id)}
                      className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer select-none gap-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${isAllActive ? sec.badgeColor : "bg-muted text-muted-foreground"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">{sec.title}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isAllActive
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : isPartiallyActive
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {activeCount}/{totalCount} Active
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sec.desc}</p>
                        </div>
                      </div>

                      {/* Master Toggle & Expand Chevron */}
                      <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5" title={`Toggle all in ${sec.title}`}>
                          <span className="text-[10px] text-muted-foreground font-semibold hidden sm:inline">
                            {isAllActive ? "All On" : "All"}
                          </span>
                          <Switch
                            checked={isAllActive}
                            onCheckedChange={() => toggleAllPendingInSection(sec.id)}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSectionExpand(sec.id)}
                          className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Section Content (Items) */}
                    {isExpanded && (
                      <div className="p-3.5 sm:p-4 pt-1 border-t border-border/40 space-y-2 bg-muted/10 animate-in fade-in duration-200">
                        {sec.items.map((item) => {
                          const isChecked = !!(pendingPerms as any)?.[item.key];
                          return (
                            <div
                              key={item.key}
                              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                                isChecked
                                  ? "bg-card border-primary/20 shadow-2xs"
                                  : "bg-background/60 border-border/40 hover:border-border"
                              }`}
                            >
                              <div className="pr-3 min-w-0">
                                <p className="text-xs font-bold text-foreground">{item.label}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                              </div>
                              <Switch
                                checked={isChecked}
                                onCheckedChange={(val) =>
                                  setPendingPerms((prev) => (prev ? { ...prev, [item.key]: val } : prev))
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-border/60 bg-card flex items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Changes will apply immediately upon saving.
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    setConfigureTeacher(null);
                    setPendingPerms(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-xl text-xs font-bold px-6 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-sm"
                  disabled={savingPerms}
                  onClick={async () => {
                    if (!configureTeacher || !pendingPerms) return;
                    setSavingPerms(true);
                    try {
                      const saved = await apiFetch<{ undoId?: string }>("/api/teachers", {
                        method: "PATCH",
                        json: {
                          userId: configureTeacher.userId,
                          staffId: configureTeacher.id,
                          permissions: pendingPerms,
                        },
                      });
                      toastWithUndo(`Permissions saved for ${configureTeacher.fullName}`, saved.undoId, loadData);
                      setConfigureTeacher(null);
                      setPendingPerms(null);
                      loadData();
                    } catch (err) {
                      if (err instanceof ApiError) setErrorMsg(err.message || "Failed to save permissions");
                      else throw err;
                    } finally {
                      setSavingPerms(false);
                    }
                  }}
                >
                  {savingPerms ? (
                    <>
                      <Spinner className="h-3.5 w-3.5 mr-1.5" /> Saving...
                    </>
                  ) : (
                    "Save Permissions"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Class Scope Panel */}
          <div className="w-full md:w-64 shrink-0 bg-muted/40 border-t md:border-t-0 md:border-l border-border/60 flex flex-col">
            <div className="p-4 border-b border-border/60 bg-muted/20">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" /> Class Scope
              </p>
            </div>

            {configureTeacher && (
              <ClassScopePanel teacherId={configureTeacher.id} assignments={assignments} onChanged={reloadAssignments} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
