"use client";

import { Button } from "@/components/ui/button";
import { Plus, GraduationCap, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

import type { RoutineTeachersState } from "./use-routine-teachers";

export function TeachersHeaderCard({ rt }: { rt: RoutineTeachersState }) {
  const { handleOpenAdd, handleSaveAllToCloud, isEditorOpen, isSavedRecently, isSavingAll, teachers } = rt;
  return (
    <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Faculty Class & Subject Configuration
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {!isEditorOpen && (
          <>
            <Button
              type="button"
              size="sm"
              disabled={isSavingAll || teachers.length === 0}
              onClick={handleSaveAllToCloud}
              className={cn(
                "h-8 text-xs font-semibold gap-1.5 px-3 transition-all duration-150 shadow-xs cursor-pointer",
                isSavedRecently
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {isSavingAll ? (
                <>
                  <Spinner className="w-3.5 h-3.5" />
                  <span>Saving...</span>
                </>
              ) : isSavedRecently ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenAdd}
              className="h-8 text-xs font-semibold gap-1.5 px-3.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Teacher
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
