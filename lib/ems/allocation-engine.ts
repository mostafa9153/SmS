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

// Check for missing rolls and return found students + mismatch items
export function filterAndValidateClassStudents(
  allStudents: Student[],
  className: string,
  section: string,
  rollFrom: number,
  rollTo: number
): {
  students: Student[];
  mismatches: MismatchItem[];
} {
  const mismatches: MismatchItem[] = [];

  const normClass = (className || "").trim().toUpperCase().replace(/^CLASS\s*/i, "");
  const normSec = (section || "").trim().toUpperCase().replace(/^SEC(TION)?\s*[-_]?\s*/i, "");

  // All active continuing students in this class & section, sorted by roll
  const allSectionStudents = allStudents
    .filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      const sClass = (s.presentClass || "").trim().toUpperCase().replace(/^CLASS\s*/i, "");
      const sSec = (s.presentSection || "").trim().toUpperCase().replace(/^SEC(TION)?\s*[-_]?\s*/i, "");
      return sClass === normClass && (!normSec || sSec === normSec);
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

  let classStudents: Student[] = [];

  // If roll range covers all students in DB (e.g. Roll 1 to 101 for 101 students):
  if (rollFrom <= 1 && rollTo >= allSectionStudents.length) {
    classStudents = allSectionStudents;
  } else {
    // If user specified a sub-range (e.g. 1 to 50):
    // First, attempt matching by presentRoll
    const byRoll = allSectionStudents.filter(
      (s) => s.presentRoll >= rollFrom && s.presentRoll <= rollTo
    );
    if (byRoll.length > 0) {
      classStudents = byRoll;
    } else {
      // Fallback to slice based on 1-based order
      const start = Math.max(0, rollFrom - 1);
      const end = Math.min(allSectionStudents.length, rollTo);
      classStudents = allSectionStudents.slice(start, end);
    }
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

  const normalizeCode = (c: string) => (c || "").trim().toUpperCase().replace(/^CLASS\s*/i, "");

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
    const secA = (a.section || "").trim().toUpperCase();
    const secB = (b.section || "").trim().toUpperCase();
    return secA.localeCompare(secB, undefined, { numeric: true });
  });

  sortedClassInputs.forEach((c) => {
    const { students, mismatches } = filterAndValidateClassStudents(
      allStudents,
      c.class,
      c.section,
      c.rollFrom,
      c.rollTo
    );
    mismatches.forEach((m) => mismatchItems.push(m));
    totalStudentsNeeded += students.length;

    const normKey = normalizeCode(c.class);
    if (!classGroupsMap.has(normKey)) {
      classGroupsMap.set(normKey, []);
    }
    // Append this section's students (already sorted by roll ascending)
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
  let currentClassIndex = 0;

  targetRooms.forEach((room) => {
    const seats: SeatAssignment[] = [];
    let globalSeatCounter = 1;
    const roomClassesPresent = new Set<string>();

    // Determine which classes are eligible to sit in this room
    const assignedClasses = config.roomClassMap?.[room.id];
    const allowedClassSet =
      assignedClasses && assignedClasses.length > 0
        ? new Set(assignedClasses.map(normalizeCode))
        : null;

    const eligibleGroups = allowedClassSet
      ? classGroups.filter((g) => allowedClassSet.has(normalizeCode(g.class)))
      : classGroups;

    if (config.strategy === "alternate-columns") {
      // Column Block strategy:
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
              isVacant: !student,
            });
          }
        }

        currentClassIndex++;
      });
    } else {
      // Interleaved seats strategy:
      room.columns.forEach((colConfig) => {
        const effectiveSeatsPerBench =
          config.studentsPerBench || colConfig.seatsPerBench || 2;

        for (let b = 1; b <= colConfig.benchCount; b++) {
          for (let s = 1; s <= effectiveSeatsPerBench; s++) {
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
              isVacant: !student,
            });

            currentClassIndex++;
          }
        }
      });
    }

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

  const unseatedCount = classGroups.reduce((sum, g) => sum + g.students.length, 0);
  if (unseatedCount > 0) {
    const unseatedClasses = Array.from(
      new Set(classGroups.filter((g) => g.students.length > 0).map((g) => g.class))
    );
    mismatchItems.push({
      type: "SEATS_DEFICIT",
      severity: "warning",
      title: "Unassigned / Unseated Students Remaining",
      message: `${unseatedCount} student(s) from Class ${unseatedClasses.join(", ")} could not be seated in their assigned rooms due to room capacity.`,
      suggestedAction: "Assign more rooms to these classes or increase seats per bench.",
    });
  }

  const totalOccupied = allocatedRooms.reduce((sum, r) => sum + r.occupiedSeats, 0);
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
