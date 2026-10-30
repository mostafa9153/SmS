"use client";

import { GraduationCap, Layers, Award, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

import type { ClassManagementState } from "./use-class-management";

export function ClassKpiCards({ cm }: { cm: ClassManagementState }) {
  const { classes } = cm;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <Card className="border bg-card/90 shadow-2xs p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Total Classes</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">{classes.length}</h3>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <Card className="border bg-card/90 shadow-2xs p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Active Sections</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">
              {classes.reduce((sum, c) => sum + c.sections.length, 0)}
            </h3>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <Card className="border bg-card/90 shadow-2xs p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">RTE Auto-Pass Classes</p>
            <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
              {classes.filter((c) => c.isAutoPass).length}
            </h3>
          </div>
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <Card className="border bg-card/90 shadow-2xs p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Total Student Capacity</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">
              {classes.reduce((sum, c) => sum + (c.capacity || 0), 0)}
            </h3>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );
}
