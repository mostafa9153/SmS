import { RoutineSettings, RoutineRoom, RoutineClass, RoutineSubject, RoutineTeacher, RoutineAssignment, RoutineSubjectGroup, GeneratedRoutine } from "@/lib/routine/types";

export interface RoutineFullState {
  settings: RoutineSettings;
  rooms: RoutineRoom[];
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  assignments: RoutineAssignment[];
  groups: RoutineSubjectGroup[];
  routine: GeneratedRoutine | null;
}

const LOCAL_STORAGE_KEY = "routine_forge_pro_local_state_v1";

export function getLocalRoutineState(): Partial<RoutineFullState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalRoutineState(state: Partial<RoutineFullState>) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalRoutineState() || {};
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...existing, ...state }));
  } catch {}
}
