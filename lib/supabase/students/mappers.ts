import type { Student, StudentStatus } from "@/lib/types";

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

export const toNullableDate = (val: any) => (val && typeof val === "string" && val.trim() !== "" ? val.trim() : null);
export const toNullableString = (val: any) => (val && typeof val === "string" && val.trim() !== "" ? val.trim() : null);
export const toNullableNumber = (val: any) => (val !== undefined && val !== null && val !== "" && !Number.isNaN(Number(val)) ? Number(val) : null);

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
