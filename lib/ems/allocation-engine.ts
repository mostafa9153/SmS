// EMS Allocation Engine — Manual & Smart Auto Distribution with Anti-Copying & Live DB Mismatch Detection
import { Student } from "@/lib/types";
import {
  EmsRoom,
  SeatAssignment,
  AllocatedRoom,
  ExamAllocation,
  AutoAllocationConfig,
  ManualRoomAllocationConfig,
  MismatchReport,
  MismatchItem,
} from "./types";

import {
  normalizeClassCode,
  normalizeSectionCode,
  buildClassStudentPool,
  arrangeRoomUnified,
  toShortStream,
  isHigherSecondaryClass,
} from "./seat-arrangement-algorithm";
import { ColumnClassAllocationConfig } from "./seat-arrangement-types";

// Helper to fetch active continuing students from API
export async function fetchContinuingStudents(): Promise<Student[]> {
  try {
    const res = await fetch("/api/students?paginated=false");
    if (!res.ok) throw new Error("Failed to fetch students");
    const json = await res.json();
    const students: Student[] = json.data || [];
    return students.filter((s) => s.currentStatus === "Continuing");
  } catch (err) {
    console.error("Error fetching students for EMS allocation:", err);
    return [];
  }
}

// Helper to neatly format roll numbers (e.g. [1, 2, 3, 5, 8, 9, 10] -> "1–3, 5, 8–10" or "5, 8, 14")
export function formatMissingRolls(rolls: number[]): string {
  if (!rolls || rolls.length === 0) return "";
  if (rolls.length <= 10) return rolls.join(", ");

  const ranges: string[] = [];
  let start = rolls[0];
  let prev = rolls[0];

  for (let i = 1; i < rolls.length; i++) {
    const cur = rolls[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = cur;
      prev = cur;
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return ranges.join(", ");
}

export interface MissingRollsInfo {
  class: string;
  section: string;
  rollFrom: number;
  rollTo: number;
  expectedCount: number;
  foundCount: number;
  missingRolls: number[];
  missingFormatted: string;
}

// Global missing rolls detector for any configured classes (skips HS classes)
export function detectAllMissingRolls(
  configuredClasses: { class: string; section: string; rollFrom: number; rollTo: number; isHsClass?: boolean }[],
  allStudents: Student[]
): MissingRollsInfo[] {
  const results: MissingRollsInfo[] = [];

  configuredClasses.forEach((cfg) => {
    if (cfg.isHsClass || isHigherSecondaryClass(cfg.class)) return;

    const normClass = normalizeClassCode(cfg.class);
    const normSec = normalizeSectionCode(cfg.section);

    const activeSecStudents = allStudents.filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      const sClass = normalizeClassCode(s.presentClass);
      const sSec = normalizeSectionCode(s.presentSection);
      return sClass === normClass && (!normSec || normSec === "ALL" || sSec === normSec);
    });

    const presentRollSet = new Set(
      activeSecStudents
        .map((s) => Number(s.presentRoll))
        .filter((r) => !isNaN(r) && r > 0)
    );

    const missingRolls: number[] = [];
    for (let r = cfg.rollFrom; r <= cfg.rollTo; r++) {
      if (!presentRollSet.has(r)) {
        missingRolls.push(r);
      }
    }

    if (missingRolls.length > 0) {
      const expectedCount = Math.max(0, cfg.rollTo - cfg.rollFrom + 1);
      const foundCount = Math.max(0, expectedCount - missingRolls.length);
      results.push({
        class: cfg.class,
        section: cfg.section,
        rollFrom: cfg.rollFrom,
        rollTo: cfg.rollTo,
        expectedCount,
        foundCount,
        missingRolls,
        missingFormatted: formatMissingRolls(missingRolls),
      });
    }
  });

  return results;
}

