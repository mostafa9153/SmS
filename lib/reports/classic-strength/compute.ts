import type { Student } from "@/lib/types";
import { currentYearIST } from "@/lib/utils/academic-year";
import { ClassSummaryRow, ClassicReportData, DifferentialGroup, SectionMatrixRow } from "@/lib/reports/classic-strength/types";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function isMuslim(religion?: string): boolean {
  if (!religion) return false;
  const r = religion.trim().toLowerCase();
  return r === "islam" || r === "muslim" || r.includes("islam") || r.includes("muslim");
}

function isHindu(religion?: string): boolean {
  if (!religion) return false;
  const r = religion.trim().toLowerCase();
  return r === "hindu" || r === "hinduism" || r.includes("hindu");
}

export function computeClassicStrengthData(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = String(currentYearIST())
): ClassicReportData {
  const activeStudents = students.filter(
    (s) => s.currentStatus === "Continuing" || !s.currentStatus
  );

  const standardLayout = [
    { classLevel: "V", section: "A", label: "V-A", stage: "V-VIII" as const },
    { classLevel: "V", section: "B", label: "V-B", stage: "V-VIII" as const },
    { classLevel: "VI", section: "A", label: "VI-A", stage: "V-VIII" as const },
    { classLevel: "VI", section: "B", label: "VI-B", stage: "V-VIII" as const },
    { classLevel: "VII", section: "A", label: "VII-A", stage: "V-VIII" as const },
    { classLevel: "VII", section: "B", label: "VII-B", stage: "V-VIII" as const },
    { classLevel: "VIII", section: "A", label: "VIII-A", stage: "V-VIII" as const },
    { classLevel: "VIII", section: "B", label: "VIII-B", stage: "V-VIII" as const },
    { classLevel: "IX", section: "A", label: "IX A", stage: "IX-X" as const },
    { classLevel: "IX", section: "B", label: "IX B", stage: "IX-X" as const },
    { classLevel: "X", section: "A", label: "X-A", stage: "IX-X" as const },
    { classLevel: "XI", section: "", label: "XI", stage: "XI-XII" as const },
    { classLevel: "XII", section: "", label: "XII", stage: "XI-XII" as const },
  ];

  // Map students to sections
  const comboMap = new Map<string, Student[]>();
  standardLayout.forEach((item) => {
    comboMap.set(`${item.classLevel}__${item.section}`, []);
  });

  activeStudents.forEach((student) => {
    const c = (student.presentClass || "V").toUpperCase().trim();
    const s = (student.presentSection || "").toUpperCase().trim();
    const key = `${c}__${s}`;
    if (comboMap.has(key)) {
      comboMap.get(key)!.push(student);
    } else {
      const fallbackKey = `${c}__A`;
      if (comboMap.has(fallbackKey)) {
        comboMap.get(fallbackKey)!.push(student);
      } else {
        const firstKey = `${c}__`;
        if (comboMap.has(firstKey)) {
          comboMap.get(firstKey)!.push(student);
        }
      }
    }
  });

  // Calculate Class Subtotals
  const classTotals = new Map<
    string,
    { boysH: number; boysM: number; boys: number; girlsH: number; girlsM: number; girls: number; hindu: number; muslim: number; total: number }
  >();

  STANDARD_CLASSES.forEach((c) => {
    classTotals.set(c, {
      boysH: 0,
      boysM: 0,
      boys: 0,
      girlsH: 0,
      girlsM: 0,
      girls: 0,
      hindu: 0,
      muslim: 0,
      total: 0,
    });
  });

  standardLayout.forEach((item) => {
    const list = comboMap.get(`${item.classLevel}__${item.section}`) || [];
    const ct = classTotals.get(item.classLevel)!;
    list.forEach((s) => {
      const isM = s.gender === "Male";
      const isF = s.gender === "Female";
      const hindu = isHindu(s.religion);
      const muslim = isMuslim(s.religion);

      if (isM) {
        ct.boys++;
        if (hindu) ct.boysH++;
        else if (muslim) ct.boysM++;
      } else if (isF) {
        ct.girls++;
        if (hindu) ct.girlsH++;
        else if (muslim) ct.girlsM++;
      }
      if (hindu) ct.hindu++;
      else if (muslim) ct.muslim++;
      ct.total++;
    });
  });

  // Calculate Stage Totals
  const stageSums = {
    "V-VIII": ["V", "VI", "VII", "VIII"].reduce((s, c) => s + classTotals.get(c)!.total, 0),
    "IX-X": ["IX", "X"].reduce((s, c) => s + classTotals.get(c)!.total, 0),
    "XI-XII": ["XI", "XII"].reduce((s, c) => s + classTotals.get(c)!.total, 0),
  };

  // Build section matrix rows with vertical merge metadata
  const sectionRows: SectionMatrixRow[] = [];
  const classSeen = new Set<string>();
  const stageSeen = new Set<string>();

  const stageCounts = {
    "V-VIII": standardLayout.filter((x) => x.stage === "V-VIII").length,
    "IX-X": standardLayout.filter((x) => x.stage === "IX-X").length,
    "XI-XII": standardLayout.filter((x) => x.stage === "XI-XII").length,
  };

  standardLayout.forEach((item) => {
    const list = comboMap.get(`${item.classLevel}__${item.section}`) || [];
    let boysHindu = 0;
    let boysMuslim = 0;
    let girlsHindu = 0;
    let girlsMuslim = 0;

    list.forEach((s) => {
      const isM = s.gender === "Male";
      const isF = s.gender === "Female";
      const hindu = isHindu(s.religion);
      const muslim = isMuslim(s.religion);

      if (isM) {
        if (hindu) boysHindu++;
        else if (muslim) boysMuslim++;
      } else if (isF) {
        if (hindu) girlsHindu++;
        else if (muslim) girlsMuslim++;
      }
    });

    const totalBoys = boysHindu + boysMuslim;
    const totalGirls = girlsHindu + girlsMuslim;
    const totalStudents = list.length;
    const ct = classTotals.get(item.classLevel)!;

    const isFirstInSection = !classSeen.has(item.classLevel);
    classSeen.add(item.classLevel);

    const sectionCountInClass = standardLayout.filter((x) => x.classLevel === item.classLevel).length;

    const isFirstInStage = !stageSeen.has(item.stage);
    stageSeen.add(item.stage);

    sectionRows.push({
      classLevel: item.classLevel,
      section: item.section,
      displayLabel: item.label,
      boysHindu,
      boysMuslim,
      totalBoys,
      boysInClass: ct.boys,
      girlsHindu,
      girlsMuslim,
      totalGirls,
      girlsInClass: ct.girls,
      totalHindu: ct.hindu,
      totalMuslim: ct.muslim,
      totalStudents,
      studentsInClass: ct.total,
      isFirstInSection,
      sectionCountInClass,
      stageGroup: item.stage,
      stageTotal: stageSums[item.stage],
      isFirstInStage,
      stageRowCount: stageCounts[item.stage],
    });
  });

  // Grand Totals
  const totals = {
    boysHindu: sectionRows.reduce((s, r) => s + r.boysHindu, 0),
    boysMuslim: sectionRows.reduce((s, r) => s + r.boysMuslim, 0),
    totalBoys: sectionRows.reduce((s, r) => s + r.totalBoys, 0),
    girlsHindu: sectionRows.reduce((s, r) => s + r.girlsHindu, 0),
    girlsMuslim: sectionRows.reduce((s, r) => s + r.girlsMuslim, 0),
    totalGirls: sectionRows.reduce((s, r) => s + r.totalGirls, 0),
    totalHindu: Array.from(classTotals.values()).reduce((s, c) => s + c.hindu, 0),
    totalMuslim: Array.from(classTotals.values()).reduce((s, c) => s + c.muslim, 0),
    totalStudents: sectionRows.reduce((s, r) => s + r.totalStudents, 0),
  };

  // Class-Wise Summaries
  const classSummaries: ClassSummaryRow[] = STANDARD_CLASSES.map((c) => {
    const ct = classTotals.get(c)!;
    return {
      classLevel: c,
      boysHindu: ct.boysH,
      boysMuslim: ct.boysM,
      totalBoys: ct.boys,
      girlsHindu: ct.girlsH,
      girlsMuslim: ct.girlsM,
      totalGirls: ct.girls,
      totalHindu: ct.hindu,
      totalMuslim: ct.muslim,
      totalStudents: ct.total,
    };
  });

  // Differentials
  const getDiff = (classes: string[], label: string) => {
    const items = classSummaries.filter((cs) => classes.includes(cs.classLevel));
    return {
      label,
      boys: items.reduce((s, i) => s + i.totalBoys, 0),
      girls: items.reduce((s, i) => s + i.totalGirls, 0),
      hindu: items.reduce((s, i) => s + i.totalHindu, 0),
      muslim: items.reduce((s, i) => s + i.totalMuslim, 0),
      total: items.reduce((s, i) => s + i.totalStudents, 0),
    };
  };

  const differentials: DifferentialGroup[] = [
    getDiff(["V", "VI", "VII", "VIII"], "V to VIII-"),
    getDiff(["V", "VI", "VII", "VIII", "IX", "X"], "V to X-"),
    getDiff(["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"], "V to XII-"),
    getDiff(["VI", "VII", "VIII"], "VI to VIII"),
    getDiff(["IX", "X"], "IX to X-"),
    getDiff(["XI", "XII"], "XI to XII-"),
    {
      label: "Total Hindu/Muslim",
      boys: totals.totalBoys,
      girls: totals.totalGirls,
      hindu: totals.totalHindu,
      muslim: totals.totalMuslim,
      total: totals.totalStudents,
    },
  ];

  const today = customDate || new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  return {
    schoolName,
    reportTitle: `STUDENTS STRENGTH ${academicYear} As On ${today}`,
    asOnDate: today,
    academicYear,
    sectionRows,
    totals,
    classSummaries,
    differentials,
  };
}
