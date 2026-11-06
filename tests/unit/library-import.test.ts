import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { matchImportColumns, parseImportRows, rowsFromGrid } from "@/lib/library/import";

describe("matchImportColumns", () => {
  it("reads Bengali and English headers, ignoring case and punctuation", () => {
    expect(matchImportColumns(["বইয়ের নাম", "লেখক", "Copies", "Price (₹)", "Acc. No", "Remarks"])).toEqual({
      title: "বইয়ের নাম",
      author: "লেখক",
      copies: "Copies",
      price: "Price (₹)",
      legacy_no: "Acc. No",
    });
    expect(matchImportColumns(["Title", "দাম"])).toEqual({ title: "Title", price: "দাম" });
  });
});

describe("parseImportRows (K2)", () => {
  const headers = ["বইয়ের নাম", "লেখক", "কপির সংখ্যা", "দাম"];

  it("reads Bengali text and Bengali digits", () => {
    const r = parseImportRows(headers, [{ "বইয়ের নাম": " পথের   পাঁচালী ", লেখক: "বিভূতিভূষণ", "কপির সংখ্যা": "৩", দাম: "১২০" }], [2]);
    expect(r.errors).toEqual([]);
    expect(r.entries).toEqual([
      {
        rows: [2],
        copies: 3,
        price: 120,
        book: expect.objectContaining({ title: "পথের পাঁচালী", author: "বিভূতিভূষণ", publisher: null }),
      },
    ]);
  });

  it("skips blank lines and defaults copies to 1", () => {
    const r = parseImportRows(headers, [{ "বইয়ের নাম": "", লেখক: "  " }, { "বইয়ের নাম": "আরণ্যক" }], [2, 3]);
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0]).toMatchObject({ rows: [3], copies: 1, price: null });
  });

  it("reports a missing title, a bad count and a bad price by sheet row", () => {
    const r = parseImportRows(
      headers,
      [{ লেখক: "কেউ" }, { "বইয়ের নাম": "ক", "কপির সংখ্যা": "2.5" }, { "বইয়ের নাম": "খ", দাম: "abc" }, { "বইয়ের নাম": "গ", "কপির সংখ্যা": "-1" }],
      [5, 6, 7, 8],
    );
    expect(r.entries).toEqual([]);
    expect(r.errors.map((e) => e.row)).toEqual([5, 6, 7, 8]);
  });

  it("merges the same title and author within the file, summing copies", () => {
    const r = parseImportRows(
      headers,
      [
        { "বইয়ের নাম": "গীতাঞ্জলি", লেখক: "রবীন্দ্রনাথ", "কপির সংখ্যা": 2 },
        { "বইয়ের নাম": "গীতাঞ্জলি।", লেখক: "রবীন্দ্রনাথ", "কপির সংখ্যা": 3, দাম: "₹ 1,250" },
        { "বইয়ের নাম": "গীতাঞ্জলি", লেখক: "অন্য কেউ" },
      ],
      [2, 3, 4],
    );
    expect(r.entries).toHaveLength(2);
    expect(r.entries[0]).toMatchObject({ rows: [2, 3], copies: 5, price: 1250 });
  });

  it("refuses a sheet without a title column", () => {
    expect(parseImportRows(["Author"], [{ Author: "x" }]).missingTitleColumn).toBe(true);
  });

  it("allows zero copies (title only) but not more than 500 of one title", () => {
    const r = parseImportRows(headers, [{ "বইয়ের নাম": "ক", "কপির সংখ্যা": 0 }, { "বইয়ের নাম": "খ", "কপির সংখ্যা": 400 }, { "বইয়ের নাম": "খ", "কপির সংখ্যা": 200 }], [2, 3, 4]);
    expect(r.entries[0].copies).toBe(0);
    expect(r.errors).toEqual([{ row: 4, message: expect.any(String) }]);
    expect(r.entries[1].copies).toBe(400);
  });
});

describe("reading a real sheet", () => {
  const sheetOf = (aoa: unknown[][]) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Books");
    const read = XLSX.read(XLSX.write(wb, { type: "array", bookType: "xlsx" }), { type: "array" });
    return XLSX.utils.sheet_to_json(read.Sheets.Books, { header: 1, defval: "", raw: true }) as unknown[][];
  };

  it("finds the header below a banner row, even when data mentions Science or English", () => {
    const grid = sheetOf([
      ["Marigachi High School Library"],
      ["Title", "Category", "Language", "Copies"],
      ["A History of Science", "Science", "English", 2],
    ]);
    const sheet = rowsFromGrid(grid)!;
    expect(sheet.headers[0]).toBe("Title");
    const r = parseImportRows(sheet.headers, sheet.rows, sheet.rowNumbers);
    expect(r.entries).toEqual([expect.objectContaining({ rows: [3], copies: 2 })]);
  });

  it("keeps every digit of a numeric ISBN and accession number", () => {
    const grid = sheetOf([
      ["বইয়ের নাম", "ISBN", "Accession No", "দাম"],
      ["The Odyssey", 9780140449136, 123456789012, 1250.5],
    ]);
    const sheet = rowsFromGrid(grid)!;
    const [e] = parseImportRows(sheet.headers, sheet.rows, sheet.rowNumbers).entries;
    expect(e.book).toMatchObject({ isbn: "9780140449136", legacy_no: "123456789012" });
    expect(e.price).toBe(1250.5);
  });

  it("gives up when no top row names a title column", () => {
    expect(rowsFromGrid(sheetOf([["Author"], ["x"]]))).toBeNull();
  });
});

describe("same title in one file, author on one row only", () => {
  const headers = ["Title", "Author", "Copies"];
  it("treats them as one book (K1) and keeps the author", () => {
    const r = parseImportRows(headers, [{ Title: "Gitanjali", Copies: 2 }, { Title: "Gitanjali", Author: "Tagore", Copies: 3 }], [2, 3]);
    expect(r.entries).toEqual([expect.objectContaining({ rows: [2, 3], copies: 5, book: expect.objectContaining({ author: "Tagore" }) })]);
  });
  it("asks for an author when a blank-author row could be either of two books", () => {
    const r = parseImportRows(
      headers,
      [{ Title: "Poems", Author: "A" }, { Title: "Poems", Author: "B" }, { Title: "Poems" }],
      [2, 3, 4],
    );
    expect(r.entries).toHaveLength(2);
    expect(r.errors).toEqual([{ row: 4, message: expect.any(String) }]);
  });
});
