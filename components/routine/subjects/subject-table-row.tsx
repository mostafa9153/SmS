"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RoutineSubject } from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, FlaskConical, Clock, Share2, Atom, Briefcase, Palette, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { detectSubjectStream, isHsClass } from "@/lib/routine/routine-helpers";


interface SubjectTableRowProps {
  subject: RoutineSubject;
  activeClass: string;
  onEdit: (s: RoutineSubject) => void;
  onDelete: (id: string) => Promise<void>;
  isDraggable?: boolean;
}

export const SubjectTableRow = React.memo(function SubjectTableRow({
  subject: s,
  activeClass,
  onEdit,
  onDelete,
  isDraggable = false,
}: SubjectTableRowProps) {
  const subjectStream = detectSubjectStream(s.name, s.stream);
  const isCommon = s.isCommon || subjectStream === "Common";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: s.id, disabled: !isDraggable });

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
  };

  return (
    <tr
      ref={setNodeRef}
      style={rowStyle}
      className={cn(
        "hover:bg-muted/30 transition-colors",
        isDragging && "bg-primary/5 shadow-sm"
      )}
    >
      {isDraggable && (
        <td className="pl-3 pr-1 py-2.5 w-6">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${s.name}`}
            title="Drag to reorder"
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none flex items-center"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="py-2.5 px-4 font-semibold text-foreground">
        <div className="flex items-center gap-1.5">
          <span>{s.name}</span>
          {isCommon && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200"
            >
              Common
            </Badge>
          )}
        </div>
      </td>

      <td className="py-2.5 px-4">
        {isHsClass(s.className || activeClass) ? (
          subjectStream === "Science" ? (
            <Badge variant="outline" className="text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 gap-1">
              <Atom className="w-2.5 h-2.5" />
              Science
            </Badge>
          ) : subjectStream === "Commerce" ? (
            <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 gap-1">
              <Briefcase className="w-2.5 h-2.5" />
              Commerce
            </Badge>
          ) : subjectStream === "Arts" ? (
            <Badge variant="outline" className="text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 gap-1">
              <Palette className="w-2.5 h-2.5" />
              Arts
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 gap-1">
              <Share2 className="w-2.5 h-2.5" />
              Common Core
            </Badge>
          )
        ) : (
          <span className="text-muted-foreground text-[11px]">General</span>
        )}
      </td>
      <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
        {s.isLab && (s.theoryPeriods ?? 0) > 0 ? (
          <div className="space-y-0.5">
            <Badge variant="secondary" className="text-[10px] font-mono font-bold">
              {s.periodsPerWeek || ((s.theoryPeriods || 4) + (s.labPeriods || 2))} p/wk
            </Badge>
            <span className="text-[10px] text-muted-foreground block font-mono">
              {s.theoryPeriods || 4} Th + {s.labPeriods || 2} Lab
            </span>
          </div>
        ) : s.isLab ? (
          <div className="space-y-0.5">
            <Badge variant="secondary" className="text-[10px] font-mono font-bold">
              {s.periodsPerWeek || 2} p/wk
            </Badge>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">
              Lab Only
            </span>
          </div>
        ) : (
          <Badge variant="secondary" className="text-[10px] font-mono font-bold">
            {s.periodsPerWeek || 5} p/wk
          </Badge>
        )}
      </td>
      <td className="py-2.5 px-4">
        {s.isLab && (s.theoryPeriods ?? 0) > 0 ? (
          <Badge
            variant="secondary"
            className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 gap-1 font-medium"
          >
            <FlaskConical className="w-2.5 h-2.5 text-blue-600" />
            Theory + Lab (2 Slots)
          </Badge>
        ) : s.isLab ? (
          <Badge
            variant="secondary"
            className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 gap-1 font-medium"
          >
            <FlaskConical className="w-2.5 h-2.5 text-blue-600" />
            Lab (Double Slot)
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px]">Single Slot</span>
        )}
      </td>
      <td className="py-2.5 px-4 capitalize text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 opacity-60" />
          <span>
            {s.timePref === "morning"
              ? "Morning Preference"
              : s.timePref === "afternoon"
              ? "Afternoon Preference"
              : "Flexible"}
          </span>
        </div>
      </td>
      <td className="py-2.5 px-4 text-muted-foreground">
        {s.allowMultiplePerDay ? (
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 font-semibold"
          >
            Max {s.maxPerDay || 2} / Day
          </Badge>
        ) : (
          <span className="text-[11px]">Max 1 / Day</span>
        )}
      </td>
      <td className="py-2.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(s)}
            aria-label={`Edit ${s.name}`}
            title={`Edit ${s.name}`}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(s.id)}
            aria-label={`Delete ${s.name}`}
            title={`Delete ${s.name}`}
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
});
