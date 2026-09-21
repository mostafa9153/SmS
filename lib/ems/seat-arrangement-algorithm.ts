// EMS Seat Arrangement Algorithm — UE (Even) & UU (Uneven) with Continuity Rule
import { AllocatedRoom, SeatAssignment, EmsRoom, AutoAllocationClassInput } from "./types";
import { Student } from "@/lib/types";
import {
  ArrangementPattern,
  FillDirection,
  ColumnClassAllocationConfig,
  RoomArrangementConfig,
  ArrangementPromptState,
} from "./seat-arrangement-types";

// Normalize class code for robust matching
export function normalizeClassCode(c?: string): string {
  if (!c) return "";
  const clean = c.trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  const romanMap: Record<string, string> = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
    "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    "11": "XI", "12": "XII",
  };
  return romanMap[clean] || clean;
}

// Check if a class is Higher Secondary (Class 11 or 12)
export function isHigherSecondaryClass(c?: string): boolean {
  if (!c) return false;
  const norm = normalizeClassCode(c);
  return norm === "XI" || norm === "XII" || norm === "11" || norm === "12";
}

// Standardize short stream representation (Sci, Arts, Com)
export function toShortStream(stream?: string): string {
  if (!stream) return "";
  const s = stream.trim().toLowerCase();
  if (s.includes("sci")) return "Sci";
  if (s.includes("art") || s.includes("hum")) return "Arts";
  if (s.includes("com")) return "Com";
  return stream.trim();
}

// Normalize section code for robust matching
export function normalizeSectionCode(sec?: string): string {
  if (!sec) return "";
  return sec.trim().toUpperCase().replace(/^SEC(TION)?\s*[-_]?\s*/i, "");
}

// Information on HS students missing a board registration number
export interface MissingHsStudentInfo {
  id: string;
  name: string;
  presentClass: string;
  presentRoll: number;
  academicStream?: string;
  gender: string;
}

// Pre-flight check to detect HS students missing Board Registration Numbers
export function checkMissingHsRegistrationNos(
  allStudents: Student[],
  configuredClasses: AutoAllocationClassInput[]
): MissingHsStudentInfo[] {
  const missing: MissingHsStudentInfo[] = [];
  const seenIds = new Set<string>();

  configuredClasses.forEach((cfg) => {
    if (!isHigherSecondaryClass(cfg.class)) return;
    const normClass = normalizeClassCode(cfg.class);

    const matching = allStudents.filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      if (normalizeClassCode(s.presentClass) !== normClass) return false;
      if (cfg.stream && cfg.stream !== "ALL" && toShortStream(s.academicStream) !== toShortStream(cfg.stream)) {
        return false;
      }
      if (cfg.gender && cfg.gender !== "ALL") {
        const isBoy = cfg.gender.toLowerCase().startsWith("boy") || cfg.gender.toLowerCase() === "male";
        if (isBoy && s.gender !== "Male") return false;
        if (!isBoy && s.gender !== "Female") return false;
      }
      return true;
    });

    matching.forEach((s) => {
      if (!s.boardRegistrationNo || s.boardRegistrationNo.trim() === "") {
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          missing.push({
            id: s.id,
            name: s.name,
            presentClass: s.presentClass,
            presentRoll: s.presentRoll,
            academicStream: s.academicStream,
            gender: s.gender,
          });
        }
      }
    });
  });

  return missing;
}

