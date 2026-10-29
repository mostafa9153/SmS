"use client";

import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TeacherPortalStats, TeacherAbsence } from "@/lib/types/teacher";
import { todayIST } from "@/lib/utils/date";


export function useTeacherDashboard() {
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
    todayIST(),
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
  const [attendanceDate, setAttendanceDate] = useState(todayIST());
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
      const data = await apiFetch<any>("/api/teachers/workspace-init");
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
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/teacher/login");
        return;
      }
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
        await apiFetch("/api/teachers/notifications", { method: "PATCH", json: { id } });
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadNotifsCount((prev) => Math.max(0, prev - 1));
      } else {
        await apiFetch("/api/teachers/notifications", { method: "PATCH", json: { markAllAsRead: true } });
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
      toast.error("Please select at least one date for leave / absence.");
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

      await apiFetch("/api/teachers/absence", {
        method: "POST",
        json: {
          startDate,
          endDate,
          dates: sortedDates,
          reason: finalReason,
        },
      });
      setAbsenceSuccessMsg(
        `Recorded ${sortedDates.length} leave day(s) successfully! Administrator has been notified.`
      );
      setTimeout(() => {
        setIsMarkAbsenceOpen(false);
        setAbsenceSuccessMsg("");
        setCustomAbsenceReason("");
        loadDashboardData();
      }, 1500);
    } catch (err) {
      console.error("Error recording absence:", err);
      toast.error(err instanceof Error && err.message ? err.message : "Failed to record absence");
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
      const data = await apiFetch<any>(
        `/api/teachers/attendance?className=${attendanceClass}&section=${attendanceSection}&date=${attendanceDate}`
      );
      setAttendanceRoster(data.roster || []);
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
      const data = await apiFetch<any>("/api/teachers/attendance", {
        method: "POST",
        json: {
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
        },
      });
      setAttendanceSuccessMsg(data.message || "Attendance recorded successfully!");
      setTimeout(() => setAttendanceSuccessMsg(""), 3500);
    } catch (err: any) {
      setAttendanceError(err.message || "Error saving attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  // Handle task status update (Start task)
  const handleStartTask = async (task: any) => {
    try {
      try {
        await apiFetch("/api/teachers/tasks", {
          method: "PATCH",
          json: {
            assigneeId: task.assigneeRecordId,
            status: "IN_PROGRESS",
          },
        });
      } catch (err) {
        // The teacher still goes to the module when the status update fails.
        console.error("Error marking task in progress:", err);
      }

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
      await apiFetch("/api/teachers/tasks", {
        method: "PATCH",
        json: {
          assigneeId: selectedTaskForReport.assigneeRecordId,
          status: "SUBMITTED",
          completionReport: {
            students_count: Number(reportStudentsCount) || 0,
            fees_collected: Number(reportFeesCollected) || 0,
            notes: reportNotes.trim(),
            completion_status: reportCompletionStatus,
            attachments: reportAttachments,
          },
        },
      });

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
    } catch (err) {
      console.error("Error submitting task report:", err);
    } finally {
      setSubmittingReport(false);
    }
  };

  // Check today's absence status
  const todayStr = todayIST();
  const isAbsentToday = absences.some((a) => {
    if (a.dates && Array.isArray(a.dates)) {
      return a.dates.includes(todayStr);
    }
    return a.start_date <= todayStr && a.end_date >= todayStr;
  });

  const teacherName = profile?.full_name || staff?.full_name || user?.email?.split("@")[0] || "Teacher";

  return {
    COMMON_LEAVE_REASONS,
    absenceReason,
    absenceSuccessMsg,
    absences,
    activities,
    attachmentError,
    attendanceClass,
    attendanceDate,
    attendanceError,
    attendanceRoster,
    attendanceSection,
    attendanceSuccessMsg,
    calViewMonth,
    calViewYear,
    canMarksEntry,
    canNewAdmission,
    canReAdmission,
    classes,
    customAbsenceReason,
    formatAttachmentSize,
    formatYMD,
    handleAttachmentUpload,
    handleAttendanceStatusChange,
    handleMarkAllAttendance,
    handleMarkNotificationRead,
    handleOpenFullRoutine,
    handleOpenMyWeekRoutine,
    handleOpenReportModal,
    handleRecordAbsence,
    handleRemoveAttachment,
    handleSaveAttendance,
    handleSetQuickDate,
    handleStartTask,
    handleSubmitReport,
    handleToggleAbsenceDate,
    isAbsentToday,
    isActivityFeedOpen,
    isAttendanceModalOpen,
    isChatOpen,
    isMarkAbsenceOpen,
    loading,
    loadingAttendance,
    loadingRoutine,
    notifications,
    previewAttachment,
    profile,
    reportAttachments,
    reportCompletionStatus,
    reportFeesCollected,
    reportNotes,
    reportStudentsCount,
    reportSuccess,
    router,
    routinePeriodsByDay,
    savingAttendance,
    selectedAbsenceDates,
    selectedDay,
    selectedTaskForReport,
    setAbsenceReason,
    setAttendanceClass,
    setAttendanceDate,
    setAttendanceRoster,
    setAttendanceSection,
    setCalViewMonth,
    setCalViewYear,
    setChatUnreadCount,
    setCustomAbsenceReason,
    setIsActivityFeedOpen,
    setIsAttendanceModalOpen,
    setIsChatOpen,
    setIsMarkAbsenceOpen,
    setPreviewAttachment,
    setReportCompletionStatus,
    setReportFeesCollected,
    setReportNotes,
    setReportStudentsCount,
    setSelectedDay,
    setSelectedTaskForReport,
    setShowNotifications,
    setTrackerFilterMonth,
    setTrackerFilterYear,
    showNotifications,
    staff,
    stats,
    submittingAbsence,
    submittingReport,
    tasks,
    teacherName,
    todayStr,
    trackerFilterMonth,
    trackerFilterYear,
    unreadNotifsCount,
    user,
  };
}

export type TeacherDashboardState = ReturnType<typeof useTeacherDashboard>;
