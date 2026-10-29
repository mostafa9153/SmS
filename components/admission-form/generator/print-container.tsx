"use client";

import { formatFormNumber } from "@/components/admission-form/types";
import { AdmissionFormVIxPrintableView } from "@/components/admission-form/admission-form-v-ix-printable";
import { AdmissionFormXIPrintableView } from "@/components/admission-form/admission-form-xi-printable";

import type { AdmissionGeneratorState } from "./use-admission-form-generator";

export function PrintContainer({ gen }: { gen: AdmissionGeneratorState }) {
  const { activePageView, activeTab, admissionCategory, bulkSerialList, classRoster, effectiveFormClass, formMode, formVIx, formXI, isBulkPrinting, paddingDigits, previewFormData, schoolInfo, serialPrefix, startSerial, studentToFormData } = gen;
  return (
    <div id="pure-print-container" className="hidden print:block">
      {isBulkPrinting ? (
        formMode === "prefilled" ? (
          classRoster.map((student, idx) => {
            const isLast = idx === classRoster.length - 1;
            const serial = formatFormNumber(serialPrefix, startSerial + idx, paddingDigits);
            const { formVIx: prefilledV, formXI: prefilledXI } = studentToFormData(student, serial);
            return (
              <div key={student.id || idx} className="bulk-form-wrapper">
                {activeTab === "v-ix" ? (
                  <AdmissionFormVIxPrintableView
                    data={prefilledV}
                    school={schoolInfo}
                    activePage="all"
                    isLastInBatch={isLast}
                  />
                ) : (
                  <AdmissionFormXIPrintableView
                    data={prefilledXI}
                    school={schoolInfo}
                    activePage="all"
                    isLastInBatch={isLast}
                  />
                )}
              </div>
            );
          })
        ) : (
          bulkSerialList.map((serial, idx) => {
            const isLast = idx === bulkSerialList.length - 1;
            return (
              <div key={idx} className="bulk-form-wrapper">
                {activeTab === "v-ix" ? (
                  <AdmissionFormVIxPrintableView
                    data={{
                      ...formVIx,
                      admissionType: admissionCategory,
                      formNo: serial,
                      officeUse: {
                        ...formVIx.officeUse,
                        class: effectiveFormClass,
                      },
                    }}
                    school={schoolInfo}
                    activePage="all"
                    isLastInBatch={isLast}
                  />
                ) : (
                  <AdmissionFormXIPrintableView
                    data={{
                      ...formXI,
                      admissionType: admissionCategory,
                      formNo: serial,
                      officeUse: {
                        ...formXI.officeUse,
                        class: effectiveFormClass || "XI",
                      },
                    }}
                    school={schoolInfo}
                    activePage="all"
                    isLastInBatch={isLast}
                  />
                )}
              </div>
            );
          })
        )
      ) : (
        <div className="single-form-wrapper">
          {activeTab === "v-ix" ? (
            <AdmissionFormVIxPrintableView
              data={previewFormData.formVIx}
              school={schoolInfo}
              activePage={activePageView}
              isLastInBatch={true}
            />
          ) : (
            <AdmissionFormXIPrintableView
              data={previewFormData.formXI}
              school={schoolInfo}
              activePage={activePageView}
              isLastInBatch={true}
            />
          )}
        </div>
      )}
    </div>
  );
}