// Check for missing rolls / reg numbers and return found students + mismatch items
export function filterAndValidateClassStudents(
  allStudents: Student[],
  className: string,
  section: string,
  rollFrom: number,
  rollTo: number,
  stream?: string,
  gender?: string,
  regNoFrom?: string,
  regNoTo?: string,
  isHsClass?: boolean
): {
  students: Student[];
  mismatches: MismatchItem[];
} {
  const mismatches: MismatchItem[] = [];
  const isHs = isHsClass ?? isHigherSecondaryClass(className);
  const normClass = normalizeClassCode(className);

  // -------------------------------------------------------------
  // Higher Secondary (Class 11 & 12) Validation & Filtering
  // -------------------------------------------------------------
  if (isHs) {
    const streamShort = stream && stream !== "ALL" ? toShortStream(stream) : null;
    const isBoyFilter =
      gender && gender !== "ALL"
        ? gender.toLowerCase().startsWith("boy") || gender.toLowerCase() === "male"
        : null;

    // Inactive HS students check
    const inactiveStudents = allStudents.filter((s) => {
      if (!s.currentStatus || s.currentStatus === "Continuing") return false;
      if (normalizeClassCode(s.presentClass) !== normClass) return false;
      if (streamShort && toShortStream(s.academicStream) !== streamShort) return false;
      if (isBoyFilter !== null) {
        if (isBoyFilter && s.gender !== "Male") return false;
        if (!isBoyFilter && s.gender !== "Female") return false;
      }
      return true;
    });

    if (inactiveStudents.length > 0) {
      mismatches.push({
        type: "ROLL_INACTIVE",
        severity: "warning",
        title: `Inactive / Discontinued Students in Class ${className} (${stream || "ALL"})`,
        message: `${inactiveStudents.length} student(s) in Class ${className} are marked as Inactive/Transferred in Database and excluded from seating.`,
        details: inactiveStudents.slice(0, 5).map((s) => `${s.name} (Reg: ${s.boardRegistrationNo || s.presentRoll || "N/A"}, Status: ${s.currentStatus})`),
        class: className,
        suggestedAction: "If any of these students should be seated, update their status to 'Continuing' in Student Directory.",
      });
    }

    // Active continuing HS students
    const matching = allStudents.filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      if (normalizeClassCode(s.presentClass) !== normClass) return false;
      if (streamShort && toShortStream(s.academicStream) !== streamShort) return false;
      if (isBoyFilter !== null) {
        if (isBoyFilter && s.gender !== "Male") return false;
        if (!isBoyFilter && s.gender !== "Female") return false;
      }
      return true;
    });

    if (matching.length === 0) {
      mismatches.push({
        type: "CLASS_EMPTY",
        severity: "error",
        title: `No Active Students Found for Class ${className} (${stream || "ALL"})`,
        message: `No active continuing students found in Database for Class ${className} ${stream && stream !== "ALL" ? `Stream ${stream}` : ""}.`,
        class: className,
        suggestedAction: "Please verify class, stream, and student records in directory.",
      });
      return { students: [], mismatches };
    }

    // Check for missing Board Registration Numbers
    const missingRegStudents = matching.filter(
      (s) => !s.boardRegistrationNo || s.boardRegistrationNo.trim() === ""
    );
    if (missingRegStudents.length > 0) {
      mismatches.push({
        type: "ROLL_NOT_FOUND",
        severity: "warning",
        title: `Missing Board Registration Numbers in Class ${className} (${missingRegStudents.length} Student${missingRegStudents.length > 1 ? "s" : ""})`,
        message: `${missingRegStudents.length} student(s) in Class ${className} lack a Board Registration Number in Database.`,
        details: missingRegStudents.slice(0, 5).map((s) => `${s.name} (Roll: ${s.presentRoll || "N/A"})`),
        class: className,
        suggestedAction: "Update Board Registration Numbers in Student Directory for proper board seating order.",
      });
    }

    // Sort by board registration number (natural alphanumeric sort)
    matching.sort((a, b) => {
      const regA = (a.boardRegistrationNo || "").trim() || `${a.presentRoll}`;
      const regB = (b.boardRegistrationNo || "").trim() || `${b.presentRoll}`;
      return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
    });

    // Filter by regNoFrom / regNoTo if provided
    let filtered = matching;
    if (regNoFrom && regNoFrom.trim()) {
      const fromVal = regNoFrom.trim();
      const fromIdx = filtered.findIndex(
        (s) => (s.boardRegistrationNo || "").trim().localeCompare(fromVal, undefined, { numeric: true }) >= 0
      );
      if (fromIdx !== -1) {
        filtered = filtered.slice(fromIdx);
      }
    }
    if (regNoTo && regNoTo.trim()) {
      const toVal = regNoTo.trim();
      const toIdx = filtered.findLastIndex(
        (s) => (s.boardRegistrationNo || "").trim().localeCompare(toVal, undefined, { numeric: true }) <= 0
      );
      if (toIdx !== -1) {
        filtered = filtered.slice(0, toIdx + 1);
      }
    }

    return { students: filtered, mismatches };
  }

  // -------------------------------------------------------------
  // Classes V to X (Junior classes - 100% backward compatible)
  // -------------------------------------------------------------
  const normSec = normalizeSectionCode(section);

  // Check for inactive / left / transferred students in DB matching this class
  const inactiveStudents = allStudents.filter((s) => {
    if (!s.currentStatus || s.currentStatus === "Continuing") return false;
    const sClass = normalizeClassCode(s.presentClass);
    const sSec = normalizeSectionCode(s.presentSection);
    return sClass === normClass && (!normSec || normSec === "ALL" || sSec === normSec);
  });

  if (inactiveStudents.length > 0) {
    mismatches.push({
      type: "ROLL_INACTIVE",
      severity: "warning",
      title: `Inactive / Discontinued Students in Class ${className}-${section}`,
      message: `${inactiveStudents.length} student(s) in Class ${className}-${section} are marked as Inactive/Transferred in Database and excluded from seating.`,
      details: inactiveStudents.slice(0, 5).map((s) => `${s.name} (Roll ${s.presentRoll || "N/A"}, Status: ${s.currentStatus})`),
      class: className,
      section: section,
      suggestedAction: "If any of these students should be seated, update their status to 'Continuing' in Student Directory.",
    });
  }

  // All active continuing students in this class & section, sorted by roll
  const allSectionStudents = allStudents
    .filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      const sClass = normalizeClassCode(s.presentClass);
      const sSec = normalizeSectionCode(s.presentSection);
      return sClass === normClass && (!normSec || normSec === "ALL" || sSec === normSec);
    })
    .sort((a, b) => (Number(a.presentRoll) || 0) - (Number(b.presentRoll) || 0));

  if (allSectionStudents.length === 0) {
    mismatches.push({
      type: "CLASS_EMPTY",
      severity: "error",
      title: `No Active Students Found for Class ${className}-${section}`,
      message: `No active continuing students found in Database for Class ${className} Section ${section}.`,
      class: className,
      section: section,
      suggestedAction: "Please verify class, section, and student records in directory.",
    });
    return { students: [], mismatches };
  }

  // Check for blank or unassigned roll numbers
  const blankRollStudents = allSectionStudents.filter((s) => !s.presentRoll || isNaN(Number(s.presentRoll)));
  if (blankRollStudents.length > 0) {
    mismatches.push({
      type: "ROLL_NOT_FOUND",
      severity: "warning",
      title: `Blank / Unassigned Rolls in Class ${className}-${section}`,
      message: `${blankRollStudents.length} active student(s) in Class ${className}-${section} have blank or invalid roll numbers.`,
      details: blankRollStudents.slice(0, 5).map((s) => `${s.name} (ID: ${s.id || s.schoolId || "N/A"})`),
      class: className,
      section: section,
      suggestedAction: "Assign proper roll numbers in Student Directory for accurate seating sequence.",
    });
  }

  let classStudents: Student[] = [];

  // Match active continuing students whose actual roll is within [rollFrom, rollTo]
  const byRoll = allSectionStudents.filter((s) => {
    const roll = Number(s.presentRoll);
    if (!isNaN(roll) && roll > 0) {
      return roll >= rollFrom && roll <= rollTo;
    }
    return false;
  });

  if (byRoll.length > 0) {
    classStudents = byRoll;

    // Check for missing rolls in the requested range [rollFrom, rollTo]
    const presentRollSet = new Set(byRoll.map((s) => Number(s.presentRoll)));
    const missingRolls: number[] = [];
    for (let r = rollFrom; r <= rollTo; r++) {
      if (!presentRollSet.has(r)) {
        missingRolls.push(r);
      }
    }
    if (missingRolls.length > 0) {
      const formatted = formatMissingRolls(missingRolls);
      mismatches.push({
        type: "ROLL_NOT_FOUND",
        severity: "warning",
        title: `Missing Rolls in Class ${className}-${section} (${missingRolls.length} Roll${missingRolls.length > 1 ? "s" : ""} Missing)`,
        message: `${missingRolls.length} roll number(s) in range [${rollFrom} - ${rollTo}] could not be found in Database: ${formatted}.`,
        details: [`Missing Roll Nos (${missingRolls.length}): ${missingRolls.join(", ")}`],
        class: className,
        section: section,
        rollsAffected: missingRolls,
        suggestedAction: "These missing rolls will be omitted so active students are seated continuously without empty gaps.",
      });
    }
  } else if (blankRollStudents.length > 0) {
    // Fallback to index slicing if rolls are unassigned
    const start = Math.max(0, rollFrom - 1);
    const end = Math.min(allSectionStudents.length, rollTo);
    classStudents = allSectionStudents.slice(start, end);
  } else {
    classStudents = [];
    const missingRolls: number[] = [];
    for (let r = rollFrom; r <= rollTo; r++) {
      missingRolls.push(r);
    }
    const formatted = formatMissingRolls(missingRolls);
    mismatches.push({
      type: "ROLL_NOT_FOUND",
      severity: "warning",
      title: `No Students Found in Roll Range [${rollFrom} - ${rollTo}] for Class ${className}-${section}`,
      message: `No active continuing students match roll numbers ${rollFrom} to ${rollTo} in Class ${className}-${section}. Missing rolls: ${formatted}.`,
      details: [`Missing Roll Nos (${missingRolls.length}): ${missingRolls.join(", ")}`],
      class: className,
      section: section,
      rollsAffected: missingRolls,
      suggestedAction: "Adjust the roll range in Step 2 to match active enrolled roll numbers.",
    });
  }

  return { students: classStudents, mismatches };
}

