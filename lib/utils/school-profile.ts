export interface SchoolProfileData {
  schoolName: string;
  schoolCode: string;
  indexNo?: string;
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
  postOffice?: string;
  policeStation: string;
  district: string;
  state: string;
  pincode: string;
  schoolMotto: string;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfileData = {
  schoolName: "Marigachi High School (H.S.)",
  schoolCode: "MHS-1965",
  indexNo: "MHS-1965",
  udiseCode: "19111305602",
  hsCode: "102298",
  boardAffiliation: "WBBSE / WBCHSE",
  establishedYear: "1965",
  schoolCategory: "Higher Secondary (Class V to XII)",
  schoolType: "Co-educational (Day School)",
  mediumOfInstruction: "Bengali (First Language)",
  headmasterName: "Sahidullha Gayen",
  headDesignation: "Teacher-in-Charge",
  customHeadDesignation: "",
  headSignatureUrl: "/hod-signature.png",
  schoolLogoUrl: "/school-logo.png",
  schoolEmail: "contact@marigachihighschool.in",
  schoolPhone: "+91 98765 43210",
  altPhone: "03218-245678",
  schoolWebsite: "https://marigachihighschool.in",
  schoolAddress: "Marigachi, Mathurapur II, South 24 Parganas, West Bengal - 743349",
  village: "Marigachi",
  postOffice: "Marigachi",
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

export function getEffectiveHeadTitle(profile?: Partial<SchoolProfileData>): string {
  if (!profile) return "Teacher-in-Charge";
  if (profile.headDesignation === "Custom" && profile.customHeadDesignation?.trim()) {
    return profile.customHeadDesignation.trim();
  }
  if (profile.headDesignation) {
    return profile.headDesignation;
  }
  return "Teacher-in-Charge";
}

/**
 * Splits school name so that the main name (up to SCHOOL) remains on one line,
 * with any trailing designation or suffix like "(H.S.)" cleanly positioned below.
 */
export function formatSchoolNameParts(name?: string): { mainName: string; suffix: string } {
  const raw = (name || "MARIGACHI HIGH SCHOOL (H.S.)").trim();
  const match = raw.match(/\s*(\(H\.?\s*S\.?\))\s*$/i);
  if (match && match.index !== undefined) {
    return {
      mainName: raw.slice(0, match.index).trim(),
      suffix: match[1].toUpperCase(),
    };
  }
  return { mainName: raw, suffix: "" };
}

/**
 * Strips redundant prefixes like "Vill-", "P.O.-", "P.S.-", "Dist.-" so they don't appear twice
 * when rendered next to template labels like "Village:", "P.O.:", "P.S.:", "District:".
 */
export function cleanAddressPart(value?: string, type?: "village" | "po" | "ps" | "dist" | "pin"): string {
  if (!value) return "";
  let s = value.trim();

  // Repeatedly strip leading labels/prefixes (both English and Bengali)
  s = s.replace(/^(village|vill|vil|গ্রাম)[\s.\-_/:]*/i, "");
  s = s.replace(/^(post\s*office|p\.?o\.?|post|ডাকঘর)[\s.\-_/:]*/i, "");
  s = s.replace(/^(police\s*station|p\.?s\.?|ps|police|থানা)[\s.\-_/:]*/i, "");
  s = s.replace(/^(district|dist|dt\.?|জেলা)[\s.\-_/:]*/i, "");
  s = s.replace(/^(pin\s*code|pincode|pin|পিন)[\s.\-_/:]*/i, "");

  // Clean any leading punctuation that might remain (e.g. "- ", ": ", ". ")
  s = s.replace(/^[\s.\-_/:]+/, "");
  // Clean any trailing punctuation
  s = s.replace(/[\s.,\-:]+$/, "");

  // If type is ps and the value looks like a district or starts with dist, ignore it so it falls back to actual school P.S.
  if (type === "ps" && /^(dist|district|dt|south\s*24|north\s*24|kolkata|howrah|hooghly|nadia|murshidabad|purba|paschim)/i.test(s)) {
    return "";
  }

  // If type is po and it contains "dist", ignore it
  if (type === "po" && /^(dist|district|dt)/i.test(s)) {
    return "";
  }

  return s.trim();
}

/**
 * Constructs a standardized full address string from individual geographical address components.
 * Format: "Village, [P.O.], P.S., District, State - PIN"
 * Automatically omits empty fields and prevents duplicate Village/P.O. entries if identical.
 */
export function formatFullSchoolAddress(parts: {
  village?: string;
  postOffice?: string;
  policeStation?: string;
  district?: string;
  state?: string;
  pincode?: string;
}): string {
  const v = (parts.village || "").trim();
  const po = (parts.postOffice || "").trim();
  const ps = (parts.policeStation || "").trim();
  const dist = (parts.district || "").trim();
  const st = (parts.state || "West Bengal").trim();
  const pin = (parts.pincode || "").trim();

  const segments: string[] = [];

  if (v) segments.push(v);
  if (po && (!v || po.toLowerCase() !== v.toLowerCase())) {
    segments.push(po);
  }
  if (ps) segments.push(ps);
  if (dist) segments.push(dist);
  if (st) segments.push(st);

  let result = segments.filter(Boolean).join(", ");
  if (pin) {
    if (result) {
      result += ` - ${pin}`;
    } else {
      result = pin;
    }
  }

  return result;
}


/**
 * Robustly parses a free-form student address string into clean Village, P.O., P.S., District, and PIN,
 * correctly handling labeled tokens (Vill-, P.O.-, P.S.-, Dist.-) and preventing label duplication.
 */
export function parseStudentAddress(addr?: string, schoolProfile?: Partial<SchoolProfileData>) {
  const defaultVillage = schoolProfile?.village || "Marigachi";
  const defaultPO = schoolProfile?.postOffice || schoolProfile?.village || "Marigachi";
  const defaultPS = schoolProfile?.policeStation || "Mathurapur";
  const defaultDist = schoolProfile?.district || "South 24 Parganas";
  const defaultPin = schoolProfile?.pincode || "743349";

  if (!addr || !addr.trim()) {
    return {
      village: defaultVillage,
      postOffice: defaultPO,
      policeStation: defaultPS,
      district: defaultDist,
      pincode: defaultPin,
    };
  }

  // Extract 6-digit PIN if present
  let pin = "";
  const pinMatch = addr.match(/\b\d{6}\b/);
  if (pinMatch) {
    pin = pinMatch[0];
  }

  const cleanAddr = addr.replace(/\b\d{6}\b/, "").trim();
  const rawParts = cleanAddr.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);

  let village = "";
  let po = "";
  let ps = "";
  let dist = "";

  for (const part of rawParts) {
    if (/^(vill|village|গ্রাম)[\s.\-_/:]*/i.test(part)) {
      village = cleanAddressPart(part, "village");
    } else if (/^(p\.?o\.?|post|ডাকঘর)[\s.\-_/:]*/i.test(part)) {
      po = cleanAddressPart(part, "po");
    } else if (/^(p\.?s\.?|police|থানা)[\s.\-_/:]*/i.test(part)) {
      ps = cleanAddressPart(part, "ps");
    } else if (/^(dist|district|dt|জেলা)[\s.\-_/:]*/i.test(part)) {
      dist = cleanAddressPart(part, "dist");
    }
  }

  // Handle unlabelled parts
  const unassigned = rawParts.filter(
    (p) =>
      !/^(vill|village|গ্রাম)[\s.\-_/:]*/i.test(p) &&
      !/^(p\.?o\.?|post|ডাকঘর)[\s.\-_/:]*/i.test(p) &&
      !/^(p\.?s\.?|police|থানা)[\s.\-_/:]*/i.test(p) &&
      !/^(dist|district|dt|জেলা)[\s.\-_/:]*/i.test(p)
  );

  let unIndex = 0;
  if (!village && unassigned[unIndex]) village = cleanAddressPart(unassigned[unIndex++], "village");
  if (!po && unassigned[unIndex]) po = cleanAddressPart(unassigned[unIndex++], "po");
  if (!ps && unassigned[unIndex]) {
    const candidate = cleanAddressPart(unassigned[unIndex++], "ps");
    if (candidate) ps = candidate;
  }
  if (!dist && unassigned[unIndex]) dist = cleanAddressPart(unassigned[unIndex++], "dist");

  return {
    village: cleanAddressPart(village, "village") || defaultVillage,
    postOffice: cleanAddressPart(po, "po") || defaultPO,
    policeStation: cleanAddressPart(ps, "ps") || defaultPS,
    district: cleanAddressPart(dist, "dist") || defaultDist,
    pincode: pin || defaultPin,
  };
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

import { useState, useEffect } from "react";

/**
 * Custom React hook for live school profile subscription and auto-fetch from DB.
 * Automatically updates when school profile is edited anywhere in the app.
 */
export function useSchoolProfile() {
  const [profile, setProfile] = useState<SchoolProfileData>(getSavedSchoolProfile);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch latest from database asynchronously
    fetchSchoolProfileFromDb().then((p) => {
      if (isMounted) {
        setProfile(p);
        setIsLoading(false);
      }
    });

    // 2. React to instantaneous cross-component and cross-tab update events
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SchoolProfileData>;
      if (customEvent && customEvent.detail) {
        setProfile({ ...DEFAULT_SCHOOL_PROFILE, ...customEvent.detail });
      } else {
        setProfile(getSavedSchoolProfile());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sms_school_profile") {
        setProfile(getSavedSchoolProfile());
      }
    };

    window.addEventListener("sms_school_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("sms_school_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    const p = await fetchSchoolProfileFromDb();
    setProfile(p);
    setIsLoading(false);
    return p;
  };

  return { profile, isLoading, refetch };
}

