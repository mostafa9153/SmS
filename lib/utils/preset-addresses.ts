export interface PresetAddressItem {
  id: string; // "A1", "A2", "A3", "A4", "A5"
  label: string; // e.g. "A1"
  title: string; // e.g. "Marigachi Main"
  address: string;
  pincode: string;
}

export const DEFAULT_PRESET_ADDRESSES: PresetAddressItem[] = [
  {
    id: "A1",
    label: "A1",
    title: "Marigachi Main",
    address: "Vill+P.O- Marigachi, P.S- Mathurapur, Dist- South 24 Parganas",
    pincode: "743349",
  },
  {
    id: "A2",
    label: "A2",
    title: "Krishnachandrapur",
    address: "Vill- Krishnachandrapur, P.O- Mathurapur, P.S- Mathurapur, Dist- South 24 Parganas",
    pincode: "743354",
  },
  {
    id: "A3",
    label: "A3",
    title: "Khakurdaha",
    address: "Vill- Khakurdaha, P.O- Khakurdaha, P.S- Mathurapur, Dist- South 24 Parganas",
    pincode: "743349",
  },
  {
    id: "A4",
    label: "A4",
    title: "Ramkantapur",
    address: "Vill- Ramkantapur, P.O- Ramkantapur, P.S- Mathurapur, Dist- South 24 Parganas",
    pincode: "743349",
  },
  {
    id: "A5",
    label: "A5",
    title: "Radhakantapur",
    address: "Vill- Radhakantapur, P.O- Radhakantapur, P.S- Mathurapur, Dist- South 24 Parganas",
    pincode: "743349",
  },
];

const PRESET_ADDRESSES_STORAGE_KEY = "sms_preset_addresses";
const PRESET_ADDRESSES_EVENT = "sms_preset_addresses_updated";

/**
 * Get synchronously saved preset addresses from localStorage (or fallback defaults)
 */
export function getSavedPresetAddresses(): PresetAddressItem[] {
  if (typeof window === "undefined") return DEFAULT_PRESET_ADDRESSES;
  try {
    const saved = localStorage.getItem(PRESET_ADDRESSES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all 5 IDs exist
        return DEFAULT_PRESET_ADDRESSES.map((def) => {
          const found = parsed.find((item: any) => item.id === def.id);
          return found ? { ...def, ...found } : def;
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse preset addresses from storage", e);
  }
  return DEFAULT_PRESET_ADDRESSES;
}

/**
 * Save preset addresses to localStorage & trigger live update event
 */
export function savePresetAddresses(items: PresetAddressItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESET_ADDRESSES_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(PRESET_ADDRESSES_EVENT, { detail: items }));
  } catch (e) {
    console.error("Failed to save preset addresses to storage", e);
  }

  // Background DB sync
  savePresetAddressesToDb(items).catch((err) => {
    console.warn("Background DB sync for preset addresses failed:", err);
  });
}

/**
 * Async fetch latest preset addresses from Supabase database (system_config)
 */
export async function fetchPresetAddressesFromDb(): Promise<PresetAddressItem[]> {
  try {
    const res = await fetch("/api/school-config?key=preset_addresses", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const merged = DEFAULT_PRESET_ADDRESSES.map((def) => {
          const found = json.data.find((item: any) => item.id === def.id);
          return found ? { ...def, ...found } : def;
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(PRESET_ADDRESSES_STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent(PRESET_ADDRESSES_EVENT, { detail: merged }));
        }
        return merged;
      }
    }
  } catch (err) {
    console.error("Error fetching preset addresses from DB:", err);
  }
  return getSavedPresetAddresses();
}

/**
 * Save preset addresses to Supabase database
 */
export async function savePresetAddressesToDb(items: PresetAddressItem[]): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.setItem(PRESET_ADDRESSES_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(PRESET_ADDRESSES_EVENT, { detail: items }));
  }

  try {
    const res = await fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "preset_addresses",
        value: items,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to post preset addresses to DB:", err);
    return false;
  }
}
