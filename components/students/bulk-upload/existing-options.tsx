"use client";

import { PencilLine, PlusSquare, SkipForward, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { UpdateMode } from "@/lib/supabase/bulk-upload/students";
import type { BulkUploadState } from "./use-bulk-upload";

const MODES: Array<{ value: UpdateMode; label: string; icon: typeof PlusSquare }> = [
  { value: "skip", label: "Skip existing students", icon: SkipForward },
  { value: "fill_blanks", label: "Fill blank fields only", icon: PlusSquare },
  { value: "overwrite", label: "Fill & correct existing data", icon: PencilLine },
];

/** How a sheet treats students that already exist (matched by PEN, Banglar Shiksha ID, School ID, Aadhaar). */
export function ExistingOptions({ bulk }: { bulk: BulkUploadState }) {
  const { createNew, setCreateNew, setUpdateMode, updateMode } = bulk;
  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto] gap-2.5 items-stretch">
      {MODES.map(({ value, label, icon: Icon }) => {
        const active = updateMode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setUpdateMode(value);
              // Skipping existing students with adding off would import nothing
              if (value === "skip") setCreateNew(true);
            }}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-all active:scale-[0.98]",
              active ? "border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground" : "bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
            {label}
          </button>
        );
      })}
      <label className="sm:col-span-3 lg:col-span-1 flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 text-xs font-semibold cursor-pointer has-[:disabled]:cursor-default">
        <span className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Add students not found
        </span>
        <Switch checked={createNew} onCheckedChange={setCreateNew} disabled={updateMode === "skip"} aria-label="Add students not found" />
      </label>
    </div>
  );
}
