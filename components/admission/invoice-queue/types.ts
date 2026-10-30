

export interface UnifiedQueueCandidate {
  id: string;
  name: string;
  schoolId?: string;
  presentClass: string;
  presentSection: string;
  presentRoll: number;
  guardianName?: string;
  studentContact?: string;
  pen?: string;
  feeAmount?: number;
  feePaid?: boolean;
  paymentReceiptNo?: string;
  admissionSource: "new_admission" | "re_admission";
  formMethod?: "online" | "offline" | "ai_scan";
  formNo?: string;
  applicationNo?: string;
  admittedAt?: string;
  rawRecord?: any;
}

export interface ClassSectionGroup {
  key: string;
  class: string;
  section: string;
  students: UnifiedQueueCandidate[];
  totalCount: number;
}

export function getCandidateQueuedTime(candidate: UnifiedQueueCandidate): { dateStr: string; timeStr: string } {
  const ts = candidate.admittedAt || candidate.rawRecord?.created_at || candidate.rawRecord?.createdAt;

  if (ts) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const dateStr = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const timeStr = d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        return { dateStr, timeStr };
      }
    } catch {}
  }

  const now = new Date();
  return {
    dateStr: now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }),
    timeStr: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}
