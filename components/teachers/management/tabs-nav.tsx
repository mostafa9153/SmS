"use client";

import { IndianRupee, Shield, ClipboardList } from "lucide-react";

import type { TeacherManagementState } from "./use-teacher-management";

export function TeacherTabsNav({ tm }: { tm: TeacherManagementState }) {
  const { activeTab, setActiveTab, tasks, teachers } = tm;
  return (
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
  );
}
