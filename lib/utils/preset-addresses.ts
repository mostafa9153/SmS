export interface PostOfficeOption {
  name: string;
  pincode: string;
}

export interface AddressPresetsConfig {
  villages: string[];
  gramPanchayats: string[];
  postOffices: PostOfficeOption[];
  blocks: string[];
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

export const DEFAULT_GRAM_PANCHAYATS: string[] = [
  "Khakurdaha",
  "Mathurapur",
  "Raidighi",
  "Mandirbazar",
  "Krishnachandrapur",
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

export const DEFAULT_BLOCKS: string[] = [
  "Mathurapur-I",
  "Mathurapur-II",
  "Mandirbazar",
  "Kulpi",
  "Diamond Harbour-I",
  "Diamond Harbour-II",
  "Jaynagar-I",
  "Jaynagar-II",
  "Kakdwip",
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
  gramPanchayats: DEFAULT_GRAM_PANCHAYATS,
  postOffices: DEFAULT_POST_OFFICES,
  blocks: DEFAULT_BLOCKS,
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
  gramPanchayat?: string;
  postOffice?: string;
  block?: string;
  policeStation?: string;
  district?: string;
}): string {
  const v = (parts.village || "").trim();
  const gp = (parts.gramPanchayat || "").trim();
  const po = (parts.postOffice || "").trim();
  const blk = (parts.block || "").trim();
  const ps = (parts.policeStation || "").trim();
  const dist = (parts.district || "").trim();

  const segments: string[] = [];

  if (v && po && v.toLowerCase() === po.toLowerCase()) {
    segments.push(`Vill+P.O- ${v}`);
  } else {
    if (v) segments.push(`Vill- ${v}`);
    if (po) segments.push(`P.O- ${po}`);
  }

  if (gp) segments.push(`G.P- ${gp}`);
  if (blk) segments.push(`Block- ${blk}`);
  if (ps) segments.push(`P.S- ${ps}`);
  if (dist) segments.push(`Dist- ${dist}`);

  return segments.join(", ");
}

/**
 * Parse a standard address string into structured parts
 */
export function parseAddressString(raw: string = ""): {
  village: string;
  gramPanchayat: string;
  postOffice: string;
  block: string;
  policeStation: string;
  district: string;
} {
  if (!raw || typeof raw !== "string") {
    return { village: "", gramPanchayat: "", postOffice: "", block: "", policeStation: "", district: "" };
  }

  let village = "";
  let gramPanchayat = "";
  let postOffice = "";
  let block = "";
  let policeStation = "";
  let district = "";

  // Handle Vill+P.O- combined format
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

  const gpMatch = raw.match(/G\.?P\.?[\s:-]+([^,]+)/i);
  if (gpMatch) gramPanchayat = gpMatch[1].trim();

  const blkMatch = raw.match(/Block[\s:-]+([^,]+)/i);
  if (blkMatch) block = blkMatch[1].trim();

  const psMatch = raw.match(/P\.?S\.?[\s:-]+([^,]+)/i);
  if (psMatch) policeStation = psMatch[1].trim();

  const distMatch = raw.match(/Dist(?:rict)?[\s:-]+([^,]+)/i);
  if (distMatch) district = distMatch[1].trim();

  return { village, gramPanchayat, postOffice, block, policeStation, district };
}

// ----------------------------------------------------
// Structured Address Config Storage (Villages, GP, POs, Blocks, PS, Dist)
// ----------------------------------------------------

export function getSavedAddressPresetsConfig(): AddressPresetsConfig {
  if (typeof window === "undefined") return DEFAULT_ADDRESS_PRESETS_CONFIG;
  try {
    const saved = localStorage.getItem(ADDRESS_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        villages: Array.isArray(parsed.villages) && parsed.villages.length > 0 ? parsed.villages : DEFAULT_VILLAGES,
        gramPanchayats: Array.isArray(parsed.gramPanchayats) && parsed.gramPanchayats.length > 0 ? parsed.gramPanchayats : DEFAULT_GRAM_PANCHAYATS,
        postOffices: Array.isArray(parsed.postOffices) && parsed.postOffices.length > 0 ? parsed.postOffices : DEFAULT_POST_OFFICES,
        blocks: Array.isArray(parsed.blocks) && parsed.blocks.length > 0 ? parsed.blocks : DEFAULT_BLOCKS,
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
    const { getSchoolConfigKey } = await import("@/lib/utils/school-config-client");
    const data = await getSchoolConfigKey<any>("address_presets_config");
    if (data && typeof data === "object") {
      const merged: AddressPresetsConfig = {
        villages: Array.isArray(data.villages) && data.villages.length > 0 ? data.villages : DEFAULT_VILLAGES,
        gramPanchayats: Array.isArray(data.gramPanchayats) && data.gramPanchayats.length > 0 ? data.gramPanchayats : DEFAULT_GRAM_PANCHAYATS,
        postOffices: Array.isArray(data.postOffices) && data.postOffices.length > 0 ? data.postOffices : DEFAULT_POST_OFFICES,
        blocks: Array.isArray(data.blocks) && data.blocks.length > 0 ? data.blocks : DEFAULT_BLOCKS,
        policeStations: Array.isArray(data.policeStations) && data.policeStations.length > 0 ? data.policeStations : DEFAULT_POLICE_STATIONS,
        districts: Array.isArray(data.districts) && data.districts.length > 0 ? data.districts : DEFAULT_DISTRICTS,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(ADDRESS_CONFIG_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(ADDRESS_CONFIG_EVENT, { detail: merged }));
      }
      return merged;
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
    if (res.ok) {
      const { invalidateSchoolConfigClientCache } = await import("@/lib/utils/school-config-client");
      invalidateSchoolConfigClientCache();
    }
    return res.ok;
  } catch (err) {
    console.error("Failed to post address presets config to DB:", err);
    return false;
  }
}
