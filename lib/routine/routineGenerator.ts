/**
 * Routine Forge Pro - Constraint Satisfaction Engine (TypeScript)
 * 
 * Optimized Two-Phase Backtracking Solver with MRV (Minimum Remaining Values),
 * Degree Heuristics, Least Constraining Value (LCV) domain scoring,
 * Lab double-period support, Room arbitration, Burnout limits, and Half-day bounds.
 */

import {
  RoutineSettings,
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  RoutineRoom,
  RoutineGrid,
  GeneratedRoutine,
  ValidationReport,
  DiagnosticItem,
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
  symmGroup?: string;
  symmIndex?: number;
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
      periods.push(p);
    }
    return periods;
  }

  public validatePreconditions(): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const diagnosticItems: DiagnosticItem[] = [];

    const daysCount = this.settings.workingDays.length;
    const teachingPeriods = this.getTeachingPeriods();
    const halfDays = this.settings.halfDays;
    const fullDaysCount = this.settings.workingDays.filter((d) => !halfDays.includes(d)).length;
    const halfDaysCount = this.settings.workingDays.filter((d) => halfDays.includes(d)).length;

    if (daysCount === 0) {
      errors.push('No active working days configured.');
      diagnosticItems.push({
        type: 'general',
        severity: 'error',
        title: 'No Working Days',
        description: 'Routine requires at least 1 active working day in settings.',
      });
    }
    if (teachingPeriods.length === 0) {
      errors.push('No teaching periods available.');
      diagnosticItems.push({
        type: 'general',
        severity: 'error',
        title: 'Zero Periods Configured',
        description: 'Daily teaching periods must be greater than zero.',
      });
    }
    if (this.classes.length === 0) {
      errors.push('No classes configured in the schedule.');
      diagnosticItems.push({
        type: 'capacity_overflow',
        severity: 'error',
        title: 'No Classes Configured',
        description: 'Add at least one class section before generating routine.',
      });
    }
    if (this.assignments.length === 0) {
      errors.push('No workload assignments configured.');
      diagnosticItems.push({
        type: 'faculty_shortage',
        severity: 'error',
        title: 'Empty Assignments',
        description: 'Assign subjects to teachers or run Auto-Map Workloads.',
      });
    }

    // Break boundary for Morning/Afternoon preference
    const breakP = this.settings.breaks.length
      ? Math.min(...this.settings.breaks)
      : Math.floor(this.settings.periodsPerDay / 2);

    // 1. Class Capacity & Morning Preference Saturation Check
    for (const cls of this.classes) {
      const clsLimit = cls.dailyPeriods || this.settings.periodsPerDay;
      let totalClassSlots = 0;
      let totalMorningSlots = 0;

      for (const d of this.settings.workingDays) {
        const isHalf = halfDays.includes(d);
        const dayMax = isHalf ? Math.min(this.settings.halfDayPeriods, clsLimit) : clsLimit;
        totalClassSlots += teachingPeriods.filter((p) => p <= dayMax).length;
        totalMorningSlots += teachingPeriods.filter((p) => p <= Math.min(dayMax, breakP)).length;
      }

      const clsAssignments = this.assignments.filter((a) => a.classId === cls.id);
      const assignedPeriods = clsAssignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);

      if (assignedPeriods > totalClassSlots) {
        const err = `Class ${cls.className} (${cls.section}): Assigned periods (${assignedPeriods}) exceeds weekly capacity (${totalClassSlots}).`;
        errors.push(err);
        diagnosticItems.push({
          type: 'capacity_overflow',
          severity: 'error',
          className: `${cls.className} - ${cls.section}`,
          title: `Class Over-Capacity: ${cls.className} (${cls.section})`,
          description: `Total subject load (${assignedPeriods} p/wk) exceeds total class timetable slots (${totalClassSlots} p/wk).`,
          solution: 'Reduce weekly periods for some subjects or increase daily periods.',
        });
      }

      // Morning Preference Saturation Check
      let morningPeriodsDemand = 0;
      for (const asg of clsAssignments) {
        const subj = this.subjects.get(asg.subjectId);
        if (subj?.timePref === 'morning') {
          morningPeriodsDemand += asg.periodsPerWeek;
        }
      }

      if (morningPeriodsDemand > totalMorningSlots) {
        const warn = `Class ${cls.className} (${cls.section}): Morning-preferred subjects demand (${morningPeriodsDemand} p/wk) exceeds morning slots (${totalMorningSlots} p/wk). Solver will relax preferences to afternoon if needed.`;
        warnings.push(warn);
        diagnosticItems.push({
          type: 'time_pref_saturation',
          severity: 'warning',
          className: `${cls.className} - ${cls.section}`,
          title: `Morning Slot Saturation: ${cls.className} (${cls.section})`,
          description: `Morning demand (${morningPeriodsDemand} p/wk) exceeds available morning periods (${totalMorningSlots} p/wk).`,
          solution: 'Change time preference to "Any Time" for non-critical subjects.',
        });
      }
    }

    // 2. Teacher Capacity Check (Max Periods, Availability, Daily Capacity Limits)
    for (const [tId, teacher] of this.teachers) {
      const load = this.assignments
        .filter((a) => a.teacherId === tId)
        .reduce((sum, a) => sum + a.periodsPerWeek, 0);

      if (load > teacher.maxPeriods) {
        const err = `Teacher ${teacher.name}: Workload (${load} p/wk) exceeds max limit (${teacher.maxPeriods}).`;
        errors.push(err);
        diagnosticItems.push({
          type: 'faculty_shortage',
          severity: 'error',
          teacherName: teacher.name,
          title: `Teacher Overload: ${teacher.name}`,
          description: `Assigned ${load} p/wk exceeds teacher max threshold of ${teacher.maxPeriods} p/wk.`,
          solution: 'Increase teacher max periods or redistribute subjects.',
        });
      }

      // Check teacher availability slots
      let totalAvailSlots = 0;
      for (const d of this.settings.workingDays) {
        const isHalf = halfDays.includes(d);
        const dayPeriodCap = isHalf ? this.settings.halfDayPeriods : this.settings.periodsPerDay;
        const availList =
          (teacher.availableSlots &&
            (teacher.availableSlots[d] ||
              (teacher.availableSlots as Record<string, number[]>)[String(d)])) ??
          teachingPeriods;
        totalAvailSlots += availList.filter((p: number) => p <= dayPeriodCap).length;
      }

      if (load > totalAvailSlots) {
        const err = `Teacher ${teacher.name}: Workload (${load}) exceeds total marked available slots (${totalAvailSlots}).`;
        errors.push(err);
        diagnosticItems.push({
          type: 'teacher_availability',
          severity: 'error',
          teacherName: teacher.name,
          title: `Unsatisfiable Teacher Availability: ${teacher.name}`,
          description: `Teacher assigned ${load} p/wk but only marked ${totalAvailSlots} slots available in weekly matrix.`,
          solution: 'Open up more time slots in Setup Hub → Teachers → Availability Matrix.',
        });
      }

      // Check teacher maximum physical capacity under tchDailyMax
      const maxPhysicalDailyCapacity =
        fullDaysCount * this.settings.tchDailyMax +
        halfDaysCount * Math.min(this.settings.tchDailyMax, this.settings.halfDayPeriods);

      if (load > maxPhysicalDailyCapacity) {
        const warn = `Teacher ${teacher.name}: Workload (${load} p/wk) exceeds strict daily limit capacity (${maxPhysicalDailyCapacity} p/wk based on max ${this.settings.tchDailyMax}/day). Solver will dynamically adapt daily caps.`;
        warnings.push(warn);
        diagnosticItems.push({
          type: 'teacher_daily_max',
          severity: 'warning',
          teacherName: teacher.name,
          title: `High Daily Density: ${teacher.name} (${load} p/wk)`,
          description: `With ${this.settings.tchDailyMax} periods/day cap, maximum capacity is ${maxPhysicalDailyCapacity} periods. Requires relaxing daily limit to ~${Math.ceil(load / daysCount)} periods/day.`,
          solution: `Increase Teacher Daily Max in Settings to ${Math.ceil(load / daysCount)} or higher.`,
        });
      }
    }

    // 3. Subject daily period capacity check & Half-day pigeonhole analysis
    for (const asg of this.assignments) {
      const subj = this.subjects.get(asg.subjectId);
      const cls = this.classes.find((c) => c.id === asg.classId);
      if (subj) {
        const configuredMaxDaily = subj.allowMultiplePerDay ? (subj.maxPerDay || 2) : 1;
        const maxCapacity = daysCount * configuredMaxDaily;

        if (asg.periodsPerWeek > maxCapacity) {
          const err = `Class ${cls?.className || '?'}: ${subj.name} requires ${asg.periodsPerWeek} p/wk but maximum daily cap is ${configuredMaxDaily}/day (${maxCapacity} max across ${daysCount} days).`;
          errors.push(err);
          diagnosticItems.push({
            type: 'capacity_overflow',
            severity: 'error',
            className: cls?.className,
            subjectName: subj.name,
            title: `Subject Daily Capacity Exceeded: ${subj.name}`,
            description: `${subj.name} requires ${asg.periodsPerWeek} periods but only ${maxCapacity} can fit with max ${configuredMaxDaily} per day.`,
            solution: 'Enable "Allow Multiple Periods Per Day" for this subject in Subjects tab.',
          });
        }

        // Half-Day Saturation Check: when periodsPerWeek <= daysCount but > fullDaysCount and !allowMultiplePerDay
        if (halfDaysCount > 0 && asg.periodsPerWeek > fullDaysCount && asg.periodsPerWeek <= maxCapacity && !subj.allowMultiplePerDay) {
          const warn = `Class ${cls?.className || '?'}: ${subj.name} has ${asg.periodsPerWeek} p/wk with 1 period/day cap and ${halfDaysCount} half-day(s). Solver will allow multi-period days if half-day slots fill up.`;
          warnings.push(warn);
          diagnosticItems.push({
            type: 'half_day_starvation',
            severity: 'info',
            className: cls?.className,
            subjectName: subj.name,
            title: `Half-Day Adaptation: ${subj.name}`,
            description: `Subject has ${asg.periodsPerWeek} periods across ${fullDaysCount} full days and ${halfDaysCount} half day.`,
            solution: 'Solver auto-manages multi-period distribution when needed.',
          });
        }
      }
    }

    // 4. Room Capacity Check
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
        const err = `Room ${room?.name || rId}: Assigned load (${load}) exceeds total room slot capacity (${maxRoomSlots}).`;
        errors.push(err);
        diagnosticItems.push({
          type: 'room_capacity',
          severity: 'error',
          title: `Room Overbooked: ${room?.name || rId}`,
          description: `Total assigned room load (${load} p/wk) exceeds room capacity (${maxRoomSlots} slots).`,
          solution: 'Assign another room or balance practical lab periods.',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      diagnosticItems,
    };
  }

  public async solve(maxIterations: number = 140000): Promise<GeneratedRoutine> {
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
        diagnosticItems: validation.diagnosticItems,
      };
    }

    const days = this.settings.workingDays;
    const teachingPeriods = this.getTeachingPeriods();
    const D = days.length;
    const P = teachingPeriods.length;
    const halfDays = this.settings.halfDays;
    const maxHalfP = this.settings.halfDayPeriods;
    const fullDaysCount = days.filter((d) => !halfDays.includes(d)).length;

    // Break boundary for Morning/Afternoon preference
    const breakP = this.settings.breaks.length
      ? Math.min(...this.settings.breaks)
      : Math.floor(this.settings.periodsPerDay / 2);

    // Compute teacher weekly load for dynamic daily cap calculation
    const teacherLoadMap: Record<string, number> = {};
    for (const asg of this.assignments) {
      teacherLoadMap[asg.teacherId] = (teacherLoadMap[asg.teacherId] || 0) + asg.periodsPerWeek;
    }

    // Deconstruct assignments into schedulable atomic units
    const units: Unit[] = [];
    let unitCounter = 0;

    for (const asg of this.assignments) {
      const subj = this.subjects.get(asg.subjectId);
      if (!subj) continue;

      const classSubjTotalPeriods = this.assignments
        .filter((a) => a.classId === asg.classId && a.subjectId === asg.subjectId)
        .reduce((sum, a) => sum + a.periodsPerWeek, 0);

      // Auto-compute maxDaily to handle half-day pigeonhole constraints
      let autoMaxDaily = Math.ceil(classSubjTotalPeriods / Math.max(1, D));
      if (halfDays.length > 0 && classSubjTotalPeriods > fullDaysCount) {
        autoMaxDaily = Math.max(2, Math.ceil(classSubjTotalPeriods / Math.max(1, D)));
      }

      const maxDaily = Math.max(autoMaxDaily, subj.allowMultiplePerDay ? (subj.maxPerDay || 2) : autoMaxDaily);
      const allowMultiple = subj.allowMultiplePerDay || autoMaxDaily > 1;

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

      let symmGroupPrefix = `${asg.classId}-${asg.subjectId}-${asg.teacherId}-${asg.roomId || 'none'}`;

      let rem = asg.periodsPerWeek;
      let labSymmIndex = 0;
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
            multi: allowMultiple,
            maxPerDay: maxDaily,
            timePref: subj.timePref,
            isClassTeacherUnit: isCT,
            targetFirstPeriods: targetFirstPeriods,
            mrv: 0,
            slot: null,
            symmGroup: `${symmGroupPrefix}-2`,
            symmIndex: labSymmIndex++,
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
            multi: allowMultiple,
            maxPerDay: maxDaily,
            timePref: subj.timePref,
            isClassTeacherUnit: isCT,
            targetFirstPeriods: targetFirstPeriods,
            mrv: 0,
            slot: null,
            symmGroup: `${symmGroupPrefix}-1`,
            symmIndex: 0,
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
            multi: allowMultiple,
            maxPerDay: maxDaily,
            timePref: subj.timePref,
            isClassTeacherUnit: isCT,
            targetFirstPeriods: targetFirstPeriods,
            mrv: 0,
            slot: null,
            symmGroup: `${symmGroupPrefix}-1`,
            symmIndex: i,
          });
        }
      }
    }

    // Pre-build symmetry predecessor lookup: O(1) instead of O(N) per recursion step
    const symmPredecessor = new Map<number, Unit>();
    for (const u of units) {
      if (u.symmIndex !== undefined && u.symmIndex > 0) {
        const prev = units.find(x => x.symmGroup === u.symmGroup && x.symmIndex === u.symmIndex! - 1);
        if (prev) symmPredecessor.set(u.uid, prev);
      }
    }

    // Diagnostic tracking containers
    let maxPlacedDepth = 0;
    const bottleneckReasons = new Map<string, number>();
    const unitBottlenecks = new Map<number, { unit: Unit; reasons: Map<string, number> }>();

    // Run 2-Phase CSP Solver
    // Phase 1: Strict mode
    // Phase 2: Relaxed soft constraints mode (soft time preferences, relaxed daily/consecutive caps)
    const runSolverPhase = async (phase: number, iterBudget: number): Promise<{ solved: boolean; iters: number; relaxed: string[] }> => {
      const isRelaxed = phase === 2;
      const relaxedItems: string[] = [];

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

      // Dynamic Teacher Daily Cap per teacher based on load & phase
      const getTeacherDailyCap = (tid: string, actDay?: number): number => {
        const load = teacherLoadMap[tid] || 0;
        const halfDaysCount = halfDays.length;
        const halfDayContribution = halfDaysCount * Math.min(this.settings.tchDailyMax, this.settings.halfDayPeriods);
        const fullDayRequired = fullDaysCount > 0 ? Math.ceil(Math.max(0, load - halfDayContribution) / fullDaysCount) : 0;
        
        const baseCapFull = Math.max(this.settings.tchDailyMax, fullDayRequired);
        const baseCapHalf = Math.min(this.settings.tchDailyMax, this.settings.halfDayPeriods);

        if (actDay !== undefined) {
           const isHalf = halfDays.includes(actDay);
           const baseCap = isHalf ? baseCapHalf : baseCapFull;
           return isRelaxed ? baseCap + 1 : baseCap;
        }

        const fallbackCap = Math.max(baseCapFull, baseCapHalf);
        return isRelaxed ? fallbackCap + 1 : fallbackCap;
      };

      const maxConsecLimit = isRelaxed ? this.settings.tchConsecMax + 1 : this.settings.tchConsecMax;

      if (isRelaxed) {
        relaxedItems.push(`Soft time preferences (morning/afternoon penalties instead of hard rejection)`);
        relaxedItems.push(`Fatigue bounds relaxed: max daily +1, max consecutive +1`);
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
          if (this.settings.breaks.includes(i)) {
            current = 0; // Recess / break resets consecutive teaching fatigue
          }
        }
        return maxBlock;
      };

      const checkSlot = (
        u: Unit,
        dPos: number,
        pPos: number,
        recordBottlenecks: boolean = false,
        uReasons?: Map<string, number>
      ): boolean => {
        const tid = u.tid;
        const cid = u.cid;
        const sid = u.sid;
        const rid = u.rid;
        const actDay = days[dPos];
        const pNum = teachingPeriods[pPos];

        const recordFailure = (key: string) => {
          if (recordBottlenecks) {
            bottleneckReasons.set(key, (bottleneckReasons.get(key) || 0) + 1);
            if (uReasons) {
              uReasons.set(key, (uReasons.get(key) || 0) + 1);
            }
          }
        };

        // Class limits
        const cls = this.classes.find((x) => x.id === cid);
        const cDaily = cls?.dailyPeriods || this.settings.periodsPerDay;
        if (pNum > cDaily) return false;
        if (halfDays.includes(actDay) && pNum > maxHalfP) return false;

        // Strict hard rule 1: No class double-booking
        if (cBusy[cid]?.[dPos]?.[pPos]) {
          recordFailure('class_busy');
          return false;
        }

        // Strict hard rule 2: No teacher double-booking
        if (tBusy[tid]?.[dPos]?.[pPos]) {
          recordFailure('teacher_busy');
          return false;
        }

        // Strict hard rule 3: Room availability
        if (rid && rBusy[rid]?.[dPos]?.[pPos]) {
          recordFailure('room_busy');
          return false;
        }

        // Subject time preference (Strict in Phase 1, Soft in Phase 2)
        if (!isRelaxed) {
          if (u.timePref === 'morning' && pNum > breakP) {
            recordFailure('time_pref_saturation');
            return false;
          }
          if (u.timePref === 'afternoon' && pNum <= breakP) {
            recordFailure('time_pref_saturation');
            return false;
          }
        }

        // Teacher availability grid
        const tch = this.teachers.get(tid);
        if (!tch) return false;
        const rawAvail = tch.availableSlots?.[actDay] || (tch.availableSlots as Record<string, number[]>)?.[String(actDay)];
        const availSlots = Array.isArray(rawAvail) ? rawAvail : teachingPeriods;
        if (!availSlots.includes(pNum)) {
          recordFailure('teacher_availability');
          return false;
        }

        // Lab block (size = 2) checks: physical consecutive, room, break intervals
        if (u.sz === 2) {
          if (pPos >= P - 1) return false;
          const pNum2 = teachingPeriods[pPos + 1];
          if (pNum2 > cDaily) return false;
          if (halfDays.includes(actDay) && pNum2 > maxHalfP) return false;
          if (pNum2 - pNum !== 1) return false; // Must be physically consecutive
          if (this.settings.breaks.includes(pNum)) return false; // Cannot span across recess / break interval
          if (cBusy[cid]?.[dPos]?.[pPos + 1] || tBusy[tid]?.[dPos]?.[pPos + 1]) {
            recordFailure('class_busy');
            return false;
          }
          if (rid && rBusy[rid]?.[dPos]?.[pPos + 1]) {
            recordFailure('room_busy');
            return false;
          }
          if (!availSlots.includes(pNum2)) {
            recordFailure('teacher_availability');
            return false;
          }
          if (!isRelaxed) {
            if (u.timePref === 'morning' && pNum2 > breakP) {
              recordFailure('time_pref_saturation');
              return false;
            }
            if (u.timePref === 'afternoon' && pNum2 <= breakP) {
              recordFailure('time_pref_saturation');
              return false;
            }
          }
        }

        // Subject daily frequency constraint (maxPerDay)
        const maxDaily = u.sz === 2 ? Math.max(2, u.multi ? (u.maxPerDay || 2) : 2) : (u.multi ? (u.maxPerDay || 2) : 1);
        let daySlotsUsed = 0;
        for (let p = 0; p < P; p++) {
          const b = cBusy[cid]?.[dPos]?.[p];
          if (b && b.sid === sid) {
            daySlotsUsed++;
          }
        }
        if (daySlotsUsed + u.sz > maxDaily) {
          recordFailure('half_day_starvation');
          return false;
        }

        // Teacher daily & consecutive period burnout limits
        const tchCap = getTeacherDailyCap(tid, actDay);
        if ((tDayLoad[tid]?.[dPos] || 0) + u.sz > tchCap) {
          recordFailure('teacher_daily_max');
          return false;
        }

        if (getTchConsecutiveBlocks(tid, dPos, pPos, u.sz) > maxConsecLimit) {
          recordFailure('consecutive_fatigue');
          return false;
        }

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
        u.slot = null;
      }

      // MRV Ordering: Class Teacher units -> Most constrained units -> Size 2 before 1 -> Hard subjects
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

      let localIters = 0;

      const solveBacktrack = async (idx: number, domains: number[]): Promise<boolean> => {
        if (idx > maxPlacedDepth) {
          maxPlacedDepth = idx;
        }
        if (idx >= units.length) return true;
        localIters++;
        
        // Yield to UI thread every 500 iterations to prevent "Page Unresponsive" freezing
        if (localIters % 500 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }

        if (localIters > iterBudget) return false;

        // FIX 2 & PERFORMANCE FIX: Dynamic MRV using cached O(1) domains
        let u: Unit | null = null;
        let minMrv = Infinity;
        let bestTieScore = -Infinity;
        for (let i = 0; i < units.length; i++) {
          const unplaced = units[i];
          if (unplaced.slot === null) {
            // Do not consider units in a symmetry group if their predecessor is not placed yet.
            if (unplaced.symmIndex !== undefined && unplaced.symmIndex > 0) {
              const prev = symmPredecessor.get(unplaced.uid);
              if (prev && prev.slot === null) continue;
            }

            const options = domains[i];
            
            // Re-apply original sorting heuristics as tie-breakers for MRV
            const isCT = unplaced.isClassTeacherUnit && unplaced.targetFirstPeriods > 0 ? 1 : 0;
            const tieScore = (isCT * 1000) + (unplaced.sz * 10) + (unplaced.hard ? 1 : 0);

            if (options < minMrv || (options === minMrv && tieScore > bestTieScore)) {
              minMrv = options;
              bestTieScore = tieScore;
              u = unplaced;
            }
          }
        }
        if (!u) return true;

        const candidates: { dPos: number; pPos: number; score: number }[] = [];

        const prevUnit = (u.symmIndex !== undefined && u.symmIndex > 0) ? symmPredecessor.get(u.uid) || null : null;
        const prevSlotIndex = (prevUnit && prevUnit.slot) ? prevUnit.slot.dPos * P + prevUnit.slot.pPos : -1;

        for (let d = 0; d < D; d++) {
          for (let p = 0; p < P; p++) {
            if (prevSlotIndex >= 0 && (d * P + p) <= prevSlotIndex) continue;
            
            if (checkSlot(u, d, p, false)) {
              let score = 0;
              const pNum = teachingPeriods[p];

              // Hard subject preference (earlier in day)
              if (u.hard) {
                score += p;
              }

              // Soft Time Preference scoring
              if (u.timePref === 'morning') {
                if (pNum <= breakP) score -= 80;
                else score += 150;
              } else if (u.timePref === 'afternoon') {
                if (pNum > breakP) score -= 80;
                else score += 150;
              }

              // Gap minimization for teachers (cluster periods to avoid fragmented schedules)
              let adj = 0;
              if (p > 0 && tBusy[u.tid]?.[d]?.[p - 1]) adj++;
              if (p < P - 1 && tBusy[u.tid]?.[d]?.[p + 1]) adj++;
              score -= adj * 25;

              // Class Teacher 1st Period Quota
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
                    score -= 800;
                  }
                } else {
                  if (ctFirstPeriodsPlaced < u.targetFirstPeriods) {
                    score += 60;
                  }
                }
              }

              candidates.push({ dPos: d, pPos: p, score });
            }
          }
        }

        if (candidates.length === 0) {
          // Probe why no slots were found for diagnostic telemetry
          const uReasons = new Map<string, number>();
          for (let d = 0; d < D; d++) {
            for (let p = 0; p < P; p++) {
              checkSlot(u, d, p, true, uReasons);
            }
          }
          
          if (idx > maxPlacedDepth) {
            maxPlacedDepth = idx;
            unitBottlenecks.clear(); // Clear ghosts from shallower paths
            unitBottlenecks.set(u.uid, { unit: u, reasons: uReasons });
          } else if (idx === maxPlacedDepth) {
            unitBottlenecks.set(u.uid, { unit: u, reasons: uReasons });
          }
          
          return false;
        }

        if (isRelaxed) {
          candidates.forEach(c => c.score += Math.random() * 10);
        }
        candidates.sort((a, b) => a.score - b.score);

        for (const c of candidates) {
          place(u, c.dPos, c.pPos, true);
          
          let forwardCheckFailed = false;
          const nextDomains = [...domains]; // O(N) clone, very fast for N=500
          
          // MAC (Maintaining Arc Consistency): only recompute domains for affected units
          for (let i = 0; i < units.length; i++) {
            const unplaced = units[i];
            if (unplaced.slot === null) {
              if (unplaced.tid === u!.tid || unplaced.cid === u!.cid || (u!.rid && unplaced.rid === u!.rid)) {
                let hasOption = false;
                let optionsCount = 0;
                for (let d = 0; d < D; d++) {
                  for (let p = 0; p < P; p++) {
                    if (checkSlot(unplaced, d, p, false)) {
                      hasOption = true;
                      optionsCount++;
                    }
                  }
                }
                if (!hasOption) {
                  forwardCheckFailed = true;
                  break;
                }
                nextDomains[i] = optionsCount;
              }
            }
          }

          if (!forwardCheckFailed) {
            if (await solveBacktrack(idx + 1, nextDomains)) {
              unitBottlenecks.delete(u!.uid);
              return true;
            }
          }
          place(u!, c.dPos, c.pPos, false);
        }

        return false;
      };

      const initialDomains = new Array(units.length).fill(0);
      for (let i = 0; i < units.length; i++) {
        initialDomains[i] = units[i].mrv;
      }

      const solved = await solveBacktrack(0, initialDomains);
      return { solved, iters: localIters, relaxed: relaxedItems };
    };

    // Execute Phase 1 (Strict Solver)
    const phase1Budget = Math.floor(maxIterations * 0.45);
    const phase1Result = await runSolverPhase(1, phase1Budget);

    let finalSolved = phase1Result.solved;
    let totalIterations = phase1Result.iters;
    let winningPhase = 1;
    let activeRelaxations: string[] = [];

    // If Phase 1 failed, execute Phase 2 (Relaxed Soft-Constraint Solver)
    if (!finalSolved) {
      for (const u of units) u.slot = null;
      unitBottlenecks.clear();

      const phase2Budget = maxIterations - totalIterations;
      const phase2Result = await runSolverPhase(2, phase2Budget);
      finalSolved = phase2Result.solved;
      totalIterations += phase2Result.iters;
      winningPhase = 2;
      activeRelaxations = phase2Result.relaxed;
    }

    if (finalSolved) {
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
        iterations: totalIterations,
        executionTimeMs: Date.now() - startTime,
        generatedAt: new Date().toISOString(),
        metadata: {
          phase: winningPhase,
          relaxedConstraints: activeRelaxations,
        },
        stats: {
          totalUnits: units.length,
          placedUnits: units.length,
          iterations: totalIterations,
          executionTimeMs: Date.now() - startTime,
          phase: winningPhase,
          relaxedConstraints: activeRelaxations,
        },
      };
    }

    // Build rich itemized diagnostic items from telemetry
    const diagnosticsList: string[] = [];
    const bottleneckDetails: DiagnosticItem[] = [];
    const seenIssueKeys = new Set<string>();

    // 1. Process specific unit bottlenecks
    for (const { unit: u, reasons: uReasons } of unitBottlenecks.values()) {
      const cls = this.classes.find((c) => c.id === u.cid);
      const subj = this.subjects.get(u.sid);
      const tch = this.teachers.get(u.tid);
      const clsLabel = cls ? `${cls.className}${cls.section && cls.section !== 'ALL' ? ` (${cls.section})` : ''}` : 'Class';
      const subjLabel = subj?.name || 'Subject';
      const tchLabel = tch?.name || 'Teacher';

      const tDaily = uReasons.get('teacher_daily_max') || 0;
      const cFatigue = uReasons.get('consecutive_fatigue') || 0;
      const tAvail = uReasons.get('teacher_availability') || 0;
      const hStarve = uReasons.get('half_day_starvation') || 0;
      const rBusyCount = uReasons.get('room_busy') || 0;
      const tBusyCount = uReasons.get('teacher_busy') || 0;
      const cBusyCount = uReasons.get('class_busy') || 0;

      if (tDaily > 0) {
        const key = `tdaily::${u.tid}::${u.cid}`;
        if (!seenIssueKeys.has(key)) {
          seenIssueKeys.add(key);
          bottleneckDetails.push({
            type: 'teacher_daily_max',
            severity: 'error',
            className: clsLabel,
            subjectName: subjLabel,
            teacherName: tchLabel,
            title: `Teacher Daily Limit: ${tchLabel}`,
            description: `${tchLabel} could not take ${subjLabel} in ${clsLabel} because their daily teaching period cap was reached on candidate days.`,
            solution: `Increase Teacher Daily Max in Settings or reassign ${subjLabel} in Workload Hub.`,
          });
        }
      }

      if (tAvail > 0) {
        const key = `tavail::${u.tid}`;
        if (!seenIssueKeys.has(key)) {
          seenIssueKeys.add(key);
          bottleneckDetails.push({
            type: 'teacher_availability',
            severity: 'error',
            className: clsLabel,
            subjectName: subjLabel,
            teacherName: tchLabel,
            title: `Availability Restriction: ${tchLabel}`,
            description: `${tchLabel} is marked unavailable during candidate periods for ${subjLabel} in ${clsLabel}.`,
            solution: `Open more time slots in Setup Hub → Teachers → Availability Matrix.`,
          });
        }
      }

      if (cFatigue > 0) {
        const key = `cfatigue::${u.tid}`;
        if (!seenIssueKeys.has(key)) {
          seenIssueKeys.add(key);
          bottleneckDetails.push({
            type: 'consecutive_fatigue',
            severity: 'warning',
            className: clsLabel,
            subjectName: subjLabel,
            teacherName: tchLabel,
            title: `Consecutive Teaching Fatigue: ${tchLabel}`,
            description: `${tchLabel} reached the maximum consecutive periods limit without a break while scheduling ${subjLabel}.`,
            solution: `Increase Max Consecutive Periods in Settings or adjust break placement.`,
          });
        }
      }

      // Only flag daily subject limit bottleneck if daily cap blocked all valid options and not masked by other dominant factors
      if (hStarve > 0 && (tBusyCount === 0 || !subj?.allowMultiplePerDay)) {
        const key = `hstarve::${u.cid}::${u.sid}`;
        if (!seenIssueKeys.has(key)) {
          seenIssueKeys.add(key);
          const limit = u.maxPerDay || (subj?.allowMultiplePerDay ? 2 : 1);
          bottleneckDetails.push({
            type: 'half_day_starvation',
            severity: 'warning',
            className: clsLabel,
            subjectName: subjLabel,
            title: `Daily Subject Limit: ${subjLabel} (${clsLabel})`,
            description: subj?.allowMultiplePerDay
              ? `${subjLabel} reached its ${limit} periods/day cap across available working days.`
              : `${subjLabel} reached the 1 period/day cap across all available working days.`,
            solution: subj?.allowMultiplePerDay
              ? `Increase Max Periods/Day or rebalance weekly periods for ${subjLabel}.`
              : `Enable "Allow Multiple Periods Per Day" for ${subjLabel} in Subjects tab.`,
          });
        }
      }

      if (rBusyCount > 0) {
        const key = `rbusy::${u.rid}`;
        if (!seenIssueKeys.has(key)) {
          seenIssueKeys.add(key);
          bottleneckDetails.push({
            type: 'room_capacity',
            severity: 'error',
            className: clsLabel,
            subjectName: subjLabel,
            title: `Room Collision: ${subjLabel}`,
            description: `Assigned room is occupied by other classes during all candidate periods.`,
            solution: `Add another practical lab room or stagger practical periods.`,
          });
        }
      }

      if (tBusyCount > 0 && cBusyCount > 0 && tDaily === 0 && tAvail === 0 && cFatigue === 0) {
        const key = `tbusy::${u.tid}::${u.cid}`;
        if (!seenIssueKeys.has(key)) {
          seenIssueKeys.add(key);
          bottleneckDetails.push({
            type: 'capacity_overflow',
            severity: 'error',
            className: clsLabel,
            subjectName: subjLabel,
            teacherName: tchLabel,
            title: `Timetable Collision: ${clsLabel} - ${subjLabel}`,
            description: `All candidate timetable slots for ${clsLabel} are blocked by other subjects or ${tchLabel} is teaching another class.`,
            solution: `Reassign ${subjLabel} or adjust teacher workload distribution across classes.`,
          });
        }
      }
    }

    // 2. Global tally checks
    const teacherDailyBottleneck = bottleneckReasons.get('teacher_daily_max') || 0;
    const consecFatigueBottleneck = bottleneckReasons.get('consecutive_fatigue') || 0;
    const halfDayBottleneck = bottleneckReasons.get('half_day_starvation') || 0;
    const timePrefBottleneck = bottleneckReasons.get('time_pref_saturation') || 0;
    const availBottleneck = bottleneckReasons.get('teacher_availability') || 0;
    const roomBottleneck = bottleneckReasons.get('room_busy') || 0;

    if (teacherDailyBottleneck > 0) {
      diagnosticsList.push(`Teacher daily load threshold reached in ${teacherDailyBottleneck} trial slot placements.`);
    }
    if (consecFatigueBottleneck > 0) {
      diagnosticsList.push(`Consecutive teaching period limits prevented placement in ${consecFatigueBottleneck} trial slots.`);
    }
    if (halfDayBottleneck > 0) {
      diagnosticsList.push(`Subject max daily cap prevented placement in ${halfDayBottleneck} trial slots.`);
    }
    if (timePrefBottleneck > 0) {
      diagnosticsList.push(`Morning/Afternoon preference restrictions blocked ${timePrefBottleneck} trial slots.`);
    }
    if (availBottleneck > 0) {
      diagnosticsList.push(`Teacher unavailable in marked slots in ${availBottleneck} trial placements.`);
    }
    if (roomBottleneck > 0) {
      diagnosticsList.push(`Room capacity conflicts encountered in ${roomBottleneck} trial placements.`);
    }

    if (diagnosticsList.length === 0) {
      diagnosticsList.push(
        `Solver reached iteration limit (${totalIterations}). Placed ${maxPlacedDepth} of ${units.length} units (${Math.round((maxPlacedDepth / Math.max(1, units.length)) * 100)}%).`
      );
    }

    return {
      success: false,
      grid: {},
      days,
      teachingPeriods,
      breaks: this.settings.breaks,
      iterations: totalIterations,
      executionTimeMs: Date.now() - startTime,
      generatedAt: new Date().toISOString(),
      stats: {
        totalUnits: units.length,
        placedUnits: maxPlacedDepth,
        iterations: totalIterations,
        executionTimeMs: Date.now() - startTime,
      },
      diagnostics: diagnosticsList,
      diagnosticItems: bottleneckDetails.length > 0 ? bottleneckDetails : validation.diagnosticItems,
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
export async function generateRoutine(
  settings: RoutineSettings,
  classes: RoutineClass[],
  teachers: RoutineTeacher[],
  subjects: RoutineSubject[],
  assignments: RoutineAssignment[],
  rooms: RoutineRoom[] = []
): Promise<GeneratedRoutine> {
  const solver = new RoutineSolver(settings, classes, teachers, subjects, assignments, rooms);
  return await solver.solve();
}

