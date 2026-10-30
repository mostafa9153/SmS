"use client";

import { TeacherLoungeDrawer } from "@/components/teacher/teacher-lounge-drawer";
import { TaskCardSkeleton, StatCardsGridSkeleton } from "@/components/ui/skeleton-loaders";

import { WelcomeHeader } from "@/components/teacher/dashboard/welcome-header";
import { MetricsBar } from "@/components/teacher/dashboard/metrics-bar";
import { AbsenceTracker } from "@/components/teacher/dashboard/absence-tracker";
import { QuickActionHub } from "@/components/teacher/dashboard/quick-action-hub";
import { RoutineCard } from "@/components/teacher/dashboard/routine-card";
import { ActiveTasks } from "@/components/teacher/dashboard/active-tasks";
import { RecentActivity } from "@/components/teacher/dashboard/recent-activity";
import { MarkAbsenceDialog } from "@/components/teacher/dashboard/mark-absence-dialog";
import { TaskReportDialog } from "@/components/teacher/dashboard/task-report-dialog";
import { AttachmentPreviewDialog } from "@/components/teacher/dashboard/attachment-preview-dialog";
import { AttendanceDialog } from "@/components/teacher/dashboard/attendance-dialog";
import { useTeacherDashboard } from "@/components/teacher/dashboard/use-teacher-dashboard";

export default function TeacherDashboardPage() {
  const gen = useTeacherDashboard();
  const { isChatOpen, loading, profile, setChatUnreadCount, setIsChatOpen, staff, user } = gen;

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up relative pb-20">
      <WelcomeHeader gen={gen} />

      <MetricsBar gen={gen} />

      <AbsenceTracker gen={gen} />

      <QuickActionHub gen={gen} />

      <RoutineCard gen={gen} />

      <ActiveTasks gen={gen} />

      <RecentActivity gen={gen} />

      <TeacherLoungeDrawer
        isOpen={isChatOpen}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => setIsChatOpen(false)}
        currentUser={user}
        currentProfile={profile}
        currentStaff={staff}
        onUnreadChange={setChatUnreadCount}
      />

      <MarkAbsenceDialog gen={gen} />

      <TaskReportDialog gen={gen} />

      <AttachmentPreviewDialog gen={gen} />

      <AttendanceDialog gen={gen} />
    </div>
  );
}
