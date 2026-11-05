import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelFile } from "@/lib/utils/excel/sheet";
import { normalizeDate, toIsoDate } from "@/lib/utils/excel/normalizers";

/** A real xlsx with date cells stored under the locale short-date format (numFmt 14) */
function workbookFile(): File {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "DOB"],
    ["NAZBUL", new Date(Date.UTC(2016, 0, 1))],
    ["SALAMAN", new Date(Date.UTC(2015, 7, 6))],
    ["SABNAM", new Date(Date.UTC(2015, 7, 21))],
  ]);
  for (const addr of ["B2", "B3", "B4"]) ws[addr].z = XLSX.SSF.get_table()[14] as string;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const file = new File([buf], "students.xlsx");
  // jsdom-free environments lack File.arrayBuffer on some versions
  if (!file.arrayBuffer) (file as any).arrayBuffer = async () => buf;
  return file;
}

describe("Excel date cells", () => {
  it("reads the stored date, not the locale display text", async () => {
    const parsed = await parseExcelFile(workbookFile());
    expect(parsed.rawRows.map((r) => r.DOB)).toEqual(["2016-01-01", "2015-08-06", "2015-08-21"]);
  });
});

describe("date text", () => {
  it("reads day-first text with two- or four-digit years", () => {
    expect(toIsoDate("06-08-2015")).toBe("2015-08-06");
    expect(toIsoDate("6/8/15")).toBe("2015-08-06");
    expect(toIsoDate("21.08.2015")).toBe("2015-08-21");
    expect(toIsoDate("8/21/15")).toBe("2015-08-21");
    expect(toIsoDate("06-Aug-2015")).toBe("2015-08-06");
    expect(toIsoDate("6 August 2015")).toBe("2015-08-06");
    expect(normalizeDate("1/1/98")).toBe("1998-01-01");
  });

  it("rejects text that is not a date", () => {
    expect(toIsoDate("NA")).toBe("");
    expect(toIsoDate("31/02/2015")).toBe("");
  });
});

describe("CSV dates and IDs", () => {
  it("reads CSV text day-first and keeps leading zeros", async () => {
    const csv = "Name,DOB,Student Code\nA,06-08-2015,09433222000164\nB,21/08/2015,05717421000006\n";
    const file = new File([csv], "students.csv");
    if (!file.arrayBuffer) (file as any).arrayBuffer = async () => new TextEncoder().encode(csv).buffer;
    const parsed = await parseExcelFile(file);
    expect(parsed.rawRows.map((r) => toIsoDate(r.DOB))).toEqual(["2015-08-06", "2015-08-21"]);
    expect(parsed.rawRows[0]["Student Code"]).toBe("09433222000164");
  });
});
