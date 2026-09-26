import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Student, StudentFilters, PaginatedStudents, StudentStatus } from "@/lib/types";
import { compareStudentsByClassAndRoll } from "@/lib/utils";
import { applyStudentEntryDefaults } from "@/lib/utils/student-entry-presets";

// DB Row shape (snake_case)
export interface DBStudent {
  id: string;
  school_id: string;
  name: string;
  photo_url?: string | null;
  pen: string | null;
  aadhaar: string | null;
  mobile: string | null;
  dob: string;
  gender: "Male" | "Female" | "Other";
  social_category: string | null;
  caste_certificate_no?: string | null;
  religion: string | null;
  father_name: string;
  mother_name: string;
  address: string | null;
  present_class: string;
  present_section: string;
  present_roll: number;
  current_status: StudentStatus;
  admission_year: number;
  admission_date: string | null;
  previous_school: string | null;
  created_at: string;
  updated_at: string;
  academic_history?: DBAcademicHistory[];

  // --- NEW COLUMNS ---
  // A. General / Personal Details
  student_name_bengali?: string | null;
  father_name_bengali?: string | null;
  mother_name_bengali?: string | null;
  guardian_name: string | null;
  name_as_per_aadhaar: string | null;
  pincode: string | null;
  gram_panchayat?: string | null;
  block?: string | null;
  alt_mobile: string | null;
  email: string | null;
  mother_tongue: string | null;
  minority_group: string | null;
  is_aay: boolean;
  is_ews: boolean;
  bpl_status?: string | null;
  bpl_no?: string | null;
  is_cwsn: boolean;
  impairment_type: string | null;
  has_disability_certificate: boolean;
  disability_certificate_no?: string | null;
  disability_percentage: number | null;
  sld_type: string | null;
  indian_nationality: boolean;
  is_out_of_school: boolean;
  mainstreamed_date: string | null;
  blood_group: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  student_unique_code: string | null;
  kanyashree_id?: string | null;
  dise_code: string | null;
  health_id: string | null;
  annual_family_income: number | null;
  birth_registration_no: string | null;
  identification_mark: string | null;
  relationship_with_guardian: string | null;
  guardian_occupation?: string | null;
  guardian_qualification: string | null;
  father_occupation?: string | null;
  mother_occupation?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_ifsc: string | null;
  bank_account_no: string | null;

  // B. Enrolment Details
  admission_no: string | null;
  admission_type: string | null;
  academic_year: string | null;
  medium_of_instruction: string | null;
  present_class_admission_date: string | null;
  board_registration_no?: string | null;
  board_roll_no?: string | null;
  bengali_marks?: number | null;
  english_marks?: number | null;
  math_marks?: number | null;
  life_sci_marks?: number | null;
  phy_sci_marks?: number | null;
  history_marks?: number | null;
  geo_marks?: number | null;
  total_madhyamik_marks?: number | null;
  percentage_madhyamik?: number | null;
  language_group: string[] | null;
  foreign_language: string | null;
  mandatory_subjects: string[] | null;
  additional_subjects: string[] | null;
  co_curricular_subjects: string[] | null;
  academic_stream: string | null;
  previous_status: string | null;
  previous_class: string | null;
  previous_section: string | null;
  previous_stream: string | null;
  previous_roll_no: number | null;
  previous_appeared_for_exams: boolean;
  previous_result: string | null;
  previous_marks_percent: number | null;
  previous_days_attended: number | null;
  rte_section_12c: boolean;
  rte_amount_claimed: number | null;

  // C. Facility Profile
  facilities_provided: string[] | null;
  cwsn_facilities: string[] | null;
  competitions_olympiads: string[] | null;
  ncc: boolean;
  nss: boolean;
  scouts_guides: boolean;
  distance_to_school: number | null;
  highest_education_parents: string | null;

  // D. Re-admission & Invoice Queue
  re_admission_status?: string | null;
  re_admitted_at?: string | null;
  re_admitted_session?: string | null;
  is_invoice_queued?: boolean | null;
  invoice_printed_at?: string | null;

  // E. Semester & Status Lifecycle
  present_semester?: "Sem 1" | "Sem 2" | "Sem 3" | "Sem 4" | null;
  detention_count?: number | null;
  tc_issued?: boolean | null;
  tc_date?: string | null;
  tc_reason?: string | null;
}

export interface DBAcademicHistory {
  id: string;
  student_id: string;
  year: number;
  class: string;
  section: string;
  roll: number;
  status: StudentStatus;
  semester?: "Sem 1" | "Sem 2" | "Sem 3" | "Sem 4" | null;
  detention_count?: number | null;
  created_at: string;
}

