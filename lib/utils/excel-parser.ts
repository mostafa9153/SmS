import * as XLSX from "xlsx";
import type { Student, StudentStatus, ColumnMapping, ValidationIssue, BulkPreviewRow, BulkResultRow } from "@/lib/types";

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

export interface FieldDefinition {
  key: keyof Student;
  label: string;
  category: string;
  icon?: string;
  aliases: string[];
  required?: boolean;
}

export const TARGET_FIELDS: FieldDefinition[] = [
  // 1. Core & Enrolment
  {
    key: "name",
    label: "Student Name",
    category: "Core",
    icon: "👤",
    aliases: [
      "student name",
      "student's name",
      "student_name",
      "candidate name",
      "name of student",
      "name of the student",
      "student fullname",
      "name",
    ],
    required: true,
  },
  {
    key: "dob",
    label: "Date of Birth",
    category: "Core",
    icon: "📅",
    aliases: [
      "student dob",
      "student date of birth",
      "date of birth",
      "birth date",
      "dob",
      "d.o.b",
      "d.o.b.",
      "birth_date",
      "student_dob",
    ],
    required: true,
  },
  {
    key: "gender",
    label: "Gender",
    category: "Core",
    icon: "⚧",
    aliases: ["gender", "sex", "male/female", "boy/girl"],
    required: true,
  },
  {
    key: "presentClass",
    label: "Class",
    category: "Enrolment",
    icon: "🏫",
    aliases: [
      "class",
      "present class",
      "current class",
      "standard",
      "grade",
      "enrolled class",
    ],
    required: true,
  },
  {
    key: "presentSection",
    label: "Section",
    category: "Enrolment",
    icon: "🔤",
    aliases: ["section", "sec", "present section", "division", "sec."],
  },
  {
    key: "presentRoll",
    label: "Roll No",
    category: "Enrolment",
    icon: "🎯",
    aliases: [
      "roll no",
      "roll no.",
      "roll number",
      "roll",
      "present roll",
      "roll_no",
      "student roll",
      "class roll",
    ],
  },
  {
    key: "admissionNo",
    label: "Admission Number",
    category: "Enrolment",
    icon: "📖",
    aliases: [
      "admission number",
      "admission no",
      "admission_no",
      "admission no.",
      "adm no",
      "adm_no",
      "adm number",
      "admission#",
      "admission id",
      "admission num",
      "admission",
      "admission code",
      "student admission no",
      "admission roll",
      "admission serial",
    ],
  },
  {
    key: "admissionDate",
    label: "Admission Date",
    category: "Enrolment",
    icon: "📅",
    aliases: [
      "admission date",
      "date of admission",
      "admission_date",
      "doa",
      "adm date",
      "enrolment date",
      "admission dt",
      "date of adm",
      "admission_dt",
      "admission day",
    ],
  },
  {
    key: "academicYear",
    label: "Academic Year",
    category: "Enrolment",
    icon: "🗓️",
    aliases: [
      "academic year",
      "session",
      "academic session",
      "current academic year",
      "acad year",
      "academic_year",
      "session year",
    ],
  },
  {
    key: "admissionYear",
    label: "Admission Year",
    category: "Enrolment",
    icon: "🗓️",
    aliases: ["admission year", "adm year", "admission_year", "year of admission"],
  },
  {
    key: "currentStatus",
    label: "Student Status",
    category: "Enrolment",
    icon: "📌",
    aliases: ["status", "current status", "student status", "enrolment status"],
  },
  {
    key: "academicStream",
    label: "Academic Stream",
    category: "Enrolment",
    icon: "🎨",
    aliases: [
      "academic stream",
      "stream",
      "stream name",
      "discipline",
      "arts/science/commerce",
      "academic_stream",
      "academic stream name",
      "higher secondary stream",
      "hs stream",
    ],
  },
  {
    key: "mediumOfInstruction",
    label: "Medium of Instruction",
    category: "Enrolment",
    icon: "🌐",
    aliases: [
      "medium of instruction",
      "medium",
      "instruction medium",
      "language of instruction",
      "medium_of_instruction",
      "medium of study",
      "instruction_medium",
      "instruction language",
      "school medium",
    ],
  },

  // 2. Government & School Identifiers
  {
    key: "studentUniqueCode",
    label: "Student Code (BSP)",
    category: "Identifiers",
    icon: "🆔",
    aliases: [
      "student code",
      "student unique code",
      "bsp id",
      "bsp code",
      "banglar shiksha id",
      "banglar shiksha code",
      "unique code",
      "student_code",
      "studentcode",
      "bsp",
    ],
  },
  {
    key: "schoolId",
    label: "School ID",
    category: "Identifiers",
    icon: "🔢",
    aliases: [
      "school id",
      "school_id",
      "student id",
      "studentid",
      "id",
      "school_student_id",
    ],
  },
  {
    key: "pen",
    label: "PEN Number",
    category: "Identifiers",
    icon: "📝",
    aliases: [
      "pen",
      "pen no",
      "pen number",
      "permanent education number",
      "pen_no",
      "pen no.",
    ],
  },
  {
    key: "hasAadhaar",
    label: "Aadhaar Available (Yes/No)",
    category: "Identifiers",
    icon: "🛡️",
    aliases: [
      "aadhaar y n",
      "aadhar y n",
      "aadhaar y/n",
      "aadhar y/n",
      "aadhaar (y/n)",
      "aadhar (y/n)",
      "aadhaar yn",
      "aadhar yn",
      "aadhaar yes no",
      "aadhar yes no",
      "aadhaar yes/no",
      "aadhar yes/no",
      "aadhaar y",
      "aadhar y",
      "aadhaar available",
      "aadhar available",
      "has aadhaar",
      "has aadhar",
      "aadhaar status",
      "aadhar status",
    ],
  },
  {
    key: "aadhaar",
    label: "Aadhaar Number (12 digits)",
    category: "Identifiers",
    icon: "💳",
    aliases: [
      "aadhaar number",
      "aadhar number",
      "aadhaar no",
      "aadhar no",
      "aadhaar card no",
      "aadhar card no",
      "student aadhaar",
      "student aadhar",
      "aadhaar",
      "aadhar",
      "uid",
      "uidai",
      "aadhaar no.",
    ],
  },
  {
    key: "diseCode",
    label: "DISE Code",
    category: "Identifiers",
    icon: "🏫",
    aliases: [
      "dise code",
      "udise code",
      "udise+",
      "dise_code",
      "udise_code",
      "school dise code",
      "dise",
      "udise",
      "school dise",
      "school udise code",
      "school dise no",
      "udise code no",
    ],
  },
  {
    key: "healthId",
    label: "Health ID / ABHA",
    category: "Identifiers",
    icon: "🏥",
    aliases: [
      "health id",
      "health_id",
      "abha id",
      "abham id",
      "national health id",
    ],
  },
  {
    key: "birthRegistrationNo",
    label: "Birth Registration No",
    category: "Identifiers",
    icon: "📄",
    aliases: [
      "birth registration no",
      "birth registration number",
      "birth reg no",
      "birth certificate no",
      "birth_registration_no",
      "birth cert no",
      "birth registration",
      "birth reg. no",
      "birth reg. no.",
      "birth reg no.",
      "birth cert number",
      "birth certificate number",
      "birth reg",
      "brn",
      "birth cert #",
    ],
  },
  {
    key: "identificationMark",
    label: "Identification Mark",
    category: "Identifiers",
    icon: "🔍",
    aliases: [
      "identification mark",
      "id mark",
      "body mark",
      "visible mark",
      "identification_mark",
      "identity mark",
    ],
  },

  // 3. Family & Contact
  {
    key: "fatherName",
    label: "Father Name",
    category: "Family",
    icon: "👨",
    aliases: [
      "father name",
      "father's name",
      "father",
      "father_name",
      "father full name",
      "fathers name",
      "father / guardian name",
    ],
  },
  {
    key: "motherName",
    label: "Mother Name",
    category: "Family",
    icon: "👩",
    aliases: [
      "mother name",
      "mother's name",
      "mother",
      "mother_name",
      "mother full name",
      "mothers name",
    ],
  },
  {
    key: "guardianName",
    label: "Guardian Name",
    category: "Family",
    icon: "👥",
    aliases: [
      "guardian name",
      "guardian's name",
      "guardian fullname",
      "guardians name",
      "name of guardian",
      "guardian",
      "guardian number",
    ],
  },
  {
    key: "relationshipWithGuardian",
    label: "Relationship with Guardian",
    category: "Family",
    icon: "🤝",
    aliases: [
      "relationship with guardian",
      "guardian relation",
      "relation with guardian",
      "relation",
      "relationship",
    ],
  },
  {
    key: "guardianQualification",
    label: "Guardian Qualification",
    category: "Family",
    icon: "🎓",
    aliases: [
      "guardian qualification",
      "qualification of guardian",
      "parent qualification",
      "highest education parents",
    ],
  },
  {
    key: "studentContact",
    label: "Student Contact Number",
    category: "Contact",
    icon: "📞",
    aliases: [
      "student contact number",
      "student contact no",
      "student contact no.",
      "student contact",
      "student mobile",
      "student phone",
      "primary mobile",
      "mobile number",
      "mobile no",
      "contact no",
      "phone no",
      "contact",
      "mobile",
      "phone",
      "student mobile no",
    ],
  },
  {
    key: "altMobile",
    label: "Guardian Contact Number",
    category: "Contact",
    icon: "📱",
    aliases: [
      "guardian contact number",
      "guardian contact no",
      "guardian contact no.",
      "guardian mobile",
      "guardian contact",
      "guardian phone",
      "alternate contact number",
      "alternate mobile",
      "alt mobile",
      "alt_mobile",
      "emergency contact",
      "guardian phone no",
    ],
  },
  {
    key: "email",
    label: "Email ID",
    category: "Contact",
    icon: "📧",
    aliases: ["email", "email id", "contact email", "e-mail", "student email"],
  },
  {
    key: "address",
    label: "Residential Address",
    category: "Contact",
    icon: "🏠",
    aliases: [
      "address",
      "permanent address",
      "residential address",
      "village",
      "vill",
      "student address",
    ],
  },
  {
    key: "pincode",
    label: "Pincode",
    category: "Contact",
    icon: "📮",
    aliases: ["pincode", "pin code", "pin", "postal code", "post code"],
  },

  // 4. Demographics & Personal Info
  {
    key: "socialCategory",
    label: "Social Category (Gen/OBC/SC/ST)",
    category: "Demographics",
    icon: "🏷️",
    aliases: [
      "social category",
      "category",
      "caste",
      "caste category",
      "social_category",
    ],
  },
  {
    key: "religion",
    label: "Religion",
    category: "Demographics",
    icon: "🕌",
    aliases: ["religion", "faith", "community"],
  },
  {
    key: "motherTongue",
    label: "Mother Tongue",
    category: "Demographics",
    icon: "🗣️",
    aliases: [
      "mother tongue",
      "mother_tongue",
      "first language",
      "native language",
      "mother language",
      "mothertongue",
      "mother tounge",
      "home language",
    ],
  },
  {
    key: "minorityGroup",
    label: "Minority Group",
    category: "Demographics",
    icon: "🤝",
    aliases: [
      "minority group",
      "minority",
      "minority_group",
      "minority community",
      "minority status",
      "minority name",
      "minority group name",
      "minority type",
    ],
  },
  {
    key: "bloodGroup",
    label: "Blood Group",
    category: "Personal",
    icon: "🩸",
    aliases: [
      "blood group",
      "lood group",
      "blood_group",
      "blood",
      "bg",
      "blood group name",
      "blood grp",
      "lood grp",
      "blood group (+/-)",
      "blood type",
    ],
  },
  {
    key: "heightCm",
    label: "Height (cm)",
    category: "Personal",
    icon: "📏",
    aliases: [
      "height (cm)",
      "height cm",
      "height in cm",
      "height",
      "height_cm",
      "student height",
      "height(cm)",
      "height in centimeter",
      "height in cms",
    ],
  },
  {
    key: "weightKg",
    label: "Weight (kg)",
    category: "Personal",
    icon: "⚖️",
    aliases: [
      "weight (kg)",
      "weight kg",
      "weight in kg",
      "weight",
      "weight_kg",
      "student weight",
      "weight(kg)",
      "weight in kilogram",
      "weight in kgs",
    ],
  },

  // 5. Special Categories & Welfare
  {
    key: "isBpl",
    label: "BPL Beneficiary (Yes/No)",
    category: "Welfare",
    icon: "🎫",
    aliases: [
      "bpl beneficiary",
      "bpl",
      "is bpl",
      "bpl status",
      "bpl y/n",
      "bpl y n",
      "bpl card holder",
      "bpl beneficiary (yes/no)",
      "bpl (y/n)",
      "bpl yes/no",
      "bpl beneficiary y/n",
      "bpl category",
      "below poverty line",
    ],
  },
  {
    key: "isCwsn",
    label: "CWSN / Disability (Yes/No)",
    category: "Welfare",
    icon: "♿",
    aliases: [
      "cwsn / disability",
      "cwsn disability",
      "cwsn",
      "is cwsn",
      "cwsn y/n",
      "cwsn status",
      "cwsn student",
      "disabled",
      "disability",
      "cwsn y n",
      "special needs",
      "cwsn / disability (yes/no)",
      "cwsn (y/n)",
      "cwsn yes/no",
      "disability y/n",
      "disability (y/n)",
      "child with special needs",
    ],
  },
  {
    key: "impairmentType",
    label: "Disability / Impairment Type",
    category: "Welfare",
    icon: "📜",
    aliases: [
      "disability type",
      "impairment type",
      "type of disability",
      "impairment",
      "nature of disability",
      "disability_type",
      "disability impairment type",
      "type of impairment",
      "cwsn type",
      "disability name",
    ],
  },
  {
    key: "annualFamilyIncome",
    label: "Annual Family Income (₹)",
    category: "Welfare",
    icon: "💰",
    aliases: [
      "annual family income",
      "annual income",
      "family income",
      "income",
      "annual_income",
      "family annual income",
      "annual family income (₹)",
      "annual family income rs",
      "annual family income in rs",
      "family annual income (rs)",
      "parental income",
      "parents annual income",
      "annual income rs",
      "total family income",
    ],
  },

  // 6. Bank Details
  {
    key: "bankAccountNo",
    label: "Bank Account Number",
    category: "Bank",
    icon: "🏦",
    aliases: [
      "bank a/c number",
      "bank a c number",
      "bank a/c no",
      "bank a c no",
      "bank ac number",
      "bank ac no",
      "bank account number",
      "bank account no",
      "bank account",
      "a/c number",
      "a/c no",
      "account number",
      "account no",
      "a c number",
      "a c no",
      "acc no",
      "bank acc",
      "account_no",
    ],
  },
  {
    key: "bankIfsc",
    label: "Bank IFSC Code",
    category: "Bank",
    icon: "🏛️",
    aliases: [
      "bank ifs code",
      "bank ifsc code",
      "bank ifs",
      "bank ifsc",
      "ifs code",
      "ifsc code",
      "ifs",
      "ifsc",
      "branch ifsc",
      "ifsc_code",
    ],
  },

  // 7. Previous Schooling
  {
    key: "previousSchool",
    label: "Previous School Name",
    category: "Previous",
    icon: "🏫",
    aliases: [
      "previous school",
      "previous school name",
      "last attended school",
      "previous_school",
      "last school",
    ],
  },
  {
    key: "previousClass",
    label: "Previous Class",
    category: "Previous",
    icon: "📖",
    aliases: [
      "previous class",
      "last class attended",
      "prev class",
      "previous_class",
    ],
  },
  {
    key: "previousRollNo",
    label: "Previous Roll No",
    category: "Previous",
    icon: "🎯",
    aliases: [
      "previous roll",
      "prev roll",
      "last roll no",
      "previous roll no",
      "previous_roll_no",
    ],
  },
  {
    key: "previousMarksPercent",
    label: "Previous Marks (%)",
    category: "Previous",
    icon: "📊",
    aliases: [
      "previous marks (%)",
      "previous marks %",
      "previous marks",
      "previous marks percent",
      "prev marks",
      "last exam percentage",
      "previous %",
      "previous_marks_percent",
      "previous marks in %",
      "previous marks percentage",
      "last year marks %",
      "last exam marks",
      "marks in previous class",
      "prev class %",
    ],
  },
];

