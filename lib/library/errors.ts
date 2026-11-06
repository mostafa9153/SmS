/**
 * Library rule failures. The database raises `LIB:<code>` (see the library
 * migration); the TypeScript layer raises LibraryError with the same codes for
 * the soft rules it checks itself (plan D12). Routes turn either into
 * `{ success: false, error: <Bengali message>, code }`.
 */

export const LIBRARY_ERRORS = {
  // request plumbing
  actor_required: [400, "কে কাজটা করছেন তা জানা যায়নি। আবার sign in করুন।"],
  request_id_required: [400, "Request id নেই। পাতাটা reload করে আবার চেষ্টা করুন।"],
  request_mismatch: [409, "এই request আগে অন্য কাজে ব্যবহার হয়েছে। পাতাটা reload করুন।"],
  // catalog
  book_not_found: [404, "বইটা পাওয়া যায়নি।"],
  title_required: [400, "বইয়ের নাম লিখুন।"],
  book_withdrawn: [409, "বইটা withdrawn, নতুন কপি যোগ করা যাবে না।"],
  invalid_count: [400, "কপির সংখ্যা ১ থেকে ৫০০-র মধ্যে দিন।"],
  copy_not_found: [404, "কপিটা পাওয়া যায়নি।"],
  copy_unavailable: [409, "কপিটা এখন দেওয়া যাবে না (হারানো বা withdrawn)।"],
  copy_on_loan: [409, "কপিটা এখন অন্য কারও নামে আছে।"],
  copy_not_lost: [409, "কপিটা হারানো হিসেবে চিহ্নিত নেই।"],
  copy_has_history: [409, "এই বইয়ের কপির ইতিহাস আছে, মোছা যাবে না। Withdraw করুন।"],
  copy_has_loans: [409, "এই কপি একবার দেওয়া হয়েছে, তাই মোছা যাবে না।"],
  // borrower and loan
  borrower_required: [400, "Borrower বাছাই করুন।"],
  borrower_not_found: [404, "Borrower পাওয়া যায়নি।"],
  inactive: [409, "এই borrower এখন সক্রিয় নন, বই দেওয়া যাবে না।"],
  limit: [409, "সর্বোচ্চ সংখ্যক বই নেওয়া হয়ে গেছে।"],
  balance: [409, "বাকি fine সীমার বেশি। আগে fine জমা দিতে হবে।"],
  rules_required: [500, "Loan-এর নিয়ম পাওয়া যায়নি।"],
  invalid_date: [400, "তারিখ ঠিক নেই।"],
  loan_not_found: [404, "Loan পাওয়া যায়নি।"],
  loan_not_open: [409, "বইটা আগেই ফেরত হয়েছে।"],
  loan_not_returned: [409, "বইটা ফেরত হিসেবে নেই।"],
  no_open_loan: [409, "কপিটা কারও নামে নেই।"],
  max_renews: [409, "আর renew করা যাবে না, সীমা শেষ।"],
  no_gain: [409, "এখন renew করলে due date বাড়বে না।"],
  too_early: [409, "Renew এখনো খোলেনি।"],
  overdue: [409, "Due পার হয়ে গেছে, renew করা যাবে না। বই ফেরত নিন।"],
  invalid_source: [400, "কোথায় পাওয়া গেল তা বাছাই করুন।"],
  // money
  invalid_amount: [400, "টাকার পরিমাণ ঠিক নেই।"],
  fine_not_found: [404, "Fine পাওয়া যায়নি।"],
  fine_cancelled: [409, "এই fine বাতিল। আগে আদায় করা টাকা ফেরত দিন।"],
  fine_has_payments: [409, "এই fine-এ টাকা জমা বা মওকুফ আছে। আগে রসিদ ফেরত বা মওকুফ বাতিল করুন।"],
  over_balance: [409, "বাকির চেয়ে বেশি হয়ে যাচ্ছে।"],
  over_paid: [409, "জমার চেয়ে বেশি ফেরত দেওয়া যাবে না।"],
  duplicate_fine: [400, "একই fine দুইবার দেওয়া হয়েছে।"],
  mixed_borrowers: [400, "এক রসিদে শুধু একজন borrower-এর fine থাকবে।"],
  reason_required: [400, "কারণ লিখুন।"],
  receipt_not_found: [404, "রসিদটা পাওয়া যায়নি বা আগেই বাতিল।"],
  refund_first: [409, "এই রসিদের বিপরীতে ফেরত দেওয়া আছে। আগে ফেরতের রসিদ বাতিল করুন।"],
  nothing_due: [409, "কোনো বাকি নেই।"],
  // undo
  event_not_found: [404, "কাজটা পাওয়া যায়নি।"],
  already_undone: [409, "কাজটা আগেই undo হয়েছে।"],
  newer_action: [409, "এর পরে এই বই নিয়ে আরও কাজ হয়েছে। আগে সেগুলো undo করুন।"],
  state_changed: [409, "এর মধ্যে অবস্থা বদলে গেছে, তাই undo করা যাবে না।"],
  not_undoable: [409, "এই কাজ undo করা যায় না।"],
  append_only: [409, "এই হিসাব বদলানো বা মোছা যায় না।"],
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
