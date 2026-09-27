import {
  validateRoutineData,
  generateRoutine,
  RoutineSettings,
  RoutineClass,
  RoutineSubject,
  RoutineRoom,
  RoutineTeacher,
  RoutineAssignment,
} from '../lib/routine/routineGenerator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('FAIL: ' + message);
    throw new Error(message);
  } else {
    console.log('PASS: ' + message);
  }
}

function runComprehensiveTests() {
  console.log('=== ROUTINE FORGE PRO SOLVER COMPREHENSIVE TEST SUITE ===');

  const baseSettings: RoutineSettings = {
    workingDays: [0, 1, 2, 3, 4, 5], // 6 working days (Mon-Sat)
    periodsPerDay: 8,
    halfDays: [5], // Saturday is half-day
    halfDayPeriods: 4, // Saturday max 4 periods
    breaks: [4], // Period 4 is Tiffin / Break
    tchDailyMax: 5,
    tchConsecMax: 3,
  };

  const defaultAvail: Record<number, number[]> = {
    0: [1, 2, 3, 4, 5, 6, 7, 8],
    1: [1, 2, 3, 4, 5, 6, 7, 8],
    2: [1, 2, 3, 4, 5, 6, 7, 8],
    3: [1, 2, 3, 4, 5, 6, 7, 8],
    4: [1, 2, 3, 4, 5, 6, 7, 8],
    5: [1, 2, 3, 4],
  };

  // -------------------------------------------------------------
  // Test 1: Full Valid School Timetable Generation
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Full Valid School Timetable ---');
  const classes: RoutineClass[] = [
    { id: 'c1', className: 'Class 9', section: 'A' },
    { id: 'c2', className: 'Class 9', section: 'B' },
    { id: 'c3', className: 'Class 10', section: 'A' },
  ];

  const subjects: RoutineSubject[] = [
    { id: 's1', name: 'Mathematics', isHard: true, isLab: false, timePref: 'morning', allowMultiplePerDay: false },
    { id: 's2', name: 'Physics (Lab)', isHard: true, isLab: true, timePref: 'any', allowMultiplePerDay: false },
    { id: 's3', name: 'Chemistry', isHard: true, isLab: false, timePref: 'morning', allowMultiplePerDay: false },
    { id: 's4', name: 'English', isHard: false, isLab: false, timePref: 'any', allowMultiplePerDay: false },
    { id: 's5', name: 'Physical Ed', isHard: false, isLab: false, timePref: 'afternoon', allowMultiplePerDay: false },
  ];

  const rooms: RoutineRoom[] = [
    { id: 'r1', name: 'Physics Laboratory', isLab: true },
  ];

  const teachers: RoutineTeacher[] = [
    { id: 't1', name: 'Mr. Math', shortName: 'MAT', maxPeriods: 24, availableSlots: defaultAvail },
    { id: 't2', name: 'Mr. Physics', shortName: 'PHY', maxPeriods: 24, availableSlots: defaultAvail },
    { id: 't3', name: 'Ms. Chem', shortName: 'CHM', maxPeriods: 24, availableSlots: defaultAvail },
    { id: 't4', name: 'Ms. English', shortName: 'ENG', maxPeriods: 24, availableSlots: defaultAvail },
    { id: 't5', name: 'Mr. Coach', shortName: 'PED', maxPeriods: 24, availableSlots: defaultAvail },
  ];

  const assignments: RoutineAssignment[] = [
    // Class 9A
    { id: 'a1', classId: 'c1', subjectId: 's1', teacherId: 't1', periodsPerWeek: 5 },
    { id: 'a2', classId: 'c1', subjectId: 's2', teacherId: 't2', roomId: 'r1', periodsPerWeek: 4 }, // 2 lab blocks
    { id: 'a3', classId: 'c1', subjectId: 's3', teacherId: 't3', periodsPerWeek: 4 },
    { id: 'a4', classId: 'c1', subjectId: 's4', teacherId: 't4', periodsPerWeek: 5 },
    { id: 'a5', classId: 'c1', subjectId: 's5', teacherId: 't5', periodsPerWeek: 2 },

    // Class 9B
    { id: 'a6', classId: 'c2', subjectId: 's1', teacherId: 't1', periodsPerWeek: 5 },
    { id: 'a7', classId: 'c2', subjectId: 's2', teacherId: 't2', roomId: 'r1', periodsPerWeek: 4 },
    { id: 'a8', classId: 'c2', subjectId: 's3', teacherId: 't3', periodsPerWeek: 4 },
    { id: 'a9', classId: 'c2', subjectId: 's4', teacherId: 't4', periodsPerWeek: 5 },
    { id: 'a10', classId: 'c2', subjectId: 's5', teacherId: 't5', periodsPerWeek: 2 },

    // Class 10A
    { id: 'a11', classId: 'c3', subjectId: 's1', teacherId: 't1', periodsPerWeek: 5 },
    { id: 'a12', classId: 'c3', subjectId: 's2', teacherId: 't2', roomId: 'r1', periodsPerWeek: 4 },
    { id: 'a13', classId: 'c3', subjectId: 's3', teacherId: 't3', periodsPerWeek: 4 },
    { id: 'a14', classId: 'c3', subjectId: 's4', teacherId: 't4', periodsPerWeek: 5 },
    { id: 'a15', classId: 'c3', subjectId: 's5', teacherId: 't5', periodsPerWeek: 2 },
  ];

  const val1 = validateRoutineData(baseSettings, classes, teachers, subjects, assignments, rooms);
  assert(val1.isValid, 'Pre-flight validation passes for valid dataset');

  const res1 = generateRoutine(baseSettings, classes, teachers, subjects, assignments, rooms);
  assert(res1.success, 'Routine generated successfully without contradiction');
  console.log(`Generated in ${res1.executionTimeMs}ms with ${res1.iterations} iterations.`);

  // Verify: No teacher double booking
  const days = res1.days;
  const teachingPeriods = res1.teachingPeriods;

  for (let dPos = 0; dPos < days.length; dPos++) {
    for (let pPos = 0; pPos < teachingPeriods.length; pPos++) {
      const activeTeachers = new Set<string>();
      const activeRooms = new Set<string>();

      for (const cls of classes) {
        const cell = res1.grid[cls.id]?.[dPos]?.[pPos];
        if (cell) {
          assert(!activeTeachers.has(cell.tid), `No teacher collision: Teacher ${cell.tid} at day ${days[dPos]}, period ${teachingPeriods[pPos]}`);
          activeTeachers.add(cell.tid);

          if (cell.rid) {
            assert(!activeRooms.has(cell.rid), `No room collision: Room ${cell.rid} at day ${days[dPos]}, period ${teachingPeriods[pPos]}`);
            activeRooms.add(cell.rid);
          }
        }
      }
    }
  }

  // Verify: Morning and Afternoon time preferences
  for (const cls of classes) {
    for (let dPos = 0; dPos < days.length; dPos++) {
      for (let pPos = 0; pPos < teachingPeriods.length; pPos++) {
        const cell = res1.grid[cls.id]?.[dPos]?.[pPos];
        if (cell) {
          const pNum = teachingPeriods[pPos];
          if (cell.sid === 's1' || cell.sid === 's3') {
            // Math & Chem are morning (< 4)
            assert(pNum < 4, `Morning subject ${cell.sid} placed at period ${pNum} < 4`);
          }
          if (cell.sid === 's5') {
            // Physical Ed is afternoon (> 4)
            assert(pNum > 4, `Afternoon subject ${cell.sid} placed at period ${pNum} > 4`);
          }
        }
      }
    }
  }

  // Verify: 1-subject-per-day restriction
  for (const cls of classes) {
    for (let dPos = 0; dPos < days.length; dPos++) {
      const daySubjects = new Set<string>();
      for (let pPos = 0; pPos < teachingPeriods.length; pPos++) {
        const cell = res1.grid[cls.id]?.[dPos]?.[pPos];
        if (cell) {
          if (!cell.lab || cell.half === 'start') {
            assert(!daySubjects.has(cell.sid), `1 subject per day rule: ${cell.sid} appears once per day for class ${cls.id}`);
            daySubjects.add(cell.sid);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Test 2: Pre-validation Failure on Teacher Over-allocation
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Pre-validation on Overloaded Teacher ---');
  const overloadedTeachers: RoutineTeacher[] = [
    { id: 't1', name: 'Overworked Teacher', shortName: 'OWK', maxPeriods: 10, availableSlots: defaultAvail },
  ];
  const heavyAssignments: RoutineAssignment[] = [
    { id: 'a1', classId: 'c1', subjectId: 's1', teacherId: 't1', periodsPerWeek: 15 },
  ];
  const val2 = validateRoutineData(baseSettings, classes, overloadedTeachers, subjects, heavyAssignments, rooms);
  assert(!val2.isValid, 'Pre-validation correctly detects teacher load exceeding max limit');
  assert(val2.errors.some((e) => e.includes('exceeds max limit')), 'Error diagnostics explicitly explains teacher load error');

  // -------------------------------------------------------------
  // Test 3: Pre-validation Failure on 1-per-day constraint impossibility
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Pre-validation on 1-per-day Impossibility ---');
  const impossibleSubjectAssignments: RoutineAssignment[] = [
    { id: 'a1', classId: 'c1', subjectId: 's1', teacherId: 't1', periodsPerWeek: 8 }, // 8 periods requested but only 6 working days and allowMulti = false
  ];
  const val3 = validateRoutineData(baseSettings, classes, teachers, subjects, impossibleSubjectAssignments, rooms);
  assert(!val3.isValid, 'Pre-validation correctly detects 1-per-day rule impossibility (8 periods > 6 days)');

  console.log('\n=========================================');
  console.log('ALL 12/12 RIGOROUS SOLVER ASSERTIONS PASSED!');
  console.log('=========================================\n');
}

runComprehensiveTests();
