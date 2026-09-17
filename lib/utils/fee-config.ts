/**
 * Centralized Admission & Annual Fee Structure Configuration
 * Supports customizable fee heads, default school values, number-to-words conversion,
 * and persistence across browser sessions and Supabase.
 */

export interface FeeItem {
  id: string;
  name: string;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string; // ISO or formatted date
  issueTime: string; // e.g. "06:30 PM"
  academicSession: string; // e.g. "2026 - 2027"
  
  // Student Info
  studentId?: string;
  studentName: string;
  studentClass: string;
  section?: string;
  rollNo?: string;
  guardianName?: string;
  contactNumber?: string;
  penNumber?: string;
  isBlankTemplate?: boolean;

  // Fee Details
  feeItems: FeeItem[];
  paymentMode: "Cash" | "Online / UPI" | "Bank Transfer" | "Cheque";
  paymentStatus: "Paid" | "Partial" | "Due";
  remarks?: string;
}

/**
 * Section 1: Class 5 to 8 Default standard fee heads
 */
export const DEFAULT_FEE_ITEMS_V_VIII: FeeItem[] = [
  { id: "fee-dev", name: "School Development Fund", amount: 24 },
  { id: "fee-sports", name: "Games & Sports Fund", amount: 6 },
  { id: "fee-library", name: "Library & Reading Room Fund", amount: 5 },
  { id: "fee-magazine", name: "Annual Magazine Fund", amount: 6 },
  { id: "fee-exam", name: "Examination & Evaluation Fee", amount: 12 },
  { id: "fee-electric", name: "Electricity & Utility Fund", amount: 12 },
  { id: "fee-lab", name: "Science Laboratory Fund", amount: 12 },
  { id: "fee-session", name: "Admission & Session Fee", amount: 523 },
];

/**
 * Section 2: Class 9 to 10 Default standard fee heads
 */
export const DEFAULT_FEE_ITEMS_IX_X: FeeItem[] = [
  { id: "fee-dev", name: "School Development Fund", amount: 24 },
  { id: "fee-sports", name: "Games & Sports Fund", amount: 6 },
  { id: "fee-library", name: "Library & Reading Room Fund", amount: 5 },
  { id: "fee-magazine", name: "Annual Magazine Fund", amount: 6 },
  { id: "fee-exam", name: "Examination & Evaluation Fee", amount: 12 },
  { id: "fee-electric", name: "Electricity & Utility Fund", amount: 12 },
  { id: "fee-lab", name: "Science Laboratory Fund", amount: 12 },
  { id: "fee-session", name: "Admission & Session Fee", amount: 523 },
];

/**
 * Section 3: Class 11 to 12 Default standard fee heads
 */
export const DEFAULT_FEE_ITEMS_XI_XII: FeeItem[] = [
  { id: "fee-dev", name: "School Development Fund", amount: 50 },
  { id: "fee-sports", name: "Games & Sports Fund", amount: 20 },
  { id: "fee-library", name: "Library & Reading Room Fund", amount: 20 },
  { id: "fee-magazine", name: "Annual Magazine Fund", amount: 20 },
  { id: "fee-exam", name: "Examination & Evaluation Fee", amount: 50 },
  { id: "fee-electric", name: "Electricity & Utility Fund", amount: 40 },
  { id: "fee-lab", name: "Science Laboratory & Practical Fund", amount: 100 },
  { id: "fee-session", name: "Admission & Session Fee", amount: 680 },
];

export const DEFAULT_FEE_ITEMS: FeeItem[] = DEFAULT_FEE_ITEMS_V_VIII;

const FEE_STORAGE_KEY = "sms_admission_fee_structure";

export type FeeCategory = "V-VIII" | "IX-X" | "XI-XII";

export interface FeeSectionConfig {
  id: FeeCategory;
  label: string;
  shortLabel: string;
  classRange: string;
  badge: string;
  classes: string[];
  description: string;
  defaultItems: FeeItem[];
}

export const FEE_SECTIONS: FeeSectionConfig[] = [
  {
    id: "V-VIII",
    label: "Class 5 to 8 (Classes V – VIII)",
    shortLabel: "Class 5 to 8",
    classRange: "5 to 8",
    badge: "Section 1",
    classes: ["V", "VI", "VII", "VIII", "5", "6", "7", "8"],
    description: "Preset fee structure for Upper Primary & Junior High students (Classes 5, 6, 7, 8).",
    defaultItems: DEFAULT_FEE_ITEMS_V_VIII,
  },
  {
    id: "IX-X",
    label: "Class 9 to 10 (Classes IX – X)",
    shortLabel: "Class 9 to 10",
    classRange: "9 to 10",
    badge: "Section 2",
    classes: ["IX", "X", "9", "10", "Sent Up M.P.", "10th test fail"],
    description: "Preset fee structure for Secondary Madhyamik students (Classes 9 and 10).",
    defaultItems: DEFAULT_FEE_ITEMS_IX_X,
  },
  {
    id: "XI-XII",
    label: "Class 11 to 12 (Classes XI – XII)",
    shortLabel: "Class 11 to 12",
    classRange: "11 to 12",
    badge: "Section 3",
    classes: ["XI", "XII", "11", "12", "Sent Up H.S.", "12th test fail", "C.C.H.S.", "Passed Out"],
    description: "Preset fee structure for Higher Secondary council students (Classes 11 and 12).",
    defaultItems: DEFAULT_FEE_ITEMS_XI_XII,
  },
];

