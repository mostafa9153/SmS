import { createClient as createServerClient } from "@/lib/supabase/server";
import { pgContains } from "@/lib/supabase/filters";

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
      const like = pgContains(query.trim());
      dbQuery = dbQuery.or(
        `name.ilike.${like},school_id.ilike.${like},pen.ilike.${like},father_name.ilike.${like}`
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
