"use client";

import { AdmissionFormVIxPrintableView } from "@/components/admission-form/admission-form-v-ix-printable";
import { AdmissionFormXIPrintableView } from "@/components/admission-form/admission-form-xi-printable";
import { PrintPreview } from "@/components/print/print-preview";

import type { AdmissionGeneratorState } from "./use-admission-form-generator";

export function PreviewViewport({ gen }: { gen: AdmissionGeneratorState }) {
  const { activePageView, activeTab, previewFormData, schoolInfo } = gen;
  return (
    <PrintPreview
      fitMode="contain"
      resetKey={`${activeTab}-${activePageView}`}
      className="h-[460px] sm:h-[500px] lg:h-[calc(100dvh-14rem)] w-full print:hidden"
    >
      {activeTab === "v-ix" ? (
        <AdmissionFormVIxPrintableView
          data={previewFormData.formVIx}
          school={schoolInfo}
          activePage={activePageView}
        />
      ) : (
        <AdmissionFormXIPrintableView
          data={previewFormData.formXI}
          school={schoolInfo}
          activePage={activePageView}
        />
      )}
    </PrintPreview>
  );
}