// Generate deterministic public photo URL from Supabase Storage
export function getStudentPhotoUrl(id: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${supabaseUrl}/storage/v1/object/public/student-photos/${id}.webp`;
}

// Convert DB Student row to Frontend Student interface
export function mapDBStudentToStudent(db: DBStudent): Student {
  return {
    id: db.id,
    schoolId: db.school_id,
    name: db.name,
    photoUrl: db.photo_url || getStudentPhotoUrl(db.id),
    pen: db.pen || undefined,
    hasAadhaar: db.aadhaar && db.aadhaar !== "PENDING_RECORD" ? "Yes" : "No",
    aadhaar: db.aadhaar || undefined,
    dob: db.dob,
    gender: db.gender,
    socialCategory: db.social_category || undefined,
    casteCertificateNo: db.caste_certificate_no || undefined,
    religion: db.religion || undefined,
    fatherName: db.father_name,
    fatherOccupation: (db as any).father_occupation || undefined,
    motherName: db.mother_name,
    motherOccupation: (db as any).mother_occupation || undefined,
    studentContact: db.mobile || undefined,
    address: db.address || undefined,
    presentClass: db.present_class,
    presentSection: db.present_section,
    presentRoll: db.present_roll,
    currentStatus: db.current_status,
    admissionYear: db.admission_year,
    admissionDate: db.admission_date || undefined,
    previousSchool: db.previous_school || undefined,
    academicHistory: db.academic_history
      ? db.academic_history.map((h) => ({
          year: h.year,
          class: h.class,
          section: h.section,
          roll: h.roll,
          status: h.status,
          semester: (h as any).semester || undefined,
          detentionCount: (h as any).detention_count != null ? Number((h as any).detention_count) : undefined,
        }))
      : [],

    // --- NEW FIELDS ---
    // A. General / Personal Info
    studentNameBengali: (db as any).student_name_bengali || undefined,
    fatherNameBengali: (db as any).father_name_bengali || undefined,
    motherNameBengali: (db as any).mother_name_bengali || undefined,
    guardianName: db.guardian_name || undefined,
    nameAsPerAadhaar: db.name_as_per_aadhaar || undefined,
    pincode: db.pincode || undefined,
    gramPanchayat: (db as any).gram_panchayat || undefined,
    block: (db as any).block || undefined,
    altMobile: db.alt_mobile || undefined,
    email: db.email || undefined,
    motherTongue: db.mother_tongue || undefined,
    minorityGroup: db.minority_group || undefined,
    isAay: db.is_aay,
    isEws: db.is_ews,
    bplStatus: (db as any).bpl_status || undefined,
    bplNo: (db as any).bpl_no || undefined,
    isCwsn: db.is_cwsn,
    impairmentType: db.impairment_type || undefined,
    hasDisabilityCertificate: db.has_disability_certificate,
    disabilityCertificateNo: (db as any).disability_certificate_no || undefined,
    disabilityPercentage: db.disability_percentage != null ? Number(db.disability_percentage) : undefined,
    sldType: db.sld_type || undefined,
    indianNationality: db.indian_nationality,
    isOutOfSchool: db.is_out_of_school,
    mainstreamedDate: db.mainstreamed_date || undefined,
    bloodGroup: db.blood_group || undefined,
    weightKg: db.weight_kg != null ? Number(db.weight_kg) : undefined,
    heightCm: db.height_cm != null ? Number(db.height_cm) : undefined,
    studentUniqueCode: db.student_unique_code || undefined,
    kanyashreeId: db.kanyashree_id || undefined,
    diseCode: db.dise_code || undefined,
    healthId: db.health_id || undefined,
    annualFamilyIncome: db.annual_family_income != null ? Number(db.annual_family_income) : undefined,
    birthRegistrationNo: db.birth_registration_no || undefined,
    identificationMark: db.identification_mark || undefined,
    relationshipWithGuardian: db.relationship_with_guardian || undefined,
    guardianOccupation: (db as any).guardian_occupation || (db.relationship_with_guardian?.toLowerCase() === "father" ? (db as any).father_occupation : db.relationship_with_guardian?.toLowerCase() === "mother" ? (db as any).mother_occupation : undefined) || undefined,
    guardianQualification: db.guardian_qualification || undefined,
    bankName: (db as any).bank_name || undefined,
    bankBranch: (db as any).bank_branch || undefined,
    bankIfsc: db.bank_ifsc || undefined,
    bankAccountNo: db.bank_account_no || undefined,

    // B. Enrolment Info
    admissionNo: db.admission_no || undefined,
    admissionType: db.admission_type || undefined,
    academicYear: db.academic_year || undefined,
    presentSemester: (db as any).present_semester || undefined,
    detentionCount: (db as any).detention_count != null ? Number((db as any).detention_count) : undefined,
    tcIssued: (db as any).tc_issued != null ? Boolean((db as any).tc_issued) : undefined,
    tcDate: (db as any).tc_date || undefined,
    tcReason: (db as any).tc_reason || undefined,
    mediumOfInstruction: db.medium_of_instruction || "Bengali",
    presentClassAdmissionDate: db.present_class_admission_date || undefined,
    boardRegistrationNo: db.board_registration_no || (db as any).board_reg_no || undefined,
    boardRollNo: db.board_roll_no || undefined,
    bengaliMarks: (db as any).bengali_marks != null ? Number((db as any).bengali_marks) : undefined,
    englishMarks: (db as any).english_marks != null ? Number((db as any).english_marks) : undefined,
    mathMarks: (db as any).math_marks != null ? Number((db as any).math_marks) : undefined,
    lifeSciMarks: (db as any).life_sci_marks != null ? Number((db as any).life_sci_marks) : undefined,
    phySciMarks: (db as any).phy_sci_marks != null ? Number((db as any).phy_sci_marks) : undefined,
    historyMarks: (db as any).history_marks != null ? Number((db as any).history_marks) : undefined,
    geoMarks: (db as any).geo_marks != null ? Number((db as any).geo_marks) : undefined,
    totalMadhyamikMarks: (db as any).total_madhyamik_marks != null ? Number((db as any).total_madhyamik_marks) : undefined,
    percentageMadhyamik: (db as any).percentage_madhyamik != null ? Number((db as any).percentage_madhyamik) : undefined,
    languageGroup: db.language_group || [],
    foreignLanguage: db.foreign_language || undefined,
    mandatorySubjects: db.mandatory_subjects || [],
    additionalSubjects: db.additional_subjects || [],
    coCurricularSubjects: db.co_curricular_subjects || [],
    academicStream: db.academic_stream || undefined,
    previousStatus: db.previous_status || undefined,
    previousClass: db.previous_class || undefined,
    previousSection: db.previous_section || undefined,
    previousStream: db.previous_stream || undefined,
    previousRollNo: db.previous_roll_no != null ? Number(db.previous_roll_no) : undefined,
    previousAppearedForExams: db.previous_appeared_for_exams,
    previousResult: db.previous_result || undefined,
    previousMarksPercent: db.previous_marks_percent != null ? Number(db.previous_marks_percent) : undefined,
    previousDaysAttended: db.previous_days_attended != null ? Number(db.previous_days_attended) : undefined,
    rteSection12C: db.rte_section_12c,
    rteAmountClaimed: db.rte_amount_claimed != null ? Number(db.rte_amount_claimed) : undefined,

    // C. Facility Profile
    facilitiesProvided: db.facilities_provided || [],
    cwsnFacilities: db.cwsn_facilities || [],
    competitionsOlympiads: db.competitions_olympiads || [],
    ncc: db.ncc,
    nss: db.nss,
    scoutsGuides: db.scouts_guides,
    distanceToSchool: db.distance_to_school != null ? Number(db.distance_to_school) : undefined,
    highestEducationParents: db.highest_education_parents || undefined,

    // D. Re-admission & Invoice Queue
    reAdmissionStatus: (db as any).re_admission_status || undefined,
    reAdmittedAt: (db as any).re_admitted_at || undefined,
    reAdmittedSession: (db as any).re_admitted_session || undefined,
    isInvoiceQueued: (db as any).is_invoice_queued !== undefined ? Boolean((db as any).is_invoice_queued) : undefined,
    invoicePrintedAt: (db as any).invoice_printed_at || undefined,
    createdAt: db.created_at || undefined,
    updatedAt: db.updated_at || undefined,
  };
}

const toNullableDate = (val: any) => (val && typeof val === "string" && val.trim() !== "" ? val.trim() : null);
const toNullableString = (val: any) => (val && typeof val === "string" && val.trim() !== "" ? val.trim() : null);
const toNullableNumber = (val: any) => (val !== undefined && val !== null && val !== "" && !Number.isNaN(Number(val)) ? Number(val) : null);

// Map Frontend input properties to Database snake_case columns
export function mapStudentToDBInput(student: Omit<Student, "id" | "academicHistory">): Omit<DBStudent, "id" | "created_at" | "updated_at"> {
  return {
    school_id: student.schoolId,
    name: student.name,
    photo_url: toNullableString(student.photoUrl),
    pen: toNullableString(student.pen),
    aadhaar: toNullableString(student.aadhaar),
    mobile: toNullableString(student.studentContact),
    dob: student.dob,
    gender: student.gender,
    social_category: toNullableString(student.socialCategory),
    caste_certificate_no: toNullableString(student.casteCertificateNo),
    religion: toNullableString(student.religion),
    father_name: student.fatherName,
    father_occupation: toNullableString(student.fatherOccupation),
    mother_name: student.motherName,
    mother_occupation: toNullableString(student.motherOccupation),
    address: toNullableString(student.address),
    present_class: student.presentClass,
    present_section: student.presentSection,
    present_roll: student.presentRoll,
    current_status: student.currentStatus,
    admission_year: student.admissionYear,
    admission_date: toNullableDate(student.admissionDate),
    previous_school: toNullableString(student.previousSchool),

    // --- NEW FIELDS ---
    // A. General / Personal Info
    student_name_bengali: toNullableString(student.studentNameBengali),
    father_name_bengali: toNullableString(student.fatherNameBengali),
    mother_name_bengali: toNullableString(student.motherNameBengali),
    guardian_name: toNullableString(student.guardianName),
    name_as_per_aadhaar: toNullableString(student.nameAsPerAadhaar),
    pincode: toNullableString(student.pincode),
    gram_panchayat: toNullableString(student.gramPanchayat),
    block: toNullableString(student.block),
    alt_mobile: toNullableString(student.altMobile),
    email: toNullableString(student.email),
    mother_tongue: toNullableString(student.motherTongue),
    minority_group: toNullableString(student.minorityGroup),
    is_aay: !!student.isAay,
    is_ews: !!student.isEws,
    bpl_status: toNullableString(student.bplStatus),
    bpl_no: toNullableString(student.bplNo),
    is_cwsn: !!student.isCwsn,
    impairment_type: toNullableString(student.impairmentType),
    has_disability_certificate: !!student.hasDisabilityCertificate,
    disability_certificate_no: toNullableString(student.disabilityCertificateNo),
    disability_percentage: toNullableNumber(student.disabilityPercentage),
    sld_type: toNullableString(student.sldType),
    indian_nationality: student.indianNationality !== false, // default true
    is_out_of_school: !!student.isOutOfSchool,
    mainstreamed_date: toNullableDate(student.mainstreamedDate),
    blood_group: toNullableString(student.bloodGroup),
    weight_kg: toNullableNumber(student.weightKg),
    height_cm: toNullableNumber(student.heightCm),
    student_unique_code: toNullableString(student.studentUniqueCode),
    kanyashree_id: toNullableString(student.kanyashreeId),
    dise_code: toNullableString(student.diseCode),
    health_id: toNullableString(student.healthId),
    annual_family_income: toNullableNumber(student.annualFamilyIncome),
    birth_registration_no: toNullableString(student.birthRegistrationNo),
    identification_mark: toNullableString(student.identificationMark),
    relationship_with_guardian: toNullableString(student.relationshipWithGuardian),
    guardian_occupation: toNullableString(student.guardianOccupation),
    guardian_qualification: toNullableString(student.guardianQualification),
    bank_name: toNullableString(student.bankName),
    bank_branch: toNullableString(student.bankBranch),
    bank_ifsc: toNullableString(student.bankIfsc),
    bank_account_no: toNullableString(student.bankAccountNo),

    // B. Enrolment Info
    admission_no: toNullableString(student.admissionNo),
    admission_type: toNullableString(student.admissionType),
    academic_year: toNullableString(student.academicYear),
    present_semester: (student.presentSemester as "Sem 1" | "Sem 2" | "Sem 3" | "Sem 4") || null,
    detention_count: toNullableNumber(student.detentionCount),
    tc_issued: student.tcIssued !== undefined ? !!student.tcIssued : false,
    tc_date: toNullableDate(student.tcDate),
    tc_reason: toNullableString(student.tcReason),
    medium_of_instruction: toNullableString(student.mediumOfInstruction),
    present_class_admission_date: toNullableDate(student.presentClassAdmissionDate),
    board_registration_no: toNullableString(student.boardRegistrationNo),
    board_roll_no: toNullableString(student.boardRollNo),
    bengali_marks: toNullableNumber(student.bengaliMarks),
    english_marks: toNullableNumber(student.englishMarks),
    math_marks: toNullableNumber(student.mathMarks),
    life_sci_marks: toNullableNumber(student.lifeSciMarks),
    phy_sci_marks: toNullableNumber(student.phySciMarks),
    history_marks: toNullableNumber(student.historyMarks),
    geo_marks: toNullableNumber(student.geoMarks),
    total_madhyamik_marks: toNullableNumber(student.totalMadhyamikMarks),
    percentage_madhyamik: toNullableNumber(student.percentageMadhyamik),
    language_group: student.languageGroup || [],
    foreign_language: toNullableString(student.foreignLanguage),
    mandatory_subjects: student.mandatorySubjects || [],
    additional_subjects: student.additionalSubjects || [],
    co_curricular_subjects: student.coCurricularSubjects || [],
    academic_stream: toNullableString(student.academicStream),
    previous_status: toNullableString(student.previousStatus),
    previous_class: toNullableString(student.previousClass),
    previous_section: toNullableString(student.previousSection),
    previous_stream: toNullableString(student.previousStream),
    previous_roll_no: toNullableNumber(student.previousRollNo),
    previous_appeared_for_exams: !!student.previousAppearedForExams,
    previous_result: toNullableString(student.previousResult),
    previous_marks_percent: toNullableNumber(student.previousMarksPercent),
    previous_days_attended: toNullableNumber(student.previousDaysAttended),
    rte_section_12c: !!student.rteSection12C,
    rte_amount_claimed: toNullableNumber(student.rteAmountClaimed),

    // C. Facility Profile
    facilities_provided: student.facilitiesProvided || [],
    cwsn_facilities: student.cwsnFacilities || [],
    competitions_olympiads: student.competitionsOlympiads || [],
    ncc: !!student.ncc,
    nss: !!student.nss,
    scouts_guides: !!student.scoutsGuides,
    distance_to_school: toNullableNumber(student.distanceToSchool),
    highest_education_parents: toNullableString(student.highestEducationParents),

    // D. Re-admission & Invoice Queue Status
    re_admission_status: toNullableString((student as any).reAdmissionStatus),
    re_admitted_at: toNullableString((student as any).reAdmittedAt),
    re_admitted_session: toNullableString((student as any).reAdmittedSession),
    is_invoice_queued: (student as any).isInvoiceQueued !== undefined ? !!(student as any).isInvoiceQueued : undefined,
    invoice_printed_at: toNullableString((student as any).invoicePrintedAt),
  };
}

// Mask Aadhaar if user is not Admin (e.g. staff or public)
export function maskAadhaar(aadhaar?: string): string | undefined {
  if (!aadhaar) return undefined;
  const cleaned = aadhaar.replace(/\s+/g, "").replace(/-/g, "");
  if (cleaned.length !== 12) return "••••-••••-••••";
  return `••••-••••-${cleaned.slice(8)}`;
}

export const STUDENT_SUMMARY_COLUMNS = [
  "id",
  "school_id",
  "name",
  "dob",
  "gender",
  "social_category",
  "caste_certificate_no",
  "religion",
  "father_name",
  "father_occupation",
  "mother_name",
  "mother_occupation",
  "guardian_name",
  "relationship_with_guardian",
  "guardian_occupation",
  "guardian_qualification",
  "mobile",
  "alt_mobile",
  "email",
  "address",
  "pincode",
  "present_class",
  "present_section",
  "present_roll",
  "current_status",
  "admission_year",
  "admission_date",
  "admission_no",
  "admission_type",
  "academic_year",
  "medium_of_instruction",
  "present_class_admission_date",
  "board_registration_no",
  "board_roll_no",
  "pen",
  "aadhaar",
  "name_as_per_aadhaar",
  "student_unique_code",
  "kanyashree_id",
  "photo_url",
  "dise_code",
  "health_id",
  "birth_registration_no",
  "identification_mark",
  "is_cwsn",
  "impairment_type",
  "has_disability_certificate",
  "disability_percentage",
  "sld_type",
  "is_aay",
  "is_ews",
  "indian_nationality",
  "is_out_of_school",
  "mainstreamed_date",
  "blood_group",
  "height_cm",
  "weight_kg",
  "annual_family_income",
  "mother_tongue",
  "minority_group",
  "previous_school",
  "previous_class",
  "previous_section",
  "previous_stream",
  "previous_roll_no",
  "previous_status",
  "previous_marks_percent",
  "bank_account_no",
  "bank_ifsc",
  "academic_stream",
  "language_group",
  "foreign_language",
  "mandatory_subjects",
  "additional_subjects",
  "co_curricular_subjects",
  "facilities_provided",
  "cwsn_facilities",
  "competitions_olympiads",
  "ncc",
  "nss",
  "scouts_guides",
  "distance_to_school",
  "highest_education_parents",
  "re_admission_status",
  "re_admitted_session",
  "is_invoice_queued",
  "re_admitted_at",
  "invoice_printed_at",
  "present_semester",
  "detention_count",
  "tc_issued",
  "tc_date",
  "tc_reason",
  "created_at",
  "updated_at",
].join(",");

// GET all students (with auto-pagination to handle full dataset)
export async function dbGetStudents(
  projection: "summary" | "full" = "summary",
  studentClass?: string,
  section?: string
): Promise<Student[]> {
  const supabase = await createServerClient();
  const PAGE_SIZE = 1000;
  let allRows: DBStudent[] = [];
  let from = 0;
  let hasMore = true;
  const selectQuery = projection === "full" ? "*, academic_history(*)" : STUDENT_SUMMARY_COLUMNS;

  while (hasMore) {
    let query = supabase
      .from("students")
      .select(selectQuery as any)
      .range(from, from + PAGE_SIZE - 1);

    if (studentClass && studentClass !== "all") {
      query = query.eq("present_class", studentClass);
    }
    if (section && section !== "all") {
      query = query.eq("present_section", section);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    if (data && data.length > 0) {
      allRows = allRows.concat(data as unknown as DBStudent[]);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  const students = allRows.map(mapDBStudentToStudent);
  return students.sort(compareStudentsByClassAndRoll);
}

// GET student by ID
export async function dbGetStudentById(id: string): Promise<Student | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("students")
    .select("*, academic_history(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  
  // Sort academic history by year descending
  const student = mapDBStudentToStudent(data as DBStudent);
  student.academicHistory.sort((a, b) => b.year - a.year);
  return student;
}

// SEARCH students (filtered + paginated)
export async function dbSearchStudents(
  filters: StudentFilters = {},
  page = 1,
  pageSize = 20,
  userRole?: string,
  projection: "summary" | "full" = "summary"
): Promise<PaginatedStudents> {
  const supabase = await createServerClient();
  const selectQuery = projection === "full" ? "*, academic_history(*)" : STUDENT_SUMMARY_COLUMNS;
  let query = supabase.from("students").select(selectQuery as any, { count: "exact" });

  // 1. Text Search
  if (filters.query && filters.query.trim() !== "") {
    const q = filters.query.trim();
    const searchFields = [
      `name.ilike.%${q}%`,
      `school_id.ilike.%${q}%`,
      `pen.ilike.%${q}%`,
      `father_name.ilike.%${q}%`,
      `mother_name.ilike.%${q}%`,
      `student_unique_code.ilike.%${q}%`,
      `admission_no.ilike.%${q}%`,
    ];
    const parsedNum = parseInt(q, 10);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      searchFields.push(`present_roll.eq.${parsedNum}`);
    }
    // Only Admin accounts are permitted to query by full Aadhaar
    if (userRole === "Admin") {
      searchFields.push(`aadhaar.ilike.%${q}%`);
    }
    query = query.or(searchFields.join(","));
  }

  // 2. Dropdown filters
  if (filters.class) {
    const cls = filters.class.trim();
    if (cls === "IX" || cls === "9") {
      query = query.in("present_class", ["IX", "9", "Class IX", "Class 9"]);
    } else if (cls === "XI" || cls === "11") {
      query = query.in("present_class", ["XI", "11", "Class XI", "Class 11"]);
    } else if (cls === "V" || cls === "5") {
      query = query.in("present_class", ["V", "5", "Class V", "Class 5"]);
    } else if (cls === "VI" || cls === "6") {
      query = query.in("present_class", ["VI", "6", "Class VI", "Class 6"]);
    } else if (cls === "VII" || cls === "7") {
      query = query.in("present_class", ["VII", "7", "Class VII", "Class 7"]);
    } else if (cls === "VIII" || cls === "8") {
      query = query.in("present_class", ["VIII", "8", "Class VIII", "Class 8"]);
    } else if (cls === "X" || cls === "10") {
      query = query.in("present_class", ["X", "10", "Class X", "Class 10"]);
    } else if (cls === "XII" || cls === "12") {
      query = query.in("present_class", ["XII", "12", "Class XII", "Class 12"]);
    } else {
      query = query.ilike("present_class", cls);
    }
  }
  if (filters.section) {
    query = query.ilike("present_section", filters.section);
  }
  if (filters.studentType === "active") {
    if (filters.status) {
      query = query.ilike("current_status", filters.status);
    } else {
      // Active enrolled students on academic rosters
      query = query.in("current_status", ["Continuing", "New Admission", "Suspended"]);
    }
  } else if (filters.studentType === "old") {
    if (filters.status) {
      query = query.ilike("current_status", filters.status);
    } else {
      // Archived / departed students
      query = query.in("current_status", ["Passed Out", "Drop Out", "TC Out"]);
    }
  } else if (filters.studentType === "pending") {
    if (filters.status) {
      query = query.ilike("current_status", filters.status);
    } else {
      // Pending re-admission / promotion candidates
      query = query.in("current_status", [
        "Promoted But Not Admitted",
        "Detained",
        "Supplementary",
        "Compartmental",
        "Not Admitted",
        "Sent Up M.P.",
        "10th test fail",
        "exam fail - C.C",
        "C.C.H.S.",
      ]);
    }
  } else if (filters.status) {
    query = query.ilike("current_status", filters.status);
  }
  if (filters.semester) {
    query = query.ilike("present_semester", filters.semester);
  }
  if (filters.admissionYear) {
    query = query.eq("admission_year", filters.admissionYear);
  }
  if (filters.gender) {
    query = query.ilike("gender", filters.gender);
  }
  if (filters.socialCategory) {
    if (filters.socialCategory === "OBC") {
      query = query.or("social_category.eq.OBC,social_category.ilike.%OBC%");
    } else {
      query = query.ilike("social_category", filters.socialCategory);
    }
  }
  if (filters.scheme) {
    if (filters.scheme === "kanyashree" || filters.scheme === "kanyashree_k1" || filters.scheme === "kanyashree_k2") {
      query = query.eq("gender", "Female");
      const today = new Date();
      if (filters.scheme === "kanyashree_k1") {
        // Age 13 to 17.99: born on or before (today - 13y) and after (today - 18y)
        const date18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split("T")[0];
        const date13YearsAgo = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate()).toISOString().split("T")[0];
        query = query.lte("dob", date13YearsAgo).gt("dob", date18YearsAgo);
      } else if (filters.scheme === "kanyashree_k2") {
        // Age 18+: born on or before (today - 18y)
        const date18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split("T")[0];
        query = query.lte("dob", date18YearsAgo);
      } else if (filters.scheme === "kanyashree") {
        // All eligible females (Age 13+)
        const date13YearsAgo = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate()).toISOString().split("T")[0];
        query = query.lte("dob", date13YearsAgo);
      }
    } else if (filters.scheme === "sikshashree" || filters.scheme === "shikshashree") {
      query = query.in("social_category", ["SC", "ST"]).in("present_class", ["V", "VI", "VII", "VIII", "5", "6", "7", "8"]);
    } else if (filters.scheme === "oasis_pre") {
      query = query.or("social_category.in.(SC,ST),social_category.ilike.%OBC%").in("present_class", ["IX", "X", "9", "10"]);
    } else if (filters.scheme === "oasis_post") {
      query = query.or("social_category.in.(SC,ST),social_category.ilike.%OBC%").in("present_class", ["XI", "XII", "11", "12"]);
    } else if (filters.scheme === "oasis") {
      query = query.or("social_category.in.(SC,ST),social_category.ilike.%OBC%").in("present_class", ["IX", "X", "XI", "XII", "9", "10", "11", "12"]);
    } else if (filters.scheme === "nsp_pre") {
      query = query.or("religion.ilike.%muslim%,religion.ilike.%islam%,minority_group.ilike.%muslim%,minority_group.ilike.%islam%").in("present_class", ["IX", "X", "9", "10"]);
    } else if (filters.scheme === "nsp_post") {
      query = query.or("religion.ilike.%muslim%,religion.ilike.%islam%,minority_group.ilike.%muslim%,minority_group.ilike.%islam%").in("present_class", ["XI", "XII", "11", "12"]);
    } else if (filters.scheme === "nsp") {
      query = query.or("religion.ilike.%muslim%,religion.ilike.%islam%,minority_group.ilike.%muslim%,minority_group.ilike.%islam%").in("present_class", ["IX", "X", "XI", "XII", "9", "10", "11", "12"]);
    } else if (filters.scheme === "svmcm") {
      query = query.or("religion.ilike.%muslim%,religion.ilike.%islam%,minority_group.ilike.%muslim%,minority_group.ilike.%islam%").in("present_class", ["XI", "XII", "11", "12"]);
    } else if (filters.scheme === "sabooj_sathi" || filters.scheme === "sabooj_sarathi" as any) {
      query = query.in("present_class", ["IX", "X", "XI", "XII", "9", "10", "11", "12"]);
    } else if (filters.scheme === "cwsn") {
      query = query.eq("is_cwsn", true);
    }
  }

  // 3. Aadhaar Status filter (Yes / No)
  if (filters.hasAadhaar) {
    if (filters.hasAadhaar === "yes") {
      query = query.not("aadhaar", "is", null).neq("aadhaar", "");
    } else if (filters.hasAadhaar === "no") {
      query = query.or("aadhaar.is.null,aadhaar.eq.");
    }
  }

  // 4. Age Slab filter
  if (filters.ageSlab) {
    const today = new Date();
    const getDateYrsAgo = (yrs: number) => {
      const d = new Date(today.getFullYear() - yrs, today.getMonth(), today.getDate());
      return d.toISOString().split("T")[0];
    };

    const slab = filters.ageSlab.trim().toLowerCase();
    if (slab === "below_10") {
      query = query.gt("dob", getDateYrsAgo(10));
    } else if (slab === "20_above") {
      query = query.lte("dob", getDateYrsAgo(20));
    } else {
      const parts = slab.split("_").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const minAge = Math.min(parts[0], parts[1]);
        const maxAge = Math.max(parts[0], parts[1]);
        query = query.lte("dob", getDateYrsAgo(minAge)).gt("dob", getDateYrsAgo(maxAge));
      }
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Apply SQL ordering and range pagination directly on Postgres
  query = query
    .order("present_class", { ascending: true })
    .order("present_section", { ascending: true })
    .order("present_roll", { ascending: true, nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const students = (((data as unknown as DBStudent[])) || []).map(mapDBStudentToStudent);
  students.sort(compareStudentsByClassAndRoll);

  const total = count ?? students.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data: students,
    meta: {
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}

import { generateSchoolId } from "@/lib/supabase/school-id-generator";

// CREATE student
export async function dbCreateStudent(input: Omit<Student, "id" | "academicHistory">): Promise<Student> {
  const supabase = createAdminClient();
  const defaultedInput = applyStudentEntryDefaults(input);
  const dbInput = mapStudentToDBInput(defaultedInput);

  // If school_id is missing, generate it
  if (!dbInput.school_id || dbInput.school_id.trim() === "") {
    dbInput.school_id = await generateSchoolId(
      input.admissionYear || new Date().getFullYear(),
      input.presentClass || "V",
      input.presentSection || "A",
      input.presentRoll,
      input.admissionNo || "01"
    );
  }

  // Attempt insert with auto-retry up to 3 times on concurrent conflict
  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("students")
      .insert(dbInput)
      .select()
      .single();

    if (!error && data) {
      return mapDBStudentToStudent(data as DBStudent);
    }

    lastError = error;
    // If schema cache indicates optional columns are not yet in remote DB, strip and retry
    if (error && (
      error.message.includes("father_occupation") ||
      error.message.includes("mother_occupation") ||
      error.message.includes("guardian_occupation") ||
      error.message.includes("board_registration_no") ||
      error.message.includes("board_roll_no") ||
      error.message.includes("kanyashree_id") ||
      error.message.includes("caste_certificate_no")
    )) {
      delete (dbInput as any).father_occupation;
      delete (dbInput as any).mother_occupation;
      delete (dbInput as any).guardian_occupation;
      delete (dbInput as any).board_registration_no;
      delete (dbInput as any).board_roll_no;
      delete (dbInput as any).kanyashree_id;
      delete (dbInput as any).caste_certificate_no;
      continue;
    }
    // If unique constraint violation on school_id (code 23505), regenerate and retry
    if (error && (error.code === "23505" || error.message.includes("school_id"))) {
      const fallbackReg = input.admissionNo ? `${input.admissionNo}-${attempt + 1}` : `${attempt + 2}`;
      dbInput.school_id = await generateSchoolId(
        input.admissionYear || new Date().getFullYear(),
        input.presentClass || "V",
        input.presentSection || "A",
        input.presentRoll,
        fallbackReg
      );
      continue;
    }
    break;
  }

  throw new Error(lastError?.message || "Failed to create student");
}

// UPDATE student
export async function dbUpdateStudent(
  id: string,
  updates: Partial<Omit<Student, "id">>
): Promise<Student | null> {
  const supabase = createAdminClient();
  
  // Map frontend update fields to database fields
  const dbUpdates: any = {};
  dbUpdates.updated_at = new Date().toISOString();
  if (updates.schoolId !== undefined && typeof updates.schoolId === "string" && updates.schoolId.trim() !== "") {
    dbUpdates.school_id = updates.schoolId.trim();
  }
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = toNullableString(updates.photoUrl);
  if (updates.pen !== undefined) dbUpdates.pen = toNullableString(updates.pen);
  if (updates.aadhaar !== undefined) dbUpdates.aadhaar = toNullableString(updates.aadhaar);
  if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.socialCategory !== undefined) dbUpdates.social_category = toNullableString(updates.socialCategory);
  if (updates.casteCertificateNo !== undefined) dbUpdates.caste_certificate_no = toNullableString(updates.casteCertificateNo);
  if (updates.religion !== undefined) dbUpdates.religion = toNullableString(updates.religion);
  if (updates.fatherName !== undefined) dbUpdates.father_name = updates.fatherName;
  if (updates.fatherOccupation !== undefined) dbUpdates.father_occupation = toNullableString(updates.fatherOccupation);
  if (updates.motherName !== undefined) dbUpdates.mother_name = updates.motherName;
  if (updates.motherOccupation !== undefined) dbUpdates.mother_occupation = toNullableString(updates.motherOccupation);
  if (updates.studentContact !== undefined) dbUpdates.mobile = toNullableString(updates.studentContact);
  if (updates.address !== undefined) dbUpdates.address = toNullableString(updates.address);
  if (updates.presentClass !== undefined) dbUpdates.present_class = updates.presentClass;
  if (updates.presentSection !== undefined) dbUpdates.present_section = updates.presentSection;
  if (updates.presentRoll !== undefined) dbUpdates.present_roll = Number(updates.presentRoll);
  if (updates.currentStatus !== undefined) dbUpdates.current_status = updates.currentStatus;
  if (updates.admissionYear !== undefined) dbUpdates.admission_year = updates.admissionYear ? Number(updates.admissionYear) : null;
  if (updates.admissionDate !== undefined) dbUpdates.admission_date = toNullableDate(updates.admissionDate);
  if (updates.previousSchool !== undefined) dbUpdates.previous_school = toNullableString(updates.previousSchool);

  // --- NEW FIELDS ---
  if (updates.studentNameBengali !== undefined) dbUpdates.student_name_bengali = toNullableString(updates.studentNameBengali);
  if (updates.fatherNameBengali !== undefined) dbUpdates.father_name_bengali = toNullableString(updates.fatherNameBengali);
  if (updates.motherNameBengali !== undefined) dbUpdates.mother_name_bengali = toNullableString(updates.motherNameBengali);
  if (updates.guardianName !== undefined) dbUpdates.guardian_name = toNullableString(updates.guardianName);
  if (updates.nameAsPerAadhaar !== undefined) dbUpdates.name_as_per_aadhaar = toNullableString(updates.nameAsPerAadhaar);
  if (updates.pincode !== undefined) dbUpdates.pincode = toNullableString(updates.pincode);
  if (updates.gramPanchayat !== undefined) dbUpdates.gram_panchayat = toNullableString(updates.gramPanchayat);
  if (updates.block !== undefined) dbUpdates.block = toNullableString(updates.block);
  if (updates.altMobile !== undefined) dbUpdates.alt_mobile = toNullableString(updates.altMobile);
  if (updates.email !== undefined) dbUpdates.email = toNullableString(updates.email);
  if (updates.motherTongue !== undefined) dbUpdates.mother_tongue = toNullableString(updates.motherTongue);
  if (updates.minorityGroup !== undefined) dbUpdates.minority_group = toNullableString(updates.minorityGroup);
  if (updates.isAay !== undefined) dbUpdates.is_aay = !!updates.isAay;
  if (updates.isEws !== undefined) dbUpdates.is_ews = !!updates.isEws;
  if (updates.bplStatus !== undefined) dbUpdates.bpl_status = toNullableString(updates.bplStatus);
  if (updates.bplNo !== undefined) dbUpdates.bpl_no = toNullableString(updates.bplNo);
  if (updates.isCwsn !== undefined) dbUpdates.is_cwsn = !!updates.isCwsn;
  if (updates.impairmentType !== undefined) dbUpdates.impairment_type = toNullableString(updates.impairmentType);
  if (updates.hasDisabilityCertificate !== undefined) dbUpdates.has_disability_certificate = !!updates.hasDisabilityCertificate;
  if (updates.disabilityCertificateNo !== undefined) dbUpdates.disability_certificate_no = toNullableString(updates.disabilityCertificateNo);
  if (updates.disabilityPercentage !== undefined) dbUpdates.disability_percentage = toNullableNumber(updates.disabilityPercentage);
  if (updates.sldType !== undefined) dbUpdates.sld_type = toNullableString(updates.sldType);
  if (updates.indianNationality !== undefined) dbUpdates.indian_nationality = updates.indianNationality !== false;
  if (updates.isOutOfSchool !== undefined) dbUpdates.is_out_of_school = !!updates.isOutOfSchool;
  if (updates.mainstreamedDate !== undefined) dbUpdates.mainstreamed_date = toNullableDate(updates.mainstreamedDate);
  if (updates.bloodGroup !== undefined) dbUpdates.blood_group = toNullableString(updates.bloodGroup);
  if (updates.weightKg !== undefined) dbUpdates.weight_kg = toNullableNumber(updates.weightKg);
  if (updates.heightCm !== undefined) dbUpdates.height_cm = toNullableNumber(updates.heightCm);
  if (updates.studentUniqueCode !== undefined) dbUpdates.student_unique_code = toNullableString(updates.studentUniqueCode);
  if (updates.kanyashreeId !== undefined) dbUpdates.kanyashree_id = toNullableString(updates.kanyashreeId);
  if (updates.diseCode !== undefined) dbUpdates.dise_code = toNullableString(updates.diseCode);
  if (updates.healthId !== undefined) dbUpdates.health_id = toNullableString(updates.healthId);
  if (updates.annualFamilyIncome !== undefined) dbUpdates.annual_family_income = toNullableNumber(updates.annualFamilyIncome);
  if (updates.birthRegistrationNo !== undefined) dbUpdates.birth_registration_no = toNullableString(updates.birthRegistrationNo);
  if (updates.identificationMark !== undefined) dbUpdates.identification_mark = toNullableString(updates.identificationMark);
  if (updates.relationshipWithGuardian !== undefined) dbUpdates.relationship_with_guardian = toNullableString(updates.relationshipWithGuardian);
  if (updates.guardianOccupation !== undefined) dbUpdates.guardian_occupation = toNullableString(updates.guardianOccupation);
  if (updates.guardianQualification !== undefined) dbUpdates.guardian_qualification = toNullableString(updates.guardianQualification);
  if (updates.bankName !== undefined) dbUpdates.bank_name = toNullableString(updates.bankName);
  if (updates.bankBranch !== undefined) dbUpdates.bank_branch = toNullableString(updates.bankBranch);
  if (updates.bankIfsc !== undefined) dbUpdates.bank_ifsc = toNullableString(updates.bankIfsc);
  if (updates.bankAccountNo !== undefined) dbUpdates.bank_account_no = toNullableString(updates.bankAccountNo);

  if (updates.admissionNo !== undefined) dbUpdates.admission_no = toNullableString(updates.admissionNo);
  if (updates.admissionType !== undefined) dbUpdates.admission_type = toNullableString(updates.admissionType);
  if (updates.academicYear !== undefined) dbUpdates.academic_year = toNullableString(updates.academicYear);
  if (updates.presentSemester !== undefined) dbUpdates.present_semester = toNullableString(updates.presentSemester);
  if (updates.detentionCount !== undefined) dbUpdates.detention_count = toNullableNumber(updates.detentionCount);
  if (updates.tcIssued !== undefined) dbUpdates.tc_issued = !!updates.tcIssued;
  if (updates.tcDate !== undefined) dbUpdates.tc_date = toNullableDate(updates.tcDate);
  if (updates.tcReason !== undefined) dbUpdates.tc_reason = toNullableString(updates.tcReason);
  if (updates.mediumOfInstruction !== undefined) dbUpdates.medium_of_instruction = toNullableString(updates.mediumOfInstruction);
  if (updates.presentClassAdmissionDate !== undefined) dbUpdates.present_class_admission_date = toNullableDate(updates.presentClassAdmissionDate);
  if (updates.boardRegistrationNo !== undefined || (updates as any).wbbseRegNo !== undefined || (updates as any).wbchseRegNo !== undefined) {
    dbUpdates.board_registration_no = toNullableString(updates.boardRegistrationNo ?? (updates as any).wbbseRegNo ?? (updates as any).wbchseRegNo);
  }
  if (updates.boardRollNo !== undefined || (updates as any).wbbseRollNo !== undefined || (updates as any).wbchseRollNo !== undefined) {
    dbUpdates.board_roll_no = toNullableString(updates.boardRollNo ?? (updates as any).wbbseRollNo ?? (updates as any).wbchseRollNo);
  }
  if (updates.bengaliMarks !== undefined) dbUpdates.bengali_marks = toNullableNumber(updates.bengaliMarks);
  if (updates.englishMarks !== undefined) dbUpdates.english_marks = toNullableNumber(updates.englishMarks);
  if (updates.mathMarks !== undefined) dbUpdates.math_marks = toNullableNumber(updates.mathMarks);
  if (updates.lifeSciMarks !== undefined) dbUpdates.life_sci_marks = toNullableNumber(updates.lifeSciMarks);
  if (updates.phySciMarks !== undefined) dbUpdates.phy_sci_marks = toNullableNumber(updates.phySciMarks);
  if (updates.historyMarks !== undefined) dbUpdates.history_marks = toNullableNumber(updates.historyMarks);
  if (updates.geoMarks !== undefined) dbUpdates.geo_marks = toNullableNumber(updates.geoMarks);
  if (updates.totalMadhyamikMarks !== undefined) dbUpdates.total_madhyamik_marks = toNullableNumber(updates.totalMadhyamikMarks);
  if (updates.percentageMadhyamik !== undefined) dbUpdates.percentage_madhyamik = toNullableNumber(updates.percentageMadhyamik);
  if (updates.languageGroup !== undefined) dbUpdates.language_group = updates.languageGroup || [];
  if (updates.foreignLanguage !== undefined) dbUpdates.foreign_language = toNullableString(updates.foreignLanguage);
  if (updates.mandatorySubjects !== undefined) dbUpdates.mandatory_subjects = updates.mandatorySubjects || [];
  if (updates.additionalSubjects !== undefined) dbUpdates.additional_subjects = updates.additionalSubjects || [];
  if (updates.coCurricularSubjects !== undefined) dbUpdates.co_curricular_subjects = updates.coCurricularSubjects || [];
  if (updates.academicStream !== undefined) dbUpdates.academic_stream = toNullableString(updates.academicStream);
  if (updates.previousStatus !== undefined) dbUpdates.previous_status = toNullableString(updates.previousStatus);
  if (updates.previousClass !== undefined) dbUpdates.previous_class = toNullableString(updates.previousClass);
  if (updates.previousSection !== undefined) dbUpdates.previous_section = toNullableString(updates.previousSection);
  if (updates.previousStream !== undefined) dbUpdates.previous_stream = toNullableString(updates.previousStream);
  if (updates.previousRollNo !== undefined) dbUpdates.previous_roll_no = toNullableNumber(updates.previousRollNo);
  if (updates.previousAppearedForExams !== undefined) dbUpdates.previous_appeared_for_exams = !!updates.previousAppearedForExams;
  if (updates.previousResult !== undefined) dbUpdates.previous_result = toNullableString(updates.previousResult);
  if (updates.previousMarksPercent !== undefined) dbUpdates.previous_marks_percent = toNullableNumber(updates.previousMarksPercent);
  if (updates.previousDaysAttended !== undefined) dbUpdates.previous_days_attended = toNullableNumber(updates.previousDaysAttended);
  if (updates.rteSection12C !== undefined) dbUpdates.rte_section_12c = !!updates.rteSection12C;
  if (updates.rteAmountClaimed !== undefined) dbUpdates.rte_amount_claimed = toNullableNumber(updates.rteAmountClaimed);

  if (updates.facilitiesProvided !== undefined) dbUpdates.facilities_provided = updates.facilitiesProvided || [];
  if (updates.cwsnFacilities !== undefined) dbUpdates.cwsn_facilities = updates.cwsnFacilities || [];
  if (updates.competitionsOlympiads !== undefined) dbUpdates.competitions_olympiads = updates.competitionsOlympiads || [];
  if (updates.ncc !== undefined) dbUpdates.ncc = !!updates.ncc;
  if (updates.nss !== undefined) dbUpdates.nss = !!updates.nss;
  if (updates.scoutsGuides !== undefined) dbUpdates.scouts_guides = !!updates.scoutsGuides;
  if (updates.distanceToSchool !== undefined) dbUpdates.distance_to_school = toNullableNumber(updates.distanceToSchool);
  if (updates.highestEducationParents !== undefined) dbUpdates.highest_education_parents = toNullableString(updates.highestEducationParents);

  // Persist Academic History entries if supplied
  if (updates.academicHistory && Array.isArray(updates.academicHistory)) {
    for (const entry of updates.academicHistory) {
      const { data: existingHist } = await supabase
        .from("academic_history")
        .select("id")
        .eq("student_id", id)
        .eq("year", entry.year)
        .maybeSingle();

      if (existingHist) {
        await supabase
          .from("academic_history")
          .update({
            class: entry.class,
            section: entry.section,
            roll: entry.roll,
            status: entry.status,
            semester: toNullableString(entry.semester),
            detention_count: toNullableNumber(entry.detentionCount),
          })
          .eq("id", existingHist.id);
      } else {
        await supabase.from("academic_history").insert({
          student_id: id,
          year: entry.year,
          class: entry.class,
          section: entry.section,
          roll: entry.roll,
          status: entry.status,
          semester: toNullableString(entry.semester),
          detention_count: toNullableNumber(entry.detentionCount),
        });
      }
    }
  }

  let { data, error } = await supabase
    .from("students")
    .update(dbUpdates)
    .eq("id", id)
    .select("*, academic_history(*)")
    .maybeSingle();

  // Gracefully fallback if optional columns are not yet added to remote database
  if (error && (
    error.message.includes("father_occupation") ||
    error.message.includes("mother_occupation") ||
    error.message.includes("guardian_occupation") ||
    error.message.includes("board_registration_no") ||
    error.message.includes("board_roll_no") ||
    error.message.includes("kanyashree_id") ||
    error.message.includes("caste_certificate_no") ||
    error.message.includes("present_semester") ||
    error.message.includes("detention_count") ||
    error.message.includes("tc_issued") ||
    error.message.includes("tc_date") ||
    error.message.includes("tc_reason")
  )) {
    delete dbUpdates.father_occupation;
    delete dbUpdates.mother_occupation;
    delete dbUpdates.guardian_occupation;
    delete dbUpdates.board_registration_no;
    delete dbUpdates.board_roll_no;
    delete dbUpdates.kanyashree_id;
    delete dbUpdates.caste_certificate_no;
    delete dbUpdates.present_semester;
    delete dbUpdates.detention_count;
    delete dbUpdates.tc_issued;
    delete dbUpdates.tc_date;
    delete dbUpdates.tc_reason;
    const retry = await supabase
      .from("students")
      .update(dbUpdates)
      .eq("id", id)
      .select("*, academic_history(*)")
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("dbUpdateStudent database error:", error);
    throw new Error(error.message);
  }
  return data ? mapDBStudentToStudent(data as DBStudent) : null;
}

// DELETE student
export async function dbDeleteStudent(id: string): Promise<boolean> {
  const admin = createAdminClient();
  // Clean up any dependent child tables to prevent foreign key constraint violations
  await admin.from("academic_history").delete().eq("student_id", id);
  await admin.from("student_results").delete().eq("student_id", id);
  const { error } = await admin.from("students").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export interface OldStudentSummary {
  id: string;
  name: string;
  schoolId?: string;
  pen?: string;
  studentClass: string;
  section: string;
  roll: number;
  gender: string;
  exitYear: number;
  status: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  contact?: string;
  dob?: string;
}

export async function dbGetOldStudentYears(): Promise<number[]> {
  const currentYear = new Date().getFullYear();
  try {
    const supabase = await createServerClient();
    const { data: historyYears } = await supabase
      .from("academic_history")
      .select("year, status")
      .in("status", ["Passed Out", "Drop Out", "TC Out"]);

    const set = new Set<number>();
    (historyYears || []).forEach((h) => {
      if (h.year) set.add(Number(h.year));
    });

    if (set.size === 0) {
      for (let y = currentYear - 1; y >= currentYear - 5; y--) {
        set.add(y);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  } catch (err) {
    console.error("Error in dbGetOldStudentYears:", err);
    return [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
  }
}

export async function dbGetOldStudentsByYear(params: {
  year: number;
  query?: string;
  studentClass?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: OldStudentSummary[]; total: number }> {
  const { year, query = "", studentClass, page = 1, pageSize = 20 } = params;
  try {
    const supabase = await createServerClient();

    let dbQuery = supabase
      .from("students")
      .select(
        "id, name, school_id, pen, present_class, present_section, present_roll, gender, father_name, mother_name, guardian_name, mobile, dob, current_status, admission_year, tc_issued, tc_date, tc_reason",
        { count: "exact" }
      )
      .in("current_status", ["Passed Out", "Drop Out", "TC Out"]);

    if (query.trim()) {
      const q = query.trim();
      dbQuery = dbQuery.or(
        `name.ilike.%${q}%,school_id.ilike.%${q}%,pen.ilike.%${q}%,father_name.ilike.%${q}%`
      );
    }

    if (studentClass && studentClass !== "ALL") {
      dbQuery = dbQuery.ilike("present_class", studentClass);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    dbQuery = dbQuery
      .range(from, to)
      .order("present_class", { ascending: true })
      .order("present_roll", { ascending: true });

    const { data, count, error } = await dbQuery;

    if (error) {
      console.warn("Error fetching old students:", error);
      return { data: [], total: 0 };
    }

    const mapped: OldStudentSummary[] = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      schoolId: s.school_id,
      pen: s.pen,
      studentClass: s.present_class || "X",
      section: s.present_section || "A",
      roll: s.present_roll || 1,
      gender: s.gender || "Male",
      exitYear: year,
      status: s.current_status || "Passed Out",
      fatherName: s.father_name,
      motherName: s.mother_name,
      guardianName: s.guardian_name,
      contact: s.mobile || s.student_contact,
      dob: s.dob,
    }));

    return {
      data: mapped,
      total: count || 0,
    };
  } catch (err) {
    console.error("Error in dbGetOldStudentsByYear:", err);
    return { data: [], total: 0 };
  }
}

