/**
 * Routine Forge Pro - Constraint Satisfaction Engine (TypeScript)
 * 
 * Optimized Backtracking Solver with MRV (Minimum Remaining Values),
 * Degree Heuristics, Least Constraining Value (LCV) domain scoring,
 * Lab double-period support, Room arbitration, Burnout limits, and Half-day bounds.
 */

import {
  RoutineSettings,
  RoutineClass,
  RoutineSubject,
  RoutineRoom,
  RoutineTeacher,
  RoutineAssignment,
  RoutineCellData,
  RoutineGrid,
  GeneratedRoutine,
  ValidationReport,
  DEFAULT_ROUTINE_SETTINGS,
} from './types';

export * from './types';

interface Unit {
  uid: number;
  cid: string;
  sid: string;
  tid: string;
  rid: string | null;
  sz: number;
  hard: boolean;
  multi: boolean;
  maxPerDay: number;
  timePref: 'any' | 'morning' | 'afternoon';
  isClassTeacherUnit: boolean;
  targetFirstPeriods: number;
  mrv: number;
  slot: { dPos: number; pPos: number } | null;
}

export class RoutineSolver {
  private settings: RoutineSettings;
  private classes: RoutineClass[];
  private teachers: Map<string, RoutineTeacher>;
  private subjects: Map<string, RoutineSubject>;
  private assignments: RoutineAssignment[];
  private rooms: Map<string, RoutineRoom>;

  constructor(
    settings: RoutineSettings,
    classes: RoutineClass[],
    teachers: RoutineTeacher[],
    subjects: RoutineSubject[],
    assignments: RoutineAssignment[],
    rooms: RoutineRoom[] = []
  ) {
    this.settings = {
      workingDays: (settings?.workingDays || DEFAULT_ROUTINE_SETTINGS.workingDays).slice().sort((a, b) => a - b),
      periodsPerDay: settings?.periodsPerDay || DEFAULT_ROUTINE_SETTINGS.periodsPerDay,
      halfDays: settings?.halfDays || DEFAULT_ROUTINE_SETTINGS.halfDays,
      halfDayPeriods: settings?.halfDayPeriods || DEFAULT_ROUTINE_SETTINGS.halfDayPeriods,
      breaks: settings?.breaks || DEFAULT_ROUTINE_SETTINGS.breaks,
      tchDailyMax: settings?.tchDailyMax || DEFAULT_ROUTINE_SETTINGS.tchDailyMax,
      tchConsecMax: settings?.tchConsecMax || DEFAULT_ROUTINE_SETTINGS.tchConsecMax,
    };
    this.classes = classes || [];
    this.teachers = new Map((teachers || []).map((t) => [t.id, t]));
    this.subjects = new Map((subjects || []).map((s) => [s.id, s]));
    this.assignments = assignments || [];
    this.rooms = new Map((rooms || []).map((r) => [r.id, r]));
  }

  public getTeachingPeriods(): number[] {
    const periods: number[] = [];
    for (let p = 1; p <= this.settings.periodsPerDay; p++) {
      if (!this.settings.breaks.includes(p)) {
        periods.push(p);
      }
    }
    return periods;
  }

  public validatePreconditions(): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const daysCount = this.settings.workingDays.length;
    const teachingPeriods = this.getTeachingPeriods();

    if (daysCount === 0) {
      errors.push('No active working days configured.');
    }
    if (teachingPeriods.length === 0) {
      errors.push('No teaching periods available (all periods are configured as breaks).');
    }
    if (this.classes.length === 0) {
      errors.push('No classes configured in the schedule.');
    }
    if (this.assignments.length === 0) {
      errors.push('No workload assignments configured.');
    }

    // Class Capacity Check
    for (const cls of this.classes) {
      const clsLimit = cls.dailyPeriods || this.settings.periodsPerDay;
      let totalClassSlots = 0;
      for (const d of this.settings.workingDays) {
        const isHalf = this.settings.halfDays.includes(d);
        const dayMax = isHalf ? Math.min(this.settings.halfDayPeriods, clsLimit) : clsLimit;
        totalClassSlots += teachingPeriods.filter((p) => p <= dayMax).length;
      }

      const assignedPeriods = this.assignments
        .filter((a) => a.classId === cls.id)
        .reduce((sum, a) => sum + a.periodsPerWeek, 0);

      if (assignedPeriods > totalClassSlots) {
        errors.push(
          `Class ${cls.className} (${cls.section}): Assigned periods (${assignedPeriods}) exceeds weekly capacity (${totalClassSlots}).`
        );
      }
    }

