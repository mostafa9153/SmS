import { normalizeClass } from "./normalizers";
import type { DetectedFileMetadata, ParsedExcelResult } from "./types";

/**
 * Extracts school and student batch metadata from banner rows (e.g. Banglar Shiksha headers).
 */
export function extractBannerMetadata(rawText: string): DetectedFileMetadata {
  const metadata: DetectedFileMetadata = {
    rawBannerText: rawText.trim(),
  };

  // School Name
  const schoolMatch = rawText.match(
    /School\s*Name\s*[:-]\s*([^\r\n,]+?)(?=\s+UP\s+School|\s+School\s+Dise|\s+Dise\s+Code|\s+Enrolment|\s+Details|$)/i
  );
  if (schoolMatch) {
    metadata.schoolName = schoolMatch[1].replace(/[-_:]/g, " ").trim();
  }

  // DISE / UDISE Code
  const diseMatch = rawText.match(/(?:Dise|UDISE)\s*Code\s*[:-]\s*(\d+)/i);
  if (diseMatch) {
    metadata.diseCode = diseMatch[1].trim();
  }

  // Class (e.g. CLASS VIII, Class 8)
  const classMatch = rawText.match(/\bCLASS\s*[-:]?\s*([IVXLCDM]+|\d+)\b/i);
  if (classMatch) {
    metadata.detectedClass = normalizeClass(classMatch[1]);
  }

  // Section (e.g. Section-B, Section B)
  const secMatch = rawText.match(/\bSection\s*[-:]?\s*([A-Z])\b/i);
  if (secMatch) {
    metadata.detectedSection = secMatch[1].toUpperCase().trim();
  }

  // Academic Year / Session (e.g. 2026-27 or Date 25-08-26)
  // No \b: "AY_2026-27" puts the year right after an underscore
  const sessionMatch = rawText.match(/(?<!\d)(20\d{2}\s*[-/]\s*\d{2,4})(?!\d)/i);
  if (sessionMatch) {
    metadata.detectedAcademicYear = sessionMatch[1].replace(/\s+/g, "");
  } else {
    const yrMatch = rawText.match(/\b(20\d{2})\b/);
    if (yrMatch) {
      metadata.detectedAcademicYear = yrMatch[1];
    }
  }

  return metadata;
}

/**
 * Evaluates candidate rows (0 to 10) to automatically identify the real column headers.
 */
