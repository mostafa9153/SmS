import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Student, StudentFilters, PaginatedStudents, StudentStatus } from "@/lib/types";
import { compareStudentsByClassAndRoll } from "@/lib/utils";

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
  guardian_name: string | null;
  name_as_per_aadhaar: string | null;
  pincode: string | null;
  alt_mobile: string | null;
  email: string | null;
  mother_tongue: string | null;
  minority_group: string | null;
  is_bpl: boolean;
  is_aay: boolean;
  is_ews: boolean;
  is_cwsn: boolean;
  impairment_type: string | null;
  has_disability_certificate: boolean;
  disability_percentage: number | null;
  sld_type: string | null;
  indian_nationality: boolean;
  is_out_of_school: boolean;
  mainstreamed_date: string | null;
  blood_group: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  student_unique_code: string | null;
  dise_code: string | null;
  health_id: string | null;
  annual_family_income: number | null;
  birth_registration_no: string | null;
  identification_mark: string | null;
  relationship_with_guardian: string | null;
  guardian_qualification: string | null;
  bank_ifsc: string | null;
  bank_account_no: string | null;

  // B. Enrolment Details
  admission_no: string | null;
  admission_type: string | null;
  academic_year: string | null;
  medium_of_instruction: string | null;
  present_class_admission_date: string | null;
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
}

export interface DBAcademicHistory {
  id: string;
  student_id: string;
  year: number;
  class: string;
  section: string;
  roll: number;
  status: StudentStatus;
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
    religion: db.religion || undefined,
    fatherName: db.father_name,
    motherName: db.mother_name,
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
        }))
      : [],

    // --- NEW FIELDS ---
    // A. General / Personal Info
    guardianName: db.guardian_name || undefined,
    nameAsPerAadhaar: db.name_as_per_aadhaar || undefined,
    pincode: db.pincode || undefined,
    altMobile: db.alt_mobile || undefined,
    email: db.email || undefined,
    motherTongue: db.mother_tongue || undefined,
    minorityGroup: db.minority_group || undefined,
    isBpl: db.is_bpl,
    isAay: db.is_aay,
    isEws: db.is_ews,
    isCwsn: db.is_cwsn,
    impairmentType: db.impairment_type || undefined,
    hasDisabilityCertificate: db.has_disability_certificate,
    disabilityPercentage: db.disability_percentage != null ? Number(db.disability_percentage) : undefined,
    sldType: db.sld_type || undefined,
    indianNationality: db.indian_nationality,
    isOutOfSchool: db.is_out_of_school,
    mainstreamedDate: db.mainstreamed_date || undefined,
    bloodGroup: db.blood_group || undefined,
    weightKg: db.weight_kg != null ? Number(db.weight_kg) : undefined,
    heightCm: db.height_cm != null ? Number(db.height_cm) : undefined,
    studentUniqueCode: db.student_unique_code || undefined,
    diseCode: db.dise_code || undefined,
    healthId: db.health_id || undefined,
    annualFamilyIncome: db.annual_family_income != null ? Number(db.annual_family_income) : undefined,
    birthRegistrationNo: db.birth_registration_no || undefined,
    identificationMark: db.identification_mark || undefined,
    relationshipWithGuardian: db.relationship_with_guardian || undefined,
    guardianQualification: db.guardian_qualification || undefined,
    bankIfsc: db.bank_ifsc || undefined,
    bankAccountNo: db.bank_account_no || undefined,

    // B. Enrolment Info
    admissionNo: db.admission_no || undefined,
    admissionType: db.admission_type || undefined,
    academicYear: db.academic_year || undefined,
    mediumOfInstruction: db.medium_of_instruction || undefined,
    presentClassAdmissionDate: db.present_class_admission_date || undefined,
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
    religion: toNullableString(student.religion),
    father_name: student.fatherName,
    mother_name: student.motherName,
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
    guardian_name: toNullableString(student.guardianName),
    name_as_per_aadhaar: toNullableString(student.nameAsPerAadhaar),
    pincode: toNullableString(student.pincode),
    alt_mobile: toNullableString(student.altMobile),
    email: toNullableString(student.email),
    mother_tongue: toNullableString(student.motherTongue),
    minority_group: toNullableString(student.minorityGroup),
    is_bpl: !!student.isBpl,
    is_aay: !!student.isAay,
    is_ews: !!student.isEws,
    is_cwsn: !!student.isCwsn,
    impairment_type: toNullableString(student.impairmentType),
    has_disability_certificate: !!student.hasDisabilityCertificate,
    disability_percentage: toNullableNumber(student.disabilityPercentage),
    sld_type: toNullableString(student.sldType),
    indian_nationality: student.indianNationality !== false, // default true
    is_out_of_school: !!student.isOutOfSchool,
    mainstreamed_date: toNullableDate(student.mainstreamedDate),
    blood_group: toNullableString(student.bloodGroup),
    weight_kg: toNullableNumber(student.weightKg),
    height_cm: toNullableNumber(student.heightCm),
    student_unique_code: toNullableString(student.studentUniqueCode),
    dise_code: toNullableString(student.diseCode),
    health_id: toNullableString(student.healthId),
    annual_family_income: toNullableNumber(student.annualFamilyIncome),
    birth_registration_no: toNullableString(student.birthRegistrationNo),
    identification_mark: toNullableString(student.identificationMark),
    relationship_with_guardian: toNullableString(student.relationshipWithGuardian),
    guardian_qualification: toNullableString(student.guardianQualification),
    bank_ifsc: toNullableString(student.bankIfsc),
    bank_account_no: toNullableString(student.bankAccountNo),

    // B. Enrolment Info
    admission_no: toNullableString(student.admissionNo),
    admission_type: toNullableString(student.admissionType),
    academic_year: toNullableString(student.academicYear),
    medium_of_instruction: toNullableString(student.mediumOfInstruction),
    present_class_admission_date: toNullableDate(student.presentClassAdmissionDate),
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
  };
}

