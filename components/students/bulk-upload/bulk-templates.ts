import { BulkUploadType } from "@/lib/types";

export async function downloadSampleTemplate(
  type: BulkUploadType,
  ctx: { targetClass: string; targetSection: string; resultYear: number; resultExam: any; targetSessionYear: number }
) {
  const { targetClass, targetSection, resultYear, resultExam, targetSessionYear } = ctx;
  let wsData: any[] = [];
  let filename = "Template.xlsx";

  const classForTemplate = targetClass !== "AUTO" ? targetClass : "V";
  const secForTemplate = targetSection !== "AUTO" ? targetSection : "A";

  if (type === "exam_results") {
    filename = `Results_Marksheet_${resultYear}_Template.xlsx`;
    wsData = [
      [
        "Student Code",
        "Student Name",
        "Class",
        "Section",
        "Roll No",
        "Academic Year",
        "Exam Name",
        "Bengali",
        "English",
        "Mathematics",
        "Physical Science",
        "Life Science",
        "History",
        "Geography",
        "Total Marks",
        "Full Marks",
      ],
      [
        "BSP-2025-001",
        "Abir Das",
        classForTemplate,
        secForTemplate,
        1,
        resultYear,
        resultExam,
        75,
        68,
        82,
        70,
        78,
        65,
        72,
        510,
        700,
      ],
      [
        "BSP-2025-002",
        "Tanmoy Roy",
        classForTemplate,
        secForTemplate,
        2,
        resultYear,
        resultExam,
        80,
        74,
        88,
        76,
        85,
        72,
        79,
        554,
        700,
      ],
    ];
  } else if (type === "old_students") {
    filename = `Old_Students_Archive_${targetSessionYear}_Template.xlsx`;
    wsData = [
      [
        "Student Code",
        "Student Name",
        "Gender",
        "Date of Birth",
        "Academic Year",
        "Class",
        "Section",
        "Roll No",
        "Status",
        "Father Name",
        "Mother Name",
        "Guardian Contact Number",
        "Aadhaar Y/N",
      ],
      [
        "BSP-2023-010",
        "Rahul Sen",
        "Male",
        "2008-04-12",
        targetSessionYear,
        classForTemplate,
        secForTemplate,
        15,
        "Alumni",
        "Sunil Sen",
        "Mita Sen",
        "9876543210",
        "Yes",
      ],
    ];
  } else {
    filename = `Current_Students_${targetSessionYear}_Template.xlsx`;
    const normCls = classForTemplate.toUpperCase().replace(/^CLASS\s*/i, "").trim();
    const isHsCls = ["XI", "11", "XII", "12"].includes(normCls);
    const isSecCls = ["IX", "9", "X", "10"].includes(normCls);

    const headers = [
      "Student Code",
      "Roll No",
      "Student Name",
      "Student DOB",
      "Academic Year",
      "Class",
      "Section",
      "Father Name",
      "Mother Name",
      "Guardian Contact Number",
      "Student Contact Number",
      "Bank IFS Code",
      "Bank A/C number",
      "Aadhaar Y/N",
    ];
    const sampleRow: any[] = [
      "BSP-2026-101",
      1,
      "Rohit Sharma",
      "2012-05-15",
      targetSessionYear,
      classForTemplate,
      secForTemplate,
      "Gopal Sharma",
      "Sita Sharma",
      "9830012345",
      "9830012345",
      "SBIN0001234",
      "123456789012",
      "Yes",
    ];

    if (isHsCls) {
      headers.push("WBCHSE Reg No", "WBCHSE Roll No");
      sampleRow.push("19111305602/2024", "123456N 0012");
    } else if (isSecCls) {
      headers.push("WBBSE Reg No", "WBBSE Roll No");
      sampleRow.push("19180201004/2024", "123456N 0012");
    }

    wsData = [headers, sampleRow];
  }

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

export async function exportImportIssues(importResult: any) {
  if (!importResult?.details) return;
  const skipped = importResult.details.skipped || [];
  const errors = importResult.details.errors || [];

  const rows: any[] = [];
  errors.forEach((err: any) => {
    rows.push({
      "Status": "FAILED / ERROR",
      "Excel Row": err.rowNumber || "—",
      "Student Name": err.name || "—",
      "School ID / PEN": err.schoolId || "—",
      "Reason / Issue": err.message || "Import failed",
    });
  });
  skipped.forEach((sk: any) => {
    rows.push({
      "Status": "SKIPPED",
      "Excel Row": sk.rowNumber || "—",
      "Student Name": sk.name || "—",
      "School ID / PEN": sk.schoolId || "—",
      "Reason / Issue": sk.reason || "Duplicate / Identical data",
    });
  });

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Issues_Log");
  XLSX.writeFile(wb, `Import_Issues_${importResult.batchId || "batch"}.xlsx`);
}
