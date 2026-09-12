export interface BankPresetItem {
  id: string;
  bankName: string;
  branchName: string;
  ifsc: string;
}

export const DEFAULT_BANK_PRESETS: BankPresetItem[] = [
  {
    id: "b1",
    bankName: "State Bank of India",
    branchName: "Mathurapur",
    ifsc: "SBIN0001234",
  },
  {
    id: "b2",
    bankName: "Punjab National Bank",
    branchName: "Mathurapur",
    ifsc: "PUNB0012340",
  },
  {
    id: "b3",
    bankName: "Bangiya Gramin Vikash Bank (BGVB)",
    branchName: "Mathurapur",
    ifsc: "PUNB0BGVB01",
  },
  {
    id: "b4",
    bankName: "Bank of India",
    branchName: "Mathurapur",
    ifsc: "BKID0004321",
  },
  {
    id: "b5",
    bankName: "UCO Bank",
    branchName: "Diamond Harbour",
    ifsc: "UCBA0000567",
  },
  {
    id: "b6",
    bankName: "Axis Bank",
    branchName: "Diamond Harbour",
    ifsc: "UTIB0001234",
  },
];

const BANK_PRESETS_STORAGE_KEY = "sms_bank_presets";
const BANK_PRESETS_EVENT = "sms_bank_presets_updated";

export function getSavedBankPresets(): BankPresetItem[] {
  if (typeof window === "undefined") return DEFAULT_BANK_PRESETS;
  try {
    const saved = localStorage.getItem(BANK_PRESETS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse bank presets from storage", e);
  }
  return DEFAULT_BANK_PRESETS;
}

export function saveBankPresets(items: BankPresetItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BANK_PRESETS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(BANK_PRESETS_EVENT, { detail: items }));
  } catch (e) {
    console.error("Failed to save bank presets to storage", e);
  }

  saveBankPresetsToDb(items).catch((err) => {
    console.warn("Background DB sync for bank presets failed:", err);
  });
}

export async function fetchBankPresetsFromDb(): Promise<BankPresetItem[]> {
  try {
    const res = await fetch("/api/school-config?key=bank_presets", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(BANK_PRESETS_STORAGE_KEY, JSON.stringify(json.data));
          window.dispatchEvent(new CustomEvent(BANK_PRESETS_EVENT, { detail: json.data }));
        }
        return json.data;
      }
    }
  } catch (err) {
    console.error("Error fetching bank presets from DB:", err);
  }
  return getSavedBankPresets();
}

export async function saveBankPresetsToDb(items: BankPresetItem[]): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.setItem(BANK_PRESETS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(BANK_PRESETS_EVENT, { detail: items }));
  }

  try {
    const res = await fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "bank_presets",
        value: items,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to post bank presets to DB:", err);
    return false;
  }
}