export const TEMPLATE_PRESETS: Record<string, { name: string; mapping: ColumnMapping }> = {
  banglarShiksha: {
    name: "Banglar Shiksha (BSP) Export",
    mapping: {
      "Student Code": "studentUniqueCode",
      "Student Unique Code": "studentUniqueCode",
      "Roll No": "presentRoll",
      "Student Name": "name",
      "Student DOB": "dob",
      "Date of Birth": "dob",
      "Academic Year": "academicYear",
      "Admission Number": "admissionNo",
      "Admission Date": "admissionDate",
      "Academic Stream": "academicStream",
      "Medium of Instruction": "mediumOfInstruction",
      "Birth Registration No": "birthRegistrationNo",
      "DISE Code": "diseCode",
      "Minority Group": "minorityGroup",
      "Mother Tongue": "motherTongue",
      "BPL Beneficiary": "isBpl",
      "Annual Family Income": "annualFamilyIncome",
      "CWSN / Disability": "isCwsn",
      "Disability Type": "impairmentType",
      "Blood Group": "bloodGroup",
      "lood Group": "bloodGroup",
      "Height (cm)": "heightCm",
      "Weight (kg)": "weightKg",
      "Previous Marks (%)": "previousMarksPercent",
      "Father Name": "fatherName",
      "Mother Name": "motherName",
      "Guardian Name": "guardianName",
      "Guardian Number": "guardianName",
      "Student Contact Number": "studentContact",
      "Guardian Contact Number": "altMobile",
      "Bank IFS Code": "bankIfsc",
      "Bank A/C number": "bankAccountNo",
      "Aadhaar Y/N": "hasAadhaar",
      "Gender": "gender",
      "Class": "presentClass",
      "Section": "presentSection",
      "Mobile No": "studentContact",
      "Aadhaar No": "aadhaar",
      "PEN": "pen",
      "Social Category": "socialCategory",
      "Religion": "religion",
      "IFSC": "bankIfsc",
      "Account No": "bankAccountNo",
    },
  },
  udise: {
    name: "UDISE+ Student Portal",
    mapping: {
      "PEN": "pen",
      "Student Name": "name",
      "Gender": "gender",
      "DOB": "dob",
      "Class": "presentClass",
      "Section": "presentSection",
      "Roll": "presentRoll",
      "Father's Name": "fatherName",
      "Mother's Name": "motherName",
      "Aadhaar Number": "aadhaar",
      "Mobile Number": "studentContact",
      "Caste": "socialCategory",
      "Admission Number": "admissionNo",
      "Admission Date": "admissionDate",
      "Academic Stream": "academicStream",
      "Medium of Instruction": "mediumOfInstruction",
      "Birth Registration No": "birthRegistrationNo",
      "DISE Code": "diseCode",
      "Minority Group": "minorityGroup",
      "Mother Tongue": "motherTongue",
      "BPL Beneficiary": "isBpl",
      "Annual Family Income": "annualFamilyIncome",
      "CWSN / Disability": "isCwsn",
      "Disability Type": "impairmentType",
      "Blood Group": "bloodGroup",
      "lood Group": "bloodGroup",
      "Height (cm)": "heightCm",
      "Weight (kg)": "weightKg",
      "Previous Marks (%)": "previousMarksPercent",
    },
  },
};

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
  const sessionMatch = rawText.match(/\b(20\d{2}\s*[-/]\s*\d{2,4})\b/i);
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
    "bpl",
    "bpl beneficiary",
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

    // Aggregate banner metadata from text rows
    if (nonBlankCells.length > 0) {
      const fullRowText = nonBlankCells.join(" ");
      const rowMeta = extractBannerMetadata(fullRowText);
      aggregatedMetadata = { ...aggregatedMetadata, ...rowMeta };
    }

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
): { headers: string[]; rawRows: Record<string, any>[] } {
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

  // Build data rows starting after headerRowIndex
  const rawRows: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < sheet2D.length; r++) {
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
    }
  }

  return { headers, rawRows };
}

