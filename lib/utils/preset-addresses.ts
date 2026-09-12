export interface PostOfficeOption {
  name: string;
  pincode: string;
}

export interface AddressPresetsConfig {
  villages: string[];
  postOffices: PostOfficeOption[];
  policeStations: string[];
  districts: string[];
}

export const DEFAULT_VILLAGES: string[] = [
  "Marigachi",
  "Krishnachandrapur",
  "Khakurdaha",
  "Ramkantapur",
  "Radhakantapur",
];

export const DEFAULT_POST_OFFICES: PostOfficeOption[] = [
  { name: "Marigachi", pincode: "743349" },
  { name: "Mathurapur", pincode: "743354" },
  { name: "Khakurdaha", pincode: "743349" },
  { name: "Ramkantapur", pincode: "743349" },
  { name: "Radhakantapur", pincode: "743349" },
];

export const DEFAULT_POLICE_STATIONS: string[] = [
  "Mathurapur",
  "Mandirbazar",
  "Kulpi",
  "Diamond Harbour",
  "Raidighi",
  "Usthi",
  "Jaynagar",
];

export const DEFAULT_DISTRICTS: string[] = [
  "South 24 Parganas",
  "North 24 Parganas",
  "Kolkata",
  "Howrah",
  "Hooghly",
];

export const DEFAULT_ADDRESS_PRESETS_CONFIG: AddressPresetsConfig = {
  villages: DEFAULT_VILLAGES,
  postOffices: DEFAULT_POST_OFFICES,
  policeStations: DEFAULT_POLICE_STATIONS,
  districts: DEFAULT_DISTRICTS,
};

const ADDRESS_CONFIG_STORAGE_KEY = "sms_address_presets_config";
const ADDRESS_CONFIG_EVENT = "sms_address_presets_config_updated";

/**
 * Compile structured fields into standard address string
 */
export function compileAddressString(parts: {
  village?: string;
  postOffice?: string;
  policeStation?: string;
  district?: string;
}): string {
  const v = (parts.village || "").trim();
  const po = (parts.postOffice || "").trim();
  const ps = (parts.policeStation || "").trim();
  const dist = (parts.district || "").trim();

  const segments: string[] = [];

  if (v && po && v.toLowerCase() === po.toLowerCase()) {
    segments.push(`Vill+P.O- ${v}`);
  } else {
    if (v) segments.push(`Vill- ${v}`);
    if (po) segments.push(`P.O- ${po}`);
  }

  if (ps) segments.push(`P.S- ${ps}`);
  if (dist) segments.push(`Dist- ${dist}`);

  return segments.join(", ");
}

/**
 * Parse a standard address string into structured parts
 */
export function parseAddressString(raw: string = ""): {
  village: string;
  postOffice: string;
  policeStation: string;
  district: string;
} {
  if (!raw || typeof raw !== "string") {
    return { village: "", postOffice: "", policeStation: "", district: "" };
  }

  let village = "";
  let postOffice = "";
  let policeStation = "";
  let district = "";

  // Handle Vill+P.O- combined format e.g. "Vill+P.O- Marigachi" or "Vill + P.O - Marigachi"
  const villPoMatch = raw.match(/Vill\s*\+\s*P\.?O\.?[\s:-]+([^,]+)/i);
  if (villPoMatch) {
    village = villPoMatch[1].trim();
    postOffice = villPoMatch[1].trim();
  } else {
    const villMatch = raw.match(/Vill(?:age)?[\s:-]+([^,]+)/i);
    if (villMatch) village = villMatch[1].trim();

    const poMatch = raw.match(/P\.?O\.?[\s:-]+([^,]+)/i);
    if (poMatch) postOffice = poMatch[1].trim();
  }

  const psMatch = raw.match(/P\.?S\.?[\s:-]+([^,]+)/i);
  if (psMatch) policeStation = psMatch[1].trim();

  const distMatch = raw.match(/Dist(?:rict)?[\s:-]+([^,]+)/i);
  if (distMatch) district = distMatch[1].trim();

  return { village, postOffice, policeStation, district };
}

// ----------------------------------------------------
// Structured Address Config Storage (Villages, POs, PS, Dist)
// ----------------------------------------------------

export function getSavedAddressPresetsConfig(): AddressPresetsConfig {
  if (typeof window === "undefined") return DEFAULT_ADDRESS_PRESETS_CONFIG;
  try {
    const saved = localStorage.getItem(ADDRESS_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        villages: Array.isArray(parsed.villages) && parsed.villages.length > 0 ? parsed.villages : DEFAULT_VILLAGES,
        postOffices: Array.isArray(parsed.postOffices) && parsed.postOffices.length > 0 ? parsed.postOffices : DEFAULT_POST_OFFICES,
        policeStations: Array.isArray(parsed.policeStations) && parsed.policeStations.length > 0 ? parsed.policeStations : DEFAULT_POLICE_STATIONS,
        districts: Array.isArray(parsed.districts) && parsed.districts.length > 0 ? parsed.districts : DEFAULT_DISTRICTS,
      };
    }
  } catch (e) {
    console.error("Failed to parse address presets config from storage", e);
  }
  return DEFAULT_ADDRESS_PRESETS_CONFIG;
}

export function saveAddressPresetsConfig(config: AddressPresetsConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADDRESS_CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(ADDRESS_CONFIG_EVENT, { detail: config }));
  } catch (e) {
    console.error("Failed to save address presets config to storage", e);
  }

  saveAddressPresetsConfigToDb(config).catch((err) => {
    console.warn("Background DB sync for address presets config failed:", err);
  });
}

export async function fetchAddressPresetsConfigFromDb(): Promise<AddressPresetsConfig> {
  try {
    const res = await fetch("/api/school-config?key=address_presets_config", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data && typeof json.data === "object") {
        const merged: AddressPresetsConfig = {
          villages: Array.isArray(json.data.villages) && json.data.villages.length > 0 ? json.data.villages : DEFAULT_VILLAGES,
          postOffices: Array.isArray(json.data.postOffices) && json.data.postOffices.length > 0 ? json.data.postOffices : DEFAULT_POST_OFFICES,
          policeStations: Array.isArray(json.data.policeStations) && json.data.policeStations.length > 0 ? json.data.policeStations : DEFAULT_POLICE_STATIONS,
          districts: Array.isArray(json.data.districts) && json.data.districts.length > 0 ? json.data.districts : DEFAULT_DISTRICTS,
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(ADDRESS_CONFIG_STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent(ADDRESS_CONFIG_EVENT, { detail: merged }));
        }
        return merged;
      }
    }
  } catch (err) {
    console.error("Error fetching address presets config from DB:", err);
  }
  return getSavedAddressPresetsConfig();
}

export async function saveAddressPresetsConfigToDb(config: AddressPresetsConfig): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.setItem(ADDRESS_CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(ADDRESS_CONFIG_EVENT, { detail: config }));
  }

  try {
    const res = await fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "address_presets_config",
        value: config,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to post address presets config to DB:", err);
    return false;
  }
}