    // Teacher Capacity Check
    for (const [tId, teacher] of this.teachers) {
      const load = this.assignments
        .filter((a) => a.teacherId === tId)
        .reduce((sum, a) => sum + a.periodsPerWeek, 0);

      if (load > teacher.maxPeriods) {
        errors.push(
          `Teacher ${teacher.name}: Workload (${load} p/wk) exceeds max limit (${teacher.maxPeriods}).`
        );
      }

      // Check teacher availability slots
      let totalAvailSlots = 0;
      for (const d of this.settings.workingDays) {
        const availList = teacher.availableSlots?.[d] || (teacher.availableSlots as Record<string, number[]>)?.[String(d)] || [];
        totalAvailSlots += availList.filter((p: number) => !this.settings.breaks.includes(p)).length;
      }

      if (load > totalAvailSlots) {
        errors.push(
          `Teacher ${teacher.name}: Workload (${load}) exceeds total marked available slots (${totalAvailSlots}).`
        );
      }
    }

    // Subject daily period capacity check
    for (const asg of this.assignments) {
      const subj = this.subjects.get(asg.subjectId);
      const cls = this.classes.find((c) => c.id === asg.classId);
      if (subj) {
        const maxDaily = subj.allowMultiplePerDay ? (subj.maxPerDay || 2) : 1;
        const maxCapacity = daysCount * maxDaily;
        if (asg.periodsPerWeek > maxCapacity) {
          errors.push(
            `Class ${cls?.className || '?'}: ${subj.name} requires ${asg.periodsPerWeek} p/wk but maximum daily cap is ${maxDaily}/day (${maxCapacity} max across ${daysCount} days).`
          );
        }
      }
    }

