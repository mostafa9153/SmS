"use client";

import { CheckCircle2, Shield, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PERMISSION_SECTIONS } from "@/components/teachers/management/permissions";
import type { TeacherManagementState } from "./use-teacher-management";

export function AccountsTab({ tm }: { tm: TeacherManagementState }) {
  const { assignments, filteredTeachers, handleToggleBatch, searchQuery, setConfigureTeacher, setCreateAccountModal, setNewEmail, setNewPassword, setPendingPerms, setSearchQuery } = tm;
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search teacher by name or designation..." size="sm" className="max-w-sm w-full" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Click any module badge to toggle batch permissions</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {filteredTeachers.length === 0 ? (
          <EmptyState compact title="No teachers found." className="border border-border/80 rounded-2xl bg-card/60" />
        ) : (
          filteredTeachers.map((t) => {
            const initials = t.fullName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
            const teacherAssignments = assignments.filter((a: any) => a.teacherId === t.id || a.teacher_id === t.id);
            const currentPerms = t.permissions || {};
            const activePermsCount = Object.entries(currentPerms).filter(([k, v]) => k !== "allowed_classes" && v === true).length;

            return (
              <div key={t.id} className="group p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 hover:shadow-md transition-all duration-200 space-y-4">
                {/* Top Row: Teacher Info & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3.5">
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-indigo-500/20">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground text-sm truncate">{t.fullName}</p>
                        {t.hasLogin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20">
                            No Login
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {t.designation || "Teaching Staff"} · <span className="font-mono">{t.uniqueId}</span>
                        {t.email ? ` · ${t.email}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!t.hasLogin ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setCreateAccountModal(t);
                          setNewEmail(t.email || `${t.uniqueId.toLowerCase()}@school.internal`);
                          setNewPassword("School@2026");
                        }}
                        className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                      >
                        <Key className="h-3.5 w-3.5 mr-1.5" /> Enable Login
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setConfigureTeacher(t);
                          const existingPerms = t.permissions || {};
                          setPendingPerms({
                            can_generate_invoices: existingPerms.can_generate_invoices ?? true,
                            can_generate_marksheets: existingPerms.can_generate_marksheets ?? true,
                            can_generate_certificates: existingPerms.can_generate_certificates ?? false,
                            can_handle_readmission: existingPerms.can_handle_readmission ?? true,
                            can_generate_admit_cards: existingPerms.can_generate_admit_cards ?? true,
                            allowed_classes: existingPerms.allowed_classes ?? [],
                            can_view_students: existingPerms.can_view_students ?? true,
                            can_view_student_profile: existingPerms.can_view_student_profile ?? true,
                            can_edit_student_profile: existingPerms.can_edit_student_profile ?? false,
                            can_add_student_manual: existingPerms.can_add_student_manual ?? false,
                            can_bulk_upload_students: existingPerms.can_bulk_upload_students ?? false,
                            can_view_old_students: existingPerms.can_view_old_students ?? false,
                            can_handle_new_admission: existingPerms.can_handle_new_admission ?? false,
                            can_handle_new_admission_online: existingPerms.can_handle_new_admission_online ?? false,
                            can_handle_ai_scan_admission: existingPerms.can_handle_ai_scan_admission ?? false,
                            can_view_admission_applications: existingPerms.can_view_admission_applications ?? false,
                            can_view_admission_invoices: existingPerms.can_view_admission_invoices ?? false,
                            can_generate_transfer_certificate: existingPerms.can_generate_transfer_certificate ?? false,
                            can_generate_pass_certificate: existingPerms.can_generate_pass_certificate ?? false,
                            can_generate_kanyashree: existingPerms.can_generate_kanyashree ?? false,
                            can_generate_id_card: existingPerms.can_generate_id_card ?? false,
                            can_print_admission_form: existingPerms.can_print_admission_form ?? false,
                            can_generate_tabulation: existingPerms.can_generate_tabulation ?? false,
                            can_view_certificate_tracker: existingPerms.can_view_certificate_tracker ?? false,
                            can_enter_results: existingPerms.can_enter_results ?? false,
                            can_view_seating_plan: existingPerms.can_view_seating_plan ?? false,
                            can_manage_ems: existingPerms.can_manage_ems ?? false,
                            can_manage_sports: existingPerms.can_manage_sports ?? false,
                            can_view_reports: existingPerms.can_view_reports ?? false,
                          });
                        }}
                        className="h-8 rounded-xl text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer gap-1.5"
                      >
                        <Shield className="h-3.5 w-3.5" /> Configure All ({activePermsCount})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bottom Row: 5 Module Shortcut Pills (Batch Toggles) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold px-0.5">
                    <span>Module Permissions &amp; Quick Toggles:</span>
                    <span>
                      {teacherAssignments.length > 0 ? (
                        <span className="text-primary font-bold">
                          Assigned {teacherAssignments.map((a: any) => `${a.className || a.class_name}${a.section !== 'ALL' ? ` (${a.section})` : ''}`).join(", ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No class assigned</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {PERMISSION_SECTIONS.map((sec) => {
                      const Icon = sec.icon;
                      const activeCount = sec.items.filter((item) => !!currentPerms[item.key]).length;
                      const totalCount = sec.items.length;
                      const isFullyActive = activeCount === totalCount && totalCount > 0;
                      const isPartiallyActive = activeCount > 0 && !isFullyActive;

                      return (
                        <div
                          key={sec.id}
                          onClick={() => {
                            if (t.hasLogin) {
                              handleToggleBatch(t, sec.id);
                            } else {
                              setCreateAccountModal(t);
                              setNewEmail(t.email || `${t.uniqueId.toLowerCase()}@school.internal`);
                              setNewPassword("School@2026");
                            }
                          }}
                          className={`group/mod flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 select-none cursor-pointer ${
                            !t.hasLogin
                              ? "opacity-50 bg-muted/20 border-border/40 hover:opacity-80"
                              : isFullyActive
                              ? "bg-primary/5 border-primary/40 hover:bg-primary/10 shadow-xs ring-1 ring-primary/20"
                              : isPartiallyActive
                              ? "bg-muted/40 border-border/80 hover:bg-muted/60"
                              : "bg-muted/20 border-border/40 hover:bg-muted/40 text-muted-foreground"
                          }`}
                          title={t.hasLogin ? `Click to toggle all ${sec.title} permissions` : "Enable login first to configure permissions"}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`p-1 rounded-lg ${isFullyActive ? sec.badgeColor : "bg-muted text-muted-foreground"}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[11px] font-bold truncate ${isFullyActive ? "text-foreground" : "text-muted-foreground"}`}>
                                {sec.shortTitle}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                {activeCount}/{totalCount} ON
                              </p>
                            </div>
                          </div>

                          {t.hasLogin && (
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 font-bold transition-all ${
                                isFullyActive
                                  ? "bg-emerald-500 text-white"
                                  : isPartiallyActive
                                  ? "bg-amber-500/20 text-amber-600 border border-amber-500/40"
                                  : "bg-muted border border-border text-muted-foreground"
                              }`}
                            >
                              {isFullyActive ? "✓" : isPartiallyActive ? "•" : ""}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
