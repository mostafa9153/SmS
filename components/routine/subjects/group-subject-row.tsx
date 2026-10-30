"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RoutineSubject, RoutineSubjectGroup } from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, FlaskConical, Clock, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { groupTeacherLoad } from "@/lib/routine/routine-domain";
import { useConfirm } from "@/components/ui/confirm-dialog";


interface GroupSubjectRowProps {
  group: RoutineSubjectGroup;
  members: RoutineSubject[];
  onEdit: (group: RoutineSubjectGroup, members: RoutineSubject[]) => void;
  onDelete?: (id: string) => Promise<void>;
}

export const GroupSubjectRow = React.memo(function GroupSubjectRow({
  group,
  members,
  onEdit,
  onDelete,
}: GroupSubjectRowProps) {
  const confirm = useConfirm();
  const first = members[0];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `group:${group.id}`,
  });
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
      className={cn("hover:bg-muted/30 transition-colors", isDragging && "bg-primary/5 shadow-sm")}
    >
      <td className="pl-3 pr-1 py-2.5 w-6">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${group.name}`}
          title="Drag to reorder"
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none flex items-center"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="py-2.5 px-4 font-semibold text-foreground">
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{group.name}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
            Group
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {members.map((m) => (
            <span key={m.id} className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {m.name}
            </span>
          ))}
        </div>
      </td>
      <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
        {group.scope === "class" ? "Class-wise" : `${group.sectionIds.length} sections`}
      </td>
      <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
        <Badge variant="secondary" className="text-[10px] font-mono font-bold">
          {group.periodsPerWeek || 5} p/wk
        </Badge>
        <Badge variant="outline" className="ml-1 text-[10px] font-mono font-bold">
          {groupTeacherLoad(group)} teacher p/wk
        </Badge>
      </td>
      <td className="py-2.5 px-4">
        {first.isLab ? (
          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 gap-1 font-medium">
            <FlaskConical className="w-2.5 h-2.5 text-blue-600" />
            {(first.theoryPeriods ?? 0) > 0 ? "Theory + Lab (2 Slots)" : "Lab (Double Slot)"}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px]">Single Slot</span>
        )}
      </td>
      <td className="py-2.5 px-4 capitalize text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 opacity-60" />
          <span>
            {first.timePref === "morning"
              ? "Morning Preference"
              : first.timePref === "afternoon"
              ? "Afternoon Preference"
              : "Flexible"}
          </span>
        </div>
      </td>
      <td className="py-2.5 px-4 text-muted-foreground">
        {first.allowMultiplePerDay ? (
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 font-semibold">
            Max {first.maxPerDay || 2} / Day
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
            onClick={() => onEdit(group, members)}
            aria-label={`Edit ${group.name}`}
            title={`Edit ${group.name}`}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (await confirm({ title: `Delete group "${group.name}"? Its subjects will show as separate rows again.`, destructive: true })) {
                  void onDelete(group.id);
                }
              }}
              aria-label={`Delete ${group.name}`}
              title={`Delete ${group.name}`}
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