/**
 * Parses an Excel or CSV file in the browser using XLSX with smart header & metadata auto-detection.
 */
export async function parseExcelFile(
  file: File,
  options?: { forcedHeaderRow?: number; sheetIndex?: number }
): Promise<ParsedExcelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: true });

  const sheetNames = workbook.SheetNames;
  const selectedSheet = sheetNames[options?.sheetIndex ?? 0] || "Sheet1";
  const worksheet = workbook.Sheets[selectedSheet];

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

  const { headers, rawRows } = buildRowsFromHeader(allRows2D, headerRowIndex);

  return {
    sheetNames,
    selectedSheet,
    headers,
    rawRows,
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
  const { headers, rawRows } = buildRowsFromHeader(parsed.allRows2D, safeIndex);

  return {
    ...parsed,
    headerRowIndex: safeIndex,
    headers,
    rawRows,
    totalRows: rawRows.length,
  };
}

/**
 * Auto-suggests column mappings based on prioritized fuzzy matching.
 */
export function autoSuggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Explicit priority order for matching to prevent generic collisions (like "name" eating "father name")
  const PRIORITY_KEYS: (keyof Student)[] = [
    "fatherName",
    "motherName",
    "altMobile",
    "studentContact",
    "guardianName",
    "relationshipWithGuardian",
    "guardianQualification",
    "studentUniqueCode",
    "bankAccountNo",
    "bankIfsc",
    "birthRegistrationNo",
    "diseCode",
    "healthId",
    "identificationMark",
    "admissionNo",
    "admissionDate",
    "academicYear",
    "admissionYear",
    "academicStream",
    "mediumOfInstruction",
    "dob",
    "presentRoll",
    "presentClass",
    "presentSection",
    "pen",
    "hasAadhaar",
    "aadhaar",
    "socialCategory",
    "religion",
    "motherTongue",
    "minorityGroup",
    "isBpl",
    "annualFamilyIncome",
    "isCwsn",
    "impairmentType",
    "bloodGroup",
    "heightCm",
    "weightKg",
    "previousMarksPercent",
    "previousSchool",
    "previousClass",
    "previousRollNo",
    "email",
    "address",
    "pincode",
    "currentStatus",
    "schoolId",
    "gender",
    "name",
  ];

  const fieldMap = new Map<keyof Student, FieldDefinition>();
  for (const f of TARGET_FIELDS) {
    fieldMap.set(f.key, f);
  }

  // Ensure all defined target fields are checked
  const allTargetKeys = TARGET_FIELDS.map((f) => f.key);
  const orderedKeys: (keyof Student)[] = [
    ...PRIORITY_KEYS,
    ...allTargetKeys.filter((k) => !PRIORITY_KEYS.includes(k)),
  ];

  for (const rawHeader of headers) {
    const cleanHeader = clean(rawHeader);
    let bestMatch: keyof Student | "ignore" = "ignore";

    // Pass 1: Direct EXACT match across all fields (highest confidence)
    for (const key of orderedKeys) {
      const field = fieldMap.get(key);
      if (!field) continue;

      const matched = field.aliases.some((alias) => {
        const cleanAlias = clean(alias);
        return (
          cleanHeader === cleanAlias ||
          cleanHeader === cleanAlias.replace(/\s+/g, "")
        );
      });

      if (matched) {
        bestMatch = key;
        break;
      }
    }

    // Pass 2: Word-boundary start/end match (prioritize specific multi-word fields)
    if (bestMatch === "ignore") {
      for (const key of orderedKeys) {
        const field = fieldMap.get(key);
        if (!field) continue;

        // Skip prefix match if it would misclassify specific fields
        if (key === "motherName" && cleanHeader.includes("tongue")) continue;
        if (key === "fatherName" && cleanHeader.includes("income")) continue;
        if (key === "isCwsn" && (cleanHeader.includes("type") || cleanHeader.includes("nature") || cleanHeader.includes("impairment"))) continue;
        if (key === "admissionNo" && cleanHeader.includes("date")) continue;

        const matched = field.aliases.some((alias) => {
          const cleanAlias = clean(alias);
          if (cleanAlias.length < 3) return false;
          return (
            cleanHeader.startsWith(cleanAlias + " ") ||
            cleanHeader.endsWith(" " + cleanAlias)
          );
        });

        if (matched) {
          bestMatch = key;
          break;
        }
      }
    }

    // Pass 3: Fallback partial contains check in priority order
    if (bestMatch === "ignore") {
      for (const key of orderedKeys) {
        const field = fieldMap.get(key);
        if (!field) continue;

        // Skip generic 'name' in partial match if 'father', 'mother', or 'guardian' is present
        if (
          key === "name" &&
          (cleanHeader.includes("father") ||
            cleanHeader.includes("mother") ||
            cleanHeader.includes("guardian"))
        ) {
          continue;
        }
        if (key === "motherName" && cleanHeader.includes("tongue")) continue;
        if (key === "isCwsn" && (cleanHeader.includes("type") || cleanHeader.includes("nature") || cleanHeader.includes("impairment"))) continue;
        if (key === "admissionNo" && cleanHeader.includes("date")) continue;

        const matched = field.aliases.some((alias) => {
          const cleanAlias = clean(alias);
          if (cleanAlias.length < 3) return false;
          return cleanHeader.includes(cleanAlias);
        });

        if (matched) {
          bestMatch = key;
          break;
        }
      }
    }

    mapping[rawHeader] = bestMatch;
  }

  return mapping;
}

