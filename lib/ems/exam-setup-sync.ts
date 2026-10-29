import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";

/**
 * EMS exam setup (routine, start time, section order) shared through /api/school-config,
 * like rooms and allocations. localStorage is only this browser's cache.
 */
const KEYS = {
  routines: { local: "sms_ems_exam_routines", db: "ems_exam_routines" },
  startTime: { local: "sms_ems_exam_start_time", db: "ems_exam_start_time" },
  sectionOrders: { local: "sms_ems_section_orders", db: "ems_section_orders" },
} as const;

export type ExamSetupKey = keyof typeof KEYS;

/* eslint-disable @typescript-eslint/no-explicit-any -- stored values are opaque JSON */
type ExamSetup = Partial<Record<ExamSetupKey, any>>;

// The start time is stored as a plain string; the others as JSON.
const toLocal = (key: ExamSetupKey, value: any) => (key === "startTime" ? String(value) : JSON.stringify(value));
const fromLocal = (key: ExamSetupKey, raw: string) => (key === "startTime" ? raw : JSON.parse(raw));

const timers: Partial<Record<ExamSetupKey, ReturnType<typeof setTimeout>>> = {};

async function postValue(key: ExamSetupKey, value: any) {
  try {
    await apiFetch("/api/school-config", { method: "POST", json: { key: KEYS[key].db, value } });
  } catch (err) {
    // Saved in this browser only; other devices will not see it until a later save succeeds.
    toast.error("Exam setup was not saved to the server", { description: err instanceof Error ? err.message : undefined });
  }
}

/** Send this browser's cached value to the server (debounced per key). */
export function pushExamSetup(key: ExamSetupKey) {
  if (typeof window === "undefined") return;
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    try {
      const raw = localStorage.getItem(KEYS[key].local);
      if (raw !== null) void postValue(key, fromLocal(key, raw));
    } catch {}
  }, 800);
}

/**
 * Load the shared exam setup into this browser's cache and return it. When the
 * server has nothing yet, this browser's cached value is uploaded instead. A
 * differing local value is kept once under `<key>__before_sync` before it is replaced.
 */
export async function pullExamSetup(): Promise<ExamSetup> {
  if (typeof window === "undefined") return {};
  const result: ExamSetup = {};
  await Promise.all(
    (Object.keys(KEYS) as ExamSetupKey[]).map(async (key) => {
      const { local, db } = KEYS[key];
      try {
        // apiFetch unwraps `data`; for an unset key it returns the `{ success, key, data: null }` envelope.
        const payload = await apiFetch<any>(`/api/school-config?key=${db}`, { cache: "no-store" });
        const value = payload?.success === true && payload?.data === null ? null : payload;
        const cached = localStorage.getItem(local);
        if (value === undefined || value === null) {
          if (cached !== null) void postValue(key, fromLocal(key, cached));
          return;
        }
        const incoming = toLocal(key, value);
        if (cached !== null && cached !== incoming && localStorage.getItem(`${local}__before_sync`) === null) {
          localStorage.setItem(`${local}__before_sync`, cached);
        }
        localStorage.setItem(local, incoming);
        result[key] = value;
      } catch (err) {
        console.warn(`[EMS] could not load ${key}:`, err);
      }
    }),
  );
  return result;
}
