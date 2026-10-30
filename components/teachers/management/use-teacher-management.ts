"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { TeacherPermissions } from "@/lib/types/teacher";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { VALID_TEACHER_TABS } from "@/components/teachers/management/tabs";
import { PERMISSION_SECTIONS } from "@/components/teachers/management/permissions";

export function useTeacherManagement() {
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as any;
  const initialTab = tabParam && VALID_TEACHER_TABS.includes(tabParam) ? tabParam : "accounts";
  const [activeTab, setActiveTabState] = useState<"accounts" | "tasks" | "performance">(initialTab);

  const setActiveTab = (tab: "accounts" | "tasks" | "performance") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "accounts") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };
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

  // New Task Form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskType, setTaskType] = useState<string>("RE_ADMISSION");
  const [taskTargetClass, setTaskTargetClass] = useState("V");
  const [taskTargetSection, setTaskTargetSection] = useState("A");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [selectedTeacherIdsForTask, setSelectedTeacherIdsForTask] = useState<string[]>([]);

  const reloadAssignments = useCallback(async () => {
    const cData = await apiFetch<{ assignments?: any[] }>("/api/teachers/classes").catch(() => null);
    if (cData) setAssignments(cData.assignments || []);
  }, []);

  // Load All Teacher Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      // 1. Fetch Teachers
      const tData = await apiFetch<{ teachers?: any[] }>("/api/teachers");
      setTeachers(tData.teachers || []);

      // 2. Fetch Class Assignments
      const cData = await apiFetch<{ assignments?: any[] }>("/api/teachers/classes");
      setAssignments(cData.assignments || []);

      // 3. Fetch Tasks
      const tasksData = await apiFetch<{ tasks?: any[] }>("/api/teachers/tasks");
      setTasks(tasksData.tasks || []);

      // 4. Fetch Performance
      const pData = await apiFetch<{ summary?: any[] }>("/api/teachers/activity");
      setPerformance(pData.summary || []);
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
      const data = await apiFetch<{ undoId?: string }>("/api/teachers", {
        method: "PATCH",
        json: {
          userId: teacher.userId,
          staffId: teacher.id,
          permissions: updatedPerms,
        },
      });
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, permissions: updatedPerms } : t))
      );
      toastWithUndo(`Updated permissions for ${teacher.fullName}`, data.undoId, loadData);
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) setErrorMsg(err.message || "Failed to update permission");
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
      const data = await apiFetch<{ undoId?: string }>("/api/teachers", {
        method: "PATCH",
        json: {
          userId: teacher.userId,
          staffId: teacher.id,
          permissions: updatedPerms,
        },
      });
      toastWithUndo(`${nextState ? "Enabled" : "Disabled"} ${targetSection.title} for ${teacher.fullName}`, data.undoId, loadData);
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) setErrorMsg(err.message || "Failed to update permissions");
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
      const data = await apiFetch<{ user?: { id?: string } }>("/api/teachers", {
        method: "POST",
        json: {
          staffId: createAccountModal.id,
          email: newEmail,
          password: newPassword,
          fullName: createAccountModal.fullName,
        },
      });
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
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message || "Failed to create account." : err.message || "Error creating account.";
      setCreateAccountError(message);
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
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
      await apiFetch("/api/teachers/tasks", {
        method: "POST",
        json: {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          taskType,
          targetClass: taskTargetClass,
          targetSection: taskTargetSection,
          dueDate: taskDueDate || null,
          teacherIds: selectedTeacherIdsForTask,
        },
      });
      setCreateTaskModal(false);
      setTaskTitle("");
      setTaskDescription("");
      setSelectedTeacherIdsForTask([]);
      showToast("Task assigned to teachers successfully!");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error creating task.");
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Task
  const handleApproveTask = async (taskId: string, assigneeId: string) => {
    try {
      const data = await apiFetch<{ undoId?: string }>("/api/teachers/tasks", {
        method: "PATCH",
        json: {
          taskId,
          assigneeId,
          status: "APPROVED",
        },
      });
      toastWithUndo("Task verified & approved!", data.undoId, loadData);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!await confirm({ title: "Are you sure you want to delete this task?", destructive: true })) return;
    try {
      const data = await apiFetch<{ undoId?: string }>(`/api/teachers/tasks?id=${taskId}`, { method: "DELETE" });
      toastWithUndo("Task deleted successfully", data.undoId, loadData);
      loadData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to delete task");
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
      const data = await apiFetch<{ logs?: any[] }>(`/api/teachers/activity?teacherId=${teacherId}&limit=50`);
      setTeacherLogs(data.logs || []);
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

  return {
    activeTab,
    assignments,
    configureTeacher,
    createAccountError,
    createAccountModal,
    createTaskModal,
    errorMsg,
    expandedSections,
    filteredTeachers,
    handleApproveTask,
    handleCreateAccount,
    handleCreateTask,
    handleDeleteTask,
    handleExportCSV,
    handleToggleBatch,
    handleViewTeacherLogs,
    loadData,
    loading,
    loadingTeacherLogs,
    newEmail,
    newPassword,
    pendingPerms,
    performance,
    reloadAssignments,
    savingPerms,
    searchQuery,
    selectedTeacherForLogs,
    selectedTeacherIdsForTask,
    setActiveTab,
    setConfigureTeacher,
    setCreateAccountError,
    setCreateAccountModal,
    setCreateTaskModal,
    setErrorMsg,
    setNewEmail,
    setNewPassword,
    setPendingPerms,
    setSavingPerms,
    setSearchQuery,
    setSelectedTeacherForLogs,
    setSelectedTeacherIdsForTask,
    setTaskDescription,
    setTaskDueDate,
    setTaskTargetClass,
    setTaskTargetSection,
    setTaskTitle,
    setTaskType,
    submitting,
    successMsg,
    taskDescription,
    taskDueDate,
    taskTargetClass,
    taskTargetSection,
    taskTitle,
    taskType,
    tasks,
    teacherLogs,
    teachers,
    toggleAllPendingGlobally,
    toggleAllPendingInSection,
    toggleSectionExpand,
  };
}

export type TeacherManagementState = ReturnType<typeof useTeacherManagement>;
