"use client";

import { EvaluationPrintDialog } from "@/components/results/evaluation-print-dialog";

import { ResultsFilterBar } from "@/components/results/client/results-filter-bar";
import { ResultsPageHeader } from "@/components/results/client/results-page-header";
import { SubjectBatchView } from "@/components/results/client/subject-batch-view";
import { ClassSummaryView } from "@/components/results/client/class-summary-view";
import { StudentEditDialog } from "@/components/results/client/student-edit-dialog";
import { useResultsClient } from "@/components/results/client/use-results-client";

/** `allowedClasses` scopes a Teacher to their classes (empty = all); the API enforces the same rule. */
const NO_SCOPE: string[] = [];

export default function ResultsClient({ allowedClasses = NO_SCOPE }: { allowedClasses?: string[] }) {
  const rc = useResultsClient(allowedClasses);
  const { academicYear, activeView, classSubjects, filteredResults, isPrintModalOpen, selectedClass, selectedExam, selectedSection, setIsPrintModalOpen } = rc;

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. TOP STICKY FILTER BAR (Identical to StudentFiltersBar) */}
      <ResultsFilterBar rc={rc} />

      {/* 2. MAIN BODY CONTAINER (Identical to Student Register Layout) */}
      <div className="p-3.5 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
        {/* Page Header Bar */}
        <ResultsPageHeader rc={rc} />

        {/* 3. VIEW MODE 1: SUBJECT-WISE BATCH ENTRY */}
        {activeView === "subject_batch" && (
          <SubjectBatchView rc={rc} />
        )}

        {/* 4. VIEW MODE 2: MASTER CLASS MERIT & SUMMARY */}
        {activeView === "class_summary" && (
          <ClassSummaryView rc={rc} />
        )}
      </div>

      {/* 5. SINGLE STUDENT MULTI-SUBJECT EDIT DIALOG */}
      <StudentEditDialog rc={rc} />

      {/* 6. EVALUATION & MARKS REGISTER PRINT MODAL */}
      <EvaluationPrintDialog
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        students={filteredResults}
        academicYear={academicYear}
        selectedClass={selectedClass}
        selectedSection={selectedSection}
        selectedExam={selectedExam}
        subjects={classSubjects}
      />
    </div>
  );
}
