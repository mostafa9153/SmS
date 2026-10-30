"use client";

import { GraduationCap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

import type { TeacherManagementState } from "./use-teacher-management";

export function TeacherManagementHeader({ tm }: { tm: TeacherManagementState }) {
  const { loadData, loading } = tm;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 p-6 sm:p-8 mb-6 border border-border/50 shadow-sm">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse duration-10000" />
        <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl opacity-50 animate-pulse duration-7000" />
      </div>
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageHeader icon={GraduationCap} title="Teacher Management Hub" />
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
  );
}
