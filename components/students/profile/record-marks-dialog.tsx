"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import type { StudentProfileState } from "./use-student-profile";

export function RecordMarksDialog({ profile }: { profile: StudentProfileState }) {
  const { addResultMutation, currentYear, isAddResultOpen, resError, resExam, resMarks, resRemarks, resYear, setIsAddResultOpen, setResError, setResExam, setResMarks, setResRemarks, setResYear, student } = profile;
  if (!student) return null;
  return (
    <Dialog open={isAddResultOpen} onOpenChange={setIsAddResultOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Academic Exam Marks</DialogTitle>
          <DialogDescription>
            Enter evaluation results for {student.name} ({student.schoolId}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {resError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
              {resError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Academic Year</label>
              <CustomSelect
                value={resYear}
                onChange={(val) => setResYear(Number(val))}
                options={[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((yr) => ({
                  label: String(yr),
                  value: yr,
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Evaluation Exam</label>
              <CustomSelect
                value={resExam}
                onChange={(val) => setResExam(String(val))}
                options={[
                  { label: "1st Summative Evaluation", value: "1st Summative Evaluation" },
                  { label: "2nd Summative Evaluation", value: "2nd Summative Evaluation" },
                  { label: "3rd Summative Evaluation / Annual", value: "3rd Summative Evaluation" },
                  { label: "Sem I", value: "Sem I" },
                  { label: "Sem II", value: "Sem II" },
                  { label: "Annual Examination", value: "Annual Examination" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Class & Section:</span>
              <span className="font-bold">Class {student.presentClass} - {student.presentSection} (Roll: {student.presentRoll})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Class Full Marks:</span>
              <span className="font-mono font-bold text-amber-700">
                {student.presentClass === "VI" ? 1050 : student.presentClass === "VII" || student.presentClass === "VIII" ? 1200 : student.presentClass === "IX" || student.presentClass === "X" ? 700 : 500} Marks
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Marks Obtained (প্রাপ্ত নম্বর)</label>
            <input
              type="number"
              min="0"
              value={resMarks}
              onChange={(e) => setResMarks(e.target.value)}
              placeholder="e.g. 420"
              className="w-full rounded-md border px-3 py-2 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Remarks (ঐচ্ছিক মন্তব্য)</label>
            <input
              type="text"
              value={resRemarks}
              onChange={(e) => setResRemarks(e.target.value)}
              placeholder="e.g. Good progress in Mathematics"
              className="w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => setIsAddResultOpen(false)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const num = parseFloat(resMarks);
              const fullMarks = student.presentClass === "VI" ? 1050 : student.presentClass === "VII" || student.presentClass === "VIII" ? 1200 : student.presentClass === "IX" || student.presentClass === "X" ? 700 : 500;
              if (isNaN(num) || num < 0 || num > fullMarks) {
                setResError(`Please enter a valid marks between 0 and ${fullMarks}.`);
                return;
              }
              addResultMutation.mutate({
                studentId: student.id,
                academicYear: resYear,
                class: student.presentClass,
                section: student.presentSection,
                roll: student.presentRoll,
                examName: resExam,
                fullMarks,
                marksObtained: num,
                remarks: resRemarks,
              });
            }}
            disabled={addResultMutation.isPending}
            className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/90"
          >
            {addResultMutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            Save Result
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
