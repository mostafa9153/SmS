/**
 * Library rule failures. The database raises `LIB:<code>` (see the library
 * migration); the TypeScript layer raises LibraryError with the same codes for
 * the soft rules it checks itself (plan D12). Routes turn either into
 * `{ success: false, error: <Bengali message>, code }`.
 */

export const LIBRARY_ERRORS = {
  // request plumbing
  actor_required: [400, "Could not tell who is doing this. Please sign in again."],
  request_id_required: [400, "Missing request id. Reload the page and try again."],
  request_mismatch: [409, "This request was already used for another action. Reload the page."],
  // catalog
  book_not_found: [404, "Book not found."],
  nothing_to_import: [409, "Nothing to import."],
  title_required: [400, "Enter the book title."],
  book_withdrawn: [409, "This book is withdrawn; copies cannot be added."],
  invalid_count: [400, "Copies must be between 1 and 500."],
  copy_not_found: [404, "Copy not found."],
  copy_unavailable: [409, "This copy cannot be issued (lost or withdrawn)."],
  copy_on_loan: [409, "This copy is on loan to someone else."],
  copy_not_lost: [409, "This copy is not marked lost."],
  copy_has_history: [409, "Copies of this book have history; it cannot be deleted. Withdraw it instead."],
  copy_has_loans: [409, "This copy has been lent before, so it cannot be deleted."],
  // borrower and loan
  borrower_required: [400, "Select a borrower."],
  borrower_not_found: [404, "Borrower not found."],
  inactive: [409, "This borrower is not active; books cannot be issued."],
  limit: [409, "Book limit reached."],
  balance: [409, "Fines due exceed the limit. Pay fines first."],
  rules_required: [500, "Loan rules not found."],
  invalid_date: [400, "Invalid date."],
  loan_not_found: [404, "Loan not found."],
  loan_not_open: [409, "This book is already returned."],
  loan_not_returned: [409, "This book is not returned."],
  no_open_loan: [409, "This copy is not on loan."],
  max_renews: [409, "Renew limit reached."],
  no_gain: [409, "Renewing now would not extend the due date."],
  too_early: [409, "Renew is not open yet."],
  overdue: [409, "Past due; cannot renew. Take the book back."],
  invalid_source: [400, "Select where it was found."],
  // money
  invalid_amount: [400, "Invalid amount."],
  fine_not_found: [404, "Fine not found."],
  fine_cancelled: [409, "This fine is cancelled. Refund the money collected first."],
  fine_has_payments: [409, "This fine has payments or waivers. Refund the receipt or void the waiver first."],
  over_balance: [409, "More than the amount due."],
  over_paid: [409, "Cannot refund more than was paid."],
  duplicate_fine: [400, "The same fine was sent twice."],
  mixed_borrowers: [400, "One receipt can only hold one borrower's fines."],
  reason_required: [400, "Enter a reason."],
  receipt_not_found: [404, "Receipt not found or already voided."],
  refund_first: [409, "This receipt has a refund. Void the refund receipt first."],
  nothing_due: [409, "Nothing due."],
  // undo
  event_not_found: [404, "Action not found."],
  already_undone: [409, "Already undone."],
  newer_action: [409, "Later actions exist on this book. Undo those first."],
  state_changed: [409, "The state has changed since; cannot undo."],
  not_undoable: [409, "This action cannot be undone."],
  append_only: [409, "This record cannot be changed or deleted."],
} as const satisfies Record<string, readonly [number, string]>;

export type LibraryErrorCode = keyof typeof LIBRARY_ERRORS;

export class LibraryError extends Error {
  constructor(
    readonly code: LibraryErrorCode,
    readonly detail?: string,
  ) {
    super(LIBRARY_ERRORS[code][1]);
  }
  get status(): number {
    return LIBRARY_ERRORS[this.code][0];
  }
}

const isCode = (c: string): c is LibraryErrorCode => Object.prototype.hasOwnProperty.call(LIBRARY_ERRORS, c);

/** A `LIB:<code>` database message as a known library error, or null. */
export function libraryError(message: string | null | undefined): LibraryError | null {
  const m = /LIB:([a-z_]+)/.exec(message ?? "");
  return m && isCode(m[1]) ? new LibraryError(m[1]) : null;
}
