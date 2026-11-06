import { titleKey } from "./catalog";

/**
 * Excel import (plan K2), pure so the client preview and the server commit
 * read a sheet the same way. Columns are matched by header in Bengali or
 * English; rows of the same title and author are merged into one entry.
 */

export const IMPORT_MAX_ROWS = 2000;

export type ImportField = "title" | "author" | "publisher" | "category" | "language" | "edition" | "isbn" | "legacy_no" | "copies" | "price";

const ALIASES: Record<ImportField, string[]> = {
  title: ["title", "book", "book name", "name", "বই", "বইয়ের নাম", "নাম"],
  author: ["author", "writer", "লেখক", "লেখক/লেখিকা"],
  publisher: ["publisher", "প্রকাশক", "প্রকাশনী"],
  category: ["category", "subject", "বিষয়", "শ্রেণি"],
  language: ["language", "ভাষা"],
  edition: ["edition", "সংস্করণ"],
  isbn: ["isbn"],
  legacy_no: ["accession no", "accession", "acc no", "acc", "legacy no", "পুরোনো accession no", "অ্যাকসেশন নং", "রেজিস্টার নং"],
  copies: ["copies", "copy", "qty", "quantity", "কপি", "কপির সংখ্যা", "সংখ্যা"],
  price: ["price", "cost", "rate", "দাম", "মূল্য"],
};

/** The template's header row, in the order the columns appear. */
export const IMPORT_TEMPLATE_HEADERS: [ImportField, string][] = [
  ["title", "বইয়ের নাম"],
  ["author", "লেখক"],
  ["publisher", "প্রকাশক"],
  ["category", "বিষয়"],
  ["language", "ভাষা"],
  ["edition", "সংস্করণ"],
  ["isbn", "ISBN"],
  ["legacy_no", "Accession No"],
  ["copies", "কপির সংখ্যা"],
  ["price", "দাম"],
];