// -------------------------------------------------------------
// 1. MANUAL ALLOCATION GENERATOR
// -------------------------------------------------------------
export function generateManualRoomAllocation(
  room: EmsRoom,
  config: ManualRoomAllocationConfig,
  allStudents: Student[]
): {
  allocatedRoom: AllocatedRoom;
  mismatchReport: MismatchReport;
} {
  const mismatchItems: MismatchItem[] = [];
  const seats: SeatAssignment[] = [];
  let globalSeatCounter = 1;
  const classesPresentSet = new Set<string>();

  // Map each column's student pool
  const columnStudentMap: Record<number, Student[]> = {};

  config.columns.forEach((colInput) => {
    if (!colInput.class) return;
    const { students, mismatches } = filterAndValidateClassStudents(
      allStudents,
      colInput.class,
      colInput.section,
      colInput.rollFrom,
      colInput.rollTo
    );
    columnStudentMap[colInput.columnIndex] = students;
    mismatches.forEach((m) => mismatchItems.push(m));
  });

  // Now construct seats according to the room's physical columns and benches
  room.columns.forEach((colConfig) => {
    const colStudents = columnStudentMap[colConfig.columnIndex] || [];
    let studentPointer = 0;
    const effectiveSeatsPerBench = config.studentsPerBench || colConfig.seatsPerBench || 3;
    const colCapacity = colConfig.benchCount * effectiveSeatsPerBench;

    if (colStudents.length > colCapacity) {
      const overflowCount = colStudents.length - colCapacity;
      mismatchItems.push({
        type: "CAPACITY_OVERFLOW",
        severity: "error",
        title: `Column ${colConfig.columnIndex} Overflow in ${room.roomNumber}`,
        message: `${colConfig.columnLabel} has ${colCapacity} seats, but ${colStudents.length} students were assigned!`,
        details: [`${overflowCount} student(s) will not get a seat in this column.`],
        suggestedAction: `Increase benches in Column ${colConfig.columnIndex} or allocate remaining students to another column/room.`,
      });
    }

    for (let b = 1; b <= colConfig.benchCount; b++) {
      for (let s = 1; s <= effectiveSeatsPerBench; s++) {
        const student = colStudents[studentPointer];
        const isOccupied = Boolean(student);

        if (student) {
          classesPresentSet.add(`${student.presentClass}-${student.presentSection}`);
          studentPointer++;
        }

        seats.push({
          seatId: `${room.id}-C${colConfig.columnIndex}-B${b}-S${s}`,
          roomId: room.id,
          roomNumber: room.roomNumber,
          columnIndex: colConfig.columnIndex,
          benchIndex: b,
          seatPosition: s,
          globalSeatNumber: globalSeatCounter++,
          studentId: student?.id,
          studentName: student?.name,
          studentRoll: student?.presentRoll,
          studentClass: student?.presentClass,
          studentSection: student?.presentSection,
          studentRegNo: student?.boardRegistrationNo,
          studentStream: student?.academicStream ? toShortStream(student.academicStream) : undefined,
          studentGender: student?.gender,
          schoolId: student?.schoolId,
          fatherName: student?.fatherName,
          contact: student?.studentContact,
          isVacant: !isOccupied,
        });
      }
    }
  });

  const occupiedSeats = seats.filter((s) => !s.isVacant).length;
  const vacantSeats = seats.filter((s) => s.isVacant).length;

  return {
    allocatedRoom: {
      roomId: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      building: room.building,
      columns: room.columns,
      seats,
      totalSeats: seats.length,
      occupiedSeats,
      vacantSeats,
      classesPresent: Array.from(classesPresentSet),
    },
    mismatchReport: {
      hasErrors: mismatchItems.some((m) => m.severity === "error"),
      hasWarnings: mismatchItems.some((m) => m.severity === "warning"),
      items: mismatchItems,
    },
  };
}

