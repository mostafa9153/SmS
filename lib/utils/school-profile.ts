export interface SchoolProfileData {
  schoolName: string;
  schoolCode: string;
  udiseCode: string;
  hsCode?: string;
  boardAffiliation: string;
  establishedYear: string;
  schoolCategory: string;
  schoolType: string;
  mediumOfInstruction: string;
  headmasterName: string;
  headDesignation: string; // e.g. "Teacher-in-Charge", "Headmaster", "Headmistress", "Principal", "Teacher-in-Charge / Headmaster", "President", "Custom"
  customHeadDesignation?: string;
  headSignatureUrl?: string; // Base64 data URL or path
  schoolLogoUrl?: string; // Base64 data URL or path
  schoolEmail: string;
  schoolPhone: string;
  altPhone: string;
  schoolWebsite: string;
  schoolAddress: string;
  village: string;
  policeStation: string;
  district: string;
  state: string;
  pincode: string;
  schoolMotto: string;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfileData = {
  schoolName: "Marigachi High School (H.S.)",
  schoolCode: "MHS-1965",
  udiseCode: "19111305602",
  hsCode: "102298",
  boardAffiliation: "WBBSE / WBCHSE",
  establishedYear: "1965",
  schoolCategory: "Higher Secondary (Class V to XII)",
  schoolType: "Co-educational (Day School)",
  mediumOfInstruction: "Bengali (First Language)",
  headmasterName: "Sheikh Sirajuddin",
  headDesignation: "Teacher-in-Charge",
  customHeadDesignation: "",
  headSignatureUrl: "/hod-signature.png",
  schoolLogoUrl: "/logo.png",
  schoolEmail: "contact@marigachihighschool.in",
  schoolPhone: "+91 98765 43210",
  altPhone: "03218-245678",
  schoolWebsite: "https://marigachihighschool.in",
  schoolAddress: "Marigachi, Mathurapur II, South 24 Parganas, West Bengal - 743349",
  village: "Marigachi",
  policeStation: "Mathurapur",
  district: "South 24 Parganas",
  state: "West Bengal",
  pincode: "743349",
  schoolMotto: "Knowledge, Character, Excellence (আলো থেকে আলো)",
};

export const HEAD_DESIGNATION_OPTIONS = [
  { label: "Teacher-in-Charge (T.I.C.)", value: "Teacher-in-Charge" },
  { label: "Headmaster", value: "Headmaster" },
  { label: "Headmistress", value: "Headmistress" },
  { label: "Principal", value: "Principal" },
  { label: "Teacher-in-Charge / Headmaster", value: "Teacher-in-Charge / Headmaster" },
  { label: "President / Administrator", value: "President" },
  { label: "Custom Title...", value: "Custom" },
];

export function getEffectiveHeadTitle(profile: Partial<SchoolProfileData>): string {
  if (profile.headDesignation === "Custom" && profile.customHeadDesignation?.trim()) {
    return profile.customHeadDesignation.trim();
  }
  if (profile.headDesignation) {
    return profile.headDesignation;
  }
  return "Teacher-in-Charge";
}

export function getSavedSchoolProfile(): SchoolProfileData {
  if (typeof window === "undefined") return DEFAULT_SCHOOL_PROFILE;
  try {
    const saved = localStorage.getItem("sms_school_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SCHOOL_PROFILE, ...parsed };
    }
  } catch (e) {
    console.error("Failed to parse school profile from storage", e);
  }
  return DEFAULT_SCHOOL_PROFILE;
}

export function saveSchoolProfile(profile: SchoolProfileData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("sms_school_profile", JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("sms_school_profile_updated", { detail: profile }));
  } catch (e) {
    console.error("Failed to save school profile to storage", e);
  }

  // Background sync to database
  saveSchoolProfileToDb(profile).catch((err) => {
    console.warn("Background DB sync for school profile failed:", err);
  });
}

/**
 * Asynchronously fetches the latest school profile from Supabase system_config
 * and synchronizes it into local storage.
 */
export async function fetchSchoolProfileFromDb(): Promise<SchoolProfileData> {
  try {
    const res = await fetch("/api/school-config?key=school_profile", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        const merged: SchoolProfileData = { ...DEFAULT_SCHOOL_PROFILE, ...json.data };
        if (typeof window !== "undefined") {
          localStorage.setItem("sms_school_profile", JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent("sms_school_profile_updated", { detail: merged }));
        }
        return merged;
      }
    }
  } catch (err) {
    console.error("Error fetching school profile from DB:", err);
  }
  return getSavedSchoolProfile();
}

/**
 * Saves the school profile to both localStorage and the Supabase database.
 */
export async function saveSchoolProfileToDb(profile: SchoolProfileData): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.setItem("sms_school_profile", JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("sms_school_profile_updated", { detail: profile }));
  }

  try {
    const res = await fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "school_profile",
        value: profile,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to save school profile to DB:", err);
    return false;
  }
}