/**
 * Returns the matching fee preset category for any class string
 */
export function getFeeCategoryForClass(className: string): FeeCategory {
  if (!className) return "V-VIII";
  const upper = className.toString().toUpperCase().trim().replace(/^CLASS\s+/i, "").replace(/^STD\s+/i, "");
  
  if (["V", "VI", "VII", "VIII", "5", "6", "7", "8", "CLASS 5", "CLASS 6", "CLASS 7", "CLASS 8", "CLASS V", "CLASS VI", "CLASS VII", "CLASS VIII"].includes(upper)) {
    return "V-VIII";
  }
  if (["IX", "X", "9", "10", "CLASS 9", "CLASS 10", "CLASS IX", "CLASS X", "SENT UP M.P.", "10TH TEST FAIL"].includes(upper)) {
    return "IX-X";
  }
  if (["XI", "XII", "11", "12", "CLASS 11", "CLASS 12", "CLASS XI", "CLASS XII", "SENT UP H.S.", "12TH TEST FAIL", "C.C.H.S.", "PASSED OUT"].includes(upper)) {
    return "XI-XII";
  }
  
  // Fallback heuristic: check numeric digit if present
  const num = parseInt(upper, 10);
  if (!isNaN(num)) {
    if (num >= 5 && num <= 8) return "V-VIII";
    if (num >= 9 && num <= 10) return "IX-X";
    if (num >= 11 && num <= 12) return "XI-XII";
  }
  
  return "V-VIII";
}

/**
 * Returns default items for a category
 */
export function getDefaultFeeStructure(category: FeeCategory = "V-VIII"): FeeItem[] {
  if (category === "IX-X") return DEFAULT_FEE_ITEMS_IX_X;
  if (category === "XI-XII") return DEFAULT_FEE_ITEMS_XI_XII;
  return DEFAULT_FEE_ITEMS_V_VIII;
}

/**
 * Load saved fee structure from localStorage with fallback to default for that section
 */
export function getSavedFeeStructure(category: FeeCategory = "V-VIII"): FeeItem[] {
  const defaultItems = getDefaultFeeStructure(category);
  if (typeof window === "undefined") return defaultItems;
  try {
    const key = `${FEE_STORAGE_KEY}_${category}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Backward compatibility: check root storage key if category is V-VIII
    if (category === "V-VIII") {
      const legacyRaw = localStorage.getItem(FEE_STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error("Failed to load fee structure from storage:", e);
  }
  return defaultItems;
}

/**
 * Save customized fee structure for a specific category
 */
export function saveFeeStructure(category: FeeCategory, items: FeeItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${FEE_STORAGE_KEY}_${category}`;
    localStorage.setItem(key, JSON.stringify(items));
    if (category === "V-VIII") {
      localStorage.setItem(FEE_STORAGE_KEY, JSON.stringify(items));
    }
    window.dispatchEvent(
      new CustomEvent("sms_fee_structure_updated", { detail: { category, items } })
    );
  } catch (e) {
    console.error("Failed to save fee structure:", e);
  }
}

/**
 * Reset fee structure for a category to official school default
 */
export function resetFeeStructure(category: FeeCategory): FeeItem[] {
  const defaultItems = getDefaultFeeStructure(category);
  saveFeeStructure(category, defaultItems);
  return defaultItems;
}

/**
 * Calculate total amount for a list of fee items
 */
export function calculateFeeTotal(items: FeeItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

/**
 * Convert numeric Indian currency amount into words
 * e.g. 600 -> "Rupees Six Hundred Only"
 *      1250 -> "Rupees One Thousand Two Hundred Fifty Only"
 */
export function numberToWordsINR(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "Rupees Zero Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function inWords(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + "Crore ";
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + "Lakh ";
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + "Thousand ";
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + "Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "and ";
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) {
          str += "-" + a[n % 10].trim() + " ";
        } else {
          str += " ";
        }
      }
    }
    return str;
  }

  const whole = Math.floor(num);
  const words = inWords(whole).trim();
  return `Rupees ${words} Only`;
}

/**
 * Generate sequential formatted Invoice Number
 * e.g. MHS/2026/ADM-0036
 */
export function generateInvoiceNumber(seqNo?: number, customYear?: number): string {
  const year = customYear || new Date().getFullYear();
  const num = seqNo !== undefined && seqNo >= 1 ? seqNo : 1;
  const formattedSeq = String(num).padStart(4, "0");
  return `MHS/${year}/ADM-${formattedSeq}`;
}
