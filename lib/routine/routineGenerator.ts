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
  totalPeriods: number;
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
    try {
      const payload = {
        settings: this.settings,
        classes: this.classes,
        teachers: Array.from(this.teachers.values()),
        subjects: Array.from(this.subjects.values()),
        assignments: this.assignments,
        rooms: Array.from(this.rooms.values()),
      };

      const res = await fetch('/api/routine/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      
      if (!data.success) {
        return {
          success: false,
          grid: data.grid || {},
          days: data.days || this.settings.workingDays,
          teachingPeriods: data.teachingPeriods || this.getTeachingPeriods(),
          breaks: data.breaks || this.settings.breaks,
          iterations: data.iterations || 0,
          executionTimeMs: data.executionTimeMs || 0,
          generatedAt: data.generatedAt || new Date().toISOString(),
          stats: data.stats || {
            totalUnits: 0,
            placedUnits: 0,
            iterations: 0,
            executionTimeMs: 0,
          },
          diagnostics: data.diagnostics || ["Backend failed to generate routine."],
          diagnosticItems: data.diagnosticItems || [],
        };
      }
      
      return data as GeneratedRoutine;
    } catch (error) {
      console.error("Routine Generation Backend Error:", error);
      return {
        success: false,
        grid: {},
        days: this.settings.workingDays,
        teachingPeriods: this.getTeachingPeriods(),
        breaks: this.settings.breaks,
        iterations: 0,
        executionTimeMs: 0,
        generatedAt: new Date().toISOString(),
        stats: {
          totalUnits: 0,
          placedUnits: 0,
          iterations: 0,
          executionTimeMs: 0,
        },
        diagnostics: ["Failed to connect to the scheduling backend server."],
        diagnosticItems: [
          {
            type: 'general',
            severity: 'error',
            title: 'Backend Server Unreachable',
            description: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
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

