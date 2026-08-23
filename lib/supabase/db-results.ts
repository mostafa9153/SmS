import { createClient as createServerClient } from "@/lib/supabase/server";
import type { StudentResult, ResultEntryInput, ClassResultsSummary } from "@/lib/types";

// Standard Full Marks mapping per class as requested by user
export const CLASS_DEFAULT_FULL_MARKS: Record<string, number> = {
  V: 500,
  VI: 1050,
  VII: 1200,
  VIII: 1200,
  IX: 700,
  X: 700,
  XI: 500,
  XII: 500,
};

export function getClassFullMarks(className: string): number {
  const norm = (className || "V").toUpperCase().trim();
  const digitMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  const standardKey = digitMap[norm] || norm;
  return CLASS_DEFAULT_FULL_MARKS[standardKey] ?? 500;
}

export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "AA (Outstanding)";
  if (percentage >= 80) return "A+ (Excellent)";
  if (percentage >= 60) return "A (Very Good)";
  if (percentage >= 45) return "B+ (Good)";
  if (percentage >= 35) return "B (Satisfactory)";
  if (percentage >= 25) return "C (Marginal)";
  return "D (Needs Improvement)";
}

/**
 * Fetch results for an entire class/section, joined with enrolled students.
 */
export async function dbGetResultsByClass(
  academicYear: number,
  className: string,
  section?: string,
  examName = "Annual Examination"
): Promise<ClassResultsSummary> {
  const supabase = await createServerClient();
  const normClass = (className || "V").toUpperCase().trim();
  const fullMarks = getClassFullMarks(normClass);

  // 1. Fetch all students currently in this class & section
  let studentsQuery = supabase
    .from("students")
    .select("id, name, school_id, pen, gender, present_class, present_section, present_roll, student_unique_code")
    .eq("present_class", normClass)
    .order("present_roll", { ascending: true });

  if (section && section !== "ALL") {
    studentsQuery = studentsQuery.eq("present_section", section.toUpperCase().trim());
  }

  const { data: students, error: studErr } = await studentsQuery;
  if (studErr) throw new Error(studErr.message);

  // 2. Fetch all existing results for this class and academic year
  let resultsQuery = supabase
    .from("student_results")
    .select("*")
    .eq("academic_year", academicYear)
    .eq("class", normClass)
    .eq("exam_name", examName);

  if (section && section !== "ALL") {
    resultsQuery = resultsQuery.eq("section", section.toUpperCase().trim());
  }

  const { data: resultsData, error: resErr } = await resultsQuery;
  if (resErr) {
    console.error("Error fetching results (table may need creation):", resErr.message);
  }

  const resultMap = new Map<string, any>();
  for (const r of (resultsData || [])) {
    resultMap.set(r.student_id, r);
  }

  // 3. Merge student roster with results
  const mergedResults: StudentResult[] = (students || []).map((s) => {
    const existing = resultMap.get(s.id);

    if (existing) {
      const marksObt = Number(existing.marks_obtained);
      const percentage = Number(((marksObt / fullMarks) * 100).toFixed(2));
      const grade = calculateGrade(percentage);

      return {
        id: existing.id,
        studentId: s.id,
        academicYear: existing.academic_year,
        class: normClass,
        section: existing.section,
        roll: existing.roll,
        examName: existing.exam_name,
        fullMarks: fullMarks,
        marksObtained: marksObt,
        percentage: percentage,
        grade: grade,
        rankInSection: existing.rank_in_section ?? undefined,
        rankInClass: existing.rank_in_class ?? undefined,
        subjectMarks: existing.subject_marks || {},
        remarks: existing.remarks || undefined,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
        student: {
          id: s.id,
          name: s.name,
          schoolId: s.school_id,
          pen: s.pen || undefined,
          gender: s.gender,
          studentUniqueCode: s.student_unique_code || undefined,
        },
      };
    }

    return {
      id: `virtual-${s.id}`,
      studentId: s.id,
      academicYear,
      class: s.present_class,
      section: s.present_section,
      roll: s.present_roll,
      examName,
      fullMarks,
      marksObtained: 0,
      percentage: 0,
      grade: undefined,
      rankInSection: undefined,
      rankInClass: undefined,
      student: {
        id: s.id,
        name: s.name,
        schoolId: s.school_id,
        pen: s.pen || undefined,
        gender: s.gender,
        studentUniqueCode: s.student_unique_code || undefined,
      },
    };
  });

  // Calculate summary metrics
  const evaluatedRows = mergedResults.filter((r) => !r.id.startsWith("virtual-") && r.marksObtained > 0);
  const highestMarks = evaluatedRows.reduce((max, r) => Math.max(max, r.marksObtained), 0);
  const totalObtainedSum = evaluatedRows.reduce((sum, r) => sum + r.marksObtained, 0);
  const averageMarks = evaluatedRows.length > 0 ? Number((totalObtainedSum / evaluatedRows.length).toFixed(1)) : 0;

  return {
    academicYear,
    class: normClass,
    examName,
    fullMarks,
    totalStudents: (students || []).length,
    evaluatedCount: evaluatedRows.length,
    highestMarks,
    averageMarks,
    results: mergedResults,
  };
}

