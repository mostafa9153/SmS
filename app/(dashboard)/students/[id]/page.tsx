"use client";

import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTimeline } from "@/components/students/history-timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, BookOpen, Clock, ShieldCheck, Award, CreditCard, Trophy } from "lucide-react";
import { SectionTitle } from "@/components/students/profile/info-primitives";
import { ProfileHeaderCard } from "@/components/students/profile/profile-header-card";
import { PersonalTab } from "@/components/students/profile/tab-personal";
import { AcademicTab } from "@/components/students/profile/tab-academic";
import { FacilitiesTab } from "@/components/students/profile/tab-facilities";
import { BankTab } from "@/components/students/profile/tab-bank";
import { IdentificationTab } from "@/components/students/profile/tab-identification";
import { ResultsTab } from "@/components/students/profile/tab-results";
import { RecordMarksDialog } from "@/components/students/profile/record-marks-dialog";
import { DeleteStudentDialog } from "@/components/students/profile/delete-student-dialog";
import { useStudentProfile } from "@/components/students/profile/use-student-profile";

function StudentProfilePageContent() {
  const profile = useStudentProfile();
  const { activeTab, handleTabChange, isLoading, router, student } = profile;

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-24">
        <p className="text-lg font-semibold">Student not found</p>
        <button
          onClick={() => router.back()}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Students
      </button>

      {/* Header Card */}
      <ProfileHeaderCard profile={profile} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1.5 gap-1.5 bg-muted/60 rounded-2xl custom-scrollbar select-none">
          <TabsTrigger value="personal" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl shrink-0">
            <User className="h-3.5 w-3.5" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl shrink-0">
            <BookOpen className="h-3.5 w-3.5" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="facilities" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl shrink-0">
            <Award className="h-3.5 w-3.5" />
            Facilities
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl shrink-0">
            <CreditCard className="h-3.5 w-3.5" />
            Bank Details
          </TabsTrigger>
          <TabsTrigger value="identification" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl shrink-0">
            <ShieldCheck className="h-3.5 w-3.5" />
            Identification
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl shrink-0">
            <Clock className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl shrink-0 font-semibold text-amber-700 dark:text-amber-400">
            <Trophy className="h-3.5 w-3.5" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Personal Info */}
        <PersonalTab profile={profile} />

        {/* Academic / Enrolment Info */}
        <AcademicTab profile={profile} />

        {/* Facilities Tab */}
        <FacilitiesTab profile={profile} />

        {/* Bank & Welfare Details Tab */}
        <BankTab profile={profile} />

        {/* Identification Tab */}
        <IdentificationTab profile={profile} />

        {/* Academic History Timeline Tab */}
        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border bg-card p-5">
            <SectionTitle>Academic History Timeline</SectionTitle>
            <p className="text-xs text-muted-foreground mb-5">
              Year-by-year academic record from admission to present.
            </p>
            <HistoryTimeline history={student.academicHistory} studentId={student.id} />
          </div>
        </TabsContent>

        {/* Result History Tab */}
        <ResultsTab profile={profile} />
      </Tabs>

      {/* Enter / Record Exam Marks Modal */}
      <RecordMarksDialog profile={profile} />

      {/* Delete Student Confirmation Modal */}
      <DeleteStudentDialog profile={profile} />
    </div>
  );
}



export default function StudentProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <StudentProfilePageContent />
    </Suspense>
  );
}
