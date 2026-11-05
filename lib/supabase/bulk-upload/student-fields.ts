import type { Student } from "@/lib/types";
import { normalizeGender, normalizeSocialCategory, toIsoDate } from "@/lib/utils/excel/normalizers";

/** A mapped spreadsheet row as the bulk upload API receives it. */
export type BulkStudentRow = Partial<Student> & {
  /** Sheet row number, for messages */
  rowNumber?: number;
  /** Fields the upload settings filled in (not a column of the sheet): used for new students only */
  _defaults?: string[];
};

/**
 * skip: existing students are left as they are (only new students are added). fill_blanks: only
 * empty fields of an existing student are filled. overwrite: sheet values replace them.
 */
export type UpdateMode = "skip" | "fill_blanks" | "overwrite";

type Kind = "text" | "date" | "int" | "num" | "bool" | "list" | "gender" | "category" | "aadhaar";

interface StudentField {
  column: string;
  label: string;
  kind: Kind;
  /** Row key the value is read from; `read` wins when set */
  key?: keyof Student;
  read?: (row: BulkStudentRow) => unknown;
}

const field = (column: string, label: string, kind: Kind, key: keyof Student): StudentField => ({ column, label, kind, key });

/** Every students column the bulk upload can write, in one place for both creates and updates. */
export const STUDENT_FIELDS: StudentField[] = [
  field("name", "Name", "text", "name"),
  field("school_id", "School ID", "text", "schoolId"),
  field("dob", "Date of Birth", "date", "dob"),
  field("gender", "Gender", "gender", "gender"),
  field("father_name", "Father Name", "text", "fatherName"),
  field("father_occupation", "Father Occupation", "text", "fatherOccupation"),
  field("mother_name", "Mother Name", "text", "motherName"),
  field("mother_occupation", "Mother Occupation", "text", "motherOccupation"),
  field("guardian_name", "Guardian Name", "text", "guardianName"),
  field("relationship_with_guardian", "Guardian Relation", "text", "relationshipWithGuardian"),
  field("guardian_occupation", "Guardian Occupation", "text", "guardianOccupation"),
  field("guardian_qualification", "Guardian Qualification", "text", "guardianQualification"),
  field("mobile", "Mobile", "text", "studentContact"),
  field("alt_mobile", "Guardian Mobile", "text", "altMobile"),
  field("email", "Email", "text", "email"),
  field("address", "Address", "text", "address"),
  field("pincode", "Pincode", "text", "pincode"),
  field("present_class", "Class", "text", "presentClass"),
  field("present_section", "Section", "text", "presentSection"),
  field("present_roll", "Roll", "int", "presentRoll"),
  field("current_status", "Status", "text", "currentStatus"),
  field("admission_year", "Admission Year", "int", "admissionYear"),
  field("admission_no", "Admission Number", "text", "admissionNo"),
  field("admission_date", "Admission Date", "date", "admissionDate"),
  field("admission_type", "Admission Type", "text", "admissionType"),
  field("academic_year", "Academic Year", "text", "academicYear"),
  field("medium_of_instruction", "Medium of Instruction", "text", "mediumOfInstruction"),
  field("present_class_admission_date", "Present Class Admission Date", "date", "presentClassAdmissionDate"),
  field("academic_stream", "Academic Stream", "text", "academicStream"),
  field("pen", "PEN", "text", "pen"),
  field("aadhaar", "Aadhaar", "aadhaar", "aadhaar"),
  field("name_as_per_aadhaar", "Name as per Aadhaar", "text", "nameAsPerAadhaar"),
  field("student_unique_code", "Banglar Shiksha ID", "text", "studentUniqueCode"),
  field("kanyashree_id", "Kanyashree ID", "text", "kanyashreeId"),
  field("social_category", "Category", "category", "socialCategory"),
  field("caste_certificate_no", "Caste Certificate No", "text", "casteCertificateNo"),
  field("religion", "Religion", "text", "religion"),
  field("mother_tongue", "Mother Tongue", "text", "motherTongue"),
  field("minority_group", "Minority Group", "text", "minorityGroup"),
  field("bank_ifsc", "IFSC", "text", "bankIfsc"),
  field("bank_account_no", "Account No", "text", "bankAccountNo"),
  field("birth_registration_no", "Birth Registration No", "text", "birthRegistrationNo"),
  {
    column: "board_registration_no",
    label: "Board Registration No",
    kind: "text",
    read: (r) => r.boardRegistrationNo || r.wbbseRegNo || r.wbchseRegNo,
  },
  { column: "board_roll_no", label: "Board Roll No", kind: "text", read: (r) => r.boardRollNo || r.wbbseRollNo || r.wbchseRollNo },
  field("dise_code", "DISE Code", "text", "diseCode"),
  field("health_id", "Health ID", "text", "healthId"),
  field("identification_mark", "Identification Mark", "text", "identificationMark"),
  field("is_cwsn", "CWSN", "bool", "isCwsn"),
  field("impairment_type", "Disability Type", "text", "impairmentType"),
  field("has_disability_certificate", "Disability Certificate", "bool", "hasDisabilityCertificate"),
  field("disability_percentage", "Disability Percentage", "num", "disabilityPercentage"),
  field("sld_type", "SLD Type", "text", "sldType"),
  field("is_aay", "AAY", "bool", "isAay"),
  field("is_ews", "EWS", "bool", "isEws"),
  field("indian_nationality", "Indian Nationality", "bool", "indianNationality"),
  field("is_out_of_school", "Out of School", "bool", "isOutOfSchool"),
  field("mainstreamed_date", "Mainstreamed Date", "date", "mainstreamedDate"),
  field("annual_family_income", "Annual Income", "num", "annualFamilyIncome"),
  field("blood_group", "Blood Group", "text", "bloodGroup"),
  field("height_cm", "Height", "num", "heightCm"),
  field("weight_kg", "Weight", "num", "weightKg"),
  field("previous_school", "Previous School", "text", "previousSchool"),
  field("previous_class", "Previous Class", "text", "previousClass"),
  field("previous_section", "Previous Section", "text", "previousSection"),
  field("previous_stream", "Previous Stream", "text", "previousStream"),
  field("previous_roll_no", "Previous Roll", "num", "previousRollNo"),
  field("previous_marks_percent", "Previous Marks", "num", "previousMarksPercent"),
  field("previous_status", "Previous Status", "text", "previousStatus"),
  field("previous_appeared_for_exams", "Previous Appeared For Exams", "bool", "previousAppearedForExams"),
  field("previous_result", "Previous Result", "text", "previousResult"),
  field("previous_days_attended", "Previous Days Attended", "num", "previousDaysAttended"),
  field("rte_section_12c", "RTE Section 12C", "bool", "rteSection12C"),
  field("rte_amount_claimed", "RTE Amount Claimed", "num", "rteAmountClaimed"),
  field("facilities_provided", "Facilities Provided", "list", "facilitiesProvided"),
  field("cwsn_facilities", "CWSN Facilities", "list", "cwsnFacilities"),
  field("competitions_olympiads", "Competitions/Olympiads", "list", "competitionsOlympiads"),
  field("ncc", "NCC", "bool", "ncc"),
  field("nss", "NSS", "bool", "nss"),
  field("scouts_guides", "Scouts & Guides", "bool", "scoutsGuides"),
  field("distance_to_school", "Distance to School", "num", "distanceToSchool"),
  field("highest_education_parents", "Highest Education Parents", "text", "highestEducationParents"),
  field("language_group", "Language Group", "list", "languageGroup"),
  field("foreign_language", "Foreign Language", "text", "foreignLanguage"),
  field("mandatory_subjects", "Mandatory Subjects", "list", "mandatorySubjects"),
  field("additional_subjects", "Additional Subjects", "list", "additionalSubjects"),
  field("co_curricular_subjects", "Co-Curricular Subjects", "list", "coCurricularSubjects"),
];

