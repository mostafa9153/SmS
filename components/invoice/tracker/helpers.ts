import { DBInvoiceRow } from "@/lib/supabase/db-invoices";
import { type InvoiceData, DEFAULT_FEE_ITEMS } from "@/lib/utils/fee-config";
import { currentYearIST } from "@/lib/utils/academic-year";


export function dbRowToInvoiceData(inv: DBInvoiceRow): InvoiceData {
  return {
    invoiceNumber: inv.invoice_number,
    issueDate: inv.issue_date,
    issueTime: inv.issue_time || "",
    academicSession: inv.academic_session || String(currentYearIST()),
    studentId: inv.student_id || undefined,
    studentName: inv.student_name || "",
    studentClass: inv.student_class,
    section: inv.section || undefined,
    rollNo: inv.roll_no || undefined,
    guardianName: inv.guardian_name || undefined,
    contactNumber: inv.contact_number || undefined,
    penNumber: inv.pen_number || undefined,
    isBlankTemplate: Boolean(inv.is_blank),
    feeItems:
      Array.isArray(inv.fee_items) && inv.fee_items.length > 0
        ? inv.fee_items
        : DEFAULT_FEE_ITEMS,
    paymentMode: (inv.payment_mode as any) || "Cash",
    paymentStatus: (inv.payment_status as any) || "Paid",
    remarks: inv.remarks || undefined,
  };
}

export function getInvoiceCategoryAndMode(inv: DBInvoiceRow): {
  isReadmission: boolean;
  isOnline: boolean;
  label: "New-Ad. Online" | "New-Ad. Offline" | "Re-Ad. Online" | "Re-Ad. Offline";
  key: "NEW_ONLINE" | "NEW_OFFLINE" | "RE_ONLINE" | "RE_OFFLINE";
} {
  const remarks = (inv.remarks || "").toLowerCase();
  const paymentMode = (inv.payment_mode || "").toLowerCase();
  const extraType = ((inv as any).admission_type || "").toLowerCase();

  const isReadmission =
    Boolean((inv as any).is_readmission) ||
    extraType.includes("re") ||
    remarks.includes("re-admission") ||
    remarks.includes("readmission") ||
    remarks.includes("re admission");

  const isOnline =
    paymentMode === "online" ||
    paymentMode === "upi" ||
    paymentMode === "netbanking" ||
    paymentMode === "card" ||
    paymentMode === "bank" ||
    (paymentMode !== "cash" && paymentMode !== "" && paymentMode !== "offline") ||
    remarks.includes("online");

  if (isReadmission) {
    return isOnline
      ? { isReadmission: true, isOnline: true, label: "Re-Ad. Online", key: "RE_ONLINE" }
      : { isReadmission: true, isOnline: false, label: "Re-Ad. Offline", key: "RE_OFFLINE" };
  } else {
    return isOnline
      ? { isReadmission: false, isOnline: true, label: "New-Ad. Online", key: "NEW_ONLINE" }
      : { isReadmission: false, isOnline: false, label: "New-Ad. Offline", key: "NEW_OFFLINE" };
  }
}

export type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "CUSTOM";

export function isDateInRange(
  inv: DBInvoiceRow,
  preset: DatePreset,
  customStart: string,
  customEnd: string
): boolean {
  if (preset === "ALL") return true;

  let invDate: Date | null = null;
  if (inv.issue_date) {
    if (inv.issue_date.includes("/")) {
      const parts = inv.issue_date.split("/");
      if (parts.length === 3) {
        invDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else {
      invDate = new Date(inv.issue_date);
    }
  }
  if (!invDate || isNaN(invDate.getTime())) {
    if (inv.created_at) invDate = new Date(inv.created_at);
  }
  if (!invDate || isNaN(invDate.getTime())) return true;

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (preset === "TODAY") {
    return invDate >= todayStart && invDate <= todayEnd;
  }
  if (preset === "YESTERDAY") {
    const yStart = new Date(todayStart);
    yStart.setDate(yStart.getDate() - 1);
    const yEnd = new Date(todayEnd);
    yEnd.setDate(yEnd.getDate() - 1);
    return invDate >= yStart && invDate <= yEnd;
  }
  if (preset === "LAST_7_DAYS") {
    const l7Start = new Date(todayStart);
    l7Start.setDate(l7Start.getDate() - 7);
    return invDate >= l7Start && invDate <= todayEnd;
  }
  if (preset === "THIS_MONTH") {
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return invDate >= mStart && invDate <= todayEnd;
  }
  if (preset === "CUSTOM") {
    if (customStart) {
      const cStart = startOfDay(new Date(customStart));
      if (invDate < cStart) return false;
    }
    if (customEnd) {
      const cEnd = endOfDay(new Date(customEnd));
      if (invDate > cEnd) return false;
    }
    return true;
  }

  return true;
}