/** Header text without symbols or units: "Price (₹)" and "price" are the same column. */
const headerKey = (h: string) =>
  titleKey(h)
    .replace(/[^\p{L}\p{M}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Which sheet column feeds each field; unknown headers are ignored. */
export function matchImportColumns(headers: string[]): Partial<Record<ImportField, string>> {
  const out: Partial<Record<ImportField, string>> = {};
  for (const header of headers) {
    const key = headerKey(header);
    if (!key) continue;
    for (const [field, aliases] of Object.entries(ALIASES) as [ImportField, string[]][]) {
      if (!out[field] && aliases.some((a) => headerKey(a) === key)) {
        out[field] = header;
        break;
      }
    }
  }
  return out;
}

export interface ImportBook {
  title: string;
  author: string | null;
  publisher: string | null;
  category: string | null;
  language: string | null;
  edition: string | null;
  isbn: string | null;
  legacy_no: string | null;
}

export interface ImportEntry {
  /** Sheet rows merged into this entry (1-based, as Excel shows them). */
  rows: number[];
  book: ImportBook;
  copies: number;
  price: number | null;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ParsedImport {
  entries: ImportEntry[];
  errors: ImportRowError[];
  /** Header missing for the title column: nothing can be read. */
  missingTitleColumn: boolean;
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
/** Bengali digits to ASCII, thousands separators and currency marks dropped. */
function numberText(v: unknown): string {
  return String(v ?? "")
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[,₹\s]|rs\.?|টাকা/gi, "")
    .trim();
}

/** Cell text. Whole numbers keep every digit (an ISBN typed as a number must not become 9.78E+12). */
const text = (v: unknown) => {
  const raw = typeof v === "number" ? (Number.isInteger(v) ? v.toFixed(0) : String(v)) : String(v ?? "");
  const s = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, 300) : null;
};

/** Rows of a sheet as cells (row 1 first), e.g. SheetJS `sheet_to_json(ws, { header: 1, raw: true })`. */
export type SheetGrid = unknown[][];

/**
 * The header is the first of the top rows that names a title column; the
 * student importer's header guess does not know library headers. Returns
 * the data rows keyed by header text, with their sheet row numbers.
 */
export function rowsFromGrid(grid: SheetGrid): { headers: string[]; rows: Record<string, unknown>[]; rowNumbers: number[] } | null {
  const top = Math.min(grid.length, 15);
  for (let h = 0; h < top; h++) {
    const headers = (grid[h] ?? []).map((c) => String(c ?? "").trim());
    if (!matchImportColumns(headers).title) continue;
    const rows: Record<string, unknown>[] = [];
    const rowNumbers: number[] = [];
    for (let r = h + 1; r < grid.length; r++) {
      const cells = grid[r] ?? [];
      const row: Record<string, unknown> = {};
      headers.forEach((name, c) => {
        if (name && row[name] === undefined) row[name] = cells[c];
      });
      rows.push(row);
      rowNumbers.push(r + 1);
    }
    return { headers, rows, rowNumbers };
  }
  return null;
}

/** Reads sheet rows into import entries, merging duplicates within the file. */
export function parseImportRows(headers: string[], rows: Record<string, unknown>[], rowNumbers?: number[]): ParsedImport {
  const cols = matchImportColumns(headers);
  if (!cols.title) return { entries: [], errors: [], missingTitleColumn: true };
  const get = (row: Record<string, unknown>, f: ImportField) => (cols[f] ? row[cols[f]!] : undefined);

  const entries: ImportEntry[] = [];
  const byKey = new Map<string, ImportEntry>();
  const errors: ImportRowError[] = [];

  rows.slice(0, IMPORT_MAX_ROWS).forEach((row, i) => {
    const rowNo = rowNumbers?.[i] ?? i + 2;
    const values = (Object.keys(ALIASES) as ImportField[]).map((f) => text(get(row, f)));
    if (values.every((v) => !v)) return; // blank line

    const title = text(get(row, "title"));
    if (!title) return errors.push({ row: rowNo, message: "বইয়ের নাম নেই" });

    const copiesRaw = numberText(get(row, "copies"));
    const copies = copiesRaw === "" ? 1 : Number(copiesRaw);
    if (!Number.isInteger(copies) || copies < 0 || copies > 500) {
      return errors.push({ row: rowNo, message: `কপির সংখ্যা ঠিক নেই: ${copiesRaw}` });
    }
    const priceRaw = numberText(get(row, "price"));
    const price = priceRaw === "" ? null : Number(priceRaw);
    if (price !== null && (!Number.isFinite(price) || price < 0 || price >= 100_000_000)) {
      return errors.push({ row: rowNo, message: `দাম ঠিক নেই: ${priceRaw}` });
    }

    const book: ImportBook = {
      title,
      author: text(get(row, "author")),
      publisher: text(get(row, "publisher")),
      category: text(get(row, "category")),
      language: text(get(row, "language")),
      edition: text(get(row, "edition")),
      isbn: text(get(row, "isbn")),
      legacy_no: text(get(row, "legacy_no")),
    };
    const key = `${titleKey(book.title)}|${titleKey(book.author)}`;
    // The same book again: exact title and author, or the same title where one side has no author (K1).
    let same = byKey.get(key);
    if (!same) {
      const t = titleKey(book.title);
      const a = titleKey(book.author);
      const near = entries.filter((e) => titleKey(e.book.title) === t && (!a || !titleKey(e.book.author)));
      if (near.length > 1) return errors.push({ row: rowNo, message: `একই নামের একাধিক বই আগের সারিতে (${near.map((e) => e.rows[0]).join(", ")}), লেখক লিখুন` });
      same = near[0];
    }
    if (same) {
      if (same.copies + copies > 500) return errors.push({ row: rowNo, message: "একই বইয়ের ৫০০টির বেশি কপি" });
      same.rows.push(rowNo);
      same.copies += copies;
      same.price = same.price ?? (price === null ? null : Math.round(price * 100) / 100);
      for (const f of Object.keys(book) as (keyof ImportBook)[]) if (!same.book[f] && book[f]) same.book[f] = book[f] as string;
      return;
    }
    const entry: ImportEntry = { rows: [rowNo], book, copies, price: price === null ? null : Math.round(price * 100) / 100 };
    byKey.set(key, entry);
    entries.push(entry);
  });

  if (rows.length > IMPORT_MAX_ROWS) {
    errors.push({ row: (rowNumbers?.[IMPORT_MAX_ROWS] ?? IMPORT_MAX_ROWS + 2), message: `একবারে ${IMPORT_MAX_ROWS}টির বেশি সারি নেওয়া যায় না` });
  }
  return { entries, errors, missingTitleColumn: false };
}

/** What the server decided for one entry after looking at the catalog. */
export type ImportPlanItem =
  | { kind: "new"; entry: ImportEntry }
  | { kind: "add"; entry: ImportEntry; bookId: string; bookCode: string; existingTitle: string }
  | { kind: "skip"; entry: ImportEntry; reason: string };
