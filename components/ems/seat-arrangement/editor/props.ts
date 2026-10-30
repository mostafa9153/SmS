import { EmsRoom, AutoAllocationClassInput, ExamAllocation, ExamType, ExamRoutineItem } from "@/lib/ems/types";
import { Student } from "@/lib/types";


export interface SeatArrangementEditorProps {
  rooms: EmsRoom[];
  classes: AutoAllocationClassInput[];
  allStudents: Student[];
  studentsPerBench: number;
  academicYear: number;
  examType: ExamType;
  initialRoomClassMap?: Record<string, string[]>;
  initialAllocation?: ExamAllocation | null;
  onCommitArrangement: (allocation: ExamAllocation) => void;
  onBackToStep3: () => void;
  routinesByClass?: Record<string, ExamRoutineItem[]>;
  examStartTime?: string;
}
