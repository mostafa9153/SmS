"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchStudents, markStudentsDropOut, archiveStalePendingStudents } from "@/lib/data/students";
import type { Student, StudentStatus, Semester, StudentFilters } from "@/lib/types";
import { StatusBadge } from "@/components/students/status-badge";
import { StudentRoundAvatar } from "@/components/students/student-round-avatar";
import { QuickReAdmitDialog } from "@/components/students/quick-re-admit-dialog";
import { IssueTcDialog } from "@/components/students/issue-tc-dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Clock,
  Search,
  ArrowLeft,
  GraduationCap,
  FileText,
  UserX,
  UserCheck,
  MoreHorizontal,
  RotateCcw,
  Archive,
  CheckCircle2,
  Users,
  ChevronRight,
  Filter,
  Eye,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const ALL_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const SECTIONS = ["A", "B", "C", "D"];

const PENDING_STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All Pending Statuses", value: "" },
  { label: "Promoted (Pending)", value: "Promoted But Not Admitted" },
  { label: "Detained (Pending)", value: "Detained" },
  { label: "Supplementary", value: "Supplementary" },
  { label: "Compartmental", value: "Compartmental" },
  { label: "Sent Up M.P.", value: "Sent Up M.P." },
  { label: "10th Test Fail", value: "10th test fail" },
  { label: "Board Fail (C.C)", value: "exam fail - C.C" },
  { label: "Board Fail (CCHS)", value: "C.C.H.S." },
  { label: "Not Admitted", value: "Not Admitted" },
];

function getTargetClassRecommendation(currentClass: string, status: string): string {
  if (status === "Detained" || status === "10th test fail" || status === "C.C.H.S.") {
    return `Repeat Class ${currentClass}`;
  }
  const idx = ALL_CLASSES.indexOf(currentClass);
  if (idx >= 0 && idx < ALL_CLASSES.length - 1) {
    return `Promote to Class ${ALL_CLASSES[idx + 1]}`;
  }
  if (currentClass === "X") return "Admit to Class XI";
  if (currentClass === "XII") return "Passed Out / Alumni";
  return `Class ${currentClass}`;
}