// -------------------------------------------------------------
// 2. SMART AUTO ALLOCATION GENERATOR
// -------------------------------------------------------------
export function generateAutoAllocation(
  targetRooms: EmsRoom[],
  config: AutoAllocationConfig,
  allStudents: Student[]
): {
  allocation: ExamAllocation;
  mismatchReport: MismatchReport;
} {
  const mismatchItems: MismatchItem[] = [];

  // 1. Gather all class student pools — strictly sequencing Section A before Section B
  interface ClassGroup {
    key: string;
    class: string;
    students: Student[];
  }

  const classGroupsMap = new Map<string, Student[]>();
  let totalStudentsNeeded = 0;

  // Sort class inputs so that within the same class, Section A comes first, then Section B, then Section C...
  const sortedClassInputs = [...config.classes].sort((a, b) => {
    const classComp = a.class.localeCompare(b.class);
    if (classComp !== 0) return classComp;
    const secA = normalizeSectionCode(a.section);
    const secB = normalizeSectionCode(b.section);
    return secA.localeCompare(secB, undefined, { numeric: true });
  });

  sortedClassInputs.forEach((c) => {
    const { students, mismatches } = filterAndValidateClassStudents(
      allStudents,
      c.class,
      c.section,
      c.rollFrom,
      c.rollTo,
      c.stream,
      c.gender,
      c.regNoFrom,
      c.regNoTo,
      c.isHsClass
    );
    mismatches.forEach((m) => mismatchItems.push(m));
    totalStudentsNeeded += students.length;

    const normKey = normalizeClassCode(c.class);
    if (!classGroupsMap.has(normKey)) {
      classGroupsMap.set(normKey, []);
    }
    // Append this section's students (already sorted by roll ascending / regNo)
    classGroupsMap.get(normKey)!.push(...students);
  });

  const classGroups: ClassGroup[] = Array.from(classGroupsMap.entries()).map(([cls, studs]) => ({
    key: cls,
    class: cls,
    students: [...studs],
  }));

  // Calculate total room seats available (factoring in dynamic studentsPerBench if specified)
  const totalSeatsAvailable = targetRooms.reduce((acc, r) => {
    return (
      acc +
      r.columns.reduce(
        (colAcc, c) => colAcc + c.benchCount * (config.studentsPerBench || c.seatsPerBench || 3),
        0
      )
    );
  }, 0);

  if (totalStudentsNeeded > totalSeatsAvailable) {
    const deficit = totalStudentsNeeded - totalSeatsAvailable;
    mismatchItems.push({
      type: "SEATS_DEFICIT",
      severity: "error",
      title: "Not Enough Seats in Selected Rooms!",
      message: `Total students to seat: ${totalStudentsNeeded}, but selected rooms only have ${totalSeatsAvailable} seats with ${config.studentsPerBench || 3} student(s) per bench.`,
      details: [`Deficit of ${deficit} seat(s). Add more rooms to accommodate all students.`],
      suggestedAction: "Select additional exam rooms or reduce student roll range.",
    });
  } else if (totalSeatsAvailable > totalStudentsNeeded) {
    const excess = totalSeatsAvailable - totalStudentsNeeded;
    mismatchItems.push({
      type: "SEATS_DEFICIT",
      severity: "info",
      title: "Surplus Capacity Available",
      message: `${excess} seat(s) will remain vacant across selected rooms.`,
    });
  }

  // 2. Distribute students into rooms based on strategy & roomClassMap
  const allocatedRooms: AllocatedRoom[] = [];

  if (config.strategy === "alternate-columns") {
    let currentClassIndex = 0;
    targetRooms.forEach((room) => {
      const seats: SeatAssignment[] = [];
      let globalSeatCounter = 1;
      const roomClassesPresent = new Set<string>();

      const assignedClasses = config.roomClassMap?.[room.id];
      const allowedClassSet =
        assignedClasses && assignedClasses.length > 0
          ? new Set(assignedClasses.map(normalizeClassCode))
          : null;

      const eligibleGroups = allowedClassSet
        ? classGroups.filter((g) => allowedClassSet.has(normalizeClassCode(g.class)))
        : classGroups;

      room.columns.forEach((colConfig) => {
        const effectiveSeatsPerBench =
          config.studentsPerBench || colConfig.seatsPerBench || 3;

        let attempts = 0;
        while (
          eligibleGroups.length > 0 &&
          eligibleGroups[currentClassIndex % eligibleGroups.length].students.length === 0 &&
          attempts < eligibleGroups.length
        ) {
          currentClassIndex++;
          attempts++;
        }

        const activeGroup =
          eligibleGroups.length > 0 &&
          eligibleGroups[currentClassIndex % eligibleGroups.length].students.length > 0
            ? eligibleGroups[currentClassIndex % eligibleGroups.length]
            : null;

        for (let b = 1; b <= colConfig.benchCount; b++) {
          for (let s = 1; s <= effectiveSeatsPerBench; s++) {
            let student: Student | undefined = undefined;

            if (activeGroup && activeGroup.students.length > 0) {
              student = activeGroup.students.shift();
              roomClassesPresent.add(activeGroup.key);
            }

            seats.push({
              seatId: `${room.id}-C${colConfig.columnIndex}-B${b}-S${s}`,
              roomId: room.id,
              roomNumber: room.roomNumber,
              columnIndex: colConfig.columnIndex,
              benchIndex: b,
              seatPosition: s,
              globalSeatNumber: globalSeatCounter++,
              studentId: student?.id,
              studentName: student?.name,
              studentRoll: student?.presentRoll,
              studentClass: student?.presentClass,
              studentSection: student?.presentSection,
              studentRegNo: student?.boardRegistrationNo,
              studentStream: student?.academicStream ? toShortStream(student.academicStream) : undefined,
              studentGender: student?.gender,
              schoolId: student?.schoolId,
              fatherName: student?.fatherName,
              contact: student?.studentContact,
              isVacant: !student,
            });
          }
        }

        currentClassIndex++;
      });

      const occupiedSeats = seats.filter((s) => !s.isVacant).length;
      const vacantSeats = seats.filter((s) => s.isVacant).length;

      allocatedRooms.push({
        roomId: room.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        building: room.building,
        columns: room.columns,
        seats,
        totalSeats: seats.length,
        occupiedSeats,
        vacantSeats,
        classesPresent: Array.from(roomClassesPresent),
      });
    });
  } else {
    // Default High-Standard School Exam Interleaved Snake Loop Allocation
    const studentPool = buildClassStudentPool(
      allStudents,
      Array.from(new Set(sortedClassInputs.map((c) => normalizeClassCode(c.class)))),
      sortedClassInputs
    );

    let currentCursors = new Map<string, number>();

    targetRooms.forEach((room) => {
      const spb = config.studentsPerBench || room.defaultSeatsPerBench || 3;
      const normalizedRoom: EmsRoom = {
        ...room,
        defaultSeatsPerBench: spb,
        columns: room.columns.map((col) => ({
          ...col,
          seatsPerBench: spb,
        })),
        totalCapacity: room.columns.reduce((acc, col) => acc + col.benchCount * spb, 0),
      };

      // Determine default assigned classes for this room
      const assignedClasses = config.roomClassMap?.[room.id] || [];
      const primaryClass = assignedClasses[0] || sortedClassInputs[0]?.class || "";
      const secondaryClass = assignedClasses[1] || sortedClassInputs[1]?.class || primaryClass;

      const columnAssignments: ColumnClassAllocationConfig[] = normalizedRoom.columns.map((col, idx) => {
        const s1 = idx % 2 === 0 ? primaryClass : secondaryClass;
        const s2 = idx % 2 === 0 ? secondaryClass : primaryClass;
        return {
          columnIndex: col.columnIndex,
          s1ClassCode: s1,
          s2ClassCode: s2,
          s3MirrorS1: true,
          s3ClassCode: s1,
          assignedClassCode: s1,
          secondaryClassCode: s2,
        };
      });

      const { allocatedRoom, updatedCursors } = arrangeRoomUnified(
        "INTERLEAVED",
        normalizedRoom,
        columnAssignments,
        studentPool,
        currentCursors
      );
      currentCursors = updatedCursors;
      allocatedRooms.push(allocatedRoom);
    });
  }

  const totalOccupied = allocatedRooms.reduce((sum, r) => sum + r.occupiedSeats, 0);
  const unseatedCount = Math.max(0, totalStudentsNeeded - totalOccupied);
  if (unseatedCount > 0) {
    mismatchItems.push({
      type: "SEATS_DEFICIT",
      severity: "warning",
      title: "Unassigned / Unseated Students Remaining",
      message: `${unseatedCount} student(s) could not be seated in their assigned rooms due to room capacity.`,
      suggestedAction: "Assign more rooms to these classes or increase seats per bench.",
    });
  }

  const allClasses = Array.from(new Set(allocatedRooms.flatMap((r) => r.classesPresent)));

  const allocation: ExamAllocation = {
    id: `alloc-${Date.now()}`,
    title: `${config.examType} (${config.academicYear}) - ${allClasses.join(", ")}`,
    academicYear: config.academicYear,
    examType: config.examType,
    mode: "auto",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roomAllocations: allocatedRooms,
    summary: {
      totalStudents: totalOccupied,
      totalRooms: allocatedRooms.length,
      classesAllocated: allClasses,
      mismatches: {
        hasErrors: mismatchItems.some((m) => m.severity === "error"),
        hasWarnings: mismatchItems.some((m) => m.severity === "warning"),
        items: mismatchItems,
      },
    },
  };

  return {
    allocation,
    mismatchReport: {
      hasErrors: mismatchItems.some((m) => m.severity === "error"),
      hasWarnings: mismatchItems.some((m) => m.severity === "warning"),
      items: mismatchItems,
    },
  };
}