const COLUMN_BY_KEY = new Map(STUDENT_FIELDS.filter((f) => f.key).map((f) => [f.key as string, f.column]));

/** The value a row gives for a column, or undefined when its cell is blank or unreadable. */
function incoming(f: StudentField, row: BulkStudentRow): unknown {
  const raw = f.read ? f.read(row) : row[f.key!];
  if (raw === undefined || raw === null) return undefined;
  switch (f.kind) {
    case "bool":
      return typeof raw === "boolean" ? raw : undefined;
    case "int":
    case "num": {
      if (String(raw).trim() === "") return undefined;
      const n = Number(raw);
      if (!Number.isFinite(n)) return undefined;
      return f.kind === "int" ? Math.round(n) : n;
    }
    case "list": {
      if (!Array.isArray(raw)) return undefined;
      const list = raw.map((v) => String(v).trim()).filter(Boolean);
      return list.length ? list : undefined;
    }
    case "date":
      return toIsoDate(raw) || undefined;
    case "aadhaar": {
      const digits = String(raw).replace(/\D/g, "");
      return digits.length === 12 ? digits : undefined;
    }
    default: {
      const text = String(raw).trim();
      if (!text) return undefined;
      if (f.kind === "gender") return normalizeGender(text);
      if (f.kind === "category") return normalizeSocialCategory(text) || undefined;
      return text;
    }
  }
}

