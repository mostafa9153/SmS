/** A closed date range, both ends inclusive, "YYYY-MM-DD". */
export interface Holiday {
  from: string;
  to: string;
  label?: string;
}

export type LostPolicy = "price" | "fixed";

/**
 * Loan terms, copied onto each loan when it is issued (loans.rules) so later
 * settings changes never alter a running loan. Borrower limits and the holiday
 * list are not part of it: they stay live.
 */
export interface LoanRules {
  loanDays: number;
  finePerDay: number;
  graceDays: number;
  /** Highest total overdue fine for one loan; null = no cap. */
  fineCap: number | null;
  renewDays: number;
  maxRenews: number;
  renewWhenOverdue: boolean;
  /** Renew opens this many calendar days before the due date. */
  renewWindowDays: number;
  lostPolicy: LostPolicy;
  processingFee: number;
  defaultLostAmount: number;
}

export type BorrowerType = "student" | "staff";

/** "student:<uuid>" or "staff:<uuid>". */
export type BorrowerKey = `${BorrowerType}:${string}`;

export interface PaymentLine {
  kind: "payment" | "refund";
  amount: number;
  voided: boolean;
}

export interface WaiverLine {
  amount: number;
  voided: boolean;
}

export interface FineLedger {
  amount: number;
  payments: PaymentLine[];
  waivers: WaiverLine[];
  cancelled?: boolean;
}
