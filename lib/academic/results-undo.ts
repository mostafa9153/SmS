import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, type RestoreStep } from "@/lib/undo/journal";

type Row = Record<string, unknown> & { id: string };

/**
 * Saving marks re-ranks the whole class, so the before-image is every result row of that
 * class, year and exam. The save itself upserts on (student, year, exam) and ignores the
 * class, so the saved students' own rows are included even when they sit under another class.
 */
export async function snapshotClassResults(
  academicYear: number,
  className: string,
  examName: string,
  studentIds: string[] = []
): Promise<Row[]> {
  const supabase = createAdminClient();
  const byId = new Map<string, Row>();
  const { data: classRows, error } = await supabase
    .from("student_results")
    .select("*")
    .eq("academic_year", academicYear)
    .eq("class", className.toUpperCase().trim())
    .eq("exam_name", examName);
  if (error) throw new Error(`Snapshot of student_results failed: ${error.message}`);
  for (const r of (classRows ?? []) as Row[]) byId.set(String(r.id), r);

  if (studentIds.length) {
    const { data: ownRows, error: ownErr } = await supabase
      .from("student_results")
      .select("*")
      .eq("academic_year", academicYear)
      .eq("exam_name", examName)
      .in("student_id", studentIds);
    if (ownErr) throw new Error(`Snapshot of student_results failed: ${ownErr.message}`);
    for (const r of (ownRows ?? []) as Row[]) byId.set(String(r.id), r);
  }
  return [...byId.values()];
}

interface ResultsUndoInput {
  actorId: string;
  action: string;
  label: string;
  academicYear: number;
  className: string;
  examName: string;
  studentIds?: string[];
  before: Row[];
}

/**
 * Undo puts the old rows (marks and ranks) back and removes rows the save created. It lasts one
 * hour: the before-image is the whole class, so a late undo would also revert marks entered since.
 * The save has already succeeded, so a failure here returns null instead of failing the request.
 */
export async function recordResultsUndo(input: ResultsUndoInput): Promise<string | null> {
  try {
    const after = await snapshotClassResults(input.academicYear, input.className, input.examName, input.studentIds);
    const existed = new Set(input.before.map((r) => String(r.id)));
    const created = after.map((r) => r.id).filter((id) => !existed.has(String(id)));
    const steps: RestoreStep[] = [
      { table: "student_results", op: "upsert", rows: input.before },
      { table: "student_results", op: "delete", column: "id", values: created },
    ];
    return await recordUndo({
      actorId: input.actorId,
      action: input.action,
      label: input.label,
      entity: "student_results",
      entityId: `${input.academicYear}:${input.className}:${input.examName}`,
      steps,
      ttlHours: 1,
    });
  } catch (err) {
    console.error("[undo] results journal failed:", err);
    return null;
  }
}