// Mask Aadhaar if user is not Admin (e.g. staff or public)
export function maskAadhaar(aadhaar?: string): string | undefined {
  if (!aadhaar) return undefined;
  const cleaned = aadhaar.replace(/\s+/g, "").replace(/-/g, "");
  if (cleaned.length !== 12) return "••••-••••-••••";
  return `••••-••••-${cleaned.slice(8)}`;
}

// GET all students (with auto-pagination to handle full dataset)
export async function dbGetStudents(): Promise<Student[]> {
  const supabase = await createServerClient();
  const PAGE_SIZE = 1000;
  let allRows: DBStudent[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("students")
      .select("*, academic_history(*)")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    if (data && data.length > 0) {
      allRows = allRows.concat(data as DBStudent[]);
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
  userRole?: string
): Promise<PaginatedStudents> {
  const supabase = await createServerClient();
  let query = supabase.from("students").select("*, academic_history(*)", { count: "exact" });

  // 1. Text Search
  if (filters.query && filters.query.trim() !== "") {
    const q = filters.query.trim();
    const searchFields = [
      `name.ilike.%${q}%`,
      `father_name.ilike.%${q}%`,
      `mother_name.ilike.%${q}%`,
      `school_id.ilike.%${q}%`,
      `pen.ilike.%${q}%`,
      `student_unique_code.ilike.%${q}%`,
      `admission_no.ilike.%${q}%`,
    ];
    // Only Admin accounts are permitted to query by full Aadhaar
    if (userRole === "Admin") {
      searchFields.push(`aadhaar.ilike.%${q}%`);
    }
    query = query.or(searchFields.join(","));
  }

  // 2. Dropdown filters
  if (filters.class) {
    query = query.eq("present_class", filters.class);
  }
  if (filters.section) {
    query = query.eq("present_section", filters.section);
  }
  if (filters.status) {
    query = query.eq("current_status", filters.status);
  }
  if (filters.admissionYear) {
    query = query.eq("admission_year", filters.admissionYear);
  }
  if (filters.gender) {
    query = query.eq("gender", filters.gender);
  }
  if (filters.socialCategory) {
    if (filters.socialCategory === "OBC") {
      query = query.or("social_category.eq.OBC,social_category.ilike.%OBC%");
    } else {
      query = query.eq("social_category", filters.socialCategory);
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
    } else if (filters.scheme === "aikyashree") {
      query = query.or(
        "religion.ilike.%muslim%,religion.ilike.%islam%,religion.ilike.%christian%,religion.ilike.%buddhist%,religion.ilike.%sikh%,religion.ilike.%jain%,religion.ilike.%parsi%,minority_group.ilike.%muslim%,minority_group.ilike.%islam%,minority_group.ilike.%christian%,minority_group.ilike.%buddhist%,minority_group.ilike.%sikh%,minority_group.ilike.%jain%,minority_group.ilike.%parsi%"
      );
    } else if (filters.scheme === "sikshashree" || filters.scheme === "shikshashree") {
      query = query.in("social_category", ["SC", "ST"]).in("present_class", ["V", "VI", "VII", "VIII", "5", "6", "7", "8"]);
    } else if (filters.scheme === "medhashree") {
      query = query.or("social_category.eq.OBC,social_category.ilike.%OBC%").in("present_class", ["V", "VI", "VII", "VIII", "5", "6", "7", "8"]);
    } else if (filters.scheme === "oasis_pre") {
      query = query.in("social_category", ["SC", "ST"]).in("present_class", ["IX", "X", "9", "10"]);
    } else if (filters.scheme === "oasis_post") {
      query = query.or("social_category.in.(SC,ST),social_category.ilike.%OBC%").in("present_class", ["XI", "XII", "11", "12"]);
    } else if (filters.scheme === "oasis") {
      query = query.or("social_category.in.(SC,ST),social_category.ilike.%OBC%").in("present_class", ["IX", "X", "XI", "XII", "9", "10", "11", "12"]);
    } else if (filters.scheme === "svmcm") {
      query = query.in("present_class", ["XI", "XII", "11", "12"]);
    } else if (filters.scheme === "taruner_swapno") {
      query = query.in("present_class", ["XI", "XII", "11", "12"]);
    } else if (filters.scheme === "sabooj_sathi" || filters.scheme === "sabooj_sarathi" as any) {
      query = query.in("present_class", ["IX", "X", "XI", "XII", "9", "10", "11", "12"]);
    } else if (filters.scheme === "cwsn") {
      query = query.eq("is_cwsn", true);
    } else if (filters.scheme === "bpl") {
      query = query.eq("is_bpl", true);
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

  const students = ((data as DBStudent[]) || []).map(mapDBStudentToStudent);
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
  const dbInput = mapStudentToDBInput(input);

  // If school_id is missing, generate it
  if (!dbInput.school_id || dbInput.school_id.trim() === "") {
    dbInput.school_id = await generateSchoolId(
      input.admissionYear || new Date().getFullYear(),
      input.presentClass || "V",
      input.presentSection || "A"
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
    // If unique constraint violation on school_id (code 23505), regenerate and retry
    if (error && (error.code === "23505" || error.message.includes("school_id"))) {
      dbInput.school_id = await generateSchoolId(
        input.admissionYear || new Date().getFullYear(),
        input.presentClass || "V",
        input.presentSection || "A"
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
  if (updates.religion !== undefined) dbUpdates.religion = toNullableString(updates.religion);
  if (updates.fatherName !== undefined) dbUpdates.father_name = updates.fatherName;
  if (updates.motherName !== undefined) dbUpdates.mother_name = updates.motherName;
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
  if (updates.guardianName !== undefined) dbUpdates.guardian_name = toNullableString(updates.guardianName);
  if (updates.nameAsPerAadhaar !== undefined) dbUpdates.name_as_per_aadhaar = toNullableString(updates.nameAsPerAadhaar);
  if (updates.pincode !== undefined) dbUpdates.pincode = toNullableString(updates.pincode);
  if (updates.altMobile !== undefined) dbUpdates.alt_mobile = toNullableString(updates.altMobile);
  if (updates.email !== undefined) dbUpdates.email = toNullableString(updates.email);
  if (updates.motherTongue !== undefined) dbUpdates.mother_tongue = toNullableString(updates.motherTongue);
  if (updates.minorityGroup !== undefined) dbUpdates.minority_group = toNullableString(updates.minorityGroup);
  if (updates.isBpl !== undefined) dbUpdates.is_bpl = !!updates.isBpl;
  if (updates.isAay !== undefined) dbUpdates.is_aay = !!updates.isAay;
  if (updates.isEws !== undefined) dbUpdates.is_ews = !!updates.isEws;
  if (updates.isCwsn !== undefined) dbUpdates.is_cwsn = !!updates.isCwsn;
  if (updates.impairmentType !== undefined) dbUpdates.impairment_type = toNullableString(updates.impairmentType);
  if (updates.hasDisabilityCertificate !== undefined) dbUpdates.has_disability_certificate = !!updates.hasDisabilityCertificate;
  if (updates.disabilityPercentage !== undefined) dbUpdates.disability_percentage = toNullableNumber(updates.disabilityPercentage);
  if (updates.sldType !== undefined) dbUpdates.sld_type = toNullableString(updates.sldType);
  if (updates.indianNationality !== undefined) dbUpdates.indian_nationality = updates.indianNationality !== false;
  if (updates.isOutOfSchool !== undefined) dbUpdates.is_out_of_school = !!updates.isOutOfSchool;
  if (updates.mainstreamedDate !== undefined) dbUpdates.mainstreamed_date = toNullableDate(updates.mainstreamedDate);
  if (updates.bloodGroup !== undefined) dbUpdates.blood_group = toNullableString(updates.bloodGroup);
  if (updates.weightKg !== undefined) dbUpdates.weight_kg = toNullableNumber(updates.weightKg);
  if (updates.heightCm !== undefined) dbUpdates.height_cm = toNullableNumber(updates.heightCm);
  if (updates.studentUniqueCode !== undefined) dbUpdates.student_unique_code = toNullableString(updates.studentUniqueCode);
  if (updates.diseCode !== undefined) dbUpdates.dise_code = toNullableString(updates.diseCode);
  if (updates.healthId !== undefined) dbUpdates.health_id = toNullableString(updates.healthId);
  if (updates.annualFamilyIncome !== undefined) dbUpdates.annual_family_income = toNullableNumber(updates.annualFamilyIncome);
  if (updates.birthRegistrationNo !== undefined) dbUpdates.birth_registration_no = toNullableString(updates.birthRegistrationNo);
  if (updates.identificationMark !== undefined) dbUpdates.identification_mark = toNullableString(updates.identificationMark);
  if (updates.relationshipWithGuardian !== undefined) dbUpdates.relationship_with_guardian = toNullableString(updates.relationshipWithGuardian);
  if (updates.guardianQualification !== undefined) dbUpdates.guardian_qualification = toNullableString(updates.guardianQualification);
  if (updates.bankIfsc !== undefined) dbUpdates.bank_ifsc = toNullableString(updates.bankIfsc);
  if (updates.bankAccountNo !== undefined) dbUpdates.bank_account_no = toNullableString(updates.bankAccountNo);

  if (updates.admissionNo !== undefined) dbUpdates.admission_no = toNullableString(updates.admissionNo);
  if (updates.admissionType !== undefined) dbUpdates.admission_type = toNullableString(updates.admissionType);
  if (updates.academicYear !== undefined) dbUpdates.academic_year = toNullableString(updates.academicYear);
  if (updates.mediumOfInstruction !== undefined) dbUpdates.medium_of_instruction = toNullableString(updates.mediumOfInstruction);
  if (updates.presentClassAdmissionDate !== undefined) dbUpdates.present_class_admission_date = toNullableDate(updates.presentClassAdmissionDate);
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
        });
      }
    }
  }

  const { data, error } = await supabase
    .from("students")
    .update(dbUpdates)
    .eq("id", id)
    .select("*, academic_history(*)")
    .maybeSingle();

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
