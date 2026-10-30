import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Student, StudentFilters, PaginatedStudents } from "@/lib/types";
import { compareStudentsByClassAndRoll } from "@/lib/utils";
import { pgContains } from "@/lib/supabase/filters";
import { DBStudent, mapDBStudentToStudent } from "@/lib/supabase/students/mappers";

// Mask Aadhaar if user is not Admin (e.g. staff or public)
export function maskAadhaar(aadhaar?: string): string | undefined {
  if (!aadhaar) return undefined;
  const cleaned = aadhaar.replace(/\s+/g, "").replace(/-/g, "");
  if (cleaned.length !== 12) return "••••-••••-••••";
  return `••••-••••-${cleaned.slice(8)}`;
}

const STUDENT_SUMMARY_COLUMNS = [
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
    const like = pgContains(q);
    const searchFields = [
      `name.ilike.${like}`,
      `school_id.ilike.${like}`,
      `pen.ilike.${like}`,
      `father_name.ilike.${like}`,
      `mother_name.ilike.${like}`,
      `student_unique_code.ilike.${like}`,
      `admission_no.ilike.${like}`,
    ];
    const parsedNum = parseInt(q, 10);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      searchFields.push(`present_roll.eq.${parsedNum}`);
    }
    // Only Admin accounts are permitted to query by full Aadhaar
    if (userRole === "Admin") {
      searchFields.push(`aadhaar.ilike.${like}`);
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
  if (filters.status) {
    query = query.ilike("current_status", filters.status);
  } else if (filters.studentType === "active") {
    // Active enrolled students on academic rosters (excluding pending admission & departed archives)
    query = query.in("current_status", [
      "Continuing",
      "New Admission",
      "Sent Up M.P.",
      "Detained",
      "10th test fail",
      "exam fail - C.C",
      "C.C.H.S.",
      "Supplementary",
      "Compartmental",
      "Suspended",
    ]);
  } else if (filters.studentType === "old") {
    // Archived / departed students
    query = query.in("current_status", ["Passed Out", "Drop Out", "TC Out"]);
  } else if (filters.studentType === "pending") {
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
