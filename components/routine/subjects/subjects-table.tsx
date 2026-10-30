"use client";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDemandBreakdown } from "@/lib/routine/routine-domain";
import { GroupSubjectRow } from "@/components/routine/subjects/group-subject-row";
import { SubjectTableRow } from "@/components/routine/subjects/subject-table-row";
import type { RoutineSubjectsState } from "./use-routine-subjects";

export function SubjectsTable({ tab }: { tab: RoutineSubjectsState }) {
  const { activeClass, activeClassSections, currentClassGroupExtra, currentClassGroupSlots, currentClassOrdinaryPeriods, currentClassSubjects, currentClassTotalPeriods, displayRows, handleDragEnd, handleEdit, handleEditGroup, onDeleteGroup, onDeleteSubject, selectedStream, sensors } = tab;
  return (
    <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {`${activeClass} Curriculum Subjects`}
          </span>
          <Badge variant="secondary" className="text-[10px] font-mono font-bold">
            {currentClassSubjects.length} Subjects
          </Badge>
          <Badge 
            variant={(currentClassOrdinaryPeriods + currentClassGroupSlots) > 44 ? "destructive" : "outline"} 
            className={cn("text-[10px] font-mono font-bold", (currentClassOrdinaryPeriods + currentClassGroupSlots) <= 44 && "bg-primary/10 text-primary border-primary/30")}
          >
            {formatDemandBreakdown(currentClassOrdinaryPeriods, currentClassGroupSlots, currentClassGroupExtra)} p/wk / section {(currentClassOrdinaryPeriods + currentClassGroupSlots) > 44 && "(Overload!)"}
          </Badge>
          {activeClassSections.length > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono text-foreground font-semibold border-border/80">
              Total: {formatDemandBreakdown(
                activeClassSections.length * currentClassOrdinaryPeriods,
                activeClassSections.length * currentClassGroupSlots,
                activeClassSections.length * currentClassGroupExtra
              )} p/wk ({activeClassSections.length} Sections)
            </Badge>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                <th className="py-2.5 pl-3 pr-1 w-6" />
                <th className="py-2.5 px-4">Subject Name</th>
                <th className="py-2.5 px-4">Stream / Type</th>
                <th className="py-2.5 px-4">Weekly Load</th>
                <th className="py-2.5 px-4">Period Format</th>
                <th className="py-2.5 px-4">Time Preference</th>
                <th className="py-2.5 px-4">Daily Policy</th>
                <th className="py-2.5 px-4 text-right w-20">Actions</th>
              </tr>
            </thead>
            <SortableContext
              items={displayRows.map((r) => (r.type === "group" ? `group:${r.group.id}` : r.subject.id))}
              strategy={verticalListSortingStrategy}
            >
              <tbody className="divide-y divide-border">
                {displayRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <BookOpen className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      <span>
                        {`No subjects configured yet for ${activeClass}${selectedStream !== "all" ? ` (${selectedStream})` : ""}. Select a preset chip or add a subject above.`}
                      </span>
                    </td>
                  </tr>
                ) : (
                  displayRows.map((r) =>
                    r.type === "group" ? (
                      <GroupSubjectRow
                        key={`group:${r.group.id}`}
                        group={r.group}
                        members={r.members}
                        onEdit={handleEditGroup}
                        onDelete={onDeleteGroup}
                      />
                    ) : (
                      <SubjectTableRow
                        key={r.subject.id}
                        subject={r.subject}
                        activeClass={activeClass}
                        onEdit={handleEdit}
                        onDelete={onDeleteSubject}
                        isDraggable={true}
                      />
                    )
                  )
                )}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
