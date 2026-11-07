import { describe, expect, it } from "vitest";
import { decideScanAction, type DeskState } from "@/lib/library/decide-scan";
import type { BorrowerKey } from "@/lib/library/types";

const NOW = 100_000;
const idle: DeskState = { panel: null, chipCopyId: null, promptOpen: false };
const cardA: DeskState = { panel: { borrower: "student:A", openedBy: "card" }, chipCopyId: null, promptOpen: false };
const returnA: DeskState = { panel: { borrower: "student:A", openedBy: "return" }, chipCopyId: null, promptOpen: false };

const issuedTo = (borrower: BorrowerKey, issuedAtMs = 0) => ({
  kind: "copy" as const,
  copyId: "c1",
  status: "available" as const,
  openLoan: { loanId: "L1", borrower, issuedAtMs },
  returnedAtMs: null,
});
const onShelf = { kind: "copy" as const, copyId: "c2", status: "available" as const, openLoan: null, returnedAtMs: null };

describe("decideScanAction", () => {
  it("returns an issued book at once with no panel open, and opens the holder", () => {
    expect(decideScanAction(idle, issuedTo("student:A"), NOW)).toEqual({
      type: "return",
      loanId: "L1",
      panel: { borrower: "student:A", openedBy: "return" },
      notice: null,
      cancelPrompt: false,
    });
  });

  it("switches a return-opened panel to the next holder without a warning", () => {
    expect(decideScanAction(returnA, issuedTo("student:B"), NOW)).toMatchObject({
      type: "return",
      panel: { borrower: "student:B", openedBy: "return" },
      notice: null,
    });
  });

  it("keeps a card-opened panel and adds a pass-on note when someone else's book comes back", () => {
    expect(decideScanAction(cardA, issuedTo("student:B"), NOW)).toMatchObject({
      type: "return",
      panel: { borrower: "student:A", openedBy: "card" },
      notice: { kind: "returned_other", holder: "student:B", passOnTo: "student:A", copyId: "c1" },
    });
  });

  it("ignores a re-scan of a book just issued to the same borrower", () => {
    expect(decideScanAction(cardA, issuedTo("student:A", NOW - 4_000), NOW)).toEqual({ type: "ignore_recent", cancelPrompt: false });
    expect(decideScanAction(cardA, issuedTo("student:A", NOW - 60_000), NOW)).toMatchObject({ type: "return" });
  });

  it("issues a shelf book only to a card-opened panel", () => {
    expect(decideScanAction(cardA, onShelf, NOW)).toEqual({ type: "issue", copyId: "c2", borrower: "student:A", cancelPrompt: false });
  });

  it("holds a shelf book as a chip when no card was scanned", () => {
    expect(decideScanAction(idle, onShelf, NOW)).toEqual({ type: "hold_chip", copyId: "c2", cancelPrompt: false });
    // after a return the panel is not proof of who is at the desk: the book waits for a card
    expect(decideScanAction(returnA, onShelf, NOW)).toEqual({ type: "hold_chip", copyId: "c2", cancelPrompt: false });
  });

  it("opens a borrower panel and carries a held chip over", () => {
    const withChip: DeskState = { ...idle, chipCopyId: "c2" };
    expect(decideScanAction(withChip, { kind: "borrower", borrower: "staff:T" }, NOW)).toEqual({
      type: "open_panel",
      panel: { borrower: "staff:T", openedBy: "card" },
      chipCopyId: "c2",
      cancelPrompt: false,
    });
  });

  it("passes a waiting chip from a return-opened panel to the next card, and no further", () => {
    const fromReturn: DeskState = { ...returnA, chipCopyId: "c2" };
    expect(decideScanAction(fromReturn, { kind: "borrower", borrower: "student:B" }, NOW)).toMatchObject({ chipCopyId: "c2" });
    const shownToB: DeskState = { panel: { borrower: "student:B", openedBy: "card" }, chipCopyId: "c2", promptOpen: false };
    expect(decideScanAction(shownToB, { kind: "borrower", borrower: "student:C" }, NOW)).toMatchObject({
      type: "open_panel",
      chipCopyId: null,
    });
  });

  it("ignores a re-scan of a book returned moments ago instead of issuing it", () => {
    const justBack = { ...onShelf, returnedAtMs: NOW - 3_000 };
    expect(decideScanAction(cardA, justBack, NOW)).toEqual({ type: "ignore_recent", cancelPrompt: false });
    expect(decideScanAction(cardA, { ...onShelf, returnedAtMs: NOW - 30_000 }, NOW)).toMatchObject({ type: "issue" });
  });

  it("asks about lost and withdrawn copies instead of acting", () => {
    expect(decideScanAction(cardA, { kind: "copy", copyId: "c3", status: "lost", openLoan: null, returnedAtMs: null }, NOW)).toMatchObject({
      type: "prompt_found",
      copyId: "c3",
    });
    expect(decideScanAction(cardA, { kind: "copy", copyId: "c4", status: "withdrawn", openLoan: null, returnedAtMs: null }, NOW)).toMatchObject({
      type: "notice_withdrawn",
      copyId: "c4",
    });
  });

  it("hands ambiguous and unknown codes back to the librarian", () => {
    const options = [
      { kind: "student" as const, id: "s1" },
      { kind: "student" as const, id: "s2" },
    ];
    expect(decideScanAction(idle, { kind: "ambiguous", options }, NOW)).toEqual({ type: "choose", options, cancelPrompt: false });
    expect(decideScanAction(idle, { kind: "unknown", code: "XYZ" }, NOW)).toEqual({ type: "unknown", code: "XYZ", cancelPrompt: false });
  });

  it("cancels an open inline prompt instead of confirming it", () => {
    const prompting: DeskState = { ...cardA, promptOpen: true };
    expect(decideScanAction(prompting, onShelf, NOW)).toMatchObject({ type: "issue", cancelPrompt: true });
    expect(decideScanAction(prompting, { kind: "unknown", code: "X" }, NOW)).toMatchObject({ cancelPrompt: true });
  });
});
