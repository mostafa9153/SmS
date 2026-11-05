import type { BulkUploadType, Student } from "@/lib/types";
import { TARGET_FIELDS } from "@/lib/utils/excel/fields";

// One standard student sheet: every field the importer reads, grouped like the profile.
// Headers are the field labels, so the mapping step matches each column on its own.
const CATEGORY_ORDER = [
  "Core", "Enrolment", "Identifiers", "Board Examination", "Family", "Contact", "Demographics",
  "Personal", "Bank", "Welfare", "Previous", "Curriculum", "Facilities", "Activities",
];
// The class-specific WBBSE / WBCHSE columns cover these two
const TEMPLATE_SKIP = new Set<keyof Student>(["boardRegistrationNo", "boardRollNo"]);

type Sample = Partial<Record<keyof Student, string | number>>;

export const STUDENT_SAMPLE: Sample = {
  name: "Rohit Sharma", dob: "2012-05-15", gender: "Male", presentRoll: 1,
  admissionNo: "ADM-2026-0101", admissionDate: "2026-01-02", academicStream: "", mediumOfInstruction: "Bengali",
  studentUniqueCode: "BSP-2026-101", schoolId: "", pen: "", hasAadhaar: "Yes", aadhaar: "123412341234",
  diseCode: "19180201004", healthId: "", birthRegistrationNo: "", wbbseRegNo: "", wbchseRegNo: "",
  wbbseRollNo: "", wbchseRollNo: "", identificationMark: "Mole on left cheek",
  fatherName: "Gopal Sharma", fatherOccupation: "Farmer", motherName: "Sita Sharma", motherOccupation: "Homemaker",
  guardianName: "Gopal Sharma", relationshipWithGuardian: "Father", guardianQualification: "Secondary",
  studentContact: "9830012345", altMobile: "9830012345", email: "", address: "Vill- Rampur, PO- Rampur, Dist- Nadia",
  pincode: "741101", socialCategory: "General", religion: "Hinduism", motherTongue: "Bengali", minorityGroup: "",
  bloodGroup: "B+", heightCm: 140, weightKg: 35, isCwsn: "No", impairmentType: "", annualFamilyIncome: 60000,
  bankAccountNo: "123456789012", bankIfsc: "SBIN0001234",
  previousSchool: "", previousClass: "IV", previousRollNo: "", previousMarksPercent: "", previousStatus: "",
  previousSection: "", previousStream: "", previousAppearedForExams: "Yes", previousResult: "Passed",
  previousDaysAttended: "", kanyashreeId: "", casteCertificateNo: "", nameAsPerAadhaar: "Rohit Sharma",
  guardianOccupation: "Farmer", admissionType: "New", presentClassAdmissionDate: "2026-01-02",
  hasDisabilityCertificate: "No", disabilityPercentage: "", sldType: "", isAay: "No", isEws: "No",
  indianNationality: "Yes", isOutOfSchool: "No", mainstreamedDate: "", rteSection12C: "No", rteAmountClaimed: "",
  facilitiesProvided: "", cwsnFacilities: "", competitionsOlympiads: "", ncc: "No", nss: "No", scoutsGuides: "No",
  distanceToSchool: 2, highestEducationParents: "Secondary", languageGroup: "Bengali, English",
  foreignLanguage: "", mandatorySubjects: "", additionalSubjects: "", coCurricularSubjects: "",
};

export function fieldFormat(key: keyof Student, label: string): string {
  if (/date|^dob$/i.test(key)) return "YYYY-MM-DD";
  if (/\(Yes\/No\)/.test(label)) return "Yes / No";
  if (["languageGroup", "mandatorySubjects", "additionalSubjects", "coCurricularSubjects",
    "facilitiesProvided", "cwsnFacilities", "competitionsOlympiads"].includes(key)) return "Comma separated";
  if (key === "gender") return "Male / Female / Other";
  if (key === "socialCategory") return "General / OBC / SC / ST";
  if (key === "presentClass") return "V – XII";
  if (key === "currentStatus") return "Continuing / Passed Out / Drop Out";
  if (key === "aadhaar") return "12 digits";
  return "";
}

export function studentTemplateFields() {
  return TARGET_FIELDS.filter((f) => !TEMPLATE_SKIP.has(f.key)).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
}

async function writeStudentTemplate(filename: string, sample: Sample) {
  const fields = studentTemplateFields();
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([fields.map((f) => f.label), fields.map((f) => sample[f.key] ?? "")]);
  ws["!cols"] = fields.map((f) => ({ wch: Math.max(14, f.label.length + 2) }));
  const guide = XLSX.utils.aoa_to_sheet([
    ["Column", "Group", "Required", "Format"],
    ...fields.map((f) => [f.label, f.category, f.required ? "Yes" : "", fieldFormat(f.key, f.label)]),
  ]);
  guide["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 10 }, { wch: 34 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.utils.book_append_sheet(wb, guide, "Guide");
  XLSX.writeFile(wb, filename);
}

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
  } else {
    const isOld = type === "old_students";
    filename = isOld
      ? `Old_Students_Archive_${targetSessionYear}_Template.xlsx`
      : `Current_Students_${targetSessionYear}_Template.xlsx`;
    await writeStudentTemplate(filename, {
      ...STUDENT_SAMPLE,
      presentClass: classForTemplate,
      presentSection: secForTemplate,
      academicYear: targetSessionYear,
      admissionYear: targetSessionYear,
      currentStatus: isOld ? "Passed Out" : "Continuing",
    });
    return;
  }

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

/** The whole import as a workbook: one sheet per outcome, with what changed and what is missing. */
export async function exportImportReport(importResult: any) {
  if (!importResult?.details) return;
  const { buildReportItems } = await import("./import-report");
  const items = buildReportItems(importResult.details);
  const toRow = (i: (typeof items)[number]) => ({
    "Excel Row": i.rowNumber ?? "",
    "Student Name": i.name,
    "School ID": i.schoolId,
    Changes: i.changes.map((c) => `${c.label}: ${c.from || "(blank)"} -> ${c.to}`).join("; "),
    "Missing Details": i.missing.join(", "),
    Warning: i.warning || "",
    Note: i.note,
  });
  const sheets: Array<[string, typeof items]> = [
    ["Added", items.filter((i) => i.kind === "created")],
    ["Updated", items.filter((i) => i.kind === "updated")],
    ["Incomplete", items.filter((i) => i.missing.length > 0)],
    ["Skipped", items.filter((i) => i.kind === "skipped")],
    ["Failed", items.filter((i) => i.kind === "errors")],
  ];

  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const [name, list] of sheets) {
    if (list.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(list.map(toRow)), name);
  }
  if (!wb.SheetNames.length) return;
  XLSX.writeFile(wb, `Import_Report_${importResult.batchId || "batch"}.xlsx`);
}
