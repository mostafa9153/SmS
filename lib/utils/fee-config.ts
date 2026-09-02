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

  // Fee Details
  feeItems: FeeItem[];
  paymentMode: "Cash" | "Online / UPI" | "Bank Transfer" | "Cheque";
  paymentStatus: "Paid" | "Partial" | "Due";
  remarks?: string;
}

/**
 * Default standard fee heads based on Marigachi High School (H.S.) official receipt
 */
export const DEFAULT_FEE_ITEMS: FeeItem[] = [
  { id: "fee-dev", name: "School Development Fund", amount: 24 },
  { id: "fee-sports", name: "Games & Sports Fund", amount: 6 },
  { id: "fee-library", name: "Library & Reading Room Fund", amount: 5 },
  { id: "fee-magazine", name: "Annual Magazine Fund", amount: 6 },
  { id: "fee-exam", name: "Examination & Evaluation Fee", amount: 12 },
  { id: "fee-electric", name: "Electricity & Utility Fund", amount: 12 },
  { id: "fee-lab", name: "Science Laboratory Fund", amount: 12 },
  { id: "fee-session", name: "Admission & Session Fee", amount: 523 },
];

const FEE_STORAGE_KEY = "sms_admission_fee_structure";

/**
 * Load saved fee structure from localStorage with fallback to default
 */
export function getSavedFeeStructure(): FeeItem[] {
  if (typeof window === "undefined") return DEFAULT_FEE_ITEMS;
  try {
    const raw = localStorage.getItem(FEE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load fee structure from storage:", e);
  }
  return DEFAULT_FEE_ITEMS;
}

/**
 * Save customized fee structure
 */
export function saveFeeStructure(items: FeeItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FEE_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("sms_fee_structure_updated"));
  } catch (e) {
    console.error("Failed to save fee structure:", e);
  }
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
export function generateInvoiceNumber(seqNo?: number): string {
  const year = new Date().getFullYear();
  const num = seqNo || Math.floor(1000 + Math.random() * 9000);
  const formattedSeq = String(num).padStart(4, "0");
  return `MHS/${year}/ADM-${formattedSeq}`;
}
