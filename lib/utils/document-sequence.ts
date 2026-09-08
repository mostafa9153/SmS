/**
 * Centralized Yearly Auto-Incrementing Document Sequence Utility
 * 
 * Ensures that all certificates, admission receipts, and official forms generated
 * across the application start from 1 (formatted as 0001) for each academic/calendar year,
 * increment on each print, and automatically reset to 1 when the year rolls over.
 */

export type DocumentType =
  | "invoice"
  | "character-certificate"
  | "pass-certificate"
  | "transfer-certificate"
  | "kanyashree"
  | "admission-form";

export const DOC_CONFIG: Record<
  DocumentType,
  {
    storagePrefix: string;
    codePrefix: string;
    padLength: number;
  }
> = {
  invoice: {
    storagePrefix: "sms_admission_invoice_last_seq",
    codePrefix: "MHS",
    padLength: 4,
  },
  "character-certificate": {
    storagePrefix: "sms_character_cert_seq",
    codePrefix: "MHS/CC",
    padLength: 4,
  },
  "pass-certificate": {
    storagePrefix: "sms_pass_cert_seq",
    codePrefix: "MHS/POC",
    padLength: 4,
  },
  "transfer-certificate": {
    storagePrefix: "sms_transfer_cert_seq",
    codePrefix: "MHS/TC",
    padLength: 4,
  },
  kanyashree: {
    storagePrefix: "sms_kanyashree_cert_seq",
    codePrefix: "MHS/KP",
    padLength: 4,
  },
  "admission-form": {
    storagePrefix: "sms_admission_form_last_serial",
    codePrefix: "MHS/AF",
    padLength: 4,
  },
};

/**
 * Gets the storage key for a document type for a specific year
 */
export function getDocumentStorageKey(docType: DocumentType, year?: number): string {
  const y = year || new Date().getFullYear();
  return `${DOC_CONFIG[docType].storagePrefix}_${y}`;
}

/**
 * Retrieves the current sequence number for a document type.
 * Returns 1 if no sequence is saved for this year (ensures automatic year rollover reset).
 */
export function getDocumentSequence(docType: DocumentType, year?: number): number {
  if (typeof window === "undefined") return 1;
  try {
    const key = getDocumentStorageKey(docType, year);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
  } catch (e) {
    console.error(`Error loading sequence for ${docType}:`, e);
  }
  return 1;
}

/**
 * Saves and updates the sequence number for a document type for a specific year
 */
export function saveDocumentSequence(docType: DocumentType, nextSeq: number, year?: number): void {
  if (typeof window === "undefined") return;
  try {
    const key = getDocumentStorageKey(docType, year);
    localStorage.setItem(key, String(nextSeq));
  } catch (e) {
    console.error(`Error saving sequence for ${docType}:`, e);
  }
}

/**
 * Generates the full formatted document code for the given sequence number and year.
 * e.g.
 * - invoice: MHS/2026/ADM-0001
 * - character-certificate: MHS/CC/2026/0001
 * - pass-certificate: MHS/POC/2026/0001
 * - transfer-certificate: MHS/TC/2026/0001
 * - kanyashree: MHS/KP/2026/0001
 * - admission-form: MHS/AF/26/0001
 */
export function formatDocumentNumber(docType: DocumentType, seqNo?: number, year?: number): string {
  const y = year || new Date().getFullYear();
  const num = seqNo !== undefined && seqNo >= 1 ? seqNo : getDocumentSequence(docType, y);
  const pad = DOC_CONFIG[docType].padLength;
  const seqStr = String(num).padStart(pad, "0");

  switch (docType) {
    case "invoice":
      return `MHS/${y}/ADM-${seqStr}`;
    case "character-certificate":
      return `MHS/CC/${y}/${seqStr}`;
    case "pass-certificate":
      return `MHS/POC/${y}/${seqStr}`;
    case "transfer-certificate":
      return `MHS/TC/${y}/${seqStr}`;
    case "kanyashree":
      return `MHS/KP/${y}/${seqStr}`;
    case "admission-form": {
      const yearSuffix = String(y).slice(-2);
      return `MHS/AF/${yearSuffix}/${seqStr}`;
    }
    default:
      return seqStr;
  }
}
