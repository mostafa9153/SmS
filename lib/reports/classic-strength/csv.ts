import type { Student } from "@/lib/types";
import { todayIST } from "@/lib/utils/date";
import { currentYearIST } from "@/lib/utils/academic-year";
import { computeClassicStrengthData } from "@/lib/reports/classic-strength/compute";

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT HELPER (.csv)
// ─────────────────────────────────────────────────────────────────────────────
export function exportClassicStrengthCsv(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = String(currentYearIST())
) {
  const data = computeClassicStrengthData(students, schoolName, customDate, academicYear);
  const rows: string[][] = [];

  rows.push([`"${data.schoolName}"`]);
  rows.push([`"${data.reportTitle}"`]);
  rows.push([]);

  // Top Table
  rows.push([
    "Class",
    "Boys (Hindu)",
    "Boys (Muslim)",
    "Total Boys",
    "Boys in Class",
    "Girls (Hindu)",
    "Girls (Muslim)",
    "Total Girls",
    "Girls in Class",
    "Total Hindu",
    "Total Muslim",
    "Total Students",
    "Students in Class",
    "Stage Total",
  ]);

  data.sectionRows.forEach((r) => {
    rows.push([
      `"${r.displayLabel}"`,
      String(r.boysHindu),
      String(r.boysMuslim),
      String(r.totalBoys),
      String(r.boysInClass),
      String(r.girlsHindu),
      String(r.girlsMuslim),
      String(r.totalGirls),
      String(r.girlsInClass),
      String(r.totalHindu),
      String(r.totalMuslim),
      String(r.totalStudents),
      String(r.studentsInClass),
      String(r.stageTotal),
    ]);
  });

  rows.push([
    "Total",
    String(data.totals.boysHindu),
    String(data.totals.boysMuslim),
    String(data.totals.totalBoys),
    String(data.totals.totalBoys),
    String(data.totals.girlsHindu),
    String(data.totals.girlsMuslim),
    String(data.totals.totalGirls),
    String(data.totals.totalGirls),
    String(data.totals.totalHindu),
    String(data.totals.totalMuslim),
    String(data.totals.totalStudents),
    String(data.totals.totalStudents),
    String(data.totals.totalStudents),
  ]);

  rows.push([]);
  rows.push([]);
  rows.push(["Class-Wise Summary", "", "", "", "", "Deferentials", "", "", "", "", ""]);
  rows.push([
    "Class",
    "Boys (H)",
    "Boys (M)",
    "Girls (H)",
    "Girls (M)",
    "Total",
    "Boys",
    "Girls",
    "Deferentials",
    "Hindu",
    "Muslim",
    "Total Student",
  ]);

  for (let i = 0; i < 8; i++) {
    const cs = data.classSummaries[i];
    const diff = data.differentials[i] || null;
    rows.push([
      `"${cs.classLevel}"`,
      String(cs.boysHindu),
      String(cs.boysMuslim),
      String(cs.girlsHindu),
      String(cs.girlsMuslim),
      String(cs.totalStudents),
      diff && diff.label !== "Total Hindu/Muslim" ? String(diff.boys) : "",
      diff && diff.label !== "Total Hindu/Muslim" ? String(diff.girls) : "",
      diff ? `"${diff.label}"` : "",
      diff ? String(diff.hindu) : "",
      diff ? String(diff.muslim) : "",
      diff && diff.label !== "Total Hindu/Muslim" ? String(diff.total) : "",
    ]);
  }

  const csvContent = "\uFEFF" + rows.map((e) => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Students_Strength_${data.academicYear}_${todayIST()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
