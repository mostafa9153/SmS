import { StudentStatus, Semester } from "@/lib/types";


export interface ManualOverrideData {
  status: StudentStatus;
  targetClass?: string;
  targetSemester?: Semester | null;
  reason?: string;
}