function isBlank(kind: Kind, value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  // A flag that was never set reads as false
  return kind === "bool" && value === false;
}

function same(kind: Kind, current: unknown, next: unknown): boolean {
  if (current === null || current === undefined) return false;
  switch (kind) {
    case "list":
      return Array.isArray(current) && JSON.stringify([...current].map(String).sort()) === JSON.stringify([...(next as string[])].sort());
    case "int":
    case "num":
      return Number(current) === next;
    case "date":
      return String(current).slice(0, 10) === next;
    case "bool":
      return Boolean(current) === next;
    default:
      return String(current).trim() === next;
  }
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export interface FieldChange {
  label: string;
  from: string;
  to: string;
}

/**
 * Columns to change on an existing student. A blank cell never touches a value; in fill_blanks mode
 * only empty fields are written. Values the upload settings supplied (`_defaults`) are skipped.
 */
export function buildPatch(
  existing: Record<string, unknown>,
  row: BulkStudentRow,
  mode: Exclude<UpdateMode, "skip">
): { patch: Record<string, unknown>; changes: FieldChange[] } {
  const defaulted = new Set((row._defaults || []).map((k) => COLUMN_BY_KEY.get(k)).filter(Boolean));
  const patch: Record<string, unknown> = {};
  const changes: FieldChange[] = [];
  for (const f of STUDENT_FIELDS) {
    if (defaulted.has(f.column)) continue;
    const next = incoming(f, row);
    if (next === undefined) continue;
    const current = existing[f.column];
    if (mode === "fill_blanks" && !isBlank(f.kind, current)) continue;
    if (same(f.kind, current, next)) continue;
    patch[f.column] = next;
    changes.push({ label: f.label, from: display(current), to: display(next) });
  }
  return { patch, changes };
}

/** Insert payload for a new student: what the row has, blanks stay null (flags and lists keep DB defaults). */
export function buildCreateRow(row: BulkStudentRow, fallback: { admissionYear: number; status: string }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of STUDENT_FIELDS) {
    const value = incoming(f, row);
    if (value !== undefined) out[f.column] = value;
    else if (f.kind !== "bool" && f.kind !== "list") out[f.column] = null;
  }
  out.admission_year ??= fallback.admissionYear;
  out.current_status ??= fallback.status;
  return out;
}

const ESSENTIALS: Array<[string, string]> = [
  ["dob", "Date of Birth"],
  ["gender", "Gender"],
  ["father_name", "Father Name"],
  ["mother_name", "Mother Name"],
  ["present_class", "Class"],
  ["present_section", "Section"],
  ["present_roll", "Roll"],
];

/** Essential details a student record still lacks, for the "Incomplete" report. */
export function missingEssentials(record: Record<string, unknown>): string[] {
  const missing = ESSENTIALS.filter(([column]) => isBlank("text", record[column])).map(([, label]) => label);
  // PEN is the one ID a student needs; the others only help match an existing student
  if (isBlank("text", record.pen)) missing.push("PEN");
  return missing;
}
