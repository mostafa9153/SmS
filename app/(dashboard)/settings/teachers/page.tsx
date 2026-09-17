"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  IndianRupee,
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Key,
  BookOpen,
  ClipboardList,
  FileCheck,
  Download,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Activity,
  Trophy,
  TrendingUp,
  Eye,
  BarChart3,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import type { TeacherPermissions } from "@/lib/types/teacher";
import { DataTableSkeleton, StatCardsGridSkeleton } from "@/components/ui/skeleton-loaders";

const ALL_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const ALL_SECTIONS = ["ALL", "A", "B", "C", "D"];

export interface PermissionItem {
  key: keyof TeacherPermissions;
  label: string;
  desc: string;
}

export interface PermissionSection {
  id: string;
  title: string;
  shortTitle: string;
  icon: any;
  color: string;
  badgeColor: string;
  activeBadge: string;
  desc: string;
  items: PermissionItem[];
}

export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    id: "admission",
    title: "Student Admission",
    shortTitle: "Admission",
    icon: FileCheck,
    color: "text-blue-500",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    activeBadge: "bg-blue-600 text-white",
    desc: "Re-admission, offline/online new entry & application logs",
    items: [
      { key: "can_handle_readmission", label: "Re-Admission Processing", desc: "Process student re-admissions & class upgrades" },
      { key: "can_handle_new_admission", label: "New Admission (Offline / Manual)", desc: "Enter manual offline admission forms" },
      { key: "can_handle_new_admission_online", label: "New Admission (Online Form)", desc: "Process incoming online applications" },
      { key: "can_handle_ai_scan_admission", label: "AI Scan Admission", desc: "Use camera/doc scanner for admission" },
      { key: "can_view_admission_applications", label: "View Admission Applications", desc: "Browse & inspect applicant submissions" },
      { key: "can_view_admission_invoices", label: "View Admission Invoices", desc: "Inspect admission receipts & payments" },
    ],
  },
  {
    id: "students",
    title: "Students Management",
    shortTitle: "Students",
    icon: GraduationCap,
    color: "text-emerald-500",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    activeBadge: "bg-emerald-600 text-white",
    desc: "Directory, student profiles, edits & bulk imports",
    items: [
      { key: "can_view_students", label: "View Students Directory", desc: "Search & browse active students list" },
      { key: "can_view_student_profile", label: "View Student Profile", desc: "Inspect student personal, parent & academic info" },
      { key: "can_edit_student_profile", label: "Edit Student Profile", desc: "Modify student bio, phone, roll, blood group" },
      { key: "can_add_student_manual", label: "Add Student Manually", desc: "Directly create new student record" },
      { key: "can_bulk_upload_students", label: "Bulk CSV Upload", desc: "Import multi-student spreadsheet" },
      { key: "can_view_old_students", label: "Old / Alumni Students", desc: "Browse alumni & past academic records" },
    ],
  },
  {
    id: "documents",
    title: "Generate & Documents",
    shortTitle: "Documents",
    icon: ClipboardList,
    color: "text-purple-500",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    activeBadge: "bg-purple-600 text-white",
    desc: "Invoices, marksheets, admit cards, ID cards & certificates",
    items: [
      { key: "can_generate_invoices", label: "Fee Invoices", desc: "Create & print fee payment receipts" },
      { key: "can_generate_marksheets", label: "Exam Marksheets", desc: "Generate & print CCE format student marksheets" },
      { key: "can_generate_admit_cards", label: "Admit Cards", desc: "Generate official exam admission cards" },
      { key: "can_generate_certificates", label: "Character Certificate", desc: "Issue official student character certificates" },
      { key: "can_generate_transfer_certificate", label: "Transfer Certificate (TC)", desc: "Generate official school transfer certificates" },
      { key: "can_generate_pass_certificate", label: "Pass / Promotion Certificate", desc: "Issue pass & completion certificates" },
      { key: "can_generate_kanyashree", label: "Kanyashree Certificate", desc: "Generate government scheme certificates" },
      { key: "can_generate_id_card", label: "Student ID Cards", desc: "Generate & print student identity cards" },
      { key: "can_print_admission_form", label: "Blank Admission Form", desc: "Print blank physical school admission forms" },
      { key: "can_generate_tabulation", label: "Tabulation Sheet", desc: "Export multi-student academic result sheets" },
      { key: "can_view_certificate_tracker", label: "Certificate Tracker", desc: "Track & verify generated certificate serials" },
    ],
  },
  {
    id: "academics",
    title: "Results & Exam (EMS)",
    shortTitle: "Results & EMS",
    icon: Activity,
    color: "text-amber-500",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    activeBadge: "bg-amber-600 text-white",
    desc: "Marks entry, seating plan & exam hall scheduling",
    items: [
      { key: "can_enter_results", label: "Result / Marks Entry", desc: "Enter exam scores for assigned subjects & classes" },
      { key: "can_view_seating_plan", label: "Exam Seating Plan", desc: "View exam hall arrangement and roll seating" },
      { key: "can_manage_ems", label: "EMS Auto Seating", desc: "Manage exam halls and auto seating generator" },
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    shortTitle: "Reports",
    icon: BarChart3,
    color: "text-rose-500",
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    activeBadge: "bg-rose-600 text-white",
    desc: "School analytics, student demographics & fee reports",
    items: [
      { key: "can_view_reports", label: "View Reports & Analytics", desc: "Access reports & analytics section" },
    ],
  },
];