// Group students by class code.
// For Classes V-X: strictly section-by-section and roll-by-roll.
// For Classes XI-XII: stream-by-stream and gender filtered, sorted by Board Registration Number (natural alphanumeric sort).
export function buildClassStudentPool(
  allStudents: Student[],
  allowedClasses?: string[],
  configuredClasses?: AutoAllocationClassInput[]
): Map<string, Student[]> {
  const map = new Map<string, Student[]>();

  const allowedSet = allowedClasses
    ? new Set(allowedClasses.map((c) => normalizeClassCode(c)))
    : null;

  // 1. If configuredClasses is provided (from Step 2 setup)
  if (configuredClasses && configuredClasses.length > 0) {
    const configsByClass = new Map<string, AutoAllocationClassInput[]>();
    configuredClasses.forEach((cfg) => {
      const norm = normalizeClassCode(cfg.class);
      if (allowedSet && !allowedSet.has(norm)) return;
      if (!configsByClass.has(norm)) {
        configsByClass.set(norm, []);
      }
      configsByClass.get(norm)!.push(cfg);
    });

    configsByClass.forEach((cfgs, normClass) => {
      const isHs = isHigherSecondaryClass(normClass);
      const classStudents: Student[] = [];

      if (isHs) {
        // Higher Secondary (Class XI & XII):
        cfgs.forEach((cfg) => {
          const cfgStreamShort = cfg.stream && cfg.stream !== "ALL" ? toShortStream(cfg.stream) : null;
          const isBoyFilter = cfg.gender && cfg.gender !== "ALL" ? (cfg.gender.toLowerCase().startsWith("boy") || cfg.gender.toLowerCase() === "male") : null;

          const matching = allStudents.filter((s) => {
            if (s.currentStatus && s.currentStatus !== "Continuing") return false;
            if (normalizeClassCode(s.presentClass) !== normClass) return false;
            if (cfgStreamShort && toShortStream(s.academicStream) !== cfgStreamShort) return false;
            if (isBoyFilter !== null) {
              if (isBoyFilter && s.gender !== "Male") return false;
              if (!isBoyFilter && s.gender !== "Female") return false;
            }
            return true;
          });

          // Natural alphanumeric sort by boardRegistrationNo (or fallback to schoolId / roll)
          matching.sort((a, b) => {
            const regA = (a.boardRegistrationNo || "").trim() || `${a.presentRoll}`;
            const regB = (b.boardRegistrationNo || "").trim() || `${b.presentRoll}`;
            return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
          });

          // Filter by regNoFrom / regNoTo if provided
          let filtered = matching;
          if (cfg.regNoFrom && cfg.regNoFrom.trim()) {
            const fromVal = cfg.regNoFrom.trim();
            const fromIdx = filtered.findIndex((s) => (s.boardRegistrationNo || "").trim().localeCompare(fromVal, undefined, { numeric: true }) >= 0);
            if (fromIdx !== -1) {
              filtered = filtered.slice(fromIdx);
            }
          }
          if (cfg.regNoTo && cfg.regNoTo.trim()) {
            const toVal = cfg.regNoTo.trim();
            const toIdx = filtered.findLastIndex((s) => (s.boardRegistrationNo || "").trim().localeCompare(toVal, undefined, { numeric: true }) <= 0);
            if (toIdx !== -1) {
              filtered = filtered.slice(0, toIdx + 1);
            }
          }

          classStudents.push(...filtered);
        });
      } else {
        // Classes V to X (Junior classes - 100% untouched behavior):
        cfgs.sort((a, b) => {
          const secA = normalizeSectionCode(a.section);
          const secB = normalizeSectionCode(b.section);
          return secA.localeCompare(secB, undefined, { numeric: true });
        });

        cfgs.forEach((cfg) => {
          const normCfgSec = normalizeSectionCode(cfg.section);
          const matching = allStudents.filter((s) => {
            if (s.currentStatus && s.currentStatus !== "Continuing") return false;
            if (normalizeClassCode(s.presentClass) !== normClass) return false;
            if (normCfgSec && normalizeSectionCode(s.presentSection) !== normCfgSec) return false;
            const roll = Number(s.presentRoll) || 0;
            if (cfg.rollFrom && roll < cfg.rollFrom) return false;
            if (cfg.rollTo && roll > cfg.rollTo) return false;
            return true;
          });

          matching.sort((a, b) => (Number(a.presentRoll) || 0) - (Number(b.presentRoll) || 0));
          classStudents.push(...matching);
        });
      }

      map.set(normClass, classStudents);
    });

    return map;
  }

  // 2. Fallback if no configuredClasses:
  allStudents.forEach((student) => {
    if (student.currentStatus && student.currentStatus !== "Continuing") return;
    const norm = normalizeClassCode(student.presentClass);
    if (allowedSet && !allowedSet.has(norm)) return;

    if (!map.has(norm)) {
      map.set(norm, []);
    }
    map.get(norm)!.push(student);
  });

  // Sort each class list:
  map.forEach((list, normClass) => {
    if (isHigherSecondaryClass(normClass)) {
      // HS Classes: natural sort by Board Reg No
      list.sort((a, b) => {
        const regA = (a.boardRegistrationNo || "").trim() || `${a.presentRoll}`;
        const regB = (b.boardRegistrationNo || "").trim() || `${b.presentRoll}`;
        return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
      });
    } else {
      // Junior Classes: Section A first (rolls ascending), then Section B...
      list.sort((a, b) => {
        const secA = normalizeSectionCode(a.presentSection);
        const secB = normalizeSectionCode(b.presentSection);
        if (secA !== secB) {
          return secA.localeCompare(secB, undefined, { numeric: true });
        }
        return (Number(a.presentRoll) || 0) - (Number(b.presentRoll) || 0);
      });
    }
  });

  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. UE (EVEN) ARRANGEMENT ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────
/**
 * In UE (Even):
 * - Each column is an independent, self-contained seating block for its assigned class.
 * - Loop Rule:
 *   - 2-seat benches: Seat 1 goes top→bottom (B1..Bn), Seat 2 returns bottom→top (Bn..B1).
 *     Consecutive rolls never sit adjacent on the same bench.
 *   - 3-seat benches: Outer seats S1 and S3 form the loop pair for the primary class (S1: top→bottom, S3: bottom→top).
 *     Middle seat S2 is sequential top→bottom for a secondary class (or continuation class).
 *   - 1-seat benches: Sequential fill top→bottom.
 * - One column finishing does NOT dictate where the next starts. Each column starts fresh at Bench 1 (top).
 */
// ─────────────────────────────────────────────────────────────────────────────
// 1. UNIFIED INTERLEAVED SNAKE LOOP ALGORITHM (School Exam Standard)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Interleaved Snake Loop Seating Engine (School Exam Standard)
 * 
 * Rules:
 * - Dynamic columns: Supports any room with 2, 3, or more columns.
 * - Dynamic capacity: Supports 2-seat and 3-seat benches.
 * - Section sequencing: Section A students finish first (ascending roll 1..N), then Section B starts (1..N).
 * - Alternating Roles:
 *   - Even columns (Col 1, Col 3...):
 *     - Outer Seats (S1, S3): Class A
 *     - Center Seat (S2): Class B
 *   - Odd columns (Col 2, Col 4...):
 *     - Outer Seats (S1, S3): Class B
 *     - Center Seat (S2): Class A
 * - Snake Direction (3-seat benches):
 *   - Col 1 (k = 0):
 *     - S1: Bench 1 -> Bench N (down)
 *     - S3: Bench N -> Bench 1 (up) (Loop pair exits at Top)
 *     - S2: Bench 1 -> Bench N (down) (Exits at Bottom)
 *   - Col 2 (k = 1):
 *     - S1: Bench N -> Bench 1 (up) (Starts at bottom where Class B exited)
 *     - S3: Bench 1 -> Bench N (down)
 *     - S2: Bench 1 -> Bench N (down)
 *   - Col 3 (k = 2):
 *     - S1: Bench N -> Bench 1 (up) (Starts at bottom where Class A exited)
 *     - S3: Bench 1 -> Bench N (down)
 *     - S2: Bench 1 -> Bench N (down)
 *   - Col 4 (k = 3):
 *     - S1: Bench N -> Bench 1 (up)
 *     - S3: Bench 1 -> Bench N (down)
 *     - S2: Bench 1 -> Bench N (down)
 * - 2-Seat Benches:
 *   - Col 1: S1 = Class A, S2 = Class B (Top -> Bottom)
 *   - Col 2: S1 = Class B, S2 = Class A (Bottom -> Top)
 *   - Col 3: S1 = Class A, S2 = Class B (Top -> Bottom)
 * - Multi-Room Cascade:
 *   - Unallocated students smoothly cascade into Room 2, Room 3, etc. via classCursors.
 */
// Determine default fill direction for a seat position
export function getDefaultSeatDirection(
  pattern: ArrangementPattern,
  colIdx: number,
  seatPos: number,
  seatsPerBench: number = 3
): FillDirection {
  if (seatsPerBench === 1) return "top-to-bottom";

  if (seatsPerBench === 2) {
    return colIdx % 2 === 0 ? "top-to-bottom" : "bottom-to-top";
  }

  // 3-seat benches:
  if (pattern === "FIXED_U") {
    if (seatPos === 1) return "top-to-bottom";
    if (seatPos === 3) return "bottom-to-top";
    return colIdx % 2 === 0 ? "top-to-bottom" : "bottom-to-top";
  }

  // INTERLEAVED:
  if (colIdx === 0) {
    if (seatPos === 1) return "top-to-bottom";
    if (seatPos === 3) return "bottom-to-top";
    return "top-to-bottom"; // S2
  } else if (colIdx === 1) {
    if (seatPos === 1) return "bottom-to-top";
    if (seatPos === 3) return "top-to-bottom";
    return "top-to-bottom"; // S2
  } else if (colIdx === 2) {
    if (seatPos === 1) return "bottom-to-top";
    if (seatPos === 3) return "top-to-bottom";
    return "bottom-to-top"; // S2
  } else {
    const isS1BottomUp = colIdx % 4 === 1 || colIdx % 4 === 2;
    const isS2BottomUp = colIdx % 4 === 2 || colIdx % 4 === 3;
    if (seatPos === 1) return isS1BottomUp ? "bottom-to-top" : "top-to-bottom";
    if (seatPos === 3) return isS1BottomUp ? "top-to-bottom" : "bottom-to-top";
    return isS2BottomUp ? "bottom-to-top" : "top-to-bottom";
  }
}

export function arrangeRoomInterleaved(
  room: EmsRoom,
  columnConfigs: ColumnClassAllocationConfig[],
  studentPool: Map<string, Student[]>,
  classCursors: Map<string, number>
): {
  allocatedRoom: AllocatedRoom;
  updatedCursors: Map<string, number>;
} {
  const seats: SeatAssignment[] = [];
  let globalSeatCounter = 1;
  const classesPresentSet = new Set<string>();
  const cursors = new Map<string, number>(classCursors);

  const getNextStudentForClass = (classCode: string, avoidClassCode?: string, overflowClassCode?: string): Student | undefined => {
    if (!classCode) return undefined;
    const norm = normalizeClassCode(classCode);
    const pool = studentPool.get(norm) || [];
    const currentCursor = cursors.get(norm) || 0;
    if (currentCursor < pool.length) {
      const student = pool[currentCursor];
      const nextIdx = currentCursor + 1;
      cursors.set(norm, nextIdx);
      classCursors.set(norm, nextIdx); // Directly synchronize outer cursor for multi-room continuity
      return student;
    }

    // Priority 1: If overflowClassCode is explicitly set by user, try that first
    if (overflowClassCode) {
      const overflowNorm = normalizeClassCode(overflowClassCode);
      const overflowPool = studentPool.get(overflowNorm) || [];
      const overflowCursor = cursors.get(overflowNorm) || 0;
      if (overflowCursor < overflowPool.length) {
        const student = overflowPool[overflowCursor];
        const nextIdx = overflowCursor + 1;
        cursors.set(overflowNorm, nextIdx);
        classCursors.set(overflowNorm, nextIdx);
        return student;
      }
    }

    // Priority 2: General fallback — seat next available participating class (avoiding avoidClassCode)
    for (const [candidateNorm, candidatePool] of studentPool.entries()) {
      if (candidateNorm === norm) continue;
      if (avoidClassCode && candidateNorm === normalizeClassCode(avoidClassCode)) continue;
      const cCursor = cursors.get(candidateNorm) || 0;
      if (cCursor < candidatePool.length) {
        const student = candidatePool[cCursor];
        const nextIdx = cCursor + 1;
        cursors.set(candidateNorm, nextIdx);
        classCursors.set(candidateNorm, nextIdx);
        return student;
      }
    }

    return undefined;
  };

  // Determine Default Class A and Class B
  const assignedCodes = columnConfigs
    .map((c) => c.assignedClassCode)
    .filter(Boolean);
  const secondaryCodes = columnConfigs
    .map((c) => c.secondaryClassCode)
    .filter(Boolean);

  const poolKeys = Array.from(studentPool.keys());
  const defaultClassA = assignedCodes[0] || poolKeys[0] || "";
  const defaultClassB =
    secondaryCodes[0] ||
    assignedCodes.find((c) => normalizeClassCode(c) !== normalizeClassCode(defaultClassA)) ||
    poolKeys.find((k) => normalizeClassCode(k) !== normalizeClassCode(defaultClassA)) ||
    defaultClassA;

  room.columns.forEach((colConfig, colIdx) => {
    const colAssign = columnConfigs.find((c) => c.columnIndex === colConfig.columnIndex);

    // Determine per-seat classes (s1, s2, s3) and overflow from config
    let s1Class = "";
    let s2Class = "";
    let s3Class = "";
    const overflowClass = colAssign?.overflowClassCode || "";

    if (colAssign?.s1ClassCode) {
      // New per-seat config
      s1Class = colAssign.s1ClassCode;
      s2Class = colAssign.s2ClassCode || s1Class;
      s3Class = colAssign.s3MirrorS1 !== false ? s1Class : (colAssign.s3ClassCode || s1Class);
    } else if (colAssign?.assignedClassCode) {
      // Legacy compat
      s1Class = colAssign.assignedClassCode;
      s2Class = colAssign.secondaryClassCode ||
        (normalizeClassCode(s1Class) === normalizeClassCode(defaultClassA)
          ? defaultClassB
          : defaultClassA);
      s3Class = s1Class;
    } else {
      if (colIdx % 2 === 0) {
        s1Class = defaultClassA;
        s2Class = defaultClassB;
      } else {
        s1Class = defaultClassB;
        s2Class = defaultClassA;
      }
      s3Class = s1Class;
    }

    const benchCount = colConfig.benchCount;
    const seatsPerBench = colConfig.seatsPerBench || 2;
    const colSeatGrid: Map<string, Student | undefined> = new Map();

    // Determine directional flow for each seat lane (Top-to-Bottom vs Bottom-to-Top)
    const s1Dir = colAssign?.s1Direction || (colAssign?.direction) || getDefaultSeatDirection("INTERLEAVED", colIdx, 1, seatsPerBench);
    const s2Dir = colAssign?.s2Direction || (colAssign?.direction) || getDefaultSeatDirection("INTERLEAVED", colIdx, 2, seatsPerBench);
    const s3Dir = colAssign?.s3Direction || (colAssign?.direction) || getDefaultSeatDirection("INTERLEAVED", colIdx, 3, seatsPerBench);

    if (seatsPerBench === 3) {
      // S1 (Seat 1 - Left)
      if (s1Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, s2Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, s2Class, overflowClass));
        }
      }

      // S3 (Seat 3 - Right)
      if (s3Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-3`, getNextStudentForClass(s3Class, s2Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-3`, getNextStudentForClass(s3Class, s2Class, overflowClass));
        }
      }

      // S2 (Seat 2 - Center)
      if (s2Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-2`, getNextStudentForClass(s2Class, s1Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-2`, getNextStudentForClass(s2Class, s1Class, overflowClass));
        }
      }
    } else if (seatsPerBench === 2) {
      // 2-Seat Bench: S1 (Seat 1 - Left) & S3 (Seat 3 - Right) with S2 (Seat 2 - Middle) left vacant
      const effectiveS3Class = s3Class || s2Class;
      const effectiveS3Dir = s3Dir || s2Dir;

      // S1 (Seat 1 - Left)
      if (s1Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, effectiveS3Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, effectiveS3Class, overflowClass));
        }
      }

      // S3 (Seat 3 - Right) — S2 is left empty/vacant
      if (effectiveS3Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-3`, getNextStudentForClass(effectiveS3Class, s1Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-3`, getNextStudentForClass(effectiveS3Class, s1Class, overflowClass));
        }
      }
    } else if (seatsPerBench === 1) {
      if (s1Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, undefined, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, undefined, overflowClass));
        }
      }
    } else {
      throw new Error(
        `Unsupported seats-per-bench value: ${seatsPerBench}. Only 1, 2, or 3 are supported.`
      );
    }

    // Now flatten into SeatAssignment records ordered by benchIndex then seatPosition
    // For 2-seat benches, render 3 physical slots [1, 2, 3] with Slot 2 as vacant middle gap
    const slotPositions = seatsPerBench === 2 ? [1, 2, 3] : Array.from({ length: seatsPerBench }, (_, i) => i + 1);

    for (let b = 1; b <= benchCount; b++) {
      for (const s of slotPositions) {
        const student = colSeatGrid.get(`${b}-${s}`);
        const isVacant = !student;

        if (student) {
          classesPresentSet.add(
            `${student.presentClass}${student.presentSection ? `-${student.presentSection}` : ""}`
          );
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
          isVacant,
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
    updatedCursors: cursors,
  };
}

// Backward-compatible alias for arrangeRoomUe
export const arrangeRoomUe = arrangeRoomInterleaved;

// ─────────────────────────────────────────────────────────────────────────────
// 2. FIXED OUTER U-LOOP ALGORITHM (2:1 Ratio - School Standard)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fixed Outer U-Loop Seating Engine (2:1 Ratio - School Standard)
 *
 * Rules:
 * - Fixed Role Allocation (2:1 ratio on 3-seat benches):
 *   - In EVERY column:
 *     - Outer Loop Seats (S1 & S3): Primary Class (Class A / S1 Class)
 *     - Center Seat (S2): Secondary Class (Class B / S2 Class)
 * - Direction Flow (3-seat benches):
 *   - Outer Class:
 *     - In EVERY column:
 *       - S1: Top → Bottom (Bench 1 to N, enters Front, exits Rear)
 *       - S3: Bottom → Top (Bench N to 1, loops at Rear, exits Front)
 *       - Seamlessly transitions to the next column's S1 at the Front!
 *   - Center Class:
 *     - Continuous oscillating snake flow:
 *       - Col 1 (colIdx = 0): Top → Bottom (Bench 1 to N, exits Rear)
 *       - Col 2 (colIdx = 1): Bottom → Top (Bench N to 1, enters Rear, exits Front)
 *       - Col 3 (colIdx = 2): Top → Bottom (Bench 1 to N, enters Front, exits Rear)
 *       - Col 4 (colIdx = 3): Bottom → Top (Bench N to 1, enters Rear, exits Front)
 * - Multi-Room Cascade:
 *   - Students seamlessly waterfall into subsequent rooms without resetting.
 */
export function arrangeRoomFixedU(
  room: EmsRoom,
  columnConfigs: ColumnClassAllocationConfig[],
  studentPool: Map<string, Student[]>,
  classCursors: Map<string, number>
): {
  allocatedRoom: AllocatedRoom;
  updatedCursors: Map<string, number>;
} {
  const seats: SeatAssignment[] = [];
  let globalSeatCounter = 1;
  const classesPresentSet = new Set<string>();
  const cursors = new Map<string, number>(classCursors);

  const getNextStudentForClass = (
    classCode: string,
    avoidClassCode?: string,
    overflowClassCode?: string
  ): Student | undefined => {
    if (!classCode) return undefined;
    const norm = normalizeClassCode(classCode);
    const pool = studentPool.get(norm) || [];
    const currentCursor = cursors.get(norm) || 0;
    if (currentCursor < pool.length) {
      const student = pool[currentCursor];
      const nextIdx = currentCursor + 1;
      cursors.set(norm, nextIdx);
      classCursors.set(norm, nextIdx);
      return student;
    }

    // Priority 1: If overflowClassCode is explicitly set by user, try that first
    if (overflowClassCode) {
      const overflowNorm = normalizeClassCode(overflowClassCode);
      const overflowPool = studentPool.get(overflowNorm) || [];
      const overflowCursor = cursors.get(overflowNorm) || 0;
      if (overflowCursor < overflowPool.length) {
        const student = overflowPool[overflowCursor];
        const nextIdx = overflowCursor + 1;
        cursors.set(overflowNorm, nextIdx);
        classCursors.set(overflowNorm, nextIdx);
        return student;
      }
    }

    // Priority 2: General fallback — seat next available participating class (avoiding avoidClassCode)
    for (const [candidateNorm, candidatePool] of studentPool.entries()) {
      if (candidateNorm === norm) continue;
      if (avoidClassCode && candidateNorm === normalizeClassCode(avoidClassCode)) continue;
      const cCursor = cursors.get(candidateNorm) || 0;
      if (cCursor < candidatePool.length) {
        const student = candidatePool[cCursor];
        const nextIdx = cCursor + 1;
        cursors.set(candidateNorm, nextIdx);
        classCursors.set(candidateNorm, nextIdx);
        return student;
      }
    }

    return undefined;
  };

  // Determine Default Class A (Outer) and Class B (Center)
  const assignedCodes = columnConfigs
    .map((c) => c.s1ClassCode || c.assignedClassCode)
    .filter(Boolean);
  const secondaryCodes = columnConfigs
    .map((c) => c.s2ClassCode || c.secondaryClassCode)
    .filter(Boolean);

  const poolKeys = Array.from(studentPool.keys());
  const defaultClassA = assignedCodes[0] || poolKeys[0] || "";
  const defaultClassB =
    secondaryCodes[0] ||
    assignedCodes.find((c) => normalizeClassCode(c) !== normalizeClassCode(defaultClassA)) ||
    poolKeys.find((k) => normalizeClassCode(k) !== normalizeClassCode(defaultClassA)) ||
    defaultClassA;

  room.columns.forEach((colConfig, colIdx) => {
    const colAssign = columnConfigs.find((c) => c.columnIndex === colConfig.columnIndex);

    let s1Class = "";
    let s2Class = "";
    let s3Class = "";
    const overflowClass = colAssign?.overflowClassCode || "";

    if (colAssign?.s1ClassCode) {
      s1Class = colAssign.s1ClassCode;
      s2Class = colAssign.s2ClassCode || defaultClassB;
      s3Class = colAssign.s3MirrorS1 !== false ? s1Class : (colAssign.s3ClassCode || s1Class);
    } else if (colAssign?.assignedClassCode) {
      s1Class = colAssign.assignedClassCode;
      s2Class = colAssign.secondaryClassCode || defaultClassB;
      s3Class = s1Class;
    } else {
      s1Class = defaultClassA;
      s2Class = defaultClassB;
      s3Class = defaultClassA;
    }

    const benchCount = colConfig.benchCount;
    const seatsPerBench = colConfig.seatsPerBench || 2;
    const colSeatGrid: Map<string, Student | undefined> = new Map();

    // Determine directional flow for each seat lane (Top-to-Bottom vs Bottom-to-Top)
    const s1Dir = colAssign?.s1Direction || (colAssign?.direction) || getDefaultSeatDirection("FIXED_U", colIdx, 1, seatsPerBench);
    const s2Dir = colAssign?.s2Direction || (colAssign?.direction) || getDefaultSeatDirection("FIXED_U", colIdx, 2, seatsPerBench);
    const s3Dir = colAssign?.s3Direction || (colAssign?.direction) || getDefaultSeatDirection("FIXED_U", colIdx, 3, seatsPerBench);

    if (seatsPerBench === 3) {
      // S1 (Seat 1 - Outer Left)
      if (s1Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, s2Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, s2Class, overflowClass));
        }
      }

      // S3 (Seat 3 - Outer Right)
      if (s3Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-3`, getNextStudentForClass(s3Class, s2Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-3`, getNextStudentForClass(s3Class, s2Class, overflowClass));
        }
      }

      // S2 (Seat 2 - Center)
      if (s2Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-2`, getNextStudentForClass(s2Class, s1Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-2`, getNextStudentForClass(s2Class, s1Class, overflowClass));
        }
      }
    } else if (seatsPerBench === 2) {
      // 2-Seat Bench: S1 (Seat 1 - Left) & S3 (Seat 3 - Right) with S2 (Seat 2 - Middle) left vacant
      const effectiveS3Class = s3Class || s2Class;
      const effectiveS3Dir = s3Dir || s2Dir;

      // S1 (Seat 1 - Left)
      if (s1Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, effectiveS3Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, effectiveS3Class, overflowClass));
        }
      }

      // S3 (Seat 3 - Right) — S2 is left empty/vacant
      if (effectiveS3Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-3`, getNextStudentForClass(effectiveS3Class, s1Class, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-3`, getNextStudentForClass(effectiveS3Class, s1Class, overflowClass));
        }
      }
    } else if (seatsPerBench === 1) {
      if (s1Dir === "bottom-to-top") {
        for (let b = benchCount; b >= 1; b--) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, undefined, overflowClass));
        }
      } else {
        for (let b = 1; b <= benchCount; b++) {
          colSeatGrid.set(`${b}-1`, getNextStudentForClass(s1Class, undefined, overflowClass));
        }
      }
    } else {
      throw new Error(
        `Unsupported seats-per-bench value: ${seatsPerBench}. Only 1, 2, or 3 are supported.`
      );
    }

    // Flatten into SeatAssignment records ordered by benchIndex then seatPosition
    // For 2-seat benches, render 3 physical slots [1, 2, 3] with Slot 2 as vacant middle gap
    const slotPositions = seatsPerBench === 2 ? [1, 2, 3] : Array.from({ length: seatsPerBench }, (_, i) => i + 1);

    for (let b = 1; b <= benchCount; b++) {
      for (const s of slotPositions) {
        const student = colSeatGrid.get(`${b}-${s}`);
        const isVacant = !student;

        if (student) {
          classesPresentSet.add(
            `${student.presentClass}${student.presentSection ? `-${student.presentSection}` : ""}`
          );
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
          isVacant,
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
    updatedCursors: cursors,
  };
}

/**
 * Universal dispatcher for room arrangement based on selected pattern
 */
export function arrangeRoomUnified(
  pattern: ArrangementPattern,
  room: EmsRoom,
  columnConfigs: ColumnClassAllocationConfig[],
  studentPool: Map<string, Student[]>,
  classCursors: Map<string, number>
): {
  allocatedRoom: AllocatedRoom;
  updatedCursors: Map<string, number>;
} {
  if (pattern === "FIXED_U") {
    return arrangeRoomFixedU(room, columnConfigs, studentPool, classCursors);
  }
  return arrangeRoomInterleaved(room, columnConfigs, studentPool, classCursors);
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. UU (UNEVEN) ARRANGEMENT ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────
/**
 * In UU (Uneven):
 * - Continuous seat-by-seat, bench-by-bench, column-by-column fill.
 * - Continuity Rule:
 *   - Column 1 starts at top (Bench 1), proceeds Bench 1..N (ends at bottom).
 *   - Column 2 starts at bottom (Bench N), proceeds Bench N..1 (ends at top).
 *   - Column 3 starts at top (Bench 1), proceeds Bench 1..N (ends at bottom).
 *   - This produces an unbroken S-shape invigilator walking path!
 * - If a class's rolls run out mid-arrangement (even mid-bench), the fill pauses
 *   and asks the admin which class should continue next.
 */
export interface UuArrangeResult {
  allocatedRoom: AllocatedRoom;
  updatedCursors: Map<string, number>;
  pausePrompt?: ArrangementPromptState;
  isComplete: boolean;
}

export function arrangeRoomUu(
  room: EmsRoom,
  activeClassOrder: string[],
  studentPool: Map<string, Student[]>,
  classCursors: Map<string, number>,
  startClassIndex: number = 0,
  startDirection: FillDirection = "top-to-bottom"
): UuArrangeResult {
  const seats: SeatAssignment[] = [];
  let globalSeatCounter = 1;
  const classesPresentSet = new Set<string>();
  const cursors = new Map<string, number>(classCursors);

  // Normalize class order list
  const classList = activeClassOrder
    .map(normalizeClassCode)
    .filter((c, idx, arr) => c && arr.indexOf(c) === idx);

  let currentClassIdx = startClassIndex;

  const getNextStudent = (
    currentCol: number,
    currentBench: number,
    currentSeatPos: number
  ): { student?: Student; pausePrompt?: ArrangementPromptState } => {
    while (currentClassIdx < classList.length) {
      const cls = classList[currentClassIdx];
      const pool = studentPool.get(cls) || [];
      const cursor = cursors.get(cls) || 0;

      if (cursor < pool.length) {
        const st = pool[cursor];
        cursors.set(cls, cursor + 1);
        return { student: st };
      }

      // Current class exhausted!
      const exhaustedClass = cls;
      const lastRoll = pool.length > 0 ? pool[pool.length - 1]?.presentRoll : undefined;

      // Check if there are remaining classes with unseated students
      const remainingClasses: ArrangementPromptState["availableClasses"] = [];
      for (let i = 0; i < classList.length; i++) {
        const testCls = classList[i];
        if (testCls === exhaustedClass) continue;
        const testPool = studentPool.get(testCls) || [];
        const testCursor = cursors.get(testCls) || 0;
        const rem = testPool.length - testCursor;
        if (rem > 0) {
          remainingClasses.push({
            classCode: testCls,
            remainingCount: rem,
            displayName: `Class ${testCls} (${rem} remaining)`,
          });
        }
      }

      // If there are other classes available, pause and return prompt
      if (remainingClasses.length > 0) {
        return {
          pausePrompt: {
            isOpen: true,
            type: "CLASS_EXHAUSTED",
            roomId: room.id,
            roomNumber: room.roomNumber,
            currentClass: exhaustedClass,
            exhaustedRoll: lastRoll,
            columnIndex: currentCol,
            benchIndex: currentBench,
            seatPosition: currentSeatPos,
            availableClasses: remainingClasses,
          },
        };
      }

      currentClassIdx++;
    }

    // No more students in any class
    return {};
  };

  // Seat matrix in room to store allocated students
  // key: `${columnIndex}-${benchIndex}-${seatPosition}` -> Student | undefined
  const seatGrid = new Map<string, Student | undefined>();
  let encounteredPrompt: ArrangementPromptState | undefined = undefined;

  // Track direction for continuity across columns
  let currentDirection: FillDirection = startDirection;

  for (let cIdx = 0; cIdx < room.columns.length; cIdx++) {
    const colConfig = room.columns[cIdx];
    const benchCount = colConfig.benchCount;
    const seatsPerBench = colConfig.seatsPerBench || 2;
    if (seatsPerBench < 1 || seatsPerBench > 3) {
      throw new Error(
        `Unsupported seats-per-bench value: ${seatsPerBench}. Only 1, 2, or 3 are supported.`
      );
    }

    // Determine bench order based on current column direction
    // If top-to-bottom: B1 -> Bn
    // If bottom-to-top: Bn -> B1
    const benchIndices: number[] = [];
    if (currentDirection === "top-to-bottom") {
      for (let b = 1; b <= benchCount; b++) benchIndices.push(b);
    } else {
      for (let b = benchCount; b >= 1; b--) benchIndices.push(b);
    }

    const slotPositionsToFill = seatsPerBench === 2 ? [1, 3] : Array.from({ length: seatsPerBench }, (_, i) => i + 1);

    for (const b of benchIndices) {
      for (const s of slotPositionsToFill) {
        if (encounteredPrompt) {
          // Already hit a pause point, mark remaining slots vacant until user resumes
          seatGrid.set(`${colConfig.columnIndex}-${b}-${s}`, undefined);
          continue;
        }

        const { student, pausePrompt } = getNextStudent(colConfig.columnIndex, b, s);

        if (pausePrompt) {
          encounteredPrompt = pausePrompt;
          seatGrid.set(`${colConfig.columnIndex}-${b}-${s}`, undefined);
        } else {
          seatGrid.set(`${colConfig.columnIndex}-${b}-${s}`, student);
        }
      }
    }

    // Apply Continuity Rule across columns:
    // Whichever end this column finished on, the next starts on that same end and reverses direction
    currentDirection = currentDirection === "top-to-bottom" ? "bottom-to-top" : "top-to-bottom";
  }

  // Construct final sequential SeatAssignment array
  room.columns.forEach((colConfig) => {
    const benchCount = colConfig.benchCount;
    const seatsPerBench = colConfig.seatsPerBench || 2;
    const slotPositions = seatsPerBench === 2 ? [1, 2, 3] : Array.from({ length: seatsPerBench }, (_, i) => i + 1);

    for (let b = 1; b <= benchCount; b++) {
      for (const s of slotPositions) {
        const student = seatGrid.get(`${colConfig.columnIndex}-${b}-${s}`);
        const isVacant = !student;

        if (student) {
          classesPresentSet.add(
            `${student.presentClass}${student.presentSection ? `-${student.presentSection}` : ""}`
          );
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
          isVacant,
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
    updatedCursors: cursors,
    pausePrompt: encounteredPrompt,
    isComplete: !encounteredPrompt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MASTER ARRANGE DISPATCHER (Room-by-Room with Overflow Handling)
// ─────────────────────────────────────────────────────────────────────────────
export function arrangeRoom(
  room: EmsRoom,
  config: RoomArrangementConfig,
  studentPool: Map<string, Student[]>,
  classCursors: Map<string, number>
): {
  allocatedRoom: AllocatedRoom;
  updatedCursors: Map<string, number>;
  pausePrompt?: ArrangementPromptState;
} {
  const result = arrangeRoomInterleaved(
    room,
    config.columnAssignments,
    studentPool,
    classCursors
  );
  return {
    allocatedRoom: result.allocatedRoom,
    updatedCursors: result.updatedCursors,
  };
}
