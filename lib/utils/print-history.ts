import {
  type DocumentType,
  saveDocumentSequence,
} from "./document-sequence";

export interface PrintBatchRecord {
  id: string;
  timestamp: string;
  createdAt: number;
  docType: DocumentType;
  mode: "single" | "bulk";
  fillMode?: "fill" | "blank" | "prefilled";
  classInfo?: string;
  startSerial: number;
  endSerial: number;
  formattedStart: string;
  formattedEnd: string;
  count: number;
  undone?: boolean;
  undoneAt?: string;
}

const getHistoryKey = (docType: DocumentType, year?: number) => {
  const y = year || new Date().getFullYear();
  return `sms_${docType}_print_history_${y}`;
};

export function getPrintHistory(docType: DocumentType, year?: number): PrintBatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getHistoryKey(docType, year);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error loading print history:", e);
  }
  return [];
}

export function recordPrintBatch(
  record: Omit<PrintBatchRecord, "id" | "timestamp" | "createdAt">,
  year?: number
): PrintBatchRecord[] {
  if (typeof window === "undefined") return [];
  const y = year || new Date().getFullYear();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const newRecord: PrintBatchRecord = {
    ...record,
    id: `batch_${now.getTime()}`,
    timestamp: `${dateStr} • ${timeStr}`,
    createdAt: now.getTime(),
  };

  const history = getPrintHistory(record.docType, y);
  const updated = [newRecord, ...history].slice(0, 50); // Keep 50 most recent

  try {
    const key = getHistoryKey(record.docType, y);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error("Error saving print history:", e);
  }

  return updated;
}

export function undoPrintBatch(
  docType: DocumentType,
  batchId: string,
  year?: number
): { updatedHistory: PrintBatchRecord[]; newStartSerial: number } {
  const y = year || new Date().getFullYear();
  const history = getPrintHistory(docType, y);

  const updatedHistory = history.map((b) => {
    if (b.id === batchId) {
      return {
        ...b,
        undone: true,
        undoneAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      };
    }
    return b;
  });

  // Save updated history
  try {
    const key = getHistoryKey(docType, y);
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error("Error updating print history:", e);
  }

  // Calculate new effective next starting serial number
  // Find the highest endSerial among remaining active (non-undone) batches
  const activeBatches = updatedHistory.filter((b) => !b.undone);
  let newStartSerial = 1;
  if (activeBatches.length > 0) {
    const maxEnd = Math.max(...activeBatches.map((b) => b.endSerial));
    newStartSerial = maxEnd + 1;
  }

  // Persist updated sequence number to localStorage
  if (docType === "admission-form") {
    const storageKey = `sms_admission_form_last_serial_${y}`;
    try {
      if (newStartSerial <= 1) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, String(newStartSerial - 1));
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    saveDocumentSequence(docType, newStartSerial, y);
  }

  return { updatedHistory, newStartSerial };
}

export function clearPrintHistory(docType: DocumentType, year?: number): void {
  if (typeof window === "undefined") return;
  const y = year || new Date().getFullYear();
  try {
    const key = getHistoryKey(docType, y);
    localStorage.removeItem(key);
  } catch (e) {
    console.error(e);
  }
}
