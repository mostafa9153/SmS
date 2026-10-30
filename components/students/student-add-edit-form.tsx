"use client";

import type { StudentAddEditFormProps } from "@/components/students/add-form/props";
import { PageHeader } from "@/components/ui/page-header";

import { DemographicsSection } from "@/components/students/add-form/section-demographics";
import { SocialCategoriesSection } from "@/components/students/add-form/section-social";
import { CwsnSection } from "@/components/students/add-form/section-cwsn";
import { FamilySection } from "@/components/students/add-form/section-family";
import { EnrolmentSection } from "@/components/students/add-form/section-enrolment";
import { PreviousSchoolSection } from "@/components/students/add-form/section-previous-school";
import { FacilitiesSection } from "@/components/students/add-form/section-facilities";
import { BankSection } from "@/components/students/add-form/section-bank";
import { IdentifiersSection } from "@/components/students/add-form/section-identifiers";
import { SubmitBar } from "@/components/students/add-form/submit-bar";
import { useStudentAddEditForm } from "@/components/students/add-form/use-student-add-edit-form";

export type { StudentAddEditFormProps };

export function StudentAddEditForm(props: StudentAddEditFormProps) {
  const sf = useStudentAddEditForm(props);
  const { handleSubmit, isEmbedded, mutation, onSubmit } = sf;

  return (
    <div className={isEmbedded ? "space-y-6" : "p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5"}>
      {!isEmbedded && (
        <PageHeader title="Add Student" back />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Section 1: Demographics */}
        <DemographicsSection sf={sf} />

        {/* Section 2: Social Categories & Eligibility */}
        <SocialCategoriesSection sf={sf} />

        {/* Section 3: CWSN Profile */}
        <CwsnSection sf={sf} />

        {/* Section 4: Family & Contact */}
        <FamilySection sf={sf} />

        {/* Section 5: Present Enrolment Details */}
        <EnrolmentSection sf={sf} />

        {/* Section 6: Previous Schooling & RTE */}
        <PreviousSchoolSection sf={sf} />

        {/* Section 7: Facilities Profile */}
        <FacilitiesSection sf={sf} />

        {/* Section 8: Bank Details */}
        <BankSection sf={sf} />

        {/* Section 9: Government Identifiers */}
        <IdentifiersSection sf={sf} />

        {/* Submit */}
        <SubmitBar sf={sf} />

        {mutation.isError && (
          <p className="text-xs font-semibold text-destructive">
            Something went wrong. Please check your fields and try again.
          </p>
        )}
      </form>
    </div>
  );
}

