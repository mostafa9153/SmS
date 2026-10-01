"use client";

import React from "react";
import { RoutineTeacher, RoutineSubject, RoutineSettings } from "@/lib/routine/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Award, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTeacherSubjectPeriod } from "@/lib/routine/routine-helpers";

export interface TeacherTableRowProps {
  teacher: RoutineTeacher;
  load: number;
  subjects?: RoutineSubject[];
  classTotalSubjectsMap?: Record<string, number>;
  settings: RoutineSettings;
  onEdit: (t: RoutineTeacher) => void;
  onDelete?: (id: string) => Promise<void>;
}

export const TeacherTableRow = React.memo(function TeacherTableRow({
  teacher: t,
  load,
  subjects = [],
  classTotalSubjectsMap = {},
  settings,
  onEdit,
  onDelete,
}: TeacherTableRowProps) {
  const isOverloaded = load > t.maxPeriods;

  const qClasses = t.qualifiedClasses || Object.keys(t.classSubjects || {});
  const cSubjects = t.classSubjects || {};
  const cSections = t.classSections || {};
  const cPeriods = t.classPeriods || {};
  const sPeriods = t.sectionPeriods || {};

  const totalSlots = settings.workingDays.reduce((acc, d) => {
    const raw = t.availableSlots?.[d] ?? (t.availableSlots as any)?.[String(d)];
    return acc + (Array.isArray(raw) ? raw.length : settings.periodsPerDay);
  }, 0);

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="py-2.5 px-4 font-semibold text-foreground">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>{t.name}</span>
          {t.classTeacherOf && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200"
            >
              CT: {t.classTeacherOf}
            </Badge>
          )}
        </div>
      </td>
      <td className="py-2.5 px-4">
        <Badge variant="outline" className="font-mono text-[10px] font-bold">
          {t.shortName || "-"}
        </Badge>
      </td>
      <td className="py-2.5 px-4">
        {t.primarySubject ? (
          <Badge variant="secondary" className="text-[10px] font-medium bg-muted font-mono">
            {t.primarySubject}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px]">-</span>
        )}
      </td>
      <td className="py-2.5 px-4">
        {t.classTeacherOf ? (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-primary text-[11px] flex items-center gap-1">
              <Award className="w-3 h-3 text-primary" />
              {t.classTeacherOf}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              1st Period: {t.classTeacherFirstPeriods ?? 3}/wk
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-[11px]">-</span>
        )}
      </td>
      <td className="py-2.5 px-4">
        {qClasses.length === 0 ? (
          <span className="text-muted-foreground text-[11px] italic">
            All classes & subjects
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-w-lg">
            {qClasses.map((cls) => {
              const subs = cSubjects[cls] || [];
              const secs = cSections[cls] || [];
              const periodTarget = cPeriods[cls];

              const formattedSubs =
                subs.length > 0
                  ? subs
                      .map((sub) => {
                        const matchedSub = subjects.find(
                          (s) =>
                            s.name.trim().toLowerCase() === sub.trim().toLowerCase() &&
                            (!s.className || s.className.trim().toLowerCase() === cls.trim().toLowerCase())
                        );
                        const totalSubDemand =
                          matchedSub?.periodsPerWeek && matchedSub.periodsPerWeek > 0
                            ? matchedSub.periodsPerWeek
                            : 5;
                        const directP = getTeacherSubjectPeriod(
                          t,
                          cls,
                          secs[0] || "A",
                          sub,
                          totalSubDemand
                        );
                        return `${sub} (${directP}/${totalSubDemand}p)`;
                      })
                      .join(", ")
                  : "All";

              return (
                <div
                  key={cls}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/60 border text-[10px] font-medium text-foreground flex-wrap"
                >
                  <span className="font-bold text-primary">{cls}:</span>
                  {secs.length > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono bg-background font-semibold">
                      {secs
                        .map((sec) => {
                          const p = sPeriods[`${cls}::${sec}`] || sPeriods[`${cls}-${sec}`] || sPeriods[`${cls}_${sec}`];
                          return p ? `Sec ${sec} (${p}p)` : `Sec ${sec}`;
                        })
                        .join(", ")}
                    </Badge>
                  )}
                  {periodTarget && periodTarget > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono bg-primary/10 text-primary font-bold">
                      {periodTarget} p/wk
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {formattedSubs}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </td>
      <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11px]">
        {t.maxPeriods} p/wk
      </td>
      <td className="py-2.5 px-4">
        <Badge
          variant={isOverloaded ? "destructive" : "secondary"}
          className={cn(
            "text-[10px] font-mono gap-1",
            !isOverloaded && load > 0 && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
          )}
        >
          {isOverloaded && <AlertTriangle className="w-2.5 h-2.5" />}
          {!isOverloaded && load > 0 && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
          {load} / {t.maxPeriods}
        </Badge>
      </td>
      <td className="py-2.5 px-4">
        <span className="text-muted-foreground text-[11px] font-mono">
          {totalSlots} slots/wk
        </span>
      </td>
      <td className="py-2.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(t)}
            aria-label={`Edit ${t.name}`}
            title={`Edit ${t.name}`}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(t.id)}
              aria-label={`Delete ${t.name}`}
              title={`Delete ${t.name}`}
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
});
