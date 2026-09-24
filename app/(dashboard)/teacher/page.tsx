"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  CheckSquare,
  History,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
import { fetchTeacherPortalStats } from "@/lib/supabase/db-teachers";
import type { TeacherPortalStats, TeacherChatMessage, TeacherAbsence } from "@/lib/types/teacher";
import { TaskCardSkeleton, StatCardsGridSkeleton } from "@/components/ui/skeleton-loaders";

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

  // Marks Entry Modal State
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [marksClass, setMarksClass] = useState("V");
  const [marksSection, setMarksSection] = useState("A");
  const [marksSubject, setMarksSubject] = useState("Mathematics");
  const [marksExamType, setMarksExamType] = useState<"S1" | "S2" | "S3">("S1");
  const [marksRoster, setMarksRoster] = useState<any[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [marksSaveSuccess, setMarksSaveSuccess] = useState(false);
  const [marksError, setMarksError] = useState("");

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

  // Teacher Lounge Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<TeacherChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Task Submission Modal State
  const [selectedTaskForReport, setSelectedTaskForReport] = useState<any | null>(null);
  const [reportStudentsCount, setReportStudentsCount] = useState("");
  const [reportFeesCollected, setReportFeesCollected] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Push subscription setup
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service Worker registration skipped/failed:", err);
      });
    }
  }, []);

  // Load teacher workspace data
  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/teacher/login");
        return;
      }
      setUser(user);

      // Fetch user role & profile
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role, full_name, permissions, staff_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(roleRow);

      if (roleRow?.staff_id) {
        const { data: staffRow } = await supabase
          .from("staff_profiles")
          .select("id, full_name, profile_picture_url, designation, unique_id")
          .eq("id", roleRow.staff_id)
          .maybeSingle();
        setStaff(staffRow);
      }

      // Fetch real-time stats
      const s = await fetchTeacherPortalStats(user.id);
      setStats(s);

      // Fetch assigned tasks
      const tasksRes = await fetch("/api/teachers/tasks");
      const tasksData = await tasksRes.json();
      if (tasksData.success) {
        setTasks(tasksData.tasks || []);
      }

      // Fetch assigned classes
      const classesRes = await fetch("/api/teachers/classes");
      const classesData = await classesRes.json();
      if (classesData.success && roleRow?.staff_id) {
        const myClasses = (classesData.assignments || []).filter(
          (a: any) => a.teacherId === roleRow.staff_id
        );
        setClasses(myClasses);
      }

      // Fetch recent activities
      const actRes = await fetch("/api/teachers/activity?limit=15");
      const actData = await actRes.json();
      if (actData.success) {
        setActivities(actData.logs || []);
      }

      // Fetch notifications
      const notifRes = await fetch("/api/teachers/notifications");
      const notifData = await notifRes.json();
      if (notifData.success) {
        setNotifications(notifData.notifications || []);
        const unread = (notifData.notifications || []).filter((n: any) => !n.is_read).length;
        setUnreadNotifsCount(unread);
      }

      // Fetch absences
      const absRes = await fetch("/api/teachers/absence");
      const absData = await absRes.json();
      if (absData.success) {
        setAbsences(absData.absences || []);
      }
    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Load chat messages
  const loadChatMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers/chat?limit=50");
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.messages || []);
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
    }
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      loadChatMessages();
    }
  }, [isChatOpen, loadChatMessages]);

  // Supabase Realtime subscription for Teacher Lounge chat
  useEffect(() => {
    const channel = supabase
      .channel("public:teacher_chat_messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_chat_messages" },
        () => {
          loadChatMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadChatMessages]);

  // Handle Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch("/api/teachers/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessageText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessageText("");
        loadChatMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Edit Message
  const handleSaveEditedMessage = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      const res = await fetch(`/api/teachers/chat/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editingText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingMessageId(null);
        setEditingText("");
        loadChatMessages();
      } else {
        alert(data.error || "Failed to update message");
      }
    } catch (err) {
      console.error("Error editing message:", err);
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const res = await fetch(`/api/teachers/chat/${msgId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        loadChatMessages();
      } else {
        alert(data.error || "Failed to delete message");
      }
    } catch (err) {
      console.error("Error deleting message:", err);
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

  // Load Marks Roster for Entry Modal
  const loadMarksRoster = useCallback(async () => {
    if (!marksClass || !marksSubject) return;
    setLoadingMarks(true);
    setMarksError("");
    try {
      const res = await fetch(
        `/api/teachers/marks?className=${marksClass}&section=${marksSection}&subject=${encodeURIComponent(
          marksSubject
        )}&examType=${marksExamType}`
      );
      const data = await res.json();
      if (data.success) {
        setMarksRoster(data.roster || []);
      } else {
        setMarksError(data.error || "Failed to fetch student marks roster");
      }
    } catch (err: any) {
      setMarksError(err.message || "Failed to load marks roster");
    } finally {
      setLoadingMarks(false);
    }
  }, [marksClass, marksSection, marksSubject, marksExamType]);

  useEffect(() => {
    if (isMarksModalOpen) {
      loadMarksRoster();
    }
  }, [isMarksModalOpen, loadMarksRoster]);

  // Handle Mark Change in table
  const handleMarkChange = (studentId: string, value: string) => {
    setMarksRoster((prev) =>
      prev.map((item) => {
        if (item.studentId === studentId) {
          const numVal = value === "" ? null : Number(value);
          return {
            ...item,
            marksObtained: numVal,
          };
        }
        return item;
      })
    );
  };

  // Save Marks to Database
  const handleSaveMarks = async () => {
    setSavingMarks(true);
    setMarksSaveSuccess(false);
    setMarksError("");
    try {
      const payload = {
        className: marksClass,
        section: marksSection,
        subject: marksSubject,
        examType: marksExamType,
        academicYear: new Date().getFullYear(),
        marks: marksRoster.map((r) => ({
          studentId: r.studentId,
          studentName: r.studentName,
          rollNo: r.rollNo,
          marksObtained: r.marksObtained,
          fullMarks: r.fullMarks || 100,
          remarks: r.remarks,
        })),
      };

      const res = await fetch("/api/teachers/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMarksSaveSuccess(true);
        setTimeout(() => setMarksSaveSuccess(false), 3000);
      } else {
        setMarksError(data.error || "Failed to save marks");
      }
    } catch (err: any) {
      setMarksError(err.message || "Error saving marks");
    } finally {
      setSavingMarks(false);
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-primary/10 border border-emerald-500/20 p-6 sm:p-8 shadow-xs backdrop-blur-xs">
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
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border p-4 shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-emerald-500" /> In-App Alerts
                    </h4>
                    <span className="text-[11px] text-muted-foreground">{notifications.length} total</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-border/40 my-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="py-2.5 px-1 space-y-1 hover:bg-muted/40 rounded-lg">
                          <p className="text-xs font-bold text-foreground">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">{n.message}</p>
                          <p className="text-[9px] text-muted-foreground/80">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Performance & Collection Metrics Bar (5 Metrics) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 hover:border-emerald-500/40 transition-all duration-300 group hover:-translate-y-0.5 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Re-Admissions</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{stats.readmissionsCount}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 hover:border-teal-500/40 transition-all duration-300 group hover:-translate-y-0.5 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Fee Collection</span>
            <div className="h-8 w-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">₹{stats.totalCollected.toLocaleString()}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 hover:border-amber-500/40 transition-all duration-300 group hover:-translate-y-0.5 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Tasks Pending</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{stats.tasksPending}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 hover:border-indigo-500/40 transition-all duration-300 group hover:-translate-y-0.5 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Tasks Finished</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{stats.tasksCompleted}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 hover:border-rose-500/40 transition-all duration-300 group hover:-translate-y-0.5 shadow-xs hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Leave Days ({new Date().getFullYear()})</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <CalendarX className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {absences
              .filter((a) => new Date(a.start_date).getFullYear() === new Date().getFullYear())
              .reduce((acc, a) => acc + (a.dates?.length || 1), 0)}{" "}
            <span className="text-xs text-muted-foreground font-medium">Days</span>
          </p>
        </div>
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
              Quick Faculty Tools &amp; Modules
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">Instant Shortcuts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Link
            href="/student-attendance"
            className="p-3.5 rounded-xl bg-muted/40 hover:bg-emerald-500/10 border border-border/70 hover:border-emerald-500/30 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Class Attendance</p>
              <p className="text-[10px] text-muted-foreground">Roll-Call Entry</p>
            </div>
          </Link>

          <button
            onClick={() => setIsMarksModalOpen(true)}
            className="p-3.5 rounded-xl bg-muted/40 hover:bg-emerald-500/10 border border-border/70 hover:border-emerald-500/30 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Summative Marks</p>
              <p className="text-[10px] text-muted-foreground">S1, S2, S3 Entry</p>
            </div>
          </button>

          <Link
            href="/admission/re"
            className="p-3.5 rounded-xl bg-muted/40 hover:bg-blue-500/10 border border-border/70 hover:border-blue-500/30 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">Re-Admission</p>
              <p className="text-[10px] text-muted-foreground">Class Upgrades</p>
            </div>
          </Link>

          <Link
            href="/invoices"
            className="p-3.5 rounded-xl bg-muted/40 hover:bg-teal-500/10 border border-border/70 hover:border-teal-500/30 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400">Fee Invoices</p>
              <p className="text-[10px] text-muted-foreground">Generate Receipts</p>
            </div>
          </Link>

          <Link
            href="/generate/marksheet"
            className="p-3.5 rounded-xl bg-muted/40 hover:bg-purple-500/10 border border-border/70 hover:border-purple-500/30 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400">Marksheets</p>
              <p className="text-[10px] text-muted-foreground">CCE Print</p>
            </div>
          </Link>

          <Link
            href="/generate/admit-cards"
            className="p-3.5 rounded-xl bg-muted/40 hover:bg-amber-500/10 border border-border/70 hover:border-amber-500/30 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">Admit Cards</p>
              <p className="text-[10px] text-muted-foreground">Exam Passes</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Routine & Timetable Placeholder Card */}
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Daily Class Routine &amp; Timetable
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">Session {new Date().getFullYear()}</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {[
            { period: "Period 1", time: "10:45 AM - 11:30 AM", cls: "X", sec: "A", subj: "Mathematics", room: "Room 102", isFirst: true },
            { period: "Period 2", time: "11:30 AM - 12:15 PM", cls: "IX", sec: "B", subj: "Life Science", room: "Bio Lab" },
            { period: "Period 3", time: "12:15 PM - 01:00 PM", cls: "VIII", sec: "A", subj: "Physical Science", room: "Room 105" },
            { period: "Period 4", time: "01:30 PM - 02:15 PM", cls: "XI", sec: "A", subj: "Physics", room: "Physics Lab" },
          ].map((slot, idx) => (
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
                <p className="text-xs font-bold text-foreground">{slot.subj}</p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>Class {slot.cls}-{slot.sec}</span>
                  <span className="italic">{slot.room}</span>
                </div>
              </div>

              {/* 1-Click Quick Attendance Button for Period */}
              <Link
                href="/student-attendance"
                className="w-full py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{slot.isFirst ? "1st Period Roll-Call" : "Take Attendance"}</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Assigned Duties & Classes Banner */}
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              My Class &amp; Subject Responsibilities
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">Academic Year {new Date().getFullYear()}</span>
        </div>

        {classes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No classes currently assigned. Contact School Administrator to map Class Teacher or Subject Teacher roles.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="px-3.5 py-2 rounded-xl bg-muted/50 border border-border/70 flex items-center gap-2.5 text-xs shadow-2xs"
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

                    {/* If report already submitted, display summary */}
                    {isSubmitted && task.completionReport && (
                      <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/80 text-[11px] text-foreground space-y-1.5">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Submission Report:
                        </p>
                        <p className="text-muted-foreground flex items-center gap-3">
                          <span>Students Handled: <span className="text-foreground font-bold">{task.completionReport.students_count || 0}</span></span>
                          <span>Fees Collected: <span className="text-foreground font-bold">₹{task.completionReport.fees_collected || 0}</span></span>
                        </p>
                        {task.completionReport.notes && (
                          <p className="italic text-muted-foreground text-[10px] mt-1">&ldquo;{task.completionReport.notes}&rdquo;</p>
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
                          onClick={() => setSelectedTaskForReport(task)}
                          className="flex-1 h-9 rounded-xl border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer group/btn2 shadow-2xs"
                        >
                          <FileCheck className="h-3.5 w-3.5 text-emerald-500 mr-1.5 group-hover/btn2:scale-110 transition-transform" />
                          <span>Submit Report</span>
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50 w-full justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Task completed &amp; submitted
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Collections & Generator Activity */}
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              My Real-Time Collection &amp; Activity Feed
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">Live Activity Tracker</span>
        </div>

        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            No recent re-admissions or fee collections recorded yet for this session.
          </p>
        ) : (
          <div className="overflow-x-auto">
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
      </section>

      {/* Floating Chat Bubble & Lounge Modal */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer relative"
          title="Teacher Lounge Chat"
        >
          {isChatOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </button>

        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[480px] rounded-3xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <div>
                  <h3 className="text-sm font-bold leading-tight">Teacher Lounge</h3>
                  <p className="text-[10px] text-emerald-100">Live Faculty Communication</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No messages yet in the lounge.</p>
                  <p className="text-[10px]">Start the conversation below!</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.user_id === user?.id;
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                        <span className="font-semibold">{isMe ? "You" : msg.sender_name}</span>
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {msg.is_edited && <span className="italic text-[9px]">(edited)</span>}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1 w-full max-w-[85%]">
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveEditedMessage(msg.id)}
                            className="h-8 px-2 bg-emerald-600 text-white text-xs"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingMessageId(null)}
                            className="h-8 px-2 text-xs"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className={`group relative p-3 rounded-2xl max-w-[85%] text-xs ${
                            isMe
                              ? "bg-emerald-600 text-white rounded-br-none shadow-xs"
                              : "bg-card border border-border text-foreground rounded-bl-none shadow-xs"
                          } ${msg.is_deleted ? "italic opacity-60" : ""}`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                          {/* 1-hour Edit / Delete Actions for Author */}
                          {isMe && !msg.is_deleted && (
                            <div className="absolute top-1 -left-14 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-background/80 p-1 rounded-md border border-border shadow-xs">
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditingText(msg.message);
                                }}
                                className="text-muted-foreground hover:text-emerald-500 p-0.5"
                                title="Edit (within 1 hour)"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-muted-foreground hover:text-rose-500 p-0.5"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card flex items-center gap-2">
              <Input
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Share an update with colleagues..."
                className="h-9 text-xs rounded-xl bg-background"
              />
              <Button
                type="submit"
                disabled={sendingMessage || !newMessageText.trim()}
                className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
              >
                {sendingMessage ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </form>
          </div>
        )}
      </div>

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
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
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

      {/* Summative Marks Entry Drawer/Dialog */}
      <Dialog open={isMarksModalOpen} onOpenChange={setIsMarksModalOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-4xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2 border-b border-border/60">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                Summative Evaluation Marks Entry (S1, S2, S3)
              </DialogTitle>
              {marksSaveSuccess && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved Successfully!
                </span>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter student scores for assigned evaluation terms. Marks auto-calculate grade benchmarks.
            </DialogDescription>
          </DialogHeader>

          {/* Filter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-border/40">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class</label>
              <Select value={marksClass} onValueChange={(val) => setMarksClass(val || "V")}>
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
              <Select value={marksSection} onValueChange={(val) => setMarksSection(val || "ALL")}>
                <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["ALL", "A", "B", "C", "D"].map((s) => (
                    <SelectItem key={s} value={s}>{s === "ALL" ? "All Sections" : `Section ${s}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject</label>
              <Select value={marksSubject} onValueChange={(val) => setMarksSubject(val || "Mathematics")}>
                <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Mathematics",
                    "Bengali",
                    "English",
                    "Physical Science",
                    "Life Science",
                    "History",
                    "Geography",
                    "Physics",
                    "Chemistry",
                    "Biology",
                  ].map((subj) => (
                    <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exam Term</label>
              <Select value={marksExamType} onValueChange={(val: any) => setMarksExamType(val || "S1")}>
                <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S1">Summative 1 (S1)</SelectItem>
                  <SelectItem value="S2">Summative 2 (S2)</SelectItem>
                  <SelectItem value="S3">Summative 3 (S3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {marksError && (
            <div className="p-3 my-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{marksError}</span>
            </div>
          )}

          {/* Roster Table */}
          <div className="flex-1 overflow-y-auto my-3 border rounded-2xl border-border/70">
            {loadingMarks ? (
              <div className="p-12 text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                <p className="text-xs">Loading student roster...</p>
              </div>
            ) : marksRoster.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No students found for Class {marksClass} ({marksSection}).</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border/80 sticky top-0 z-10 text-[11px] text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Roll</th>
                    <th className="p-3 font-semibold">Student Name</th>
                    <th className="p-3 font-semibold">Class / Sec</th>
                    <th className="p-3 font-semibold text-center w-28">Score (Max 100)</th>
                    <th className="p-3 font-semibold text-center w-24">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-foreground">
                  {marksRoster.map((st) => (
                    <tr key={st.studentId} className="hover:bg-muted/30">
                      <td className="p-3 font-bold">{st.rollNo || "—"}</td>
                      <td className="p-3 font-medium">{st.studentName}</td>
                      <td className="p-3 text-muted-foreground">
                        Class {st.className} ({st.section})
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min="0"
                          max={st.fullMarks || 100}
                          value={st.marksObtained !== null && st.marksObtained !== undefined ? st.marksObtained : ""}
                          onChange={(e) => handleMarkChange(st.studentId, e.target.value)}
                          placeholder="—"
                          className="h-8 w-20 text-center mx-auto text-xs rounded-lg font-bold bg-background"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                          {st.marksObtained !== null && st.marksObtained !== undefined
                            ? st.marksObtained >= 90
                              ? "AA"
                              : st.marksObtained >= 80
                              ? "A+"
                              : st.marksObtained >= 65
                              ? "A"
                              : st.marksObtained >= 50
                              ? "B+"
                              : st.marksObtained >= 40
                              ? "B"
                              : st.marksObtained >= 30
                              ? "C"
                              : st.marksObtained >= 25
                              ? "D"
                              : "Needs Impr."
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {marksRoster.length} students loaded for {marksSubject} ({marksExamType})
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsMarksModalOpen(false)}
                className="text-xs text-muted-foreground"
              >
                Close
              </Button>
              <Button
                onClick={handleSaveMarks}
                disabled={savingMarks || marksRoster.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer gap-1.5 shadow-xs"
              >
                {savingMarks ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>Save All Marks</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Completion Report Dialog */}
      <Dialog open={!!selectedTaskForReport} onOpenChange={(open) => !open && setSelectedTaskForReport(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-md p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-500" />
              Submit Task Completion Report
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Report your completed work for &quot;{selectedTaskForReport?.title}&quot; to the School Administrator.
            </DialogDescription>
          </DialogHeader>

          {reportSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
              <p className="text-sm font-bold text-foreground">Report Submitted Successfully!</p>
              <p className="text-xs text-muted-foreground">The administrator has been notified.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Students Handled</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 25"
                    value={reportStudentsCount}
                    onChange={(e) => setReportStudentsCount(e.target.value)}
                    className="h-9 bg-background border-border text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Total Fees Collected (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={reportFeesCollected}
                    onChange={(e) => setReportFeesCollected(e.target.value)}
                    className="h-9 bg-background border-border text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Completion Notes / Remarks</label>
                <Textarea
                  placeholder="e.g. Completed re-admission for all students in Section A. Pending 3 absent students."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="bg-background border-border text-xs rounded-xl min-h-[80px]"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedTaskForReport(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer gap-1.5 shadow-xs"
                >
                  {submittingReport ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Submit to Admin</span>
                </Button>
              </DialogFooter>
            </form>
          )}
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
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
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
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
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
