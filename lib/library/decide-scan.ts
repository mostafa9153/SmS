import type { BorrowerKey } from "./types";
import type { ScanMatch } from "./scan-code";

/**
 * What the library desk does with one scan (plan §4). Pure: the desk hook
 * feeds it the current panel state and the resolved code, then performs the
 * returned action. Rules:
 *  - an issued copy is always returned at once, whoever's panel is open;
 *  - a shelf copy is issued only to a panel opened by a card scan, otherwise
 *    it waits as a chip for the next card, and that card's panel needs an
 *    explicit confirm (never the scanner's Enter); the chip goes to that one
 *    card only;
 *  - a re-scan of a copy issued or returned moments ago is a double scan and is ignored;
 *  - any new scan cancels an open inline prompt instead of confirming it.
 */

export type PanelOpenedBy = "card" | "return";

export interface DeskPanel {
  borrower: BorrowerKey;
  openedBy: PanelOpenedBy;
}

export interface DeskState {
  panel: DeskPanel | null;
  chipCopyId: string | null;
  promptOpen: boolean;
}

export type DeskScan =
  | {
      kind: "copy";
      copyId: string;
      status: "available" | "lost" | "withdrawn";
      openLoan: { loanId: string; borrower: BorrowerKey; issuedAtMs: number } | null;
      /** When this copy was last returned, if ever (ms). */
      returnedAtMs: number | null;
    }
  | { kind: "borrower"; borrower: BorrowerKey }
  | { kind: "ambiguous"; options: ScanMatch[] }
  | { kind: "unknown"; code: string };

export interface ReturnedOtherNotice {
  kind: "returned_other";
  holder: BorrowerKey;
  passOnTo: BorrowerKey;
  copyId: string;
}

export type DeskAction = { cancelPrompt: boolean } & (
  | { type: "return"; loanId: string; panel: DeskPanel; notice: ReturnedOtherNotice | null }
  | { type: "ignore_recent" }
  | { type: "issue"; copyId: string; borrower: BorrowerKey }
  /** The copy waits for a card; it is never offered to a panel that was opened by a return. */
  | { type: "hold_chip"; copyId: string }
  | { type: "open_panel"; panel: DeskPanel; chipCopyId: string | null }
  | { type: "prompt_found"; copyId: string }
  | { type: "notice_withdrawn"; copyId: string }
  | { type: "choose"; options: ScanMatch[] }
  | { type: "unknown"; code: string }
);

/** A re-scan of a book issued or returned this recently is a double scan, not a new action. */
export const RECENT_ISSUE_MS = 10_000;

export function decideScanAction(state: DeskState, scan: DeskScan, nowMs: number): DeskAction {
  const cancelPrompt = state.promptOpen;
  const { panel } = state;

  switch (scan.kind) {
    case "copy": {
      const loan = scan.openLoan;
      if (loan) {
        if (panel?.borrower === loan.borrower && nowMs - loan.issuedAtMs < RECENT_ISSUE_MS) {
          return { type: "ignore_recent", cancelPrompt };
        }
        if (panel?.openedBy === "card" && panel.borrower !== loan.borrower) {
          return {
            type: "return",
            loanId: loan.loanId,
            panel,
            notice: { kind: "returned_other", holder: loan.borrower, passOnTo: panel.borrower, copyId: scan.copyId },
            cancelPrompt,
          };
        }
        const keep = panel?.borrower === loan.borrower ? panel : { borrower: loan.borrower, openedBy: "return" as const };
        return { type: "return", loanId: loan.loanId, panel: keep, notice: null, cancelPrompt };
      }
      if (scan.status === "lost") return { type: "prompt_found", copyId: scan.copyId, cancelPrompt };
      if (scan.status === "withdrawn") return { type: "notice_withdrawn", copyId: scan.copyId, cancelPrompt };
      // Just returned and scanned again: without this a second beep would issue it to the open card panel.
      if (scan.returnedAtMs !== null && nowMs - scan.returnedAtMs < RECENT_ISSUE_MS) {
        return { type: "ignore_recent", cancelPrompt };
      }
      if (panel?.openedBy === "card") return { type: "issue", copyId: scan.copyId, borrower: panel.borrower, cancelPrompt };
      return { type: "hold_chip", copyId: scan.copyId, cancelPrompt };
    }
    case "borrower":
      return {
        type: "open_panel",
        panel: { borrower: scan.borrower, openedBy: "card" },
        // The chip was waiting for a card; once a card panel has seen it, it goes no further.
        chipCopyId: panel?.openedBy === "card" ? null : state.chipCopyId,
        cancelPrompt,
      };
    case "ambiguous":
      return { type: "choose", options: scan.options, cancelPrompt };
    case "unknown":
      return { type: "unknown", code: scan.code, cancelPrompt };
  }
}
