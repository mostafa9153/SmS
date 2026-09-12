export const DEFAULT_SCHOOL_PRESETS: string[] = [
  "Marigachi Free Primary School",
  "Krishnachandrapur F.P. School",
  "Khakurdaha Primary School",
  "Ramkantapur Primary School",
  "Radhakantapur F.P. School",
  "Mathurapur Primary School",
];

const SCHOOL_PRESETS_STORAGE_KEY = "sms_school_presets";
const SCHOOL_PRESETS_EVENT = "sms_school_presets_updated";

export function getSavedSchoolPresets(): string[] {
  if (typeof window === "undefined") return DEFAULT_SCHOOL_PRESETS;
  try {
    const saved = localStorage.getItem(SCHOOL_PRESETS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse school presets from storage", e);
  }
  return DEFAULT_SCHOOL_PRESETS;
}

export function saveSchoolPresets(items: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SCHOOL_PRESETS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(SCHOOL_PRESETS_EVENT, { detail: items }));
  } catch (e) {
    console.error("Failed to save school presets to storage", e);
  }

  saveSchoolPresetsToDb(items).catch((err) => {
    console.warn("Background DB sync for school presets failed:", err);
  });
}

export async function fetchSchoolPresetsFromDb(): Promise<string[]> {
  try {
    const res = await fetch("/api/school-config?key=school_presets", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(SCHOOL_PRESETS_STORAGE_KEY, JSON.stringify(json.data));
          window.dispatchEvent(new CustomEvent(SCHOOL_PRESETS_EVENT, { detail: json.data }));
        }
        return json.data;
      }
    }
  } catch (err) {
    console.error("Error fetching school presets from DB:", err);
  }
  return getSavedSchoolPresets();
}

export async function saveSchoolPresetsToDb(items: string[]): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.setItem(SCHOOL_PRESETS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(SCHOOL_PRESETS_EVENT, { detail: items }));
  }

  try {
    const res = await fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "school_presets",
        value: items,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to post school presets to DB:", err);
    return false;
  }
}
