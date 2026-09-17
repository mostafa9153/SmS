"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Clock,
  IndianRupee,
  BookOpen,
  ArrowRight,
  LogOut,
  Bell,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Send,
  UserCheck,
  ChevronRight,
  Receipt,
  FileText,
  User,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchTeacherPortalStats } from "@/lib/supabase/db-teachers";
import type { TeacherPortalStats } from "@/lib/types/teacher";
import { TaskCardSkeleton, StatCardsGridSkeleton } from "@/components/ui/skeleton-loaders";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
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
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Task Submission Modal State
  const [selectedTaskForReport, setSelectedTaskForReport] = useState<any | null>(null);
  const [reportStudentsCount, setReportStudentsCount] = useState("");
  const [reportFeesCollected, setReportFeesCollected] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

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
    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
        router.push(`/admission/re-admission?class=${task.targetClass || ""}&section=${task.targetSection || ""}`);
      } else if (task.taskType === "MARKSHEET") {
        router.push(`/generate/marksheet?class=${task.targetClass || ""}`);
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

  // Mark all notifications as read
  const handleMarkNotifsAsRead = async () => {
    try {
      await fetch("/api/teachers/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setUnreadNotifsCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/teacher/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <StatCardsGridSkeleton count={4} />
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  const teacherName = profile?.full_name || user?.email?.split("@")[0] || "Teacher";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-md shadow-emerald-500/20 shrink-0">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={28} height={28} className="object-contain" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">Marigachi High School</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                Faculty Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Welcome, {teacherName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button
                className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer"
                aria-label="Notifications"
                onClick={handleMarkNotifsAsRead}
              />
            }>
              <Bell className="h-4 w-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 flex items-center justify-center animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-slate-900 border-slate-800 text-slate-100 p-2 rounded-2xl shadow-2xl">
              <DropdownMenuLabel className="text-xs font-bold text-slate-300 px-2 py-1.5 flex items-center justify-between">
                <span>Task Notifications</span>
                <span className="text-[10px] text-slate-500 font-normal">{notifications.length} alerts</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <div className="max-h-64 overflow-y-auto space-y-1 py-1">
                {notifications.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-500 py-4">No recent notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded-xl text-xs transition-colors ${
                        n.is_read ? "bg-slate-900/40 text-slate-400" : "bg-emerald-500/10 border border-emerald-500/20 text-slate-200"
                      }`}
                    >
                      <p className="font-semibold text-white text-[11px]">{n.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.message}</p>
                      <span className="text-[9px] text-slate-500 mt-1 block">
                        {new Date(n.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* My Profile Link */}
          <Link
            href="/teacher/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 transition-colors"
          >
            <User className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">My Profile</span>
          </Link>

          {/* User Signout */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-8 rounded-xl bg-slate-800/60 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border-slate-700/60 text-xs font-semibold transition-colors cursor-pointer gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-slate-900 border border-emerald-500/20 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {teacherName} <Sparkles className="h-6 w-6 text-emerald-400" />
              </h2>
              <p className="text-sm text-slate-300">
                You have <span className="font-bold text-emerald-400">{stats.tasksPending} tasks</span> pending today. Let's make it a great day!
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-950/50 border border-slate-800/80 backdrop-blur-sm flex items-center gap-2 text-sm text-slate-300">
              <Clock className="h-4 w-4 text-emerald-400" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
        </section>

        {/* Performance & Collection Metrics Bar */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-400 transition-colors">Re-Admissions</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-100">{stats.readmissionsCount}</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-teal-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-teal-400 transition-colors">Fee Collection</span>
              <div className="h-8 w-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-100">₹{stats.totalCollected.toLocaleString()}</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-amber-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-400 transition-colors">Tasks Pending</span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-100">{stats.tasksPending}</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-400 transition-colors">Tasks Finished</span>
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-100">{stats.tasksCompleted}</p>
          </div>
        </section>

        {/* Assigned Duties & Classes Banner */}
        <section className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                My Class & Subject Responsibilities
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Session {new Date().getFullYear()}</span>
          </div>

          {classes.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No classes currently assigned. Contact School Admin to assign Class Teacher or Subject Teacher duties.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5 text-xs"
                >
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      cls.roleType === "CLASS_TEACHER"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {cls.roleType === "CLASS_TEACHER" ? "Class Teacher" : "Subject Teacher"}
                  </span>
                  <span className="font-semibold text-white">
                    Class {cls.className} ({cls.section})
                  </span>
                  {cls.subject && (
                    <span className="text-[11px] text-slate-400 font-normal">
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
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ClipboardList className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Task Hub
              </h2>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">{tasks.length} Action Items</span>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
              <CheckCircle2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">All caught up!</p>
              <p className="text-[11px] text-slate-500 mt-0.5">You have no pending tasks assigned by the administrator.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {tasks.map((task) => {
                const isSubmitted = task.myStatus === "SUBMITTED" || task.myStatus === "APPROVED";
                const isInProgress = task.myStatus === "IN_PROGRESS";

                return (
                  <div
                    key={task.id}
                    className={`group p-5 rounded-2xl border flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer ${
                      isSubmitted
                        ? "bg-slate-900/30 border-slate-800/50 opacity-70 hover:opacity-100"
                        : "bg-slate-900/80 border-slate-700/80 hover:border-emerald-500/50 shadow-lg"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase ${
                              isSubmitted
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : isInProgress
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {isSubmitted ? "Submitted" : isInProgress ? "In Progress" : "To-Do"}
                          </span>
                          {task.targetClass && (
                            <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-[10px] font-semibold border border-slate-700/50">
                              Class {task.targetClass} {task.targetSection ? `(${task.targetSection})` : ""}
                            </span>
                          )}
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800/50">
                            <Clock className="h-3.5 w-3.5 text-amber-400" /> {task.dueDate}
                          </div>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{task.description}</p>
                      )}

                      {/* If report already submitted, display summary */}
                      {isSubmitted && task.completionReport && (
                        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1.5">
                          <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Submission Report:
                          </p>
                          <p className="text-slate-400 flex items-center gap-3">
                            <span>Students Handled: <span className="text-white font-bold">{task.completionReport.students_count || 0}</span></span>
                            <span>Fees Collected: <span className="text-white font-bold">₹{task.completionReport.fees_collected || 0}</span></span>
                          </p>
                          {task.completionReport.notes && (
                            <p className="italic text-slate-500 text-[10px] mt-1">“{task.completionReport.notes}”</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between gap-3">
                      {!isSubmitted ? (
                        <>
                          <Button
                            onClick={() => handleStartTask(task)}
                            className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold text-sm transition-all group-hover:shadow-lg group-hover:shadow-emerald-500/20 cursor-pointer group/btn"
                          >
                            <span>Start Task</span>
                            <ArrowRight className="h-4 w-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedTaskForReport(task)}
                            className="flex-1 h-10 rounded-xl border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors cursor-pointer group/btn2"
                          >
                            <FileCheck className="h-4 w-4 text-emerald-400 mr-1.5 group-hover/btn2:scale-110 transition-transform" />
                            <span>Submit Report</span>
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/50 w-full justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Task completed & submitted
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
        <section className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                My Real-Time Collection & Activity Feed
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Live Tracker</span>
          </div>

          {activities.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No recent re-admissions or fee collections recorded yet for this session.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                    <th className="pb-2.5 font-semibold">Time</th>
                    <th className="pb-2.5 font-semibold">Action</th>
                    <th className="pb-2.5 font-semibold">Student Name</th>
                    <th className="pb-2.5 font-semibold">Class / Sec</th>
                    <th className="pb-2.5 font-semibold text-right">Fee Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 text-slate-500 text-[10px]">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                          {act.action_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-white">{act.target_student_name || "—"}</td>
                      <td className="py-2.5 text-slate-400">
                        {act.student_class ? `Class ${act.student_class} (${act.section || "—"})` : "—"}
                      </td>
                      <td className="py-2.5 text-right font-bold text-white">
                        {act.amount_collected > 0 ? `₹${Number(act.amount_collected).toLocaleString()}` : "₹0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Task Completion Report Dialog */}
      <Dialog open={!!selectedTaskForReport} onOpenChange={(open) => !open && setSelectedTaskForReport(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white rounded-3xl max-w-md p-6 animate-in fade-in zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-400" />
              Submit Task Completion Report
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Report your completed work for &quot;{selectedTaskForReport?.title}&quot; to the School Administrator.
            </DialogDescription>
          </DialogHeader>

          {reportSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
              <p className="text-sm font-bold text-white">Report Submitted Successfully!</p>
              <p className="text-xs text-slate-400">The administrator has been notified.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Students Handled</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 25"
                    value={reportStudentsCount}
                    onChange={(e) => setReportStudentsCount(e.target.value)}
                    className="h-9 bg-slate-950 border-slate-800 text-xs rounded-xl text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Total Fees Collected (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={reportFeesCollected}
                    onChange={(e) => setReportFeesCollected(e.target.value)}
                    className="h-9 bg-slate-950 border-slate-800 text-xs rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Completion Notes / Remarks</label>
                <Textarea
                  placeholder="e.g. Completed re-admission for all students in Section A. Pending 3 absent students."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs rounded-xl text-white min-h-[80px]"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedTaskForReport(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReport}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer gap-1.5"
                >
                  {submittingReport ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Submit to Admin</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