export function detectBestHeaderRow(sheet2D: any[][]): {
  headerRowIndex: number;
  metadata: DetectedFileMetadata;
} {
  const maxCandidates = Math.min(sheet2D.length, 10);
  let bestRowIndex = 0;
  let bestScore = -999;
  let aggregatedMetadata: DetectedFileMetadata = {};

  const clean = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Known header keywords for student and exam sheets
  const HEADER_KEYWORDS = new Set([
    "student",
    "student code",
    "unique code",
    "bsp code",
    "bsp id",
    "roll",
    "roll no",
    "name",
    "student name",
    "dob",
    "date of birth",
    "birth",
    "birth registration",
    "birth reg no",
    "father",
    "mother",
    "guardian",
    "contact",
    "mobile",
    "phone",
    "academic",
    "academic year",
    "session",
    "admission",
    "admission number",
    "admission no",
    "admission date",
    "stream",
    "academic stream",
    "medium",
    "medium of instruction",
    "dise",
    "dise code",
    "udise",
    "class",
    "section",
    "sec",
    "bank",
    "ifs",
    "ifsc",
    "account",
    "a/c",
    "aadhaar",
    "aadhar",
    "pen",
    "gender",
    "sex",
    "caste",
    "category",
    "social category",
    "religion",
    "mother tongue",
    "tongue",
    "minority",
    "minority group",
    "income",
    "annual income",
    "annual family income",
    "cwsn",
    "disability",
    "disability type",
    "blood",
    "blood group",
    "lood",
    "lood group",
    "height",
    "weight",
    "previous marks",
    "marks",
    "score",
    "total",
    "bengali",
    "english",
    "mathematics",
    "math",
    "science",
    "history",
    "geography",
    "grade",
    "full marks",
    "percentage",
  ]);

  for (let r = 0; r < maxCandidates; r++) {
    const row = sheet2D[r] || [];
    const nonBlankCells = row
      .map((c) => String(c ?? "").trim())
      .filter((c) => c.length > 0);

    if (nonBlankCells.length === 0) {
      continue;
    }

    let rowScore = 0;

    // A single cell banner with "School Name" or "Enrolment Details" is a banner, not headers
    const firstCellText = clean(nonBlankCells[0]);
    if (
      nonBlankCells.length <= 2 &&
      (firstCellText.includes("school") ||
        firstCellText.includes("enrolment") ||
        firstCellText.includes("dise") ||
        firstCellText.includes("report") ||
        firstCellText.includes("portal"))
    ) {
      rowScore -= 50;
    }

    for (const cell of nonBlankCells) {
      const cleanCell = clean(cell);
      if (cleanCell.length === 0) continue;

      // Positive match against known header keywords
      let matchedKeyword = false;
      for (const kw of HEADER_KEYWORDS) {
        if (cleanCell === kw || cleanCell.startsWith(kw + " ") || cleanCell.endsWith(" " + kw)) {
          rowScore += 12;
          matchedKeyword = true;
          break;
        }
      }

      if (!matchedKeyword) {
        for (const kw of HEADER_KEYWORDS) {
          if (cleanCell.includes(kw)) {
            rowScore += 6;
            break;
          }
        }
      }

      // Negative penalty if cell contains explicit data patterns (phone, date, long numeric IDs)
      if (/^\d{10}$/.test(cell)) rowScore -= 10; // Mobile
      if (/^\d{12}$/.test(cell)) rowScore -= 10; // Aadhaar
      if (/^\d{14,}$/.test(cell)) rowScore -= 10; // Student code / Account number
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cell)) rowScore -= 10; // Date of birth
      if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cell)) rowScore -= 10; // IFSC code
      if (/^\d+$/.test(cell) && cell.length <= 4) rowScore -= 2; // Numeric roll/year
    }

    // Award bonus if row has multiple distinct column-like headers
    if (nonBlankCells.length >= 4) {
      rowScore += nonBlankCells.length * 2;
    }

    if (rowScore > bestScore) {
      bestScore = rowScore;
      bestRowIndex = r;
    }
  }

  // Fallback: If best score is weak, find the first row with >= 3 non-blank cells
  if (bestScore < 10) {
    for (let r = 0; r < maxCandidates; r++) {
      const row = sheet2D[r] || [];
      const nonBlank = row.filter((c) => String(c ?? "").trim().length > 0);
      if (nonBlank.length >= 3) {
        bestRowIndex = r;
        break;
      }
    }
  }

  // Banner metadata only from the rows above the header: student rows would otherwise set the
  // class, section or year for the whole sheet
  for (let r = 0; r < bestRowIndex; r++) {
    const text = (sheet2D[r] || []).map((c) => String(c ?? "").trim()).filter(Boolean).join(" ");
    if (text) aggregatedMetadata = { ...aggregatedMetadata, ...extractBannerMetadata(text) };
  }

  return {
    headerRowIndex: bestRowIndex,
    metadata: aggregatedMetadata,
  };
}

/**
 * Builds clean headers and row records given a 2D sheet array and a 0-based header row index.
 */
export function buildRowsFromHeader(
  sheet2D: any[][],
  headerRowIndex: number
): { headers: string[]; rawRows: Record<string, any>[]; rowNumbers: number[] } {
  const rawHeaderRow = sheet2D[headerRowIndex] || [];

  // Find last non-empty column index
  let lastColIndex = -1;
  for (let c = rawHeaderRow.length - 1; c >= 0; c--) {
    if (String(rawHeaderRow[c] ?? "").trim().length > 0) {
      lastColIndex = c;
      break;
    }
  }

  // Check data rows as well to ensure no columns are truncated
  const maxScanRows = Math.min(sheet2D.length, headerRowIndex + 50);
  for (let r = headerRowIndex + 1; r < maxScanRows; r++) {
    const row = sheet2D[r] || [];
    for (let c = row.length - 1; c > lastColIndex; c--) {
      if (String(row[c] ?? "").trim().length > 0) {
        lastColIndex = c;
      }
    }
  }

  if (lastColIndex === -1) {
    lastColIndex = Math.max(0, rawHeaderRow.length - 1);
  }

  // Build unique header names
  const headers: string[] = [];
  const headerCountMap = new Map<string, number>();

  for (let c = 0; c <= lastColIndex; c++) {
    let headerName = String(rawHeaderRow[c] ?? "").trim();
    if (!headerName) {
      headerName = `Column_${c + 1}`;
    }

    const count = headerCountMap.get(headerName) || 0;
    headerCountMap.set(headerName, count + 1);

    if (count > 0) {
      headers.push(`${headerName}_${count + 1}`);
    } else {
      headers.push(headerName);
    }
  }

  // Government exports put a column-number row ("(1)", "(2)", ...) under the header
  const isNumberingRow = (row: any[]) => {
    const cells = (row || []).map((v) => String(v ?? "").trim()).filter(Boolean);
    if (cells.length < 3) return false;
    // 1, 2, 3, ... in order, with or without brackets, so a row of marks never looks like one
    const inOrder = cells.filter((v, i) => v.replace(/^\((\d+)\)$/, "$1") === String(i + 1)).length;
    return inOrder / cells.length > 0.8;
  };
  const firstDataRow = isNumberingRow(sheet2D[headerRowIndex + 1]) ? headerRowIndex + 2 : headerRowIndex + 1;

  // Build data rows starting after headerRowIndex
  const rawRows: Record<string, any>[] = [];
  // The sheet's own row number of each record (blank rows are dropped), for messages
  const rowNumbers: number[] = [];
  for (let r = firstDataRow; r < sheet2D.length; r++) {
    const row = sheet2D[r] || [];
    const rowObj: Record<string, any> = {};
    let hasData = false;

    for (let c = 0; c < headers.length; c++) {
      const val = row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : "";
      rowObj[headers[c]] = val;
      if (val !== "") {
        hasData = true;
      }
    }

    if (hasData) {
      rawRows.push(rowObj);
      rowNumbers.push(r + 1);
    }
  }

  return { headers, rawRows, rowNumbers };
}