/**
 * Normalizes date inputs from Excel formats (e.g. DD/MM/YYYY, YYYY-MM-DD, Excel Serial) to ISO "YYYY-MM-DD".
 */
export function normalizeDate(value: any): string {
  if (!value) return "";
  // Excel serial date number
  if (typeof value === "number" && value > 1000 && value < 100000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!isNaN(Number(trimmed)) && Number(trimmed) > 1000 && Number(trimmed) < 100000) {
      const serial = Number(trimmed);
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0");
      const month = ddmmyyyy[2].padStart(2, "0");
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }
    // YYYY-MM-DD
    const yyyymmdd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = yyyymmdd[1];
      const month = yyyymmdd[2].padStart(2, "0");
      const day = yyyymmdd[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  return String(value);
}

/**
 * Normalizes Gender to "Male" | "Female" | "Other".
 * Handles all variations: boy, boys, b, girl, girls, g, male, female, 1, 2, regional terms, etc.
 */
export function normalizeGender(val: any): "Male" | "Female" | "Other" {
  if (val === undefined || val === null) return "Other";
  const str = String(val).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!str) return "Other";

  // 1. Female variations (check first to catch words starting with 'fem' or 'gir')
  if (
    str === "f" ||
    str === "female" ||
    str === "females" ||
    str === "girl" ||
    str === "girls" ||
    str === "g" ||
    str === "woman" ||
    str === "women" ||
    str === "mahila" ||
    str === "mohila" ||
    str === "meye" ||
    str === "meyera" ||
    str === "nari" ||
    str === "daughter" ||
    str === "kumari" ||
    str === "2" ||
    str === "02" ||
    str.startsWith("fem") ||
    str.startsWith("gir")
  ) {
    return "Female";
  }

  // 2. Male variations
  if (
    str === "m" ||
    str === "male" ||
    str === "males" ||
    str === "boy" ||
    str === "boys" ||
    str === "b" ||
    str === "man" ||
    str === "men" ||
    str === "purush" ||
    str === "puroosh" ||
    str === "chele" ||
    str === "chhele" ||
    str === "son" ||
    str === "kumar" ||
    str === "1" ||
    str === "01" ||
    str.startsWith("mal") ||
    str.startsWith("boy")
  ) {
    return "Male";
  }

  // 3. Transgender / Other
  if (
    str === "t" ||
    str === "trans" ||
    str === "transgender" ||
    str === "tg" ||
    str === "other" ||
    str === "others" ||
    str === "o" ||
    str === "3" ||
    str === "03"
  ) {
    return "Other";
  }

  return "Other";
}

