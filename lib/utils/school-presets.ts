import { saveSchoolConfig } from "@/lib/utils/school-config-client";
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

export async function fetchSchoolPresetsFromDb(): Promise<string[]> {
  try {
    const { getSchoolConfigKey } = await import("@/lib/utils/school-config-client");
    const data = await getSchoolConfigKey<string[]>("school_presets");
    if (data && Array.isArray(data) && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(SCHOOL_PRESETS_STORAGE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent(SCHOOL_PRESETS_EVENT, { detail: data }));
      }
      return data;
    }
  } catch (err) {
    console.error("Error fetching school presets from DB:", err);
  }
  return getSavedSchoolPresets();
}

export async function saveSchoolPresetsToDb(items: string[]): Promise<boolean> {
  return saveSchoolConfig("school_presets", items, {
    label: "School presets saved",
    mirror: { storageKey: SCHOOL_PRESETS_STORAGE_KEY, event: SCHOOL_PRESETS_EVENT, detail: true },
  });
}
