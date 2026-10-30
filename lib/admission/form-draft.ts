// Per-form drafts for the admission form so an accidental refresh keeps the
// work, without leaking one student's data into another form.
// Each form passes its own key (e.g. `readmission:<studentId>`); drafts expire.

const PREFIX = "sms_admission_draft:";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Pre-2026-10-28 shared keys; every form read and wrote these, mixing students. */
const LEGACY_KEYS = ["sms_admission_apply_draft", "sms_admission_saved_sections"];

interface AdmissionDraft {
  values: Record<string, unknown>;
  savedSections: Record<string, boolean>;
  savedAt: number;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadAdmissionDraft(key: string): AdmissionDraft | null {
  const s = storage();
  if (!s) return null;
  LEGACY_KEYS.forEach((k) => s.removeItem(k));
  try {
    const raw = s.getItem(PREFIX + key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as AdmissionDraft;
    if (!draft?.savedAt || Date.now() - draft.savedAt > MAX_AGE_MS) {
      s.removeItem(PREFIX + key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveAdmissionDraft(key: string, values: Record<string, unknown>, savedSections: Record<string, boolean>) {
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify({ values, savedSections, savedAt: Date.now() } satisfies AdmissionDraft));
  } catch {
    // Quota or privacy mode: drafts are best-effort.
  }
}

export function clearAdmissionDraft(key: string) {
  storage()?.removeItem(PREFIX + key);
}
