"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";

import { DemographicsSection } from "@/components/students/edit/section-demographics";
import { SocialCategoriesSection } from "@/components/students/edit/section-social";
import { CwsnSection } from "@/components/students/edit/section-cwsn";
import { FamilySection } from "@/components/students/edit/section-family";
import { EnrolmentSection } from "@/components/students/edit/section-enrolment";
import { PreviousSchoolSection } from "@/components/students/edit/section-previous-school";
import { FacilitiesSection } from "@/components/students/edit/section-facilities";
import { BankSection } from "@/components/students/edit/section-bank";
import { IdentifiersSection } from "@/components/students/edit/section-identifiers";
import { SubmitBar } from "@/components/students/edit/submit-bar";
import { useEditStudent } from "@/components/students/edit/use-edit-student";

export default function EditStudentPage() {
  const edit = useEditStudent();
  const { handleSubmit, isLoading, mutation, onFormError, onSubmit, student } = edit;

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Student not found.</p>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
      <PageHeader title={<>Edit Student: <span className="font-medium">{student.name}</span></>} back />

      <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">

        {/* Section 1: Demographics */}
        <DemographicsSection edit={edit} />

        {/* Section 2: Social Categories & Eligibility */}
        <SocialCategoriesSection edit={edit} />

        {/* Section 3: CWSN Profile */}
        <CwsnSection edit={edit} />

        {/* Section 4: Family & Contact */}
        <FamilySection edit={edit} />

        {/* Section 5: Enrolment Details */}
        <EnrolmentSection edit={edit} />

        {/* Section 6: Previous Schooling & RTE */}
        <PreviousSchoolSection edit={edit} />

        {/* Section 7: Facilities Profile */}
        <FacilitiesSection edit={edit} />

        {/* Section 8: Bank Details */}
        <BankSection edit={edit} />

        {/* Section 9: Government Identifiers */}
        <IdentifiersSection edit={edit} />

        {/* Submit */}
        <SubmitBar edit={edit} />

        {mutation.isError && (
          <p className="text-sm text-destructive">
            Something went wrong. Please check your fields and try again.
          </p>
        )}
      </form>
    </div>
  );
}