export default function AdminTeacherManagementPage() {
  const [activeTab, setActiveTab] = useState<"accounts" | "classes" | "tasks" | "performance">("accounts");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Data
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [createAccountModal, setCreateAccountModal] = useState<any | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createAccountError, setCreateAccountError] = useState("");
  const [assignClassModal, setAssignClassModal] = useState(false);
  const [createTaskModal, setCreateTaskModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTeacherForLogs, setSelectedTeacherForLogs] = useState<{ id: string; name: string } | null>(null);
  const [teacherLogs, setTeacherLogs] = useState<any[]>([]);
  const [loadingTeacherLogs, setLoadingTeacherLogs] = useState(false);
  // Configure Permissions per-teacher
  const [configureTeacher, setConfigureTeacher] = useState<any | null>(null);
  const [pendingPerms, setPendingPerms] = useState<TeacherPermissions | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    admission: true,
    students: false,
    documents: false,
    academics: false,
    reports: false,
  });

  // Toggle section accordion inside configure dialog
  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Master toggle all permissions in a section inside configure dialog
  const toggleAllPendingInSection = (sectionId: string) => {
    if (!pendingPerms) return;
    const targetSection = PERMISSION_SECTIONS.find((s) => s.id === sectionId);
    if (!targetSection) return;

    const allCurrentlyActive = targetSection.items.every((item) => !!(pendingPerms as any)[item.key]);
    const nextState = !allCurrentlyActive;

    const updated = { ...pendingPerms };
    targetSection.items.forEach((item) => {
      (updated as any)[item.key] = nextState;
    });
    setPendingPerms(updated);
  };

  // Master toggle ALL permissions across all sections inside configure dialog
  const toggleAllPendingGlobally = (turnOn: boolean) => {
    if (!pendingPerms) return;
    const updated = { ...pendingPerms };
    PERMISSION_SECTIONS.forEach((sec) => {
      sec.items.forEach((item) => {
        (updated as any)[item.key] = turnOn;
      });
    });
    setPendingPerms(updated);
  };

  // New Class Assignment Form
  const [selectedTeacherForClass, setSelectedTeacherForClass] = useState("");
  const [selectedClass, setSelectedClass] = useState("V");
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [selectedRoleType, setSelectedRoleType] = useState<"CLASS_TEACHER" | "SUBJECT_TEACHER">("CLASS_TEACHER");
  const [selectedSubject, setSelectedSubject] = useState("");

  // New Task Form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskType, setTaskType] = useState<string>("RE_ADMISSION");
  const [taskTargetClass, setTaskTargetClass] = useState("V");
  const [taskTargetSection, setTaskTargetSection] = useState("A");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [selectedTeacherIdsForTask, setSelectedTeacherIdsForTask] = useState<string[]>([]);

  // Load All Teacher Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      // 1. Fetch Teachers
      const tRes = await fetch("/api/teachers");
      const tData = await tRes.json();
      if (tData.success) {
        setTeachers(tData.teachers || []);
      }

      // 2. Fetch Class Assignments
      const cRes = await fetch("/api/teachers/classes");
      const cData = await cRes.json();
      if (cData.success) {
        setAssignments(cData.assignments || []);
      }

      // 3. Fetch Tasks
      const tasksRes = await fetch("/api/teachers/tasks");
      const tasksData = await tasksRes.json();
      if (tasksData.success) {
        setTasks(tasksData.tasks || []);
      }

      // 4. Fetch Performance
      const pRes = await fetch("/api/teachers/activity");
      const pData = await pRes.json();
      if (pData.success) {
        setPerformance(pData.summary || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load teacher management data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // Toggle permission for a teacher
  const handleTogglePermission = async (teacher: any, key: keyof TeacherPermissions) => {
    if (!teacher.userId && !teacher.id) return;
    const currentPerms = teacher.permissions || {};
    const updatedPerms = {
      ...currentPerms,
      [key]: !currentPerms[key],
    };

    try {
      const res = await fetch("/api/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: teacher.userId,
          staffId: teacher.id,
          permissions: updatedPerms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeachers((prev) =>
          prev.map((t) => (t.id === teacher.id ? { ...t, permissions: updatedPerms } : t))
        );
        showToast(`Updated permissions for ${teacher.fullName}`);
      } else {
        setErrorMsg(data.error || "Failed to update permission");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle an entire permission batch / section for a teacher directly from shortcut
  const handleToggleBatch = async (teacher: any, sectionId: string) => {
    if (!teacher.hasLogin) return;
    const targetSection = PERMISSION_SECTIONS.find((s) => s.id === sectionId);
    if (!targetSection) return;

    const currentPerms = teacher.permissions || {};
    const allCurrentlyActive = targetSection.items.every((item) => !!currentPerms[item.key]);
    const nextState = !allCurrentlyActive;

    const updatedPerms = { ...currentPerms };
    targetSection.items.forEach((item) => {
      updatedPerms[item.key] = nextState;
    });

    // Optimistic UI update
    setTeachers((prev) =>
      prev.map((t) => (t.id === teacher.id ? { ...t, permissions: updatedPerms } : t))
    );

    try {
      const res = await fetch("/api/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: teacher.userId,
          staffId: teacher.id,
          permissions: updatedPerms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${nextState ? "Enabled" : "Disabled"} ${targetSection.title} for ${teacher.fullName}`);
      } else {
        setErrorMsg(data.error || "Failed to update permissions");
        loadData();
      }
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  // Create Auth Account for Teacher
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAccountModal) return;

    setSubmitting(true);
    setCreateAccountError("");
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: createAccountModal.id,
          email: newEmail,
          password: newPassword,
          fullName: createAccountModal.fullName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically update teacher in local state
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === createAccountModal.id
              ? {
                  ...t,
                  hasLogin: true,
                  email: newEmail,
                  userId: data.user?.id || t.userId,
                }
              : t
          )
        );
        setCreateAccountModal(null);
        setNewEmail("");
        setNewPassword("");
        setCreateAccountError("");
        showToast(`Login credentials created for ${createAccountModal.fullName}`);
        loadData();
      } else {
        setCreateAccountError(data.error || "Failed to create account.");
        setErrorMsg(data.error || "Failed to create account.");
      }
    } catch (err: any) {
      setCreateAccountError(err.message || "Error creating account.");
      setErrorMsg(err.message || "Error creating account.");
    } finally {
      setSubmitting(false);
    }
  };

  // Assign Teacher to Class
  const handleAssignClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForClass) {
      setErrorMsg("Please select a teacher.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/teachers/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacherForClass,
          className: selectedClass,
          section: selectedSection,
          roleType: selectedRoleType,
          subject: selectedSubject,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignClassModal(false);
        showToast("Class assignment saved successfully.");
        loadData();
      } else {
        setErrorMsg(data.error || "Failed to assign class.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error assigning class.");
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Class Assignment
  const handleRemoveAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;
    try {
      const res = await fetch(`/api/teachers/classes?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Assignment removed.");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || selectedTeacherIdsForTask.length === 0) {
      setErrorMsg("Please provide a title and select at least one teacher.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/teachers/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          taskType,
          targetClass: taskTargetClass,
          targetSection: taskTargetSection,
          dueDate: taskDueDate || null,
          teacherIds: selectedTeacherIdsForTask,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateTaskModal(false);
        setTaskTitle("");
        setTaskDescription("");
        setSelectedTeacherIdsForTask([]);
        showToast("Task assigned to teachers successfully!");
        loadData();
      } else {
        setErrorMsg(data.error || "Failed to assign task.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error creating task.");
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Task
  const handleApproveTask = async (taskId: string, assigneeId: string) => {
    try {
      const res = await fetch("/api/teachers/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          assigneeId,
          status: "APPROVED",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Task verified & approved!");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Performance to CSV
  const handleExportCSV = () => {
    if (performance.length === 0) return;
    const headers = [
      "Teacher Name",
      "Designation",
      "Total Re-Admissions",
      "Total Fees Collected (INR)",
      "Total Marksheets Generated",
      "Tasks Completed",
      "Tasks Pending",
    ];
    const rows = performance.map((p) => [
      `"${p.teacher_name}"`,
      `"${p.designation || ""}"`,
      p.total_readmissions,
      p.total_fees_collected,
      p.total_marksheets,
      p.tasks_completed,
      p.tasks_pending,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teacher_performance_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch specific teacher's activity logs
  const handleViewTeacherLogs = async (teacherId: string, teacherName: string) => {
    setSelectedTeacherForLogs({ id: teacherId, name: teacherName });
    setLoadingTeacherLogs(true);
    setTeacherLogs([]);
    try {
      const res = await fetch(`/api/teachers/activity?teacherId=${teacherId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setTeacherLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeacherLogs(false);
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.designation && t.designation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 p-6 sm:p-8 mb-6 border border-border/50 shadow-sm">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse duration-10000" />
          <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl opacity-50 animate-pulse duration-7000" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-background/80 shadow-sm border border-border/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center backdrop-blur-sm">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-600">
                Teacher Management Hub
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl font-medium">
              Manage teacher portal accounts, granular permissions, class responsibilities, and task delegation in a unified workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl text-xs gap-1.5 cursor-pointer bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all duration-300 shadow-sm hover:shadow"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Top-Level Stat Cards */}
      {loading && teachers.length === 0 ? (
        <div className="py-2 mb-6"><StatCardsGridSkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold text-xs uppercase tracking-wider group-hover:text-blue-600 transition-colors">Total Teachers</span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground mt-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {teachers.length}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold text-xs uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Active Accounts</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground mt-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {teachers.filter(t => t.hasLogin).length}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold text-xs uppercase tracking-wider group-hover:text-amber-600 transition-colors">Tasks Assigned</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ClipboardList className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground mt-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {tasks.length}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold text-xs uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Total Collections</span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-foreground mt-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              ₹{performance.reduce((sum, p) => sum + Number(p.total_fees_collected || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="inline-flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/50 backdrop-blur-md shadow-sm mb-6">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeTab === "accounts"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/50 scale-105"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Accounts & Permissions</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'accounts' ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
            {teachers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("classes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeTab === "classes"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/50 scale-105"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Class & Subject Mapping</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'classes' ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
            {assignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeTab === "tasks"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/50 scale-105"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Task Delegation</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'tasks' ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
            {tasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("performance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            activeTab === "performance"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/50 scale-105"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          <IndianRupee className="h-4 w-4" />
          <span>Collections & Performance</span>
        </button>
      </div>

      {loading ? (
        <div className="mt-4"><DataTableSkeleton rows={6} /></div>
      ) : (
        <>
          {/* ================= TAB 1: ACCOUNTS & PERMISSIONS ================= */}
      {activeTab === "accounts" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search teacher by name or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Click any module badge to toggle batch permissions</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {filteredTeachers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm border border-border/80 rounded-2xl bg-card/60">
                No teachers found.
              </div>
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
      )}



      {/* ================= TAB 2: CLASS & SUBJECT MAPPING ================= */}
      {activeTab === "classes" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Designate up to 2 Class Teachers per class and map Subject Teachers for continuous tracking.
            </p>
            <Button
              size="sm"
              onClick={() => setAssignClassModal(true)}
              className="h-8 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Assign Class / Subject</span>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ALL_CLASSES.map((clsName) => {
              const classAssigns = assignments.filter((a) => a.className === clsName);
              const classTeachers = classAssigns.filter((a) => a.roleType === "CLASS_TEACHER");
              const subjectTeachers = classAssigns.filter((a) => a.roleType === "SUBJECT_TEACHER");

              return (
                <div key={clsName} className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Class {clsName}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {classTeachers.length}/2 Class Teachers
                    </span>
                  </div>

                  {/* Class Teachers */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Class Teachers:
                    </p>
                    {classTeachers.length === 0 ? (
                      <p className="text-xs text-muted-foreground/80 italic">Not Assigned</p>
                    ) : (
                      classTeachers.map((ct) => (
                        <div key={ct.id} className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                          <div>
                            <p className="font-bold text-emerald-800 dark:text-emerald-300">{ct.teacherName}</p>
                            <p className="text-[10px] text-muted-foreground">Section: {ct.section}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(ct.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Subject Teachers */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Subject Teachers:
                    </p>
                    {subjectTeachers.length === 0 ? (
                      <p className="text-xs text-muted-foreground/80 italic">None assigned</p>
                    ) : (
                      subjectTeachers.map((st) => (
                        <div key={st.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border/60 text-xs">
                          <div>
                            <p className="font-semibold text-foreground">{st.teacherName}</p>
                            <p className="text-[10px] text-muted-foreground">{st.subject || "General"} · Sec {st.section}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(st.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: TASK DELEGATION ================= */}
      {activeTab === "tasks" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Delegate specific tasks (e.g. Re-Admission for Class 5-A) to one or more teachers simultaneously.
            </p>
            <Button
              size="sm"
              onClick={() => setCreateTaskModal(true)}
              className="h-8 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Assign New Task</span>
            </Button>
          </div>

          <div className="grid gap-3.5">
            {tasks.length === 0 ? (
              <div className="p-8 rounded-2xl bg-card border border-border/80 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No Tasks Assigned Yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Click &apos;Assign New Task&apos; to delegate work to teachers.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {task.task_type}
                        </span>
                        {task.target_class && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                            Class {task.target_class} ({task.target_section || "ALL"})
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>

                    {task.due_date && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Due: {task.due_date}
                      </span>
                    )}
                  </div>

                  {/* Assignees and Completion Status */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Assigned Teachers & Progress:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {(task.assignees || []).map((a: any) => {
                        const isSubmitted = a.status === "SUBMITTED" || a.status === "APPROVED";
                        return (
                          <div
                            key={a.id}
                            className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-bold text-foreground">{a.teacherName}</p>
                                <p className="text-[10px] text-muted-foreground">{a.designation}</p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  a.status === "APPROVED"
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : a.status === "SUBMITTED"
                                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {a.status}
                              </span>
                            </div>

                            {/* Submitted Report View */}
                            {isSubmitted && a.completionReport && (
                              <div className="p-2 rounded-lg bg-background/80 border border-border/60 text-[11px] space-y-1">
                                <p className="font-semibold text-primary">Completion Report:</p>
                                <p className="text-muted-foreground">
                                  Students: <span className="text-foreground font-bold">{a.completionReport.students_count || 0}</span> · Collected: <span className="text-foreground font-bold">₹{a.completionReport.fees_collected || 0}</span>
                                </p>
                                {a.completionReport.notes && (
                                  <p className="italic text-muted-foreground text-[10px]">“{a.completionReport.notes}”</p>
                                )}
                              </div>
                            )}

                            {a.status === "SUBMITTED" && (
                              <Button
                                size="sm"
                                onClick={() => handleApproveTask(task.id, a.id)}
                                className="h-6 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer self-end"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve & Close
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: COLLECTIONS & PERFORMANCE (VISUAL SUITE) ================= */}
      {activeTab === "performance" && (() => {
        const totalSchoolCollected = performance.reduce((sum, p) => sum + Number(p.total_fees_collected || 0), 0);
        const totalSchoolReadmissions = performance.reduce((sum, p) => sum + Number(p.total_readmissions || 0), 0);
        const totalSchoolMarksheets = performance.reduce((sum, p) => sum + Number(p.total_marksheets || 0), 0);
        const topCollector = performance.length > 0 ? performance[0] : null;

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Visual KPI Aggregate Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-card to-card border border-emerald-500/30 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase text-[10px] text-emerald-600 dark:text-emerald-400">Total Faculty Collections</span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <IndianRupee className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
                  ₹{totalSchoolCollected.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Verified fee collections</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/15 via-card to-card border border-blue-500/30 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase text-[10px] text-blue-600 dark:text-blue-400">Total Re-Admissions</span>
                  <div className="h-7 w-7 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
                  {totalSchoolReadmissions}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Students admitted by faculty</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-card to-card border border-amber-500/30 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase text-[10px] text-amber-600 dark:text-amber-400">Marksheets Created</span>
                  <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
                  {totalSchoolMarksheets}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Documents generated</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-card to-card border border-indigo-500/30 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase text-[10px] text-indigo-600 dark:text-indigo-400">Top Faculty Collector</span>
                  <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Trophy className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-extrabold text-foreground mt-2 truncate">
                  {topCollector?.teacher_name || "N/A"}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  ₹{Number(topCollector?.total_fees_collected || 0).toLocaleString()} collected
                </p>
              </div>
            </div>

            {/* Visual Contribution Leaderboard */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Faculty Collection & Performance Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Visual percentage contribution of each teacher to total school fee collections.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={performance.length === 0}
                  className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>

              {performance.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-6 text-center">
                  No performance records recorded for this session.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {performance.map((p, idx) => {
                    const collected = Number(p.total_fees_collected || 0);
                    const pct = totalSchoolCollected > 0 ? Math.round((collected / totalSchoolCollected) * 100) : 0;

                    return (
                      <div
                        key={p.teacher_id}
                        className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              idx === 0 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
                              idx === 1 ? "bg-slate-300/40 text-slate-700 dark:text-slate-200 border border-slate-400/30" :
                              idx === 2 ? "bg-amber-700/20 text-amber-800 dark:text-amber-500 border border-amber-700/30" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-foreground">{p.teacher_name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.designation || "Teaching Staff"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="text-right">
                              <p className="text-sm font-extrabold text-foreground">₹{collected.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">{pct}% of school total</p>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewTeacherLogs(p.teacher_id, p.teacher_name)}
                              className="h-7 px-2.5 text-[10px] rounded-lg gap-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Inspect Logs</span>
                            </Button>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded bg-background border border-border/80 text-foreground font-semibold">
                                {p.total_readmissions} Re-Admissions
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-background border border-border/80 text-foreground font-semibold">
                                {p.total_marksheets} Marksheets
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-background border border-border/80 text-foreground font-semibold">
                                {p.tasks_completed} Tasks Done
                              </span>
                            </div>
                            <span className="font-bold text-foreground">{pct}% Contribution</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detailed Table for Auditing */}
            <div className="border border-border/80 rounded-2xl overflow-hidden bg-card/60">
              <div className="p-3 bg-muted/40 border-b border-border/60">
                <h4 className="text-xs font-bold text-foreground">Detailed Financial & Operational Records</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/80 backdrop-blur-md text-muted-foreground font-semibold sticky top-0 z-10 shadow-sm">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Teacher</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3 text-center">Re-Admissions</th>
                      <th className="p-3 text-center">Marksheets</th>
                      <th className="p-3 text-center">Tasks</th>
                      <th className="p-3 text-right">Total Fees Collected</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {performance.map((p, idx) => (
                      <tr key={p.teacher_id} className="hover:bg-muted/50 transition-colors duration-200">
                        <td className="p-3 font-bold text-muted-foreground text-[11px]">#{idx + 1}</td>
                        <td className="p-3 font-bold text-foreground">{p.teacher_name}</td>
                        <td className="p-3 text-muted-foreground">{p.designation || "Teaching Staff"}</td>
                        <td className="p-3 text-center font-semibold text-foreground">{p.total_readmissions}</td>
                        <td className="p-3 text-center text-foreground">{p.total_marksheets}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            {p.tasks_completed} done
                          </span>
                        </td>
                        <td className="p-3 text-right font-extrabold text-foreground">
                          ₹{Number(p.total_fees_collected).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewTeacherLogs(p.teacher_id, p.teacher_name)}
                            className="h-6 text-[10px] text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                          >
                            Logs
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      </>
      )}

      {/* MODAL: Inspect Teacher Activity Logs */}
      <Dialog open={!!selectedTeacherForLogs} onOpenChange={(open) => !open && setSelectedTeacherForLogs(null)}>
        <DialogContent className="rounded-3xl max-w-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Activity Audit Trail: {selectedTeacherForLogs?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chronological log of re-admissions, fee collections, and generators executed by this teacher.
            </DialogDescription>
          </DialogHeader>

          {loadingTeacherLogs ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
              <p className="text-xs text-muted-foreground">Loading teacher activity logs...</p>
            </div>
          ) : teacherLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No activity logs recorded for this teacher yet.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-border/80 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Student</th>
                    <th className="p-2.5">Class / Sec</th>
                    <th className="p-2.5 text-right">Fee Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {teacherLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="p-2.5 text-muted-foreground text-[10px]">
                        {new Date(log.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} · {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                          {log.action_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-foreground">{log.target_student_name || "—"}</td>
                      <td className="p-2.5 text-muted-foreground">
                        {log.student_class ? `Class ${log.student_class} (${log.section || "—"})` : "—"}
                      </td>
                      <td className="p-2.5 text-right font-bold text-foreground">
                        {log.amount_collected > 0 ? `₹${Number(log.amount_collected).toLocaleString()}` : "₹0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedTeacherForLogs(null)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Create Teacher Login Account */}
      <Dialog open={!!createAccountModal} onOpenChange={(open) => !open && setCreateAccountModal(null)}>
        <DialogContent className="rounded-3xl max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-500" />
              Enable Teacher Login
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create portal credentials for {createAccountModal?.fullName}.
            </DialogDescription>
          </DialogHeader>

          {createAccountError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <p className="font-bold">Failed to enable login</p>
                <p className="text-[11px] mt-0.5">{createAccountError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateAccount} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Teacher Email</Label>
              <Input
                type="email"
                placeholder="teacher@school.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
              <p className="text-[10px] text-muted-foreground">The teacher will use this email to log in to the Teacher Portal.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Initial Password</Label>
              <Input
                type="text"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 text-xs rounded-xl font-mono"
                required
              />
              <p className="text-[10px] text-muted-foreground">Minimum 6 characters. Teacher can use this password to sign in.</p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreateAccountModal(null);
                  setCreateAccountError("");
                }}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  "Save Credentials"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Configure Teacher Permissions */}
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
                        const res = await fetch("/api/teachers", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId: configureTeacher.userId,
                            staffId: configureTeacher.id,
                            permissions: pendingPerms,
                          }),
                        });
                        if (res.ok) {
                          setSuccessMsg(`Permissions saved for ${configureTeacher.fullName}`);
                          setConfigureTeacher(null);
                          setPendingPerms(null);
                          loadData();
                          setTimeout(() => setSuccessMsg(""), 3000);
                        } else {
                          const err = await res.json();
                          setErrorMsg(err.error || "Failed to save permissions");
                        }
                      } finally {
                        setSavingPerms(false);
                      }
                    }}
                  >
                    {savingPerms ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
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
                <p className="text-[10px] text-muted-foreground mt-0.5">Assigned classes &amp; subjects for this teacher</p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[220px] md:max-h-none">
                {assignments.filter((a: any) => a.teacherId === configureTeacher?.id || a.teacher_id === configureTeacher?.id).length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-muted-foreground">
                    No class assignments yet.<br />
                    <span className="text-[10px] text-muted-foreground/70">Assign from Class Mapping tab.</span>
                  </div>
                ) : (
                  assignments
                    .filter((a: any) => a.teacherId === configureTeacher?.id || a.teacher_id === configureTeacher?.id)
                    .map((a: any) => (
                      <div key={a.id} className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-foreground">
                            Class {a.className || a.class_name} · Sec {a.section}
                          </p>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                              a.roleType === "CLASS_TEACHER" || a.role_type === "CLASS_TEACHER"
                                ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            }`}
                          >
                            {a.roleType === "CLASS_TEACHER" || a.role_type === "CLASS_TEACHER" ? "Class Teacher" : "Subject"}
                          </span>
                        </div>
                        {(a.subject || a.role_type === "SUBJECT_TEACHER") && (
                          <p className="text-[10px] text-muted-foreground">
                            Subject: <span className="font-semibold text-foreground">{a.subject || "All Subjects"}</span>
                          </p>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Assign Class / Subject */}
      <Dialog open={assignClassModal} onOpenChange={setAssignClassModal}>
        <DialogContent className="rounded-3xl max-w-2xl p-0 overflow-hidden border-0">
          <div className="flex flex-col md:flex-row w-full h-full">
            {/* Left Panel */}
            <div className="w-full md:w-1/3 bg-gradient-to-b from-indigo-600 to-blue-700 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:16px_16px]" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Assign Teacher</h2>
                  <p className="text-sm text-indigo-100">
                    Assign teachers to specific classes or subjects and set their roles.
                  </p>
                </div>
                <div className="w-12 h-1 bg-white/20 rounded-full mt-2" />
              </div>
              <div className="relative z-10 mt-8 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <p className="text-xs text-indigo-200 mb-1">Selected Teacher</p>
                <p className="text-sm font-semibold text-white truncate">
                  {selectedTeacherForClass 
                    ? teachers.find(t => t.id === selectedTeacherForClass)?.fullName || "Unknown Teacher"
                    : "No teacher selected"}
                </p>
              </div>
            </div>

            {/* Right Panel */}
            <div className="w-full md:w-2/3 p-6 bg-card">
              <form onSubmit={handleAssignClass} className="space-y-5 h-full flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">Select Teacher</Label>
                    <Select value={selectedTeacherForClass} onValueChange={(val) => setSelectedTeacherForClass(val || "")}>
                      <SelectTrigger className="w-full h-10 rounded-2xl">
                        <SelectValue placeholder="Select teacher..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.fullName} ({t.designation || "Teacher"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Class</Label>
                      <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val || "V")}>
                        <SelectTrigger className="w-full h-10 rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_CLASSES.map((c) => (
                            <SelectItem key={c} value={c}>
                              Class {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Section</Label>
                      <Select value={selectedSection} onValueChange={(val) => setSelectedSection(val || "ALL")}>
                        <SelectTrigger className="w-full h-10 rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_SECTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              Section {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">Role Type</Label>
                    <Select
                      value={selectedRoleType}
                      onValueChange={(v: any) => setSelectedRoleType(v)}
                    >
                      <SelectTrigger className="w-full h-10 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLASS_TEACHER">
                          Class Teacher (Max 2 per class)
                        </SelectItem>
                        <SelectItem value="SUBJECT_TEACHER">
                          Subject Teacher
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRoleType === "SUBJECT_TEACHER" && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Label className="text-sm font-bold">Subject Taught</Label>
                      <Input
                        placeholder="e.g. Mathematics, Bengali, English"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="h-10 rounded-2xl"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 mt-4 w-full">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAssignClassModal(false)}
                    className="rounded-xl flex-1 md:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="font-bold rounded-xl cursor-pointer px-6 flex-1 md:flex-none"
                  >
                    {submitting ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Assign New Task */}
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
    </div>
  );
}
