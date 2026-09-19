export interface StudentEntryPresets {
  defaultGuardianRelationship: string; // "Father" | "Mother" | "Uncle" | "Grandfather" | "Grandmother" | "None" | string
  defaultReligion: string; // "Hinduism" | "Islam" | "Christianity" | "Sikhism" | "Buddhism" | "Jainism" | "None" | string
  autoFillGuardianName: boolean; // if true and relationship is Father/Mother, auto-set guardianName
  defaultMotherTongue: string; // "Bengali" | "Hindi" | "Urdu" | "English" | "None"
  defaultMediumOfInstruction: string; // "Bengali" | "English" | "Hindi" | "Urdu" | "Nepali" | "None"
}

export const DEFAULT_STUDENT_ENTRY_PRESETS: StudentEntryPresets = {
  defaultGuardianRelationship: "Father",
  defaultReligion: "Hinduism",
  autoFillGuardianName: true,
  defaultMotherTongue: "Bengali",
  defaultMediumOfInstruction: "Bengali",
};

const STUDENT_ENTRY_PRESETS_STORAGE_KEY = "sms_student_entry_presets";
const STUDENT_ENTRY_PRESETS_EVENT = "sms_student_entry_presets_updated";

/**
 * Synchronously retrieves student defaults from localStorage (or fallback default).
 */
export function getSavedStudentEntryPresets(): StudentEntryPresets {
  if (typeof window === "undefined") return { ...DEFAULT_STUDENT_ENTRY_PRESETS };
  try {
    const saved = localStorage.getItem(STUDENT_ENTRY_PRESETS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_STUDENT_ENTRY_PRESETS,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.error("Failed to parse student entry presets from storage", e);
  }
  return { ...DEFAULT_STUDENT_ENTRY_PRESETS };
}

/**
 * Saves presets locally and triggers background sync to Supabase.
 */
export function saveStudentEntryPresets(presets: StudentEntryPresets): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STUDENT_ENTRY_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    window.dispatchEvent(new CustomEvent(STUDENT_ENTRY_PRESETS_EVENT, { detail: presets }));
  } catch (e) {
    console.error("Failed to save student entry presets to storage", e);
  }

  saveStudentEntryPresetsToDb(presets).catch((err) => {
    console.warn("Background DB sync for student entry presets failed:", err);
  });
}

/**
 * Fetches the presets from Supabase database via the school-config endpoint.
 */
export async function fetchStudentEntryPresetsFromDb(): Promise<StudentEntryPresets> {
  try {
    const { getSchoolConfigKey } = await import("@/lib/utils/school-config-client");
    const data = await getSchoolConfigKey<StudentEntryPresets>("student_entry_presets");
    if (data && typeof data === "object") {
      const merged: StudentEntryPresets = {
        ...DEFAULT_STUDENT_ENTRY_PRESETS,
        ...data,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(STUDENT_ENTRY_PRESETS_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(STUDENT_ENTRY_PRESETS_EVENT, { detail: merged }));
      }
      return merged;
    }
  } catch (err) {
    console.error("Error fetching student entry presets from DB:", err);
  }
  return getSavedStudentEntryPresets();
}

/**
 * Persists the presets to the Supabase database.
 */
export async function saveStudentEntryPresetsToDb(presets: StudentEntryPresets): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.setItem(STUDENT_ENTRY_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    window.dispatchEvent(new CustomEvent(STUDENT_ENTRY_PRESETS_EVENT, { detail: presets }));
  }

  try {
    const res = await fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "student_entry_presets",
        value: presets,
      }),
    });
    if (res.ok) {
      const { invalidateSchoolConfigClientCache } = await import("@/lib/utils/school-config-client");
      invalidateSchoolConfigClientCache();
    }
    return res.ok;
  } catch (err) {
    console.error("Failed to post student entry presets to DB:", err);
    return false;
  }
}

/**
 * Automatically applies configured default values to any blank student fields.
 * If relationship is Father/Mother and guardianName is empty, copies Father's/Mother's name.
 */
export function applyStudentEntryDefaults<T extends Record<string, any>>(
  data: T,
  customPresets?: Partial<StudentEntryPresets>
): T {
  const presets: StudentEntryPresets = {
    ...getSavedStudentEntryPresets(),
    ...(customPresets || {}),
  };

  const result: any = { ...data };

  // 1. Default Guardian Relationship
  const currentRel = (result.relationshipWithGuardian || result.relationship_with_guardian || "").trim();
  if (!currentRel && presets.defaultGuardianRelationship && presets.defaultGuardianRelationship !== "None") {
    result.relationshipWithGuardian = presets.defaultGuardianRelationship;
    if ("relationship_with_guardian" in result) {
      result.relationship_with_guardian = presets.defaultGuardianRelationship;
    }
  }

  // 2. Auto-fill Guardian Name if empty
  const activeRel = result.relationshipWithGuardian || result.relationship_with_guardian;
  const currentGuardian = (result.guardianName || result.guardian_name || "").trim();
  if (presets.autoFillGuardianName && !currentGuardian) {
    const father = (result.fatherName || result.father_name || "").trim();
    const mother = (result.motherName || result.mother_name || "").trim();

    if (activeRel === "Father" && father) {
      result.guardianName = father;
      result.guardian_name = father;
    } else if (activeRel === "Mother" && mother) {
      result.guardianName = mother;
      result.guardian_name = mother;
    }
  }

  // 3. Default Religion
  const currentReligion = (result.religion || "").trim();
  if (!currentReligion && presets.defaultReligion && presets.defaultReligion !== "None") {
    result.religion = presets.defaultReligion;
  }

  // 4. Default Mother Tongue
  const currentTongue = (result.motherTongue || result.mother_tongue || "").trim();
  if (!currentTongue && presets.defaultMotherTongue && presets.defaultMotherTongue !== "None") {
    result.motherTongue = presets.defaultMotherTongue;
    result.mother_tongue = presets.defaultMotherTongue;
  }

  // 5. Default Medium of Instruction
  const currentMedium = (result.mediumOfInstruction || result.medium_of_instruction || "").trim();
  if (!currentMedium) {
    const defaultMed = presets.defaultMediumOfInstruction && presets.defaultMediumOfInstruction !== "None"
      ? presets.defaultMediumOfInstruction
      : "Bengali";
    result.mediumOfInstruction = defaultMed;
    result.medium_of_instruction = defaultMed;
  }

  return result as T;
}
