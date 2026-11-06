import "server-only";
import { libraryToday } from "./dates";
import { LibraryError } from "./errors";
import { getBorrowerSummary, getLibrarySettings, type BorrowerSummary, type FineView, type OpenLoanView } from "./db-library";
import { renewCheck } from "./rules";
import { summarizeMine, type MySummary } from "./my-books";

export interface MyBooks extends MySummary {
  /** False when the account has no staff profile, so there is nothing to show. */
  linked: boolean;
  today: string;
  name: string;
  loans: OpenLoanView[];
  /** Fines still unpaid. */
  fines: FineView[];
  balance: BorrowerSummary["balance"];
  maxBooks: number;
  /** Why renew is refused for every book right now (inactive, unpaid fine over the limit), or empty. */
  renewBlocked: ("inactive" | "balance")[];
}

const EMPTY = { overdue: 0, dueSoon: 0, needsAttention: false, loans: [], fines: [], balance: { stored: 0, accruing: 0, total: 0 }, maxBooks: 0, name: "", renewBlocked: [] };

/**
 * The signed-in person's own books. `staffId` comes from the session
 * (auth.staffId); callers must never pass anything taken from the request.
 * No staff id means an empty answer, not an error.
 */
export async function getMyBooks(staffId: string | null, today = libraryToday()): Promise<MyBooks> {
  if (!staffId) return { ...EMPTY, linked: false, today };
  try {
    const settings = await getLibrarySettings();
    const s = await getBorrowerSummary("staff", staffId, settings, today);
    const check = renewCheck({ active: s.profile.active, balance: s.balance.total, blockThreshold: settings.blockThreshold });
    return {
      renewBlocked: check.ok ? [] : check.reasons,
      linked: true,
      today,
      name: s.profile.name,
      loans: s.openLoans,
      fines: s.fines.filter((f) => f.outstanding > 0),
      balance: s.balance,
      maxBooks: s.maxBooks,
      ...summarizeMine(s.openLoans, today),
    };
  } catch (err) {
    // A session pointing at a deleted profile behaves like an unlinked account.
    if (err instanceof LibraryError && err.code === "borrower_not_found") return { ...EMPTY, linked: false, today };
    throw err;
  }
}
