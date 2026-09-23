import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sortClasses, CLASS_ORDER } from "@/lib/utils";

const DEFAULT_SUBJECTS = [
  "Bengali",
  "English",
  "Mathematics",
  "Physical Science",
  "Life Science",
  "History",
  "Geography",
  "Work Education",
  "Physical Education",
  "Computer Application",
  "Sanskrit",
  "Philosophy",
  "Political Science",
  "Education",
  "Economics",
  "Physics",
  "Chemistry",
  "Biology",
  "Nutrition",
  "Environmental Studies",
  "General",
];

const DEFAULT_SECTIONS = ["A", "B", "C", "D", "ALL"];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Try fast RPC function
    try {
      const { data: rpcData, error: rpcError } = await adminClient.rpc("get_teacher_distinct_metadata");
      if (!rpcError && rpcData && typeof rpcData === "object") {
        const rpcClasses = Array.isArray(rpcData.classes) ? rpcData.classes : [];
        const rpcSections = Array.isArray(rpcData.sections) ? rpcData.sections : [];
        const rpcSubjects = Array.isArray(rpcData.subjects) ? rpcData.subjects : [];

        const classSet = new Set<string>([...CLASS_ORDER, ...rpcClasses.filter(Boolean)]);
        const sectionSet = new Set<string>([...DEFAULT_SECTIONS, ...rpcSections.filter(Boolean)]);
        const subjectSet = new Set<string>([...DEFAULT_SUBJECTS, ...rpcSubjects.filter(Boolean)]);

        return NextResponse.json({
          success: true,
          classes: sortClasses(Array.from(classSet)),
          sections: Array.from(sectionSet).sort(),
          subjects: Array.from(subjectSet).sort((a, b) => a.localeCompare(b)),
        });
      }
    } catch {
      // Fall through to fallback queries
    }

    // 2. Fallback direct queries
    const classSet = new Set<string>(CLASS_ORDER);
    const sectionSet = new Set<string>(DEFAULT_SECTIONS);
    const subjectSet = new Set<string>(DEFAULT_SUBJECTS);

    // Query distinct classes & sections from students
    const { data: studentRows } = await adminClient
      .from("students")
      .select("present_class, present_section")
      .limit(1000);

    (studentRows || []).forEach((r) => {
      if (r.present_class) classSet.add(r.present_class);
      if (r.present_section) sectionSet.add(r.present_section);
    });

    // Query assignments for subjects, classes, sections
    const { data: assignmentRows } = await adminClient
      .from("teacher_class_assignments")
      .select("class_name, section, subject")
      .limit(1000);

    (assignmentRows || []).forEach((r) => {
      if (r.class_name) classSet.add(r.class_name);
      if (r.section) sectionSet.add(r.section);
      if (r.subject) subjectSet.add(r.subject);
    });

    // Query staff_profiles for appointed_subject
    const { data: staffRows } = await adminClient
      .from("staff_profiles")
      .select("primary_meta")
      .eq("employee_type", "TEACHING")
      .limit(500);

    (staffRows || []).forEach((s) => {
      const subj = s.primary_meta?.appointed_subject;
      if (subj && typeof subj === "string" && subj.trim()) {
        subjectSet.add(subj.trim());
      }
    });

    return NextResponse.json({
      success: true,
      classes: sortClasses(Array.from(classSet)),
      sections: Array.from(sectionSet).sort(),
      subjects: Array.from(subjectSet).sort((a, b) => a.localeCompare(b)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load metadata" }, { status: 500 });
  }
}
