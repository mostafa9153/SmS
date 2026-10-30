"use client";

import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/ui/skeleton-loaders";
import { Spinner } from "@/components/ui/spinner";

import { TeacherManagementHeader } from "@/components/teachers/management/management-header";
import { StatsAndAlerts } from "@/components/teachers/management/stats-and-alerts";
import { TeacherTabsNav } from "@/components/teachers/management/tabs-nav";
import { AccountsTab } from "@/components/teachers/management/accounts-tab";
import { TasksTab } from "@/components/teachers/management/tasks-tab";
import { PerformanceTab } from "@/components/teachers/management/performance-tab";
import { ActivityLogsDialog } from "@/components/teachers/management/activity-logs-dialog";
import { CreateAccountDialog } from "@/components/teachers/management/create-account-dialog";
import { PermissionsDialog } from "@/components/teachers/management/permissions-dialog";
import { AssignTaskDialog } from "@/components/teachers/management/assign-task-dialog";
import { useTeacherManagement } from "@/components/teachers/management/use-teacher-management";

function AdminTeacherManagementContent() {
  const tm = useTeacherManagement();
  const { activeTab, loading } = tm;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <TeacherManagementHeader tm={tm} />

      {/* Top-Level Stat Cards */}
      <StatsAndAlerts tm={tm} />

      {/* Tabs Navigation */}
      <TeacherTabsNav tm={tm} />

      {loading ? (
        <div className="mt-4"><DataTableSkeleton rows={6} /></div>
      ) : (
        <>
          {/* ================= TAB 1: ACCOUNTS & PERMISSIONS ================= */}
      {activeTab === "accounts" && (
        <AccountsTab tm={tm} />
      )}

      {/* ================= TAB 2: TASK DELEGATION ================= */}
      {activeTab === "tasks" && (
        <TasksTab tm={tm} />
      )}

      {/* ================= TAB 4: COLLECTIONS & PERFORMANCE (VISUAL SUITE) ================= */}
      <PerformanceTab tm={tm} />

      </>
      )}

      {/* MODAL: Inspect Teacher Activity Logs */}
      <ActivityLogsDialog tm={tm} />

      {/* MODAL: Create Teacher Login Account */}
      <CreateAccountDialog tm={tm} />

      {/* MODAL: Configure Teacher Permissions */}
      <PermissionsDialog tm={tm} />

      {/* MODAL: Assign New Task */}
      <AssignTaskDialog tm={tm} />
    </div>
  );
}

export default function AdminTeacherManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Spinner className="h-4 w-4 text-primary" />
          <span>Loading Teachers Management...</span>
        </div>
      }
    >
      <AdminTeacherManagementContent />
    </Suspense>
  );
}