/**
 * Normalizes Social Category (combines OBC-A, OBC-B, OBC A, OBC B into single "OBC" category).
 */
export function normalizeSocialCategory(val: any): string {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (!str) return "";

  const upper = str.toUpperCase().replace(/[\s\-_]/g, "");
  if (upper.startsWith("OBC") || upper.includes("OBC")) {
    return "OBC";
  }
  if (upper === "SC" || upper.startsWith("SCHEDULEDCASTE") || upper.startsWith("SCHEDULCASTE")) {
    return "SC";
  }
  if (upper === "ST" || upper.startsWith("SCHEDULEDTRIBE") || upper.startsWith("SCHEDULTRIBE")) {
    return "ST";
  }
  if (upper === "GEN" || upper.startsWith("GENERAL") || upper === "UNRESERVED" || upper === "UR") {
    return "General";
  }
  return str;
}

/**
 * Normalizes Class into standard Roman/String format.
 */
export function normalizeClass(val: any): string {
  const str = String(val || "").trim().toUpperCase();
  const romanMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
    "CLASS 5": "V", "CLASS 6": "VI", "CLASS 7": "VII", "CLASS 8": "VIII", "CLASS 9": "IX", "CLASS 10": "X", "CLASS 11": "XI", "CLASS 12": "XII",
    "CLASS V": "V", "CLASS VI": "VI", "CLASS VII": "VII", "CLASS VIII": "VIII", "CLASS IX": "IX", "CLASS X": "X", "CLASS XI": "XI", "CLASS XII": "XII",
  };
  return romanMap[str] || str;
}

/**
 * Normalizes Student Status string to valid StudentStatus enum.
 */
export function normalizeStatus(val: any, defaultStatus: StudentStatus = "Continuing"): StudentStatus {
  if (!val) return defaultStatus;
  const str = String(val).trim().toLowerCase();
  if (str.includes("pass") || str.includes("alumni") || str.includes("graduat") || str.includes("completed") || str.includes("archive")) {
    return "Passed Out";
  }
  if (str.includes("drop") || str.includes("left") || str.includes("discontinue")) {
    return "Drop Out";
  }
  if (str.includes("sent up") || str.includes("mp") || str.includes("m.p.")) {
    return "Sent Up M.P.";
  }
  if (str.includes("cchs") || str.includes("c.c.h.s.")) {
    return "C.C.H.S.";
  }
  if (str.includes("continu") || str.includes("active") || str.includes("present") || str.includes("enrolled")) {
    return "Continuing";
  }
  return defaultStatus;
}

/**
 * Transforms raw excel rows into structured student payloads based on mapping.
 */
