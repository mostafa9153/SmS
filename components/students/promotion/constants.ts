import { StudentStatus } from "@/lib/types";


export const ALL_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export const EXAM_OPTIONS = [
  { label: "Annual Examination", value: "Annual Examination" },
  { label: "Selection Test (Class X / XII)", value: "Selection Test" },
  { label: "Semester 1 (Class XI)", value: "Semester 1" },
  { label: "Semester 2 (Class XI)", value: "Semester 2" },
  { label: "Semester 3 (Class XII)", value: "Semester 3" },
  { label: "Semester 4 (Class XII)", value: "Semester 4" },
  { label: "1st Summative Evaluation", value: "1st Summative Evaluation" },
  { label: "2nd Summative Evaluation", value: "2nd Summative Evaluation" },
];

export const OVERRIDE_STATUS_OPTIONS: { label: string; value: StudentStatus }[] = [
  { label: "Promoted (Pending Re-Admission)", value: "Promoted But Not Admitted" },
  { label: "Continuing (In-Place / Regular)", value: "Continuing" },
  { label: "Detained (Repeat Class)", value: "Detained" },
  { label: "Sent Up M.P. (Madhyamik Exam)", value: "Sent Up M.P." },
  { label: "10th Test Fail (Detained Cl X)", value: "10th test fail" },
  { label: "Supplementary (HS Re-Exam)", value: "Supplementary" },
  { label: "Compartmental (Board Re-Exam)", value: "Compartmental" },
  { label: "C.C.H.S. (Continuing Candidate)", value: "C.C.H.S." },
  { label: "Passed Out (Alumni / Exited)", value: "Passed Out" },
  { label: "Transfer Out (TC Issued)", value: "TC Out" },
  { label: "Drop Out", value: "Drop Out" },
];