export function PendingStudentsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters State
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<Semester | "">("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

  // Selection & Dialog States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickReAdmitStudent, setQuickReAdmitStudent] = useState<Student | null>(null);
  const [issueTcStudent, setIssueTcStudent] = useState<Student | null>(null);
  const [dropOutConfirmOpen, setDropOutConfirmOpen] = useState<boolean>(false);
  const [dropOutTargetStudents, setDropOutTargetStudents] = useState<Student[]>([]);
  const [archiveStaleConfirmOpen, setArchiveStaleConfirmOpen] = useState<boolean>(false);
  const [isArchivingStale, setIsArchivingStale] = useState(false);

  const isHS = selectedClass === "XI" || selectedClass === "XII";

  // Query Pending Students
  const filters: StudentFilters = useMemo(
    () => ({
      studentType: "pending",
      class: selectedClass || undefined,
      section: selectedSection || undefined,
      semester: selectedSemester || undefined,
      status: (selectedStatus as StudentStatus) || undefined,
      query: searchQuery.trim() || undefined,
    }),
    [selectedClass, selectedSection, selectedSemester, selectedStatus, searchQuery]
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pending-students", filters, page],
    queryFn: () => searchStudents(filters, page, pageSize, "summary"),
  });

  const students = data?.data || [];
  const totalCount = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  // Metrics breakdown
  const metrics = useMemo(() => {
    let promoted = 0;
    let detained = 0;
    let supplementary = 0;
    let examFail = 0;
    let notAdmitted = 0;

    for (const s of students) {
      const st = s.currentStatus;
      if (st === "Promoted But Not Admitted") promoted++;
      else if (st === "Detained") detained++;
      else if (st === "Supplementary" || st === "Compartmental") supplementary++;
      else if (st === "10th test fail" || st === "exam fail - C.C" || st === "C.C.H.S." || st === "Sent Up M.P.") examFail++;
      else if (st === "Not Admitted") notAdmitted++;
    }

    return { total: totalCount, promoted, detained, supplementary, examFail, notAdmitted };
  }, [students, totalCount]);

  // Multi-select helpers
  const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedIds.has(s.id));
  }, [students, selectedIds]);

  // Drop Out Mutation
  const dropOutMutation = useMutation({
    mutationFn: (ids: string[]) => markStudentsDropOut(ids, "Marked Drop Out from Pending Register"),
    onSuccess: (res) => {
      toast.success(res.message || "Marked students as Drop Out");
      setSelectedIds(new Set());
      setDropOutConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pending-students"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["old-students"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark Drop Out");
    },
  });

  // Archive Stale Handler
  async function handleArchiveStale() {
    setIsArchivingStale(true);
    try {
      const res = await archiveStalePendingStudents();
      toast.success(res.message || `Archived ${res.count} stale student(s) to Drop Out.`);
      setArchiveStaleConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pending-students"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["old-students"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to archive stale students");
    } finally {
      setIsArchivingStale(false);
    }
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-3.5 sm:space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            title="Back"
            className="rounded-xl p-2 min-h-[38px] min-w-[38px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer border"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-amber-600" />
              Pending Students Register
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : totalCount}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setArchiveStaleConfirmOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
            title="Archive unattended pending records older than 1 year to Drop Out"
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Archive Stale (&gt;1 Yr)</span>
          </Button>

          <Link href="/admission/re">
            <Button
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Re-Admission Portal</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="rounded-2xl border bg-card p-3 sm:p-4 space-y-3 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Class Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Class</label>
            <CustomSelect
              value={selectedClass}
              onChange={(val) => {
                setSelectedClass(val);
                setSelectedSemester("");
                setPage(1);
              }}
              options={[
                { label: "All Classes", value: "" },
                ...ALL_CLASSES.map((c) => ({ label: `Class ${c}`, value: c })),
              ]}
            />
          </div>

          {/* Section Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Section</label>
            <CustomSelect
              value={selectedSection}
              onChange={(val) => {
                setSelectedSection(val);
                setPage(1);
              }}
              options={[
                { label: "All Sections", value: "" },
                ...SECTIONS.map((s) => ({ label: `Section ${s}`, value: s })),
              ]}
            />
          </div>

          {/* Status Filter */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Pending Status</label>
            <CustomSelect
              value={selectedStatus}
              onChange={(val) => {
                setSelectedStatus(val);
                setPage(1);
              }}
              options={PENDING_STATUS_FILTERS}
            />
          </div>

          {/* Search Query Input */}
          <div className="col-span-2 sm:col-span-2">
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Search Student</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Name, Roll, School ID, PEN, Mobile..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border bg-background text-xs placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Semester Sub-Bar if Higher Secondary */}
        {isHS && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-[11px] font-bold text-muted-foreground">Semester:</span>
            <div className="inline-flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border">
              {(["", "Sem 1", "Sem 2", "Sem 3", "Sem 4"] as const).map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem as any)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    selectedSemester === sem
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sem || "All Semesters"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Multi-Select Toolbar */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 px-4 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <CheckSquare className="h-4 w-4" />
            <span>{selectedIds.size} student(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDropOutTargetStudents(selectedStudents);
                setDropOutConfirmOpen(true);
              }}
              className="h-7 text-xs font-semibold gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200"
            >
              <UserX className="h-3 w-3" />
              <span>Mark Drop Out</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="h-7 text-xs font-medium text-muted-foreground"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Students Data Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] font-bold text-muted-foreground">
                <th className="p-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center p-0.5 rounded hover:bg-muted text-muted-foreground"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Student Info</th>
                <th className="p-3">Enrolled Class</th>
                <th className="p-3">Pending Status</th>
                <th className="p-3">Recommended Target</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3 text-center"><Skeleton className="h-4 w-4 mx-auto" /></td>
                    <td className="p-3"><Skeleton className="h-8 w-48" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-32" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-36" /></td>
                    <td className="p-3 text-right"><Skeleton className="h-7 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-xs text-foreground">No pending students found</p>
                    <p className="text-[11px] mt-0.5">All students are actively enrolled or archived.</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isChecked = selectedIds.has(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        isChecked ? "bg-primary/5" : ""
                      )}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(student.id)}
                          className="flex items-center justify-center p-0.5 rounded hover:bg-muted text-muted-foreground"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      {/* Student Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <StudentRoundAvatar
                            name={student.name}
                            photoUrl={student.photoUrl}
                            size="sm"
                            className="h-8 w-8 text-xs shrink-0"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/students/${student.id}`}
                              className="font-bold text-foreground hover:text-primary hover:underline truncate block"
                            >
                              {student.name}
                            </Link>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                              <span>{student.schoolId || "No School ID"}</span>
                              {student.pen && <span>• PEN: {student.pen}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Enrolled Class */}
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          Class {student.presentClass}-{student.presentSection}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Roll #{student.presentRoll}
                          {student.presentSemester && ` • ${student.presentSemester}`}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <StatusBadge status={student.currentStatus} />
                      </td>

                      {/* Target Class Recommendation */}
                      <td className="p-3 text-xs font-medium text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {getTargetClassRecommendation(student.presentClass, student.currentStatus)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickReAdmitStudent(student)}
                            className="h-7 text-xs px-2.5 gap-1 font-semibold hover:bg-primary/10 hover:text-primary border-primary/30"
                            title="Re-Admit Student"
                          >
                            <UserCheck className="h-3 w-3" />
                            <span>Re-Admit</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-7 w-7 p-0 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => setQuickReAdmitStudent(student)}
                                className="text-xs font-semibold gap-2 cursor-pointer"
                              >
                                <UserCheck className="h-3.5 w-3.5 text-primary" />
                                Quick Re-Admit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setIssueTcStudent(student)}
                                className="text-xs font-semibold gap-2 text-amber-600 cursor-pointer"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Issue TC (TC Out)
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setDropOutTargetStudents([student]);
                                  setDropOutConfirmOpen(true);
                                }}
                                className="text-xs font-semibold gap-2 text-rose-600 cursor-pointer"
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Mark Drop Out
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => router.push(`/students/${student.id}`)}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Profile
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {students.length} of {totalCount} pending students
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs px-2.5"
              >
                Previous
              </Button>
              <span className="font-semibold text-foreground px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 text-xs px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <QuickReAdmitDialog
        open={!!quickReAdmitStudent}
        onOpenChange={(open) => !open && setQuickReAdmitStudent(null)}
        student={quickReAdmitStudent}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["pending-students"] });
          queryClient.invalidateQueries({ queryKey: ["students"] });
        }}
      />

      <IssueTcDialog
        open={!!issueTcStudent}
        onOpenChange={(open) => !open && setIssueTcStudent(null)}
        student={issueTcStudent}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["pending-students"] });
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["old-students"] });
        }}
      />


      {/* Drop Out Confirmation Dialog */}
      <Dialog open={dropOutConfirmOpen} onOpenChange={setDropOutConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] p-5">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <UserX className="h-4 w-4" />
              Confirm Drop Out ({dropOutTargetStudents.length} Student{dropOutTargetStudents.length > 1 ? "s" : ""})
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2 text-muted-foreground">
            <p>
              Are you sure you want to mark {dropOutTargetStudents.length === 1 ? <strong className="text-foreground font-semibold">{dropOutTargetStudents[0]?.name}</strong> : `${dropOutTargetStudents.length} selected students`} as <strong className="text-rose-600 font-semibold">Drop Out</strong>?
            </p>
            <p>
              These students will be moved out of the Active/Pending rosters into the <strong className="text-foreground font-semibold">Old Students Register</strong>.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDropOutConfirmOpen(false)}
              disabled={dropOutMutation.isPending}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => dropOutMutation.mutate(dropOutTargetStudents.map((s) => s.id))}
              disabled={dropOutMutation.isPending}
              className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white"
            >
              {dropOutMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Drop Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Stale Confirmation Dialog */}
      <Dialog open={archiveStaleConfirmOpen} onOpenChange={setArchiveStaleConfirmOpen}>
        <DialogContent className="sm:max-w-[420px] p-5">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
              <Archive className="h-4 w-4" />
              Archive Stale Pending Records
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2 text-muted-foreground">
            <p>
              This 1-click cleanup will automatically transition all pending students who have remained unattended for over 1 academic year to <strong className="text-foreground font-semibold">Drop Out</strong>.
            </p>
            <p>
              Their historical academic records will be preserved in the <strong className="text-foreground font-semibold">Old Students Register</strong>.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setArchiveStaleConfirmOpen(false)}
              disabled={isArchivingStale}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleArchiveStale}
              disabled={isArchivingStale}
              className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isArchivingStale ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Execute Stale Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