export function applyMapping(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  defaultSessionYear?: number,
  defaultClass?: string,
  defaultSection?: string,
  defaultStatus?: StudentStatus
): Array<Partial<Student>> {
  const currentYear = new Date().getFullYear();

  return rawRows.map((row) => {
    const student: Partial<Student> = {
      admissionYear: defaultSessionYear || currentYear,
      currentStatus: defaultStatus || "Continuing",
    };

    if (defaultClass && defaultClass !== "AUTO") {
      student.presentClass = normalizeClass(defaultClass);
    }

    if (defaultSection && defaultSection !== "AUTO") {
      student.presentSection = defaultSection.toUpperCase().trim();
    }

    for (const [header, fieldKey] of Object.entries(mapping)) {
      if (fieldKey === "ignore") continue;
      const rawVal = row[header];
      if (rawVal === undefined || rawVal === null || rawVal === "") continue;

      if (fieldKey === "dob") {
        student.dob = normalizeDate(rawVal);
      } else if (fieldKey === "gender") {
        student.gender = normalizeGender(rawVal);
      } else if (fieldKey === "presentClass") {
        student.presentClass = normalizeClass(rawVal);
      } else if (fieldKey === "currentStatus") {
        student.currentStatus = normalizeStatus(rawVal, defaultStatus || "Continuing");
      } else if (fieldKey === "presentRoll") {
        const rollNum = parseInt(String(rawVal).replace(/\D/g, ""), 10);
        student.presentRoll = isNaN(rollNum) ? 1 : rollNum;
      } else if (fieldKey === "admissionYear") {
        const yr = parseInt(String(rawVal).replace(/\D/g, ""), 10);
        student.admissionYear = isNaN(yr) ? new Date().getFullYear() : yr;
      } else if (fieldKey === "academicYear") {
        const strVal = String(rawVal).trim();
        student.academicYear = strVal;
        const yrMatch = strVal.match(/\b(20\d{2})\b/);
        if (yrMatch && !student.admissionYear) {
          student.admissionYear = parseInt(yrMatch[1], 10);
        }
      } else if (fieldKey === "bankIfsc") {
        student.bankIfsc = String(rawVal).trim().toUpperCase();
      } else if (fieldKey === "hasAadhaar") {
        const rawStr = String(rawVal).trim().toLowerCase();
        if (["yes", "y", "true", "1"].includes(rawStr)) {
          student.hasAadhaar = "Yes";
        } else if (["no", "n", "false", "0"].includes(rawStr)) {
          student.hasAadhaar = "No";
          if (!student.aadhaar) student.aadhaar = "";
        } else {
          student.hasAadhaar = String(rawVal).trim();
        }
      } else if (fieldKey === "aadhaar") {
        const rawStr = String(rawVal).trim();
        const digitsOnly = rawStr.replace(/\D/g, "");
        if (digitsOnly.length === 12) {
          student.aadhaar = digitsOnly;
          if (!student.hasAadhaar) student.hasAadhaar = "Yes";
        } else if (["yes", "y", "true", "1"].includes(rawStr.toLowerCase())) {
          student.hasAadhaar = "Yes";
        } else if (["no", "n", "false", "0"].includes(rawStr.toLowerCase())) {
          student.hasAadhaar = "No";
          student.aadhaar = "";
        } else {
          student.aadhaar = digitsOnly || rawStr;
        }
      } else if (fieldKey === "socialCategory") {
        student.socialCategory = normalizeSocialCategory(rawVal);
      } else if (fieldKey === "studentContact" || fieldKey === "altMobile") {
        const str = String(rawVal).trim();
        const digits = str.replace(/\D/g, "");
        if (digits.length >= 7) {
          student[fieldKey] = digits;
        } else if (/[a-zA-Z]/.test(str) && !student.guardianName) {
          // Handle BSP files where column labeled "Guardian Number" contains Guardian Name (e.g. REJAUL LASKAR)
          student.guardianName = str;
        }
      } else if (
        fieldKey === "isBpl" ||
        fieldKey === "isCwsn" ||
        fieldKey === "isAay" ||
        fieldKey === "isEws" ||
        fieldKey === "indianNationality" ||
        fieldKey === "hasDisabilityCertificate" ||
        fieldKey === "isOutOfSchool"
      ) {
        const s = String(rawVal).trim().toLowerCase();
        (student as any)[fieldKey] = ["yes", "y", "true", "1", "t"].includes(s);
      } else if (
        fieldKey === "heightCm" ||
        fieldKey === "weightKg" ||
        fieldKey === "annualFamilyIncome" ||
        fieldKey === "previousRollNo" ||
        fieldKey === "previousMarksPercent"
      ) {
        const num = parseFloat(String(rawVal).replace(/[^\d.]/g, ""));
        (student as any)[fieldKey] = isNaN(num) ? undefined : num;
      } else if (
        fieldKey === "admissionDate" ||
        fieldKey === "presentClassAdmissionDate" ||
        fieldKey === "mainstreamedDate"
      ) {
        (student as any)[fieldKey] = normalizeDate(rawVal);
      } else {
        (student as any)[fieldKey] = String(rawVal).trim();
      }
    }

    return student;
  });
}

/**
 * Client-side validation: checks for in-file duplicates and Class vs DOB mismatches.
 */