/**
 * Parses an Excel or CSV file in the browser using XLSX with smart header & metadata auto-detection.
 */
export async function parseExcelFile(
  file: File,
  options?: { forcedHeaderRow?: number; sheetIndex?: number }
): Promise<ParsedExcelResult> {
  const data = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  // CSV is read as plain text: SheetJS would guess "06-08-2015" as US month-first (8 June) and
  // drop leading zeros from IDs; the normalizers read day-first dates instead
  const isText = /\.(csv|tsv|txt)$/i.test(file.name);
  const workbook = XLSX.read(data, { type: "array", cellNF: true, raw: isText });

  const sheetNames = workbook.SheetNames;
  const selectedSheet = sheetNames[options?.sheetIndex ?? 0] || "Sheet1";
  const worksheet = workbook.Sheets[selectedSheet];

  // A date cell's display text follows the file's locale format ("8/6/15" for 6 Aug 2015 under
  // the short-date format), so read the stored date itself as YYYY-MM-DD
  for (const [addr, cell] of Object.entries(worksheet)) {
    if (addr.startsWith("!") || cell?.t !== "n" || !cell.z || !XLSX.SSF.is_date(cell.z)) continue;
    const d = XLSX.SSF.parse_date_code(cell.v);
    if (d && d.y > 1900) cell.w = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }

  // Convert worksheet to 2D array (all rows and columns preserved)
  const allRows2D: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  // Auto-detect header row index unless forced
  let headerRowIndex = 0;
  let detectedMetadata: DetectedFileMetadata | undefined;

  if (options?.forcedHeaderRow !== undefined) {
    headerRowIndex = Math.max(0, Math.min(options.forcedHeaderRow, allRows2D.length - 1));
    const bannerScan = detectBestHeaderRow(allRows2D);
    detectedMetadata = bannerScan.metadata;
  } else {
    const detection = detectBestHeaderRow(allRows2D);
    headerRowIndex = detection.headerRowIndex;
    detectedMetadata = detection.metadata;
  }

  const { headers, rawRows, rowNumbers } = buildRowsFromHeader(allRows2D, headerRowIndex);

  return {
    sheetNames,
    selectedSheet,
    headers,
    rawRows,
    rowNumbers,
    headerRowIndex,
    totalRows: rawRows.length,
    allRows2D,
    detectedMetadata,
  };
}

/**
 * Instantly re-parses cached 2D sheet data with a new header row in 0ms without re-reading the file.
 */
export function reparseWithHeaderRow(
  parsed: ParsedExcelResult,
  newHeaderRowIndex: number
): ParsedExcelResult {
  const safeIndex = Math.max(0, Math.min(newHeaderRowIndex, parsed.allRows2D.length - 1));
  const { headers, rawRows, rowNumbers } = buildRowsFromHeader(parsed.allRows2D, safeIndex);

  return {
    ...parsed,
    headerRowIndex: safeIndex,
    headers,
    rawRows,
    rowNumbers,
    totalRows: rawRows.length,
  };
}