/**
 * Save or update a single student's marks and automatically trigger dual rank recalculation.
 */
export async function dbSaveOrUpdateResult(
  input: ResultEntryInput,
  userId: string
): Promise<StudentResult> {
  const supabase = await createServerClient();
  const fullMarks = input.fullMarks || getClassFullMarks(input.class);

  // Validation: Marks cannot exceed Full Marks
  if (input.marksObtained > fullMarks) {
    throw new Error(
      `Marks Obtained (${input.marksObtained}) cannot exceed Full Marks (${fullMarks}) for Class ${input.class}.`
    );
  }
  if (input.marksObtained < 0) {
    throw new Error("Marks Obtained cannot be negative.");
  }

  const percentage = Number(((input.marksObtained / fullMarks) * 100).toFixed(2));
  const grade = calculateGrade(percentage);

  const payload = {
    student_id: input.studentId,
    academic_year: input.academicYear,
    class: input.class.toUpperCase().trim(),
    section: input.section.toUpperCase().trim(),
    roll: input.roll,
    exam_name: input.examName || "Annual Examination",
    full_marks: fullMarks,
    marks_obtained: input.marksObtained,
    percentage,
    grade,
    subject_marks: input.subjectMarks || {},
    remarks: input.remarks || null,
    updated_at: new Date().toISOString(),
  };

  // Upsert on conflict (student_id, academic_year, exam_name)
  const { data, error } = await supabase
    .from("student_results")
    .upsert(payload, { onConflict: "student_id,academic_year,exam_name" })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Trigger automatic rank recalculation for the entire class and sections
  await dbCalculateAndAssignRanks(input.academicYear, payload.class, payload.exam_name);

  // Refetch the updated record with assigned ranks
  const { data: updatedResult } = await supabase
    .from("student_results")
    .select("*, student:students(id, name, school_id, pen, gender, student_unique_code)")
    .eq("id", data.id)
    .single();

  const finalRecord = updatedResult || data;

  return {
    id: finalRecord.id,
    studentId: finalRecord.student_id,
    academicYear: finalRecord.academic_year,
    class: finalRecord.class,
    section: finalRecord.section,
    roll: finalRecord.roll,
    examName: finalRecord.exam_name,
    fullMarks: Number(finalRecord.full_marks),
    marksObtained: Number(finalRecord.marks_obtained),
    percentage: Number(finalRecord.percentage),
    grade: finalRecord.grade,
    rankInSection: finalRecord.rank_in_section ?? undefined,
    rankInClass: finalRecord.rank_in_class ?? undefined,
    subjectMarks: finalRecord.subject_marks || {},
    remarks: finalRecord.remarks || undefined,
    student: finalRecord.student ? {
      id: finalRecord.student.id,
      name: finalRecord.student.name,
      schoolId: finalRecord.student.school_id,
      pen: finalRecord.student.pen || undefined,
      gender: finalRecord.student.gender,
      studentUniqueCode: finalRecord.student.student_unique_code || undefined,
    } : undefined,
  };
}