export function validateMappedRows(rows: Array<Partial<Student>>): {
  issues: ValidationIssue[];
  previewRows: BulkPreviewRow[];
} {
  const issues: ValidationIssue[] = [];
  const previewRows: BulkPreviewRow[] = [];

  const seenPens = new Map<string, number>();
  const seenAadhaars = new Map<string, number>();
  const seenSchoolIds = new Map<string, number>();

  const currentYear = new Date().getFullYear();

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNum = idx + 2;
    const rowWarnings: string[] = [];
    const rowErrors: string[] = [];

    // 1. Check required Name
    if (!r.name || r.name.trim().length === 0) {
      issues.push({
        row: rowNum,
        field: "name",
        issue: "Student Name is missing",
        severity: "error",
      });
      rowErrors.push("Missing Name");
    }

    // 2. Check DOB & Class-Age plausibility
    if (!r.dob) {
      issues.push({
        row: rowNum,
        field: "dob",
        issue: "Date of Birth is missing",
        severity: "warning",
        studentName: r.name,
      });
      rowWarnings.push("Missing DOB");
    } else {
      const birthYear = new Date(r.dob).getFullYear();
      const age = currentYear - birthYear;

      if (age < 3 || age > 25) {
        issues.push({
          row: rowNum,
          field: "dob",
          issue: `Unusual age calculated (${age} years) from DOB ${r.dob}`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push(`Age ${age} yrs`);
      }

      // Class vs Age sanity check (e.g. Class V should typically be 9-13)
      if (r.presentClass === "V" && age > 15) {
        issues.push({
          row: rowNum,
          field: "presentClass",
          issue: `Class V student has unusually high age (${age} yrs)`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Class/Age mismatch");
      }
    }

    // 3. In-file duplicate checks
    if (r.pen) {
      const cleanPen = r.pen.toUpperCase().trim();
      if (seenPens.has(cleanPen)) {
        issues.push({
          row: rowNum,
          field: "pen",
          issue: `Duplicate PEN "${cleanPen}" (also on row ${seenPens.get(cleanPen)})`,
          severity: "error",
          studentName: r.name,
        });
        rowErrors.push("Duplicate PEN");
      } else {
        seenPens.set(cleanPen, rowNum);
      }
    }

    if (r.aadhaar && r.aadhaar.length === 12) {
      if (seenAadhaars.has(r.aadhaar)) {
        issues.push({
          row: rowNum,
          field: "aadhaar",
          issue: `Duplicate Aadhaar "${r.aadhaar}" (also on row ${seenAadhaars.get(r.aadhaar)})`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Duplicate Aadhaar");
      } else {
        seenAadhaars.set(r.aadhaar, rowNum);
      }
    }

    if (r.schoolId) {
      const cleanSid = r.schoolId.toUpperCase().trim();
      if (seenSchoolIds.has(cleanSid)) {
        issues.push({
          row: rowNum,
          field: "schoolId",
          issue: `Duplicate School ID "${cleanSid}" in file (row ${seenSchoolIds.get(cleanSid)})`,
          severity: "warning",
          studentName: r.name,
        });
        rowWarnings.push("Duplicate School ID");
      } else {
        seenSchoolIds.set(cleanSid, rowNum);
      }
    }

    // Build preview row
    previewRows.push({
      rowNumber: rowNum,
      action:
        r.schoolId || r.pen || (r.aadhaar && r.aadhaar !== "PENDING_RECORD") || r.studentUniqueCode
          ? "update"
          : "create",
      name: r.name || "Unknown",
      schoolId: r.schoolId,
      pen: r.pen,
      aadhaar: r.aadhaar,
      presentClass: r.presentClass || "V",
      presentSection: r.presentSection || "A",
      presentRoll: r.presentRoll || 1,
      data: r,
      warnings: rowWarnings,
      errors: rowErrors,
    });
  }

  return { issues, previewRows };
}

// ---------------------------------------------------------------
//  Result Bulk Upload Parser & Mapping Helpers
// ---------------------------------------------------------------

export interface ResultFieldDefinition {
  key: string;
  label: string;
  category: string;
  icon?: string;
  aliases: string[];
  required?: boolean;
}

export const RESULT_TARGET_FIELDS: ResultFieldDefinition[] = [
  // Student identification
  { key: "schoolId", label: "School ID", category: "Identifier", icon: "🔢", aliases: ["school id", "student id", "school_id", "admission no", "id"] },
  { key: "studentUniqueCode", label: "Student Code (BSP)", category: "Identifier", icon: "🆔", aliases: ["student code", "bsp id", "bsp code", "student unique code", "student_code"] },
  { key: "name", label: "Student Name", category: "Identifier", icon: "👤", aliases: ["student name", "name", "student's name"] },
  { key: "presentClass", label: "Class", category: "Enrolment", icon: "🏫", aliases: ["class", "standard", "grade", "present class"] },
  { key: "presentSection", label: "Section", category: "Enrolment", icon: "🔤", aliases: ["section", "sec", "present section"] },
  { key: "presentRoll", label: "Roll No", category: "Enrolment", icon: "🎯", aliases: ["roll", "roll no", "roll number", "present roll"] },
  
  // Evaluation specifics
  { key: "academicYear", label: "Academic Session / Year", category: "Exam", icon: "🗓️", aliases: ["academic year", "session", "year", "session year", "exam year"], required: true },
  { key: "examName", label: "Evaluation / Exam Name", category: "Exam", icon: "📝", aliases: ["exam name", "evaluation name", "exam", "evaluation", "term", "summative"], required: true },
  { key: "fullMarks", label: "Full Marks", category: "Marks", icon: "💯", aliases: ["full marks", "maximum marks", "max marks", "fm", "total full marks"] },
  { key: "marksObtained", label: "Total Marks Obtained", category: "Marks", icon: "📊", aliases: ["total marks", "marks obtained", "total obtained", "obtained marks", "grand total", "total", "marks"], required: true },
  { key: "percentage", label: "Percentage (%)", category: "Marks", icon: "📈", aliases: ["percentage", "percent", "%", "marks percent"] },
  { key: "grade", label: "Grade", category: "Marks", icon: "🏆", aliases: ["grade", "division", "rank grade"] },
  { key: "remarks", label: "Remarks / Result Status", category: "Marks", icon: "💬", aliases: ["remarks", "remark", "result", "status", "comment"] },

  // Subjects (West Bengal Secondary Board subjects)
  { key: "bengali", label: "Bengali (First Language)", category: "Subjects", icon: "📚", aliases: ["bengali", "first language", "1st language", "ben", "fl"] },
  { key: "english", label: "English (Second Language)", category: "Subjects", icon: "📚", aliases: ["english", "second language", "2nd language", "eng", "sl"] },
  { key: "mathematics", label: "Mathematics", category: "Subjects", icon: "📐", aliases: ["mathematics", "math", "maths", "mat"] },
  { key: "physicalScience", label: "Physical Science", category: "Subjects", icon: "🔬", aliases: ["physical science", "physical sc", "psc", "physics", "phy sc"] },
  { key: "lifeScience", label: "Life Science", category: "Subjects", icon: "🧬", aliases: ["life science", "life sc", "lsc", "biology", "bio sc"] },
  { key: "history", label: "History", category: "Subjects", icon: "📜", aliases: ["history", "hist", "his"] },
  { key: "geography", label: "Geography", category: "Subjects", icon: "🗺️", aliases: ["geography", "geog", "geo"] },
];

export type ResultColumnMapping = Record<string, string>;

export const RESULT_TEMPLATE_PRESETS: Record<string, { name: string; mapping: ResultColumnMapping }> = {
  wbSummative: {
    name: "WB Summative Evaluation Marksheet",
    mapping: {
      "Student Code": "studentUniqueCode",
      "Student Name": "name",
      "Class": "presentClass",
      "Section": "presentSection",
      "Roll No": "presentRoll",
      "Academic Year": "academicYear",
      "Exam Name": "examName",
      "Bengali": "bengali",
      "English": "english",
      "Mathematics": "mathematics",
      "Physical Science": "physicalScience",
      "Life Science": "lifeScience",
      "History": "history",
      "Geography": "geography",
      "Total Marks": "marksObtained",
      "Full Marks": "fullMarks",
    },
  },
  simpleMarks: {
    name: "Simple Total Marks Sheet",
    mapping: {
      "School ID": "schoolId",
      "Student Code": "studentUniqueCode",
      "Student Name": "name",
      "Class": "presentClass",
      "Section": "presentSection",
      "Roll No": "presentRoll",
      "Academic Year": "academicYear",
      "Exam Name": "examName",
      "Marks Obtained": "marksObtained",
      "Full Marks": "fullMarks",
    },
  },
};

/**
 * Auto-suggests column mappings for exam result sheets.
 */
export function autoSuggestResultMapping(headers: string[]): ResultColumnMapping {
  const mapping: ResultColumnMapping = {};

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const PRIORITY_KEYS = [
    "studentUniqueCode",
    "schoolId",
    "presentRoll",
    "presentSection",
    "presentClass",
    "name",
    "academicYear",
    "examName",
    "marksObtained",
    "fullMarks",
    "percentage",
    "grade",
    "remarks",
    "bengali",
    "english",
    "mathematics",
    "physicalScience",
    "lifeScience",
    "history",
    "geography",
  ];

  const fieldMap = new Map<string, ResultFieldDefinition>();
  for (const f of RESULT_TARGET_FIELDS) {
    fieldMap.set(f.key, f);
  }

  for (const rawHeader of headers) {
    const cleanHeader = clean(rawHeader);
    let bestMatch: string = "ignore";

    for (const key of PRIORITY_KEYS) {
      const field = fieldMap.get(key);
      if (!field) continue;

      const matched = field.aliases.some((alias) => {
        const cleanAlias = clean(alias);
        return (
          cleanHeader === cleanAlias ||
          cleanHeader.startsWith(cleanAlias + " ") ||
          cleanHeader.endsWith(" " + cleanAlias) ||
          cleanHeader === cleanAlias.replace(/\s+/g, "")
        );
      });

      if (matched) {
        bestMatch = key;
        break;
      }
    }

    if (bestMatch === "ignore") {
      for (const key of PRIORITY_KEYS) {
        const field = fieldMap.get(key);
        if (!field) continue;

        if (field.aliases.some((alias) => cleanHeader.includes(clean(alias)))) {
          bestMatch = key;
          break;
        }
      }
    }

    mapping[rawHeader] = bestMatch;
  }

  return mapping;
}

/**
 * Transforms raw result excel rows into structured BulkResultRow objects.
 */
export function applyResultMapping(
  rawRows: Record<string, any>[],
  mapping: ResultColumnMapping | ColumnMapping,
  defaultSessionYear?: number,
  defaultExamName?: string
): BulkResultRow[] {
  const currentYear = new Date().getFullYear();

  return rawRows.map((row) => {
    const result: Partial<BulkResultRow> = {
      academicYear: defaultSessionYear || currentYear,
      examName: defaultExamName || "1st Summative Evaluation",
      subjectMarks: {},
    };

    let subjectSum = 0;
    let hasSubjectMarks = false;

    for (const [header, fieldKey] of Object.entries(mapping)) {
      const field = String(fieldKey);
      if (field === "ignore") continue;
      const rawVal = row[header];
      if (rawVal === undefined || rawVal === null || rawVal === "") continue;

      const strVal = String(rawVal).trim();

      if (field === "academicYear") {
        const num = parseInt(strVal.replace(/\D/g, ""), 10);
        result.academicYear = isNaN(num) ? (defaultSessionYear || currentYear) : num;
      } else if (field === "examName") {
        result.examName = strVal;
      } else if (field === "marksObtained") {
        const num = parseFloat(strVal);
        result.marksObtained = isNaN(num) ? 0 : num;
      } else if (field === "fullMarks") {
        const num = parseFloat(strVal);
        result.fullMarks = isNaN(num) ? undefined : num;
      } else if (field === "percentage") {
        const num = parseFloat(strVal);
        result.percentage = isNaN(num) ? undefined : num;
      } else if (field === "presentRoll") {
        const rollNum = parseInt(strVal.replace(/\D/g, ""), 10);
        result.presentRoll = isNaN(rollNum) ? 1 : rollNum;
      } else if (field === "presentClass") {
        result.presentClass = normalizeClass(strVal);
      } else if (
        ["bengali", "english", "mathematics", "physicalScience", "lifeScience", "history", "geography"].includes(
          field
        )
      ) {
        const mark = parseFloat(strVal);
        if (!isNaN(mark)) {
          const capitalized = field.charAt(0).toUpperCase() + field.slice(1);
          result.subjectMarks![capitalized] = mark;
          subjectSum += mark;
          hasSubjectMarks = true;
        }
      } else {
        (result as any)[field] = strVal;
      }
    }

    // Auto calculate marksObtained from subjects if not explicitly set
    if (result.marksObtained === undefined && hasSubjectMarks) {
      result.marksObtained = subjectSum;
    }

    if (result.marksObtained === undefined) {
      result.marksObtained = 0;
    }

    // Calculate percentage if fullMarks exists
    if (result.fullMarks && result.fullMarks > 0 && result.percentage === undefined) {
      result.percentage = Number(((result.marksObtained / result.fullMarks) * 100).toFixed(2));
    }

    return result as BulkResultRow;
  });
}

/**
 * Validates result spreadsheet rows before importing.
 */
export function validateResultRows(rows: BulkResultRow[]): {
  issues: ValidationIssue[];
  previewRows: Array<{
    rowNumber: number;
    name: string;
    schoolId?: string;
    studentUniqueCode?: string;
    class?: string;
    section?: string;
    roll?: number;
    academicYear: number;
    examName: string;
    marksObtained: number;
    fullMarks?: number;
    percentage?: number;
    warnings: string[];
    errors: string[];
  }>;
} {
  const issues: ValidationIssue[] = [];
  const previewRows: any[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNum = idx + 2;
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check student identifier
    if (!r.schoolId && !r.studentUniqueCode && (!r.presentClass || !r.presentSection || !r.presentRoll)) {
      issues.push({
        row: rowNum,
        field: "schoolId",
        issue: "Row has no identifier (Must provide School ID, BSP Code, or Class+Sec+Roll)",
        severity: "error",
      });
      errors.push("Missing Identifier");
    }

    // Check Exam Name & Year
    if (!r.academicYear) {
      issues.push({
        row: rowNum,
        field: "academicYear",
        issue: "Academic Year is required",
        severity: "error",
      });
      errors.push("Missing Year");
    }

    if (!r.examName) {
      issues.push({
        row: rowNum,
        field: "examName",
        issue: "Exam Name is required",
        severity: "error",
      });
      errors.push("Missing Exam Name");
    }

    // Check Marks
    if (r.marksObtained === undefined || isNaN(r.marksObtained) || r.marksObtained < 0) {
      issues.push({
        row: rowNum,
        field: "marksObtained",
        issue: "Invalid marks obtained value",
        severity: "error",
      });
      errors.push("Invalid Marks");
    } else if (r.fullMarks && r.marksObtained > r.fullMarks) {
      issues.push({
        row: rowNum,
        field: "marksObtained",
        issue: `Marks obtained (${r.marksObtained}) exceeds full marks (${r.fullMarks})`,
        severity: "warning",
      });
      warnings.push("Marks > Full Marks");
    }

    previewRows.push({
      rowNumber: rowNum,
      name: r.name || "Student",
      schoolId: r.schoolId,
      studentUniqueCode: r.studentUniqueCode,
      class: r.presentClass,
      section: r.presentSection,
      roll: r.presentRoll,
      academicYear: r.academicYear,
      examName: r.examName,
      marksObtained: r.marksObtained,
      fullMarks: r.fullMarks,
      percentage: r.percentage,
      warnings,
      errors,
    });
  }

  return { issues, previewRows };
}
