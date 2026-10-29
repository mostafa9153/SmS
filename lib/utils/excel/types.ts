export interface DetectedFileMetadata {
  schoolName?: string;
  diseCode?: string;
  detectedClass?: string;
  detectedSection?: string;
  detectedAcademicYear?: string;
  rawBannerText?: string;
}

export interface ParsedExcelResult {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
  headerRowIndex: number; // 0-based index: 0 = Row 1 in Excel, 1 = Row 2 in Excel
  totalRows: number;
  allRows2D: any[][];
  detectedMetadata?: DetectedFileMetadata;
}
