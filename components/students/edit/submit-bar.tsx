"use client";

import { Spinner } from "@/components/ui/spinner";

import type { EditStudentState } from "./use-edit-student";

export function SubmitBar({ edit }: { edit: EditStudentState }) {
  const { mutation, router } = edit;
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {mutation.isPending && <Spinner className="h-3.5 w-3.5" />}
        {mutation.isPending ? "Saving changes…" : "Save Student"}
      </button>
      <button
        type="button"
        onClick={() => router.back()}
        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