    // Room Capacity Check
    const roomLoads = new Map<string, number>();
    for (const asg of this.assignments) {
      if (asg.roomId) {
        roomLoads.set(asg.roomId, (roomLoads.get(asg.roomId) || 0) + asg.periodsPerWeek);
      }
    }
    const maxRoomSlots = daysCount * teachingPeriods.length;
    for (const [rId, load] of roomLoads) {
      const room = this.rooms.get(rId);
      if (load > maxRoomSlots) {
        errors.push(
          `Room ${room?.name || rId}: Assigned load (${load}) exceeds total room slot capacity (${maxRoomSlots}).`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public solve(maxIterations: number = 120000): GeneratedRoutine {
    const startTime = Date.now();
    const validation = this.validatePreconditions();
    if (!validation.isValid) {
      return {
        success: false,
        grid: {},
        days: this.settings.workingDays,
        teachingPeriods: this.getTeachingPeriods(),
        breaks: this.settings.breaks,
        iterations: 0,
        executionTimeMs: Date.now() - startTime,
        generatedAt: new Date().toISOString(),
        stats: {
          totalUnits: 0,
          placedUnits: 0,
          iterations: 0,
          executionTimeMs: Date.now() - startTime,
        },
        diagnostics: validation.errors,
      };
    }

    const days = this.settings.workingDays;
    const teachingPeriods = this.getTeachingPeriods();
    const D = days.length;
    const P = teachingPeriods.length;
    const halfDays = this.settings.halfDays;
    const maxHalfP = this.settings.halfDayPeriods;

    // Break boundary for Morning/Afternoon preference
    const breakP = this.settings.breaks.length
      ? Math.min(...this.settings.breaks)
      : Math.floor(this.settings.periodsPerDay / 2) + 1;

    // Deconstruct assignments into schedulable atomic units
    const units: Unit[] = [];
    let unitCounter = 0;

    for (const asg of this.assignments) {
      const subj = this.subjects.get(asg.subjectId);
      if (!subj) continue;

      const maxDaily = subj.allowMultiplePerDay ? (subj.maxPerDay || 2) : 1;
      const tch = this.teachers.get(asg.teacherId);
      const cls = this.classes.find((c) => c.id === asg.classId);
      const fullClassLabel = `${cls?.className || ""}${cls?.section && cls.section !== "ALL" ? ` - ${cls.section}` : ""}`.toLowerCase();
      const clsNameLower = (cls?.className || "").toLowerCase();
      const isCT = Boolean(
        tch?.classTeacherOf &&
        (tch.classTeacherOf.toLowerCase() === fullClassLabel ||
         tch.classTeacherOf.toLowerCase() === clsNameLower ||
         (clsNameLower && tch.classTeacherOf.toLowerCase().includes(clsNameLower)))
      );
      const targetFirstPeriods = isCT ? (tch?.classTeacherFirstPeriods ?? 3) : 0;

      let rem = asg.periodsPerWeek;
      if (subj.isLab) {
        while (rem >= 2) {
          units.push({
            uid: unitCounter++,
            cid: asg.classId,
            sid: asg.subjectId,
            tid: asg.teacherId,
            rid: asg.roomId || null,
            sz: 2,
            hard: subj.isHard,
            multi: subj.allowMultiplePerDay,
            maxPerDay: maxDaily,
            timePref: subj.timePref,
            isClassTeacherUnit: isCT,
            targetFirstPeriods: targetFirstPeriods,
            mrv: 0,
            slot: null,
          });
          rem -= 2;
        }
        if (rem === 1) {
          units.push({
            uid: unitCounter++,
            cid: asg.classId,
            sid: asg.subjectId,
            tid: asg.teacherId,
            rid: asg.roomId || null,
            sz: 1,
            hard: subj.isHard,
            multi: subj.allowMultiplePerDay,
            maxPerDay: maxDaily,
            timePref: subj.timePref,
            isClassTeacherUnit: isCT,
            targetFirstPeriods: targetFirstPeriods,
            mrv: 0,
            slot: null,
          });
        }
      } else {
        for (let i = 0; i < rem; i++) {
          units.push({
            uid: unitCounter++,
            cid: asg.classId,
            sid: asg.subjectId,
            tid: asg.teacherId,
            rid: asg.roomId || null,
            sz: 1,
            hard: subj.isHard,
            multi: subj.allowMultiplePerDay,
            maxPerDay: maxDaily,
            timePref: subj.timePref,
            isClassTeacherUnit: isCT,
            targetFirstPeriods: targetFirstPeriods,
            mrv: 0,
            slot: null,
          });
        }
      }
    }

    // Grid states
    const cBusy: Record<string, (Unit | null)[][]> = {};
    const tBusy: Record<string, (Unit | null)[][]> = {};
    const tDayLoad: Record<string, number[]> = {};
    const rBusy: Record<string, (Unit | null)[][]> = {};

    for (const c of this.classes) {
      cBusy[c.id] = Array.from({ length: D }, () => new Array(P).fill(null));
    }
    for (const [tId] of this.teachers) {
      tBusy[tId] = Array.from({ length: D }, () => new Array(P).fill(null));
      tDayLoad[tId] = new Array(D).fill(0);
    }
    for (const [rId] of this.rooms) {
      rBusy[rId] = Array.from({ length: D }, () => new Array(P).fill(null));
    }

    const getTchConsecutiveBlocks = (tid: string, dPos: number, startPpos: number, sz: number): number => {
      let maxBlock = 0;
      let current = 0;
      const physGrid = new Array(this.settings.periodsPerDay + 1).fill(false);

      for (let p = 0; p < P; p++) {
        if (tBusy[tid]?.[dPos]?.[p]) {
          physGrid[teachingPeriods[p]] = true;
        }
      }
      physGrid[teachingPeriods[startPpos]] = true;
      if (sz === 2) {
        physGrid[teachingPeriods[startPpos + 1]] = true;
      }

      for (let i = 1; i <= this.settings.periodsPerDay; i++) {
        if (physGrid[i]) {
          current++;
          if (current > maxBlock) maxBlock = current;
        } else {
          current = 0;
        }
      }
      return maxBlock;
    };

    const checkSlot = (u: Unit, dPos: number, pPos: number): boolean => {
      const tid = u.tid;
      const cid = u.cid;
      const sid = u.sid;
      const rid = u.rid;
      const actDay = days[dPos];
      const pNum = teachingPeriods[pPos];

      // Class limits
      const cls = this.classes.find((x) => x.id === cid);
      const cDaily = cls?.dailyPeriods || this.settings.periodsPerDay;
      if (pNum > cDaily) return false;
      if (halfDays.includes(actDay) && pNum > maxHalfP) return false;
      if (cBusy[cid]?.[dPos]?.[pPos] || tBusy[tid]?.[dPos]?.[pPos]) return false;

      // Room availability
      if (rid && rBusy[rid]?.[dPos]?.[pPos]) return false;

      // Subject time preference
      if (u.timePref === 'morning' && pNum >= breakP) return false;
      if (u.timePref === 'afternoon' && pNum <= breakP) return false;

      // Teacher availability grid
      const tch = this.teachers.get(tid);
      if (!tch) return false;
      const availSlots = tch.availableSlots?.[actDay] || (tch.availableSlots as Record<string, number[]>)?.[String(actDay)] || [];
      if (!availSlots.includes(pNum)) return false;

      // Lab block (size = 2) checks
      if (u.sz === 2) {
        if (pPos >= P - 1) return false;
        const pNum2 = teachingPeriods[pPos + 1];
        if (pNum2 > cDaily) return false;
        if (halfDays.includes(actDay) && pNum2 > maxHalfP) return false;
        if (pNum2 - pNum !== 1) return false; // Must be physically consecutive without a break in-between
        if (cBusy[cid]?.[dPos]?.[pPos + 1] || tBusy[tid]?.[dPos]?.[pPos + 1]) return false;
        if (rid && rBusy[rid]?.[dPos]?.[pPos + 1]) return false;
        if (!availSlots.includes(pNum2)) return false;
        if (u.timePref === 'morning' && pNum2 >= breakP) return false;
        if (u.timePref === 'afternoon' && pNum2 <= breakP) return false;
      }

      // Subject daily frequency constraint (maxPerDay)
      const maxDaily = u.multi ? (u.maxPerDay || 2) : 1;
      let daySlotsUsed = 0;
      for (let p = 0; p < P; p++) {
        const b = cBusy[cid]?.[dPos]?.[p];
        if (b && b.sid === sid) {
          daySlotsUsed++;
        }
      }
      if (daySlotsUsed + u.sz > maxDaily) return false;

      // Teacher daily & consecutive period burnout limits
      if ((tDayLoad[tid]?.[dPos] || 0) + u.sz > this.settings.tchDailyMax) return false;
      if (getTchConsecutiveBlocks(tid, dPos, pPos, u.sz) > this.settings.tchConsecMax) return false;

      return true;
    };

    // Calculate MRV for each unit
    for (const u of units) {
      let options = 0;
      for (let d = 0; d < D; d++) {
        for (let p = 0; p < P; p++) {
          if (checkSlot(u, d, p)) options++;
        }
      }
      u.mrv = options;
    }

    // MRV Ordering: prioritize Class Teacher units targeting Period 1, then most constrained units, tie-break by size (2 before 1), then hard subjects
    units.sort((a, b) => {
      if (a.isClassTeacherUnit && a.targetFirstPeriods > 0 && !(b.isClassTeacherUnit && b.targetFirstPeriods > 0)) return -1;
      if (!(a.isClassTeacherUnit && a.targetFirstPeriods > 0) && b.isClassTeacherUnit && b.targetFirstPeriods > 0) return 1;
      return a.mrv - b.mrv || b.sz - a.sz || (b.hard ? 1 : 0) - (a.hard ? 1 : 0);
    });

    const place = (u: Unit, dPos: number, pPos: number, isPlace: boolean) => {
      const val = isPlace ? u : null;
      cBusy[u.cid][dPos][pPos] = val;
      tBusy[u.tid][dPos][pPos] = val;
      if (u.rid && rBusy[u.rid]) rBusy[u.rid][dPos][pPos] = val;

      if (u.sz === 2) {
        cBusy[u.cid][dPos][pPos + 1] = val;
        tBusy[u.tid][dPos][pPos + 1] = val;
        if (u.rid && rBusy[u.rid]) rBusy[u.rid][dPos][pPos + 1] = val;
      }

      tDayLoad[u.tid][dPos] += isPlace ? u.sz : -u.sz;
      u.slot = isPlace ? { dPos, pPos } : null;
    };

    let iterations = 0;

    const solveBacktrack = (idx: number): boolean => {
      if (idx >= units.length) return true;
      iterations++;
      if (iterations > maxIterations) return false;

      const u = units[idx];
      const candidates: { dPos: number; pPos: number; score: number }[] = [];

      for (let d = 0; d < D; d++) {
        for (let p = 0; p < P; p++) {
          if (checkSlot(u, d, p)) {
            // Heuristic scoring (lower score = higher priority)
            let score = 0;
            if (u.hard) {
              score += p; // Push hard subjects earlier in the day
            }
            // Gap minimization for teachers (cluster periods to avoid random isolated periods)
            let adj = 0;
            if (p > 0 && tBusy[u.tid]?.[d]?.[p - 1]) adj++;
            if (p < P - 1 && tBusy[u.tid]?.[d]?.[p + 1]) adj++;
            score -= adj * 25;

            // Class Teacher 1st Period Quota Logic: Prioritize Period 1 (p === 0) for the Class Teacher in their own class
            if (u.isClassTeacherUnit && u.targetFirstPeriods > 0) {
              const isFirstPeriod = p === 0;
              let ctFirstPeriodsPlaced = 0;
              for (let dayIdx = 0; dayIdx < D; dayIdx++) {
                const placed = cBusy[u.cid]?.[dayIdx]?.[0];
                if (placed && placed.tid === u.tid) {
                  ctFirstPeriodsPlaced++;
                }
              }

              if (isFirstPeriod) {
                if (ctFirstPeriodsPlaced < u.targetFirstPeriods) {
                  score -= 800; // Strong priority for Class Teacher in Period 1
                }
              } else {
                if (ctFirstPeriodsPlaced < u.targetFirstPeriods) {
                  score += 60; // Defer non-Period-1 slots until CT 1st period target is satisfied
                }
              }
            }

            candidates.push({ dPos: d, pPos: p, score });
          }
        }
      }

      candidates.sort((a, b) => a.score - b.score);

      for (const c of candidates) {
        place(u, c.dPos, c.pPos, true);
        if (solveBacktrack(idx + 1)) return true;
        place(u, c.dPos, c.pPos, false);
      }

      return false;
    };

    const solved = solveBacktrack(0);

    if (solved) {
      const grid: RoutineGrid = {};
      for (const c of this.classes) {
        grid[c.id] = Array.from({ length: D }, () => new Array(P).fill(null));
      }

      for (const u of units) {
        if (u.slot) {
          const isLab = u.sz === 2;
          grid[u.cid][u.slot.dPos][u.slot.pPos] = {
            sid: u.sid,
            tid: u.tid,
            rid: u.rid,
            sz: u.sz,
            lab: isLab,
            half: isLab ? 'start' : undefined,
            uid: u.uid,
          };
          if (isLab) {
            grid[u.cid][u.slot.dPos][u.slot.pPos + 1] = {
              sid: u.sid,
              tid: u.tid,
              rid: u.rid,
              sz: u.sz,
              lab: true,
              half: 'end',
              uid: u.uid,
            };
          }
        }
      }

      return {
        success: true,
        grid,
        days,
        teachingPeriods,
        breaks: this.settings.breaks,
        iterations,
        executionTimeMs: Date.now() - startTime,
        generatedAt: new Date().toISOString(),
        stats: {
          totalUnits: units.length,
          placedUnits: units.length,
          iterations,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }

    return {
      success: false,
      grid: {},
      days,
      teachingPeriods,
      breaks: this.settings.breaks,
      iterations,
      executionTimeMs: Date.now() - startTime,
      generatedAt: new Date().toISOString(),
      stats: {
        totalUnits: units.length,
        placedUnits: 0,
        iterations,
        executionTimeMs: Date.now() - startTime,
      },
      diagnostics: [
        'Solver reached iteration limit or mathematical contradiction.',
        'Constraints may be over-constrained (check teacher availability grids, room bottlenecks, or daily burnout limits).',
      ],
    };
  }
}

/**
 * Top-level convenience validation function
 */
export function validateRoutineData(
  settings: RoutineSettings,
  classes: RoutineClass[],
  teachers: RoutineTeacher[],
  subjects: RoutineSubject[],
  assignments: RoutineAssignment[],
  rooms: RoutineRoom[] = []
): ValidationReport {
  const solver = new RoutineSolver(settings, classes, teachers, subjects, assignments, rooms);
  return solver.validatePreconditions();
}

/**
 * Top-level convenience routine generation function
 */
export function generateRoutine(
  settings: RoutineSettings,
  classes: RoutineClass[],
  teachers: RoutineTeacher[],
  subjects: RoutineSubject[],
  assignments: RoutineAssignment[],
  rooms: RoutineRoom[] = []
): GeneratedRoutine {
  const solver = new RoutineSolver(settings, classes, teachers, subjects, assignments, rooms);
  return solver.solve();
}