/**
 * Calculates and assigns dual ranks (rank_in_class & rank_in_section) based STRICTLY on Total Marks descending.
 */
export async function dbCalculateAndAssignRanks(
  academicYear: number,
  className: string,
  examName = "Annual Examination"
): Promise<{ classUpdated: number }> {
  const supabase = await createServerClient();
  const normClass = className.toUpperCase().trim();

  // 1. Fetch all evaluated results for this class and year
  const { data: allResults, error } = await supabase
    .from("student_results")
    .select("id, section, marks_obtained")
    .eq("academic_year", academicYear)
    .eq("class", normClass)
    .eq("exam_name", examName);

  if (error || !allResults || allResults.length === 0) {
    return { classUpdated: 0 };
  }

  // 2. Rank in Class (Across all sections) based on marks_obtained DESC
  const sortedForClass = [...allResults].sort((a, b) => Number(b.marks_obtained) - Number(a.marks_obtained));
  const classRankMap = new Map<string, number>();

  let currentRank = 1;
  for (let i = 0; i < sortedForClass.length; i++) {
    if (i > 0 && Number(sortedForClass[i].marks_obtained) < Number(sortedForClass[i - 1].marks_obtained)) {
      currentRank = i + 1; // Standard competition rank (1224)
    }
    classRankMap.set(sortedForClass[i].id, currentRank);
  }

  // 3. Rank in Section (Grouped by section) based on marks_obtained DESC
  const sectionGroups = new Map<string, Array<{ id: string; marks_obtained: number }>>();
  for (const r of allResults) {
    const sec = (r.section || "A").toUpperCase().trim();
    if (!sectionGroups.has(sec)) sectionGroups.set(sec, []);
    sectionGroups.get(sec)!.push({ id: r.id, marks_obtained: Number(r.marks_obtained) });
  }

  const sectionRankMap = new Map<string, number>();
  for (const [sec, items] of sectionGroups.entries()) {
    items.sort((a, b) => b.marks_obtained - a.marks_obtained);
    let secRank = 1;
    for (let i = 0; i < items.length; i++) {
      if (i > 0 && items[i].marks_obtained < items[i - 1].marks_obtained) {
        secRank = i + 1;
      }
      sectionRankMap.set(items[i].id, secRank);
    }
  }

  // 4. Batch update ranks in database
  const updatePromises = allResults.map((r) => {
    const rInClass = classRankMap.get(r.id) || null;
    const rInSec = sectionRankMap.get(r.id) || null;

    return supabase
      .from("student_results")
      .update({
        rank_in_class: rInClass,
        rank_in_section: rInSec,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
  });

  await Promise.all(updatePromises);
  return { classUpdated: allResults.length };
}

/**
 * Fetch all historical result records for a single student across all academic years.
 */
export async function dbGetStudentResultHistory(studentId: string): Promise<StudentResult[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("student_results")
    .select("*")
    .eq("student_id", studentId)
    .order("academic_year", { ascending: true });

  if (error || !data) return [];

  return data.map((r) => {
    const fm = getClassFullMarks(r.class);
    const marksObt = Number(r.marks_obtained);
    const percentage = Number(((marksObt / fm) * 100).toFixed(2));

    return {
      id: r.id,
      studentId: r.student_id,
      academicYear: r.academic_year,
      class: r.class,
      section: r.section,
      roll: r.roll,
      examName: r.exam_name,
      fullMarks: fm,
      marksObtained: marksObt,
      percentage: percentage,
      grade: calculateGrade(percentage),
      rankInSection: r.rank_in_section ?? undefined,
      rankInClass: r.rank_in_class ?? undefined,
      subjectMarks: r.subject_marks || {},
      remarks: r.remarks || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}
