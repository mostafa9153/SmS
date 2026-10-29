"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Clock,
  IndianRupee,
  BookOpen,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Send,
  UserCheck,
  Receipt,
  User,
  Bell,
  Calendar,
  MessageSquare,
  X,
  Edit2,
  Trash2,
  CalendarX,
  FileSpreadsheet,
  GraduationCap,
  CreditCard,
  Layers,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  History,
  Lock,
  UserPlus,
  Printer,
  Maximize2,
  Minimize2,
  Paperclip,
  UploadCloud,
  FileText,
  Download,
  ExternalLink,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/client";
import { TeacherLoungeDrawer } from "@/components/teacher/teacher-lounge-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeacherPortalStats, TeacherChatMessage, TeacherAbsence } from "@/lib/types/teacher";
import { TaskCardSkeleton, StatCardsGridSkeleton } from "@/components/ui/skeleton-loaders";
import { Spinner } from "@/components/ui/spinner";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [staff, setStaff] = useState<any>(null);
  const [stats, setStats] = useState<TeacherPortalStats>({
    readmissionsCount: 0,
    totalCollected: 0,
    tasksPending: 0,
    tasksCompleted: 0,
    marksheetsCount: 0,
  });

  const [tasks, setTasks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isActivityFeedOpen, setIsActivityFeedOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Common Predefined Leave Reasons
  const COMMON_LEAVE_REASONS = [
    "Medical / Health Emergency",
    "Casual Leave (Personal Duty)",
    "Family / Social Event",
    "Official Educational Workshop / Training",
    "Examination / Board Duty",
    "Maternity / Paternity Leave",
    "Bereavement / Compassionate Leave",
    "Other / Custom Reason",
  ];

  // Absence & Leave Tracker State
  const [absences, setAbsences] = useState<TeacherAbsence[]>([]);
  const [isMarkAbsenceOpen, setIsMarkAbsenceOpen] = useState(false);
  const [selectedAbsenceDates, setSelectedAbsenceDates] = useState<string[]>([
    new Date().toISOString().split("T")[0],
  ]);
  const [calViewYear, setCalViewYear] = useState<number>(new Date().getFullYear());
  const [calViewMonth, setCalViewMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [absenceReason, setAbsenceReason] = useState("Medical / Health Emergency");
  const [customAbsenceReason, setCustomAbsenceReason] = useState("");
  const [submittingAbsence, setSubmittingAbsence] = useState(false);
  const [absenceSuccessMsg, setAbsenceSuccessMsg] = useState("");
  const [trackerFilterYear, setTrackerFilterYear] = useState<number>(new Date().getFullYear());
  const [trackerFilterMonth, setTrackerFilterMonth] = useState<string>("ALL");

  // Routine / Timetable state — auto-select today's day of week
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = dayNames[new Date().getDay()];
    // If Sunday, fallback to Monday, otherwise current day
    return todayName === "Sunday" ? "Monday" : todayName;
  });
  const [routinePeriodsByDay, setRoutinePeriodsByDay] = useState<Record<string, any[]>>({});
  const [loadingRoutine, setLoadingRoutine] = useState<boolean>(true);
  const [activeRoutineTitle, setActiveRoutineTitle] = useState<string | null>(null);

  // Full Routine & My Weekly Routine Navigation
  const handleOpenMyWeekRoutine = () => {
    const tId = profile?.staff_id || staff?.id || "";
    router.push(`/routine/viewer?view=teacher&teacherId=${encodeURIComponent(tId)}&from=teacher`);
  };

  const handleOpenFullRoutine = () => {
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    router.push("/routine/viewer?view=master&from=teacher");
  };

  // Student Daily Attendance Modal State
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState("V");
  const [attendanceSection, setAttendanceSection] = useState("A");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRoster, setAttendanceRoster] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState("");
  const [attendanceError, setAttendanceError] = useState("");

  // Role & Granular Permission Checks
  const isAdmin = profile?.role === "Admin";
  const canNewAdmission = isAdmin || Boolean(
    profile?.permissions?.can_handle_new_admission ||
    profile?.permissions?.can_handle_new_admission_online ||
    profile?.permissions?.can_handle_ai_scan_admission
  );
  const canReAdmission = isAdmin || Boolean(profile?.permissions?.can_handle_readmission);
  const canMarksEntry = isAdmin || Boolean(profile?.permissions?.can_enter_results);

  // Teacher Lounge Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Task Submission Modal State
  const [selectedTaskForReport, setSelectedTaskForReport] = useState<any | null>(null);
  const [reportStudentsCount, setReportStudentsCount] = useState("");
  const [reportFeesCollected, setReportFeesCollected] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportCompletionStatus, setReportCompletionStatus] = useState<"COMPLETED" | "PARTIAL">("COMPLETED");
  const [reportAttachments, setReportAttachments] = useState<
    Array<{ name: string; size: number; type: string; dataUrl: string }>
  >([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<{
    name: string;
    dataUrl: string;
    type: string;
  } | null>(null);

  const formatAttachmentSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleOpenReportModal = (task: any) => {
    setSelectedTaskForReport(task);
    setReportSuccess(false);
    setAttachmentError("");
    if (task.completionReport) {
      setReportStudentsCount(
        task.completionReport.students_count ? String(task.completionReport.students_count) : ""
      );
      setReportFeesCollected(
        task.completionReport.fees_collected ? String(task.completionReport.fees_collected) : ""
      );
      setReportNotes(task.completionReport.notes || "");
      setReportCompletionStatus(task.completionReport.completion_status || "COMPLETED");
      setReportAttachments(task.completionReport.attachments || []);
    } else {
      setReportStudentsCount("");
      setReportFeesCollected("");
      setReportNotes("");
      setReportCompletionStatus("COMPLETED");
      setReportAttachments([]);
    }
  };

  const handleAttachmentUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachmentError("");
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit

    Array.from(files).forEach((file) => {
      if (file.size > MAX_SIZE) {
        setAttachmentError(`"${file.name}" exceeds the 5MB size limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setReportAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              size: file.size,
              type: file.type || "application/octet-stream",
              dataUrl: result,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (idx: number) => {
    setReportAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Load teacher workspace data via fast consolidated endpoint
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teachers/workspace-init");
      if (res.status === 401) {
        router.replace("/teacher/login");
        return;
      }
      const data = await res.json();
      if (data.success) {
        if (data.user) setUser(data.user);
        if (data.profile) setProfile(data.profile);
        if (data.staff) setStaff(data.staff);
        if (data.stats) setStats(data.stats);
        if (data.tasks) setTasks(data.tasks);
        if (data.classes) setClasses(data.classes);
        if (data.activities) setActivities(data.activities);
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadNotifsCount(data.unreadNotifsCount ?? 0);
        }
        if (data.absences) setAbsences(data.absences);
        if (data.routine) {
          setRoutinePeriodsByDay(data.routine.periodsByDay || {});
          if (data.routine.activeRoutine?.title) {
            setActiveRoutineTitle(data.routine.activeRoutine.title);
          }
        }
      }
    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
    } finally {
      setLoading(false);
      setLoadingRoutine(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Mark notification as read handler
  const handleMarkNotificationRead = async (id?: string) => {
    try {
      if (id) {
        await fetch("/api/teachers/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadNotifsCount((prev) => Math.max(0, prev - 1));
      } else {
        await fetch("/api/teachers/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markAllAsRead: true }),
        });
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadNotifsCount(0);
      }
    } catch (e) {
      console.error("Failed to mark notification read", e);
    }
  };



  // Helper to format date YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Absence Quick Shortcuts
  const handleSetQuickDate = (type: "today" | "yesterday" | "tomorrow" | "clear") => {
    const now = new Date();
    if (type === "today") {
      setSelectedAbsenceDates([formatYMD(now)]);
    } else if (type === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setSelectedAbsenceDates([formatYMD(y)]);
    } else if (type === "tomorrow") {
      const tm = new Date(now);
      tm.setDate(tm.getDate() + 1);
      setSelectedAbsenceDates([formatYMD(tm)]);
    } else if (type === "clear") {
      setSelectedAbsenceDates([]);
    }
  };

  // Toggle single date selection in interactive calendar
  const handleToggleAbsenceDate = (dateStr: string) => {
    setSelectedAbsenceDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  // Handle Submit Absence
  const handleRecordAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAbsenceDates.length === 0) {
      alert("Please select at least one date for leave / absence.");
      return;
    }

    setSubmittingAbsence(true);
    setAbsenceSuccessMsg("");
    try {
      const sortedDates = [...selectedAbsenceDates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      const finalReason =
        absenceReason === "Other / Custom Reason"
          ? customAbsenceReason.trim() || "Other leave reasons"
          : absenceReason;

      const res = await fetch("/api/teachers/absence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          dates: sortedDates,
          reason: finalReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAbsenceSuccessMsg(
          `Recorded ${sortedDates.length} leave day(s) successfully! Administrator has been notified.`
        );
        setTimeout(() => {
          setIsMarkAbsenceOpen(false);
          setAbsenceSuccessMsg("");
          setCustomAbsenceReason("");
          loadDashboardData();
        }, 1500);
      } else {
        alert(data.error || "Failed to record absence");
      }
    } catch (err) {
      console.error("Error recording absence:", err);
    } finally {
      setSubmittingAbsence(false);
    }
  };

  // Load Student Attendance Roster
  const loadAttendanceRoster = useCallback(async () => {
    if (!attendanceClass) return;
    setLoadingAttendance(true);
    setAttendanceError("");
    try {
      const res = await fetch(
        `/api/teachers/attendance?className=${attendanceClass}&section=${attendanceSection}&date=${attendanceDate}`
      );
      const data = await res.json();
      if (data.success) {
        setAttendanceRoster(data.roster || []);
      } else {
        setAttendanceError(data.error || "Failed to load attendance roster");
      }
    } catch (err: any) {
      setAttendanceError(err.message || "Failed to load attendance");
    } finally {
      setLoadingAttendance(false);
    }
  }, [attendanceClass, attendanceSection, attendanceDate]);

  useEffect(() => {
    if (isAttendanceModalOpen) {
      loadAttendanceRoster();
    }
  }, [isAttendanceModalOpen, loadAttendanceRoster]);

  // Update single student attendance status
  const handleAttendanceStatusChange = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    setAttendanceRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  // Bulk mark all students as Present or Absent
  const handleMarkAllAttendance = (status: "PRESENT" | "ABSENT") => {
    setAttendanceRoster((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Save Student Daily Attendance
  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    setAttendanceSuccessMsg("");
    setAttendanceError("");
    try {
      const res = await fetch("/api/teachers/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: attendanceClass,
          section: attendanceSection,
          date: attendanceDate,
          records: attendanceRoster.map((r) => ({
            studentId: r.studentId,
            studentName: r.studentName,
            rollNo: r.rollNo,
            section: r.section,
            status: r.status,
            remarks: r.remarks,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceSuccessMsg(data.message || "Attendance recorded successfully!");
        setTimeout(() => setAttendanceSuccessMsg(""), 3500);
      } else {
        setAttendanceError(data.error || "Failed to save attendance");
      }
    } catch (err: any) {
      setAttendanceError(err.message || "Error saving attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  // Handle task status update (Start task)
  const handleStartTask = async (task: any) => {
    try {
      await fetch("/api/teachers/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId: task.assigneeRecordId,
          status: "IN_PROGRESS",
        }),
      });

      // Redirect directly to the appropriate module with preselected filters
      if (task.taskType === "RE_ADMISSION") {
        router.push(`/admission/re?class=${task.targetClass || ""}&section=${task.targetSection || ""}`);
      } else if (task.taskType === "MARKSHEET") {
        router.push(`/generate/marksheet?class=${task.targetClass || ""}`);
      } else if (task.taskType === "INVOICE_COLLECTION") {
        router.push(`/invoices?class=${task.targetClass || ""}`);
      } else {
        loadDashboardData();
      }
    } catch (err) {
      console.error("Error starting task:", err);
    }
  };

  // Submit task completion report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForReport) return;

    setSubmittingReport(true);
    try {
      const res = await fetch("/api/teachers/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId: selectedTaskForReport.assigneeRecordId,
          status: "SUBMITTED",
          completionReport: {
            students_count: Number(reportStudentsCount) || 0,
            fees_collected: Number(reportFeesCollected) || 0,
            notes: reportNotes.trim(),
            completion_status: reportCompletionStatus,
            attachments: reportAttachments,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setSelectedTaskForReport(null);
          setReportSuccess(false);
          setReportStudentsCount("");
          setReportFeesCollected("");
          setReportNotes("");
          setReportAttachments([]);
          loadDashboardData();
        }, 1200);
      }
    } catch (err) {
      console.error("Error submitting task report:", err);
    } finally {
      setSubmittingReport(false);
    }
  };

  // Check today's absence status
  const todayStr = new Date().toISOString().split("T")[0];
  const isAbsentToday = absences.some((a) => {
    if (a.dates && Array.isArray(a.dates)) {
      return a.dates.includes(todayStr);
    }
    return a.start_date <= todayStr && a.end_date >= todayStr;
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-28 rounded-3xl bg-muted/60 animate-pulse border border-border/60" />
        <StatCardsGridSkeleton count={4} />
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      </div>
    );
  }

  const teacherName = profile?.full_name || staff?.full_name || user?.email?.split("@")[0] || "Teacher";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up relative pb-20">
      {/* Welcome & Status Header */}
      <section className="relative rounded-3xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-primary/10 border border-emerald-500/20 p-6 sm:p-8 shadow-xs backdrop-blur-xs z-20">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                Faculty Workspace v2
              </span>
              {isAbsentToday ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center gap-1">
                  <CalendarX className="h-3 w-3" /> Marked On Leave Today
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> On Duty Today
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center gap-2">
              Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {teacherName} <Sparkles className="h-6 w-6 text-emerald-500" />
            </h2>
            <p className="text-sm text-muted-foreground">
              You have <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.tasksPending} tasks</span> pending today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl bg-background/80 hover:bg-background border border-border/80 text-foreground shadow-2xs hover:border-emerald-500/40 transition-all cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-emerald-500" /> In-App Alerts
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{notifications.length} total</span>
                        {unreadNotifsCount > 0 && (
                          <button
                            onClick={() => handleMarkNotificationRead()}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border/40 my-2 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-4">No notifications yet.</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => !n.is_read && handleMarkNotificationRead(n.id)}
                            className={`py-2.5 px-2 space-y-1 rounded-xl transition-colors cursor-pointer ${
                              !n.is_read ? "bg-emerald-500/10 hover:bg-emerald-500/15" : "hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />}
                                {n.title}
                              </p>
                              <span className="text-[9px] text-muted-foreground/80 shrink-0">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mark Absence Button */}
            <Button
              variant="outline"
              onClick={() => setIsMarkAbsenceOpen(true)}
              className="h-9 px-3.5 rounded-xl border-border bg-background/80 hover:bg-background text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer hover:border-rose-500/40"
            >
              <CalendarX className="h-3.5 w-3.5 text-rose-500" />
              <span>Mark Leave / Absence</span>
            </Button>

            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background/80 hover:bg-background border border-border/80 text-xs font-semibold text-foreground shadow-2xs hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-emerald-500" />
              <span>Profile</span>
            </Link>
          </div>
        </div>
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>

      {/* Performance & Collection Metrics Bar (5 Metrics) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard label="Re-Admissions" value={stats.readmissionsCount} icon={UserCheck} iconClassName="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Fee Collection" value={`₹${stats.totalCollected.toLocaleString()}`} icon={IndianRupee} iconClassName="text-teal-600 dark:text-teal-400" />
        <StatCard label="Tasks Pending" value={stats.tasksPending} icon={Clock} iconClassName="text-amber-600 dark:text-amber-400" />
        <StatCard label="Tasks Finished" value={stats.tasksCompleted} icon={CheckCircle2} iconClassName="text-indigo-600 dark:text-indigo-400" />
        <StatCard
          label={`Leave Days (${new Date().getFullYear()})`}
          value={absences
            .filter((a) => new Date(a.start_date).getFullYear() === new Date().getFullYear())
            .reduce((acc, a) => acc + (a.dates?.length || 1), 0)}
          icon={CalendarX}
          iconClassName="text-rose-600 dark:text-rose-400"
          valueClassName="text-rose-600 dark:text-rose-400"
        />
      </section>

      {/* Leave & Absence Tracker Section (Monthly & Yearly History) */}
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-rose-500" />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                My Absence &amp; Leave Records
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Track your monthly and yearly leave history. Preserved across academic years.
              </p>
            </div>
          </div>

          {/* Filters: Year & Month */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1.5">Year:</label>
              <select
                value={trackerFilterYear}
                onChange={(e) => setTrackerFilterYear(Number(e.target.value))}
                className="h-7 text-xs bg-transparent border-0 font-bold text-foreground cursor-pointer focus:outline-none"
              >
                {[
                  new Date().getFullYear() + 1,
                  new Date().getFullYear(),
                  new Date().getFullYear() - 1,
                  new Date().getFullYear() - 2,
                ].map((y) => (
                  <option key={y} value={y} className="bg-card text-foreground">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1.5">Month:</label>
              <select
                value={trackerFilterMonth}
                onChange={(e) => setTrackerFilterMonth(e.target.value)}
                className="h-7 text-xs bg-transparent border-0 font-bold text-foreground cursor-pointer focus:outline-none"
              >
                <option value="ALL" className="bg-card text-foreground">All Months</option>
                {[
                  { val: "1", label: "Jan" },
                  { val: "2", label: "Feb" },
                  { val: "3", label: "Mar" },
                  { val: "4", label: "Apr" },
                  { val: "5", label: "May" },
                  { val: "6", label: "Jun" },
                  { val: "7", label: "Jul" },
                  { val: "8", label: "Aug" },
                  { val: "9", label: "Sep" },
                  { val: "10", label: "Oct" },
                  { val: "11", label: "Nov" },
                  { val: "12", label: "Dec" },
                ].map((m) => (
                  <option key={m.val} value={m.val} className="bg-card text-foreground">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsMarkAbsenceOpen(true)}
              className="h-8 px-3 rounded-xl border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold gap-1 cursor-pointer"
            >
              <CalendarX className="h-3.5 w-3.5" />
              <span>+ New Leave</span>
            </Button>
          </div>
        </div>

        {/* Absence Table */}
        {(() => {
          const filteredAbsences = absences.filter((a) => {
            const d = new Date(a.start_date);
            const matchYear = d.getFullYear() === trackerFilterYear;
            const matchMonth =
              trackerFilterMonth === "ALL" || d.getMonth() + 1 === Number(trackerFilterMonth);
            return matchYear && matchMonth;
          });

          const totalLeaveDaysFiltered = filteredAbsences.reduce(
            (acc, a) => acc + (a.dates?.length || 1),
            0
          );

          if (filteredAbsences.length === 0) {
            return (
              <div className="p-8 text-center text-muted-foreground space-y-1">
                <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-500 opacity-60" />
                <p className="text-xs font-bold text-foreground">No leave records found</p>
                <p className="text-[11px]">
                  You have no absences recorded for {trackerFilterMonth === "ALL" ? `year ${trackerFilterYear}` : `selected period`}.
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Showing <strong className="text-foreground">{filteredAbsences.length}</strong> record(s)
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Total Absence: <strong className="text-base">{totalLeaveDaysFiltered}</strong> Days
                </span>
              </div>

              <div className="overflow-x-auto border border-border/70 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/70 text-[11px] text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Date Range</th>
                      <th className="p-3 font-semibold">Days Count</th>
                      <th className="p-3 font-semibold">All Dates</th>
                      <th className="p-3 font-semibold">Reason</th>
                      <th className="p-3 font-semibold text-right">Recorded On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-foreground">
                    {filteredAbsences.map((ab) => {
                      const daysCount = ab.dates?.length || 1;
                      return (
                        <tr key={ab.id} className="hover:bg-muted/25 transition-colors">
                          <td className="p-3 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {ab.start_date === ab.end_date
                              ? ab.start_date
                              : `${ab.start_date} → ${ab.end_date}`}
                          </td>
                          <td className="p-3 font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px]">
                              {daysCount} {daysCount === 1 ? "Day" : "Days"}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground text-[11px]">
                            {ab.dates && ab.dates.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {ab.dates.map((d) => (
                                  <span
                                    key={d}
                                    className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-medium"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              ab.start_date
                            )}
                          </td>
                          <td className="p-3 font-medium text-foreground">{ab.reason || "—"}</td>
                          <td className="p-3 text-right text-muted-foreground text-[11px] whitespace-nowrap">
                            {new Date(ab.created_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Quick Action Hub */}
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Quick Faculty Tools
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">Instant Shortcuts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. New Admission */}
          <button
            type="button"
            onClick={() => {
              if (!canNewAdmission) {
                showToast({
                  type: "error",
                  title: "Access Restricted",
                  description: "Admin has not granted you access for New Admission.",
                });
                return;
              }
              router.push("/admission/new");
            }}
            className={cn(
              "p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs",
              canNewAdmission
                ? "bg-muted/40 hover:bg-emerald-500/10 border-border/70 hover:border-emerald-500/40"
                : "bg-muted/20 border-border/40 opacity-70 hover:opacity-90"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0",
                  canNewAdmission
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">New Admission</p>
                <p className="text-[10px] text-muted-foreground">Student Registration</p>
              </div>
            </div>
            {!canNewAdmission && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </button>

          {/* 2. Re-Admission */}
          <button
            type="button"
            onClick={() => {
              if (!canReAdmission) {
                showToast({
                  type: "error",
                  title: "Access Restricted",
                  description: "Admin has not granted you access for Re-Admission.",
                });
                return;
              }
              router.push("/admission/re");
            }}
            className={cn(
              "p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs",
              canReAdmission
                ? "bg-muted/40 hover:bg-blue-500/10 border-border/70 hover:border-blue-500/40"
                : "bg-muted/20 border-border/40 opacity-70 hover:opacity-90"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0",
                  canReAdmission
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Re-Admission</p>
                <p className="text-[10px] text-muted-foreground">Class Upgrades</p>
              </div>
            </div>
            {!canReAdmission && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </button>

          {/* 3. Marks Entry */}
          <button
            type="button"
            onClick={() => {
              if (!canMarksEntry) {
                showToast({
                  type: "error",
                  title: "Access Restricted",
                  description: "Admin has not granted you access for Results & Marks Entry.",
                });
                return;
              }
              router.push("/results");
            }}
            className={cn(
              "p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs",
              canMarksEntry
                ? "bg-muted/40 hover:bg-amber-500/10 border-border/70 hover:border-amber-500/40"
                : "bg-muted/20 border-border/40 opacity-70 hover:opacity-90"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0",
                  canMarksEntry
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Marks Entry</p>
                <p className="text-[10px] text-muted-foreground">Summative S1, S2, S3</p>
              </div>
            </div>
            {!canMarksEntry && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Routine & Timetable Placeholder Card */}
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Daily Class Routine &amp; Timetable
            </h2>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">· Session {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenMyWeekRoutine}
              className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 cursor-pointer shadow-2xs"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>My Weekly Routine</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenFullRoutine}
              className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer shadow-2xs"
            >
              <Maximize2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Full Routine</span>
            </Button>
          </div>
        </div>

        {/* Day selection tabs with Today indicator */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {DAYS_OF_WEEK.map((day) => {
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const isActualToday = dayNames[new Date().getDay()] === day;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedDay === day
                    ? "bg-emerald-600 text-white shadow-xs"
                    : isActualToday
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                <span>{day}</span>
                {isActualToday && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      selectedDay === day
                        ? "bg-white/20 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Period Slots with 1-Click Roll-Call button */}
        {loadingRoutine ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Spinner className="h-4 w-4 text-emerald-500" />
            Loading your schedule...
          </div>
        ) : (routinePeriodsByDay[selectedDay] || []).length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-muted/20 border border-dashed border-border/70 text-xs text-muted-foreground">
            No classes scheduled for {selectedDay}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {(routinePeriodsByDay[selectedDay] || []).map((slot: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2.5 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      {slot.period}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">{slot.time}</span>
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    {slot.subj} {slot.isLab && <span className="text-[10px] text-sky-600 font-semibold">(Lab)</span>}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>{slot.cls?.startsWith("Class") ? slot.cls : `Class ${slot.cls}`}-{slot.sec}</span>
                    {slot.room ? <span className="italic">{slot.room}</span> : null}
                  </div>
                </div>

                {/* 1-Click Quick Attendance Button for Period */}
                <Link
                  href={`/student-attendance?class=${encodeURIComponent(slot.cls)}&section=${encodeURIComponent(slot.sec)}`}
                  className="w-full py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{slot.isFirst ? "1st Period Roll-Call" : "Take Attendance"}</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Assigned Duties & Classes Banner */}
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              My Class &amp; Subject Responsibilities
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Synced with Routine · {new Date().getFullYear()}
            </span>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="py-2 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="italic">
              No class duties mapped in routine for this academic year yet. Once assigned in Routine, your responsibilities will automatically appear here.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenFullRoutine}
              className="h-7 text-xs rounded-xl self-start sm:self-auto cursor-pointer"
            >
              View Full Routine
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="px-3.5 py-2 rounded-xl bg-muted/50 border border-border/70 flex items-center gap-2.5 text-xs shadow-2xs hover:border-emerald-500/40 transition-all"
              >
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    cls.roleType === "CLASS_TEACHER"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                  }`}
                >
                  {cls.roleType === "CLASS_TEACHER" ? "Class Teacher" : "Subject Teacher"}
                </span>
                <span className="font-bold text-foreground">
                  Class {cls.className} ({cls.section})
                </span>
                {cls.subject && (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    · {cls.subject}
                  </span>
                )}
                {cls.periodsPerWeek && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground font-semibold">
                    {cls.periodsPerWeek} per/wk
                  </span>
                )}
                <Link
                  href={`/student-attendance?class=${encodeURIComponent(cls.className)}&section=${encodeURIComponent(cls.section)}`}
                  title="Take Attendance for this class"
                  className="ml-0.5 p-1 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Assigned Tasks Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ClipboardList className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Task Hub
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/80">
            {tasks.length} Action Items
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border/80 text-center shadow-xs">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">All caught up!</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">You have no pending tasks assigned by the administrator.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {tasks.map((task) => {
              const isSubmitted = task.myStatus === "SUBMITTED" || task.myStatus === "APPROVED";
              const isInProgress = task.myStatus === "IN_PROGRESS";

              return (
                <div
                  key={task.id}
                  className={`group p-5 rounded-2xl border flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 ${
                    isSubmitted
                      ? "bg-card/60 border-border/60 opacity-80"
                      : "bg-card border-border hover:border-emerald-500/40 shadow-xs"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase ${
                            isSubmitted
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : isInProgress
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {isSubmitted ? "Submitted" : isInProgress ? "In Progress" : "To-Do"}
                        </span>
                        {task.targetClass && (
                          <span className="px-2 py-1 rounded-lg bg-muted text-foreground text-[10px] font-semibold border border-border/60">
                            Class {task.targetClass} {task.targetSection ? `(${task.targetSection})` : ""}
                          </span>
                        )}
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg border border-border/60">
                          <Clock className="h-3.5 w-3.5 text-amber-500" /> {task.dueDate}
                        </div>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* If report already submitted, display rich summary with attachments */}
                    {isSubmitted && task.completionReport && (
                      <div className="mt-4 p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-[11px] text-foreground space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            {task.myStatus === "APPROVED" ? "Approved by Admin" : "Report Submitted"}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            task.completionReport.completion_status === "PARTIAL"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          }`}>
                            {task.completionReport.completion_status === "PARTIAL" ? "Partial" : "Completed"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {Number(task.completionReport.students_count) > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 font-semibold text-foreground flex items-center gap-1.5 shadow-2xs">
                              <User className="h-3 w-3 text-indigo-500" />
                              Students: <strong className="font-bold">{task.completionReport.students_count}</strong>
                            </span>
                          )}
                          {Number(task.completionReport.fees_collected) > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-background border border-border/60 font-semibold text-foreground flex items-center gap-1.5 shadow-2xs">
                              <IndianRupee className="h-3 w-3 text-emerald-500" />
                              Collected: <strong className="font-bold">₹{task.completionReport.fees_collected.toLocaleString()}</strong>
                            </span>
                          )}
                        </div>

                        {task.completionReport.notes && (
                          <p className="text-muted-foreground text-xs leading-relaxed bg-background/50 p-2.5 rounded-xl border border-border/40 italic">
                            &ldquo;{task.completionReport.notes}&rdquo;
                          </p>
                        )}

                        {/* Attachments preview */}
                        {task.completionReport.attachments && task.completionReport.attachments.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-border/50">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Paperclip className="h-3 w-3 text-primary" />
                              Attached Documents ({task.completionReport.attachments.length}):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {task.completionReport.attachments.map((att: any, aIdx: number) => {
                                const isImg = att.type?.startsWith("image/");
                                return (
                                  <button
                                    key={aIdx}
                                    type="button"
                                    onClick={() => setPreviewAttachment(att)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background border border-border/70 hover:border-primary/50 text-[11px] font-medium text-foreground transition-all cursor-pointer shadow-2xs hover:bg-muted/30 group/att"
                                  >
                                    {isImg ? (
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="h-3.5 w-3.5 rounded object-cover"
                                      />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                                    )}
                                    <span className="truncate max-w-[130px] font-semibold">{att.name}</span>
                                    <span className="text-[9px] text-muted-foreground">({formatAttachmentSize(att.size)})</span>
                                    <Eye className="h-3 w-3 text-muted-foreground group-hover/att:text-primary ml-0.5" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                    {!isSubmitted ? (
                      <>
                        <Button
                          onClick={() => handleStartTask(task)}
                          className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer group/btn"
                        >
                          <span>Start Task</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenReportModal(task)}
                          className="flex-1 h-9 rounded-xl border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer group/btn2 shadow-2xs"
                        >
                          <FileCheck className="h-3.5 w-3.5 text-emerald-500 mr-1.5 group-hover/btn2:scale-110 transition-transform" />
                          <span>Submit Report</span>
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          {task.myStatus === "APPROVED" ? "Verified & Approved" : "Awaiting Admin Review"}
                        </span>
                        {task.myStatus !== "APPROVED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReportModal(task)}
                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit Report
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Collections & Generator Activity (Collapsible) */}
      <section className="rounded-2xl bg-card border border-border/80 shadow-xs transition-all overflow-hidden">
        <button
          type="button"
          onClick={() => setIsActivityFeedOpen((prev) => !prev)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              My Real-Time Collection &amp; Activity Feed
            </h2>
            {activities.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {activities.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">Live Activity Tracker</span>
            <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-transform">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isActivityFeedOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        </button>

        {isActivityFeedOpen && (
          <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 space-y-3 border-t border-border/60 animate-in fade-in-50 duration-200">
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No recent re-admissions or fee collections recorded yet for this session.
              </p>
            ) : (
              <div className="overflow-x-auto pt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[11px] text-muted-foreground">
                      <th className="pb-2.5 font-semibold">Time</th>
                      <th className="pb-2.5 font-semibold">Action</th>
                      <th className="pb-2.5 font-semibold">Student Name</th>
                      <th className="pb-2.5 font-semibold">Class / Sec</th>
                      <th className="pb-2.5 font-semibold text-right">Fee Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-foreground">
                    {activities.map((act) => (
                      <tr key={act.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 text-muted-foreground text-[10px]">
                          {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                            {act.action_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 font-medium">{act.target_student_name || "—"}</td>
                        <td className="py-2.5 text-muted-foreground">
                          {act.student_class ? `Class ${act.student_class} (${act.section || "—"})` : "—"}
                        </td>
                        <td className="py-2.5 text-right font-bold">
                          {act.amount_collected > 0 ? `₹${Number(act.amount_collected).toLocaleString()}` : "₹0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modern Teacher Lounge Drawer & Screen-wide Floating Action Portal */}
      <TeacherLoungeDrawer
        isOpen={isChatOpen}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => setIsChatOpen(false)}
        currentUser={user}
        currentProfile={profile}
        currentStaff={staff}
        onUnreadChange={setChatUnreadCount}
      />

      {/* Mark Absence Dialog (with Shortcuts, Multi-Date Selector & Calendar) */}
      <Dialog open={isMarkAbsenceOpen} onOpenChange={setIsMarkAbsenceOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-rose-500" />
              Report Teacher Absence / Leave
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select one or multiple days using instant shortcuts or click directly on the interactive calendar.
            </DialogDescription>
          </DialogHeader>

          {absenceSuccessMsg ? (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
              <p className="text-sm font-bold text-foreground">{absenceSuccessMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleRecordAbsence} className="space-y-4 pt-2">
              {/* Quick Preset Shortcut Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Quick Date Presets</span>
                  <span className="text-[10px] lowercase text-muted-foreground/80 font-normal">
                    {selectedAbsenceDates.length} day(s) selected
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate("today")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      selectedAbsenceDates.length === 1 && selectedAbsenceDates[0] === formatYMD(new Date())
                        ? "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-2xs font-bold"
                        : "bg-muted/40 border-border/70 text-foreground hover:bg-muted"
                    }`}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetQuickDate("yesterday")}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/40 border border-border/70 text-foreground hover:bg-muted transition-all cursor-pointer"
                  >
                    Yesterday
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetQuickDate("tomorrow")}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/40 border border-border/70 text-foreground hover:bg-muted transition-all cursor-pointer"
                  >
                    Tomorrow
                  </button>

                  {selectedAbsenceDates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate("clear")}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer ml-auto"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive Calendar Month Picker */}
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                {/* Calendar Month & Year Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-bold text-foreground">
                      {new Date(calViewYear, calViewMonth).toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (calViewMonth === 0) {
                          setCalViewMonth(11);
                          setCalViewYear((y) => y - 1);
                        } else {
                          setCalViewMonth((m) => m - 1);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Previous Month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalViewYear(now.getFullYear());
                        setCalViewMonth(now.getMonth());
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground rounded cursor-pointer"
                    >
                      Current
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (calViewMonth === 11) {
                          setCalViewMonth(0);
                          setCalViewYear((y) => y + 1);
                        } else {
                          setCalViewMonth((m) => m + 1);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Next Month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Day Headers (Sun - Sat) */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const firstDayIndex = new Date(calViewYear, calViewMonth, 1).getDay();
                    const totalDaysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
                    const cells = [];

                    // Leading empty slots
                    for (let i = 0; i < firstDayIndex; i++) {
                      cells.push(<div key={`empty-${i}`} className="h-8" />);
                    }

                    // Days of month
                    const todayStr = formatYMD(new Date());
                    for (let day = 1; day <= totalDaysInMonth; day++) {
                      const dateObj = new Date(calViewYear, calViewMonth, day);
                      const dateStr = formatYMD(dateObj);
                      const isSelected = selectedAbsenceDates.includes(dateStr);
                      const isToday = dateStr === todayStr;

                      cells.push(
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => handleToggleAbsenceDate(dateStr)}
                          className={`h-8 w-full rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-rose-600 text-white font-bold shadow-xs scale-105"
                              : isToday
                              ? "border border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/20"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          {day}
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white ring-2 ring-rose-600" />
                          )}
                        </button>
                      );
                    }

                    return cells;
                  })()}
                </div>
              </div>

              {/* Selected Dates Display Badges */}
              {selectedAbsenceDates.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Selected Dates ({selectedAbsenceDates.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 rounded-xl bg-muted/20 border border-border/50">
                    {[...selectedAbsenceDates].sort().map((d) => (
                      <span
                        key={d}
                        onClick={() => handleToggleAbsenceDate(d)}
                        className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-rose-500/25"
                        title="Click to remove"
                      >
                        {d} <X className="h-3 w-3" />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason Selection Dropdown & Custom Reason */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                    <span>Reason for Leave / Absence</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Select preset or custom</span>
                  </label>
                  <Select value={absenceReason} onValueChange={(val) => setAbsenceReason(val || COMMON_LEAVE_REASONS[0])}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background font-medium">
                      <SelectValue placeholder="Choose a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_LEAVE_REASONS.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Reason Textarea if "Other / Custom Reason" is selected */}
                {absenceReason === "Other / Custom Reason" && (
                  <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Specify Custom Reason:
                    </label>
                    <Textarea
                      placeholder="Please describe your specific reason for leave..."
                      value={customAbsenceReason}
                      onChange={(e) => setCustomAbsenceReason(e.target.value)}
                      className="bg-background text-xs rounded-xl min-h-[60px]"
                      required
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsMarkAbsenceOpen(false)}
                  className="text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingAbsence || selectedAbsenceDates.length === 0}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer gap-1.5 shadow-xs"
                >
                  {submittingAbsence ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <CalendarX className="h-3.5 w-3.5" />
                  )}
                  <span>
                    Submit {selectedAbsenceDates.length > 0 ? `(${selectedAbsenceDates.length} Days)` : ""} &amp; Notify Admin
                  </span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Completion Report Dialog */}
      <Dialog open={!!selectedTaskForReport} onOpenChange={(open) => !open && setSelectedTaskForReport(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-lg p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-primary/10 p-5 border-b border-border/60">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30">
                    {selectedTaskForReport?.taskType || "TASK"}
                  </span>
                  {selectedTaskForReport?.targetClass && (
                    <span className="text-xs text-muted-foreground font-semibold">
                      Class {selectedTaskForReport.targetClass} {selectedTaskForReport.targetSection ? `(${selectedTaskForReport.targetSection})` : ""}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedTaskForReport?.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submit completion breakdown, receipts, document proof &amp; remarks.
                </DialogDescription>
              </div>
            </div>
          </div>

          {reportSuccess ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-8 w-8 animate-bounce" />
              </div>
              <p className="text-base font-bold text-foreground">Report Submitted Successfully!</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Your completion report and attached documents have been forwarded to the school administration.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Completion Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReportCompletionStatus("COMPLETED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      reportCompletionStatus === "COMPLETED"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                        : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Fully Completed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportCompletionStatus("PARTIAL")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      reportCompletionStatus === "PARTIAL"
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20"
                        : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>Partially Completed</span>
                  </button>
                </div>
              </div>

              {/* Numerical Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-500" />
                    Students / Records
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 28"
                    value={reportStudentsCount}
                    onChange={(e) => setReportStudentsCount(e.target.value)}
                    className="h-10 bg-background border-border text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-500" />
                    Fees / Amount (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5400"
                    value={reportFeesCollected}
                    onChange={(e) => setReportFeesCollected(e.target.value)}
                    className="h-10 bg-background border-border text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground">
                  Task Execution Notes &amp; Observations
                </label>
                <Textarea
                  placeholder="Summarize the action taken, pending items, absent students, or any relevant remarks..."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="bg-background border-border text-xs rounded-xl min-h-[85px] leading-relaxed"
                  required
                />
              </div>

              {/* File Attachments Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                    Proof Attachments &amp; Documents
                  </label>
                  <span className="text-[10px] text-muted-foreground">PDF, Images, Excel, Docs (Max 5MB)</span>
                </div>

                <label className="border-2 border-dashed border-border/80 hover:border-emerald-500/50 hover:bg-muted/30 transition-all rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    className="hidden"
                    onChange={(e) => handleAttachmentUpload(e.target.files)}
                  />
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Click or drag files here to attach proof
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Bills, collection receipts, signed forms, or spreadsheets
                  </p>
                </label>

                {attachmentError && (
                  <p className="text-[11px] text-destructive font-medium">{attachmentError}</p>
                )}

                {/* Attached Files List */}
                {reportAttachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Attached Files ({reportAttachments.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {reportAttachments.map((att, idx) => {
                        const isImage = att.type?.startsWith("image/");
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2 text-xs hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isImage ? (
                                <img
                                  src={att.dataUrl}
                                  alt={att.name}
                                  className="h-8 w-8 rounded-lg object-cover border border-border/50 shrink-0"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate text-[11px]">
                                  {att.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatAttachmentSize(att.size)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment(att)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Preview"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(idx)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedTaskForReport(null)}
                  className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReport}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  {submittingReport ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Submit to Administrator</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Attachment Preview Modal */}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-2xl p-5 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-bold truncate max-w-md">
                {previewAttachment?.name}
              </DialogTitle>
            </div>
            {previewAttachment && (
              <a
                href={previewAttachment.dataUrl}
                download={previewAttachment.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs mr-6"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            )}
          </DialogHeader>
          <div className="py-4 flex items-center justify-center max-h-[70vh] overflow-auto">
            {previewAttachment?.type?.startsWith("image/") ? (
              <img
                src={previewAttachment.dataUrl}
                alt={previewAttachment.name}
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-sm"
              />
            ) : (
              <div className="p-8 text-center space-y-3">
                <FileText className="h-16 w-16 text-primary/60 mx-auto" />
                <p className="text-sm font-semibold">{previewAttachment?.name}</p>
                <p className="text-xs text-muted-foreground">Document file attached.</p>
                <a
                  href={previewAttachment?.dataUrl}
                  download={previewAttachment?.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                >
                  <Download className="h-4 w-4" /> Download File
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Daily Attendance / Roll-Call Dialog */}
      <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-4xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2 border-b border-border/60">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-500" />
                Student Daily Attendance / Roll-Call
              </DialogTitle>
              {attendanceSuccessMsg && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {attendanceSuccessMsg}
                </span>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Mark student attendance for your class or first period. Defaults to Present for quick 1-click recording.
            </DialogDescription>
          </DialogHeader>

          {/* Class, Section, Date Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-b border-border/50">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class</label>
              <Select value={attendanceClass} onValueChange={(val) => setAttendanceClass(val || "V")}>
                <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map((c) => (
                    <SelectItem key={c} value={c}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Section</label>
              <Select value={attendanceSection} onValueChange={(val) => setAttendanceSection(val || "A")}>
                <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["ALL", "A", "B", "C", "D"].map((s) => (
                    <SelectItem key={s} value={s}>Section {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="h-8 text-xs rounded-xl bg-background font-bold"
              />
            </div>

            {/* Quick Bulk Actions */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Action</label>
              <div className="flex items-center gap-1.5 pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAllAttendance("PRESENT")}
                  className="h-7 text-[10px] font-bold px-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                >
                  All Present
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAllAttendance("ABSENT")}
                  className="h-7 text-[10px] font-bold px-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                >
                  All Absent
                </Button>
              </div>
            </div>
          </div>

          {attendanceError && (
            <div className="p-3 my-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{attendanceError}</span>
            </div>
          )}

          {/* Roster Table */}
          <div className="flex-1 overflow-y-auto my-3 border rounded-2xl border-border/70">
            {loadingAttendance ? (
              <div className="p-12 text-center text-muted-foreground">
                <Spinner className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs">Loading students for Class {attendanceClass} ({attendanceSection})...</p>
              </div>
            ) : attendanceRoster.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold text-foreground">No students found</p>
                <p className="text-[11px]">No active students found in Class {attendanceClass} ({attendanceSection}).</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border/80 sticky top-0 z-10 text-[11px] text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Roll</th>
                    <th className="p-3 font-semibold">Student Name</th>
                    <th className="p-3 font-semibold">Class / Sec</th>
                    <th className="p-3 font-semibold text-center w-52">Attendance Status</th>
                    <th className="p-3 font-semibold">Remarks (Optional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-foreground">
                  {attendanceRoster.map((st) => (
                    <tr key={st.studentId} className="hover:bg-muted/30">
                      <td className="p-3 font-bold">{st.rollNo || "—"}</td>
                      <td className="p-3 font-medium">{st.studentName}</td>
                      <td className="p-3 text-muted-foreground">
                        Class {st.className} ({st.section})
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
                          <button
                            type="button"
                            onClick={() => handleAttendanceStatusChange(st.studentId, "PRESENT")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                              st.status === "PRESENT"
                                ? "bg-emerald-600 text-white shadow-2xs scale-105"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            P (Present)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceStatusChange(st.studentId, "ABSENT")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                              st.status === "ABSENT"
                                ? "bg-rose-600 text-white shadow-2xs scale-105"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            A (Absent)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceStatusChange(st.studentId, "LATE")}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                              st.status === "LATE"
                                ? "bg-amber-500 text-white shadow-2xs scale-105"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            L (Late)
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <Input
                          type="text"
                          placeholder="e.g. sick, doctor note"
                          value={st.remarks || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAttendanceRoster((prev) =>
                              prev.map((item) =>
                                item.studentId === st.studentId ? { ...item, remarks: val } : item
                              )
                            );
                          }}
                          className="h-7 text-xs bg-background rounded-lg max-w-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Total: <strong>{attendanceRoster.length}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Present: {attendanceRoster.filter((r) => r.status === "PRESENT").length}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                Absent: {attendanceRoster.filter((r) => r.status === "ABSENT").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAttendanceModalOpen(false)}
                className="text-xs text-muted-foreground"
              >
                Close
              </Button>
              <Button
                onClick={handleSaveAttendance}
                disabled={savingAttendance || attendanceRoster.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer gap-1.5 shadow-xs"
              >
                {savingAttendance ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Save Attendance</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
