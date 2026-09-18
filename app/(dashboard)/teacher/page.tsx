"use client";

import { useState, useEffect, useCallback } from "react";
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
import { fetchTeacherPortalStats } from "@/lib/supabase/db-teachers";
import type { TeacherPortalStats } from "@/lib/types/teacher";
import { TaskCardSkeleton, StatCardsGridSkeleton } from "@/components/ui/skeleton-loaders";

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-primary/10 border border-emerald-500/20 p-6 sm:p-8 shadow-xs backdrop-blur-xs">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                Faculty Workspace
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center gap-2">
              Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {teacherName} <Sparkles className="h-6 w-6 text-emerald-500" />
            </h2>
            <p className="text-sm text-muted-foreground">
              You have <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.tasksPending} tasks</span> pending today. Have a productive session!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background/80 hover:bg-background border border-border/80 text-xs font-semibold text-foreground shadow-2xs hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-emerald-500" />
              <span>My Profile</span>
            </Link>
            <div className="px-3.5 py-2 rounded-xl bg-background/80 border border-border/80 flex items-center gap-2 text-xs text-foreground shadow-2xs font-medium">
              <Clock className="h-3.5 w-3.5 text-emerald-500" />
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Performance & Collection Metrics Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
      </section>

      {/* Assigned Duties & Classes Banner */}
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              My Class & Subject Responsibilities
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
                          <p className="italic text-muted-foreground text-[10px] mt-1">“{task.completionReport.notes}”</p>
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
      <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              My Real-Time Collection & Activity Feed
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

      {/* Task Completion Report Dialog */}
      <Dialog open={!!selectedTaskForReport} onOpenChange={(open) => !open && setSelectedTaskForReport(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-300">
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
    </div>
  );
}
