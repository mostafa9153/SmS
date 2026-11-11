import type { TeacherPermissions } from "@/lib/types/teacher";

/**
 * Delegated teacher task types. A custom type is stored as `CUSTOM:<label>` in
 * `teacher_tasks.task_type` (VARCHAR 50), so no schema change is needed and labels
 * used before show up again as chips.
 */
export interface TaskTypeDef {
  id: string;
  label: string;
  color: string;
  /** Permission auto-granted to assignees for the task's lifetime. */
  permission?: keyof TeacherPermissions;
  /** Where "Start Task" takes the teacher. */
  route?: (cls: string, section: string) => string;
  /** Whether a class/section target makes sense for this type. */
  usesClass: boolean;
}

export const CUSTOM_PREFIX = "CUSTOM:";
export const CUSTOM_LABEL_MAX = 40;

const qs = (params: Record<string, string>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && v !== "ALL") p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const TASK_TYPES: TaskTypeDef[] = [
  {
    id: "NEW_ADMISSION",
    label: "New Admission",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50",
    permission: "can_handle_new_admission",
    route: () => "/admission/new",
    usesClass: false,
  },
  {
    id: "RE_ADMISSION",
    label: "Re-Admission",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50",
    permission: "can_handle_readmission",
    route: (cls, section) => `/admission/re${qs({ class: cls, section })}`,
    usesClass: true,
  },
  {
    id: "MARKS_ENTRY",
    label: "Marks Entry",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50",
    permission: "can_enter_results",
    route: (cls, section) => `/results${qs({ class: cls, section })}`,
    usesClass: true,
  },
  {
    id: "MARKSHEET",
    label: "Marksheet",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50",
    permission: "can_enter_results",
    route: (cls) => `/generate/marksheet${qs({ class: cls })}`,
    usesClass: true,
  },
  {
    id: "SEAT_ARRANGEMENT",
    label: "Seat Arrangement",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50",
    permission: "can_manage_ems",
    route: () => "/ems",
    usesClass: false,
  },
  {
    id: "GENERAL",
    label: "General",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
    usesClass: true,
  },
];

/** Types no longer offered in the dialog; old tasks still open the right page. */
const LEGACY_TYPES: TaskTypeDef[] = [
  {
    id: "INVOICE_COLLECTION",
    label: "Fee Collection",
    color: "",
    permission: "can_generate_invoices",
    route: (cls, section) => `/generate/invoice${qs({ class: cls, section })}`,
    usesClass: true,
  },
];

const CUSTOM_COLOR =
  "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50";

export function isCustomTaskType(id?: string | null): boolean {
  return !!id && id.startsWith(CUSTOM_PREFIX);
}

export function customTaskTypeId(label: string): string {
  return `${CUSTOM_PREFIX}${label.trim().replace(/\s+/g, " ").slice(0, CUSTOM_LABEL_MAX)}`;
}

export function getTaskTypeDef(id?: string | null): TaskTypeDef {
  const known = [...TASK_TYPES, ...LEGACY_TYPES].find((t) => t.id === id);
  if (known) return known;
  if (isCustomTaskType(id)) {
    return { id: id!, label: id!.slice(CUSTOM_PREFIX.length), color: CUSTOM_COLOR, usesClass: true };
  }
  return TASK_TYPES.find((t) => t.id === "GENERAL")!;
}

export function taskTypeLabel(id?: string | null): string {
  return getTaskTypeDef(id).label;
}

/** Validates a task type sent by a client: a built-in id, a legacy id or `CUSTOM:<label>`. */
export function isValidTaskType(id: unknown): id is string {
  if (typeof id !== "string") return false;
  if ([...TASK_TYPES, ...LEGACY_TYPES].some((t) => t.id === id)) return true;
  if (!isCustomTaskType(id)) return false;
  const label = id.slice(CUSTOM_PREFIX.length).trim();
  return label.length > 0 && label.length <= CUSTOM_LABEL_MAX;
}

export function taskStartRoute(task: { taskType?: string | null; targetClass?: string | null; targetSection?: string | null }): string | null {
  const def = getTaskTypeDef(task.taskType);
  return def.route ? def.route(task.targetClass || "", task.targetSection || "") : null;
}
