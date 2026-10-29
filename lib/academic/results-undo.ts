import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, type RestoreStep } from "@/lib/undo/journal";

/**
 * Saving marks re-ranks the whole class, so the before-image is every result
 * row of that class, year and exam.
 */
export async function snapshotClassResults(academicYear: number, className: string, examName: string) {
  const supabase = createAdminClient();
  const normClass = className.toUpperCase().trim();
  const { data, error } = await supabase
    .from("student_results")
    .select("*")
    .eq("academic_year", academicYear)
    .eq("class", normClass)
    .eq("exam_name", examName);
  if (error) throw new Error(`Snapshot of student_results failed: ${error.message}`);
  return data ?? [];
}

interface ResultsUndoInput {
  actorId: string;
  action: string;
  label: string;
  academicYear: number;
  className: string;
  examName: string;
  before: Record<string, unknown>[];
}

/** Undo puts the old rows (marks and ranks) back and removes rows the save created. */
export async function recordResultsUndo(input: ResultsUndoInput): Promise<string | null> {
  const after = await snapshotClassResults(input.academicYear, input.className, input.examName);
  const existed = new Set(input.before.map((r) => String(r.id)));
  const created = after.map((r) => r.id as string).filter((id) => !existed.has(String(id)));
  const steps: RestoreStep[] = [
    { table: "student_results", op: "upsert", rows: input.before },
    { table: "student_results", op: "delete", column: "id", values: created },
  ];
  return recordUndo({
    actorId: input.actorId,
    action: input.action,
    label: input.label,
    entity: "student_results",
    entityId: `${input.academicYear}:${input.className}:${input.examName}`,
    steps,
  });
}
