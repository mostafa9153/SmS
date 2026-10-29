"use client";

import { TabsContent } from "@/components/ui/tabs";
import { InfoField, InfoGrid, SectionTitle } from "@/components/students/profile/info-primitives";
import type { StudentProfileState } from "./use-student-profile";

export function FacilitiesTab({ profile }: { profile: StudentProfileState }) {
  const { student } = profile;
  if (!student) return null;
  return (
    <TabsContent value="facilities" className="mt-4">
      <div className="rounded-xl border bg-card p-5 space-y-6">
        <div>
          <SectionTitle>Provided Student Entitlements & Facilities</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">General Facilities Provided</p>
              <div className="flex flex-wrap gap-1">
                {student.facilitiesProvided && student.facilitiesProvided.length > 0 ? (
                  student.facilitiesProvided.map((fac) => (
                    <span key={fac} className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-medium">
                      {fac}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs italic">No general facilities provided</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">CWSN Specific Facilities Provided</p>
              <div className="flex flex-wrap gap-1">
                {student.cwsnFacilities && student.cwsnFacilities.length > 0 ? (
                  student.cwsnFacilities.map((fac) => (
                    <span key={fac} className="bg-indigo-50 text-indigo-800 border border-indigo-100 px-2.5 py-1 rounded-full text-xs font-medium">
                      {fac}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs italic">No CWSN facilities provided</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Co-curricular & External Engagements</SectionTitle>
          <InfoGrid>
            <InfoField label="NCC Member" value={student.ncc ? "Yes" : "No"} />
            <InfoField label="NSS Member" value={student.nss ? "Yes" : "No"} />
            <InfoField label="Scouts and Guides" value={student.scoutsGuides ? "Yes" : "No"} />
            <InfoField label="Approx. Distance to School" value={student.distanceToSchool ? `${student.distanceToSchool} KM` : undefined} />
            <InfoField label="Highest Parent Education Level" value={student.highestEducationParents} />
          </InfoGrid>

          <div className="mt-4 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Competitions / Olympiads Participation</p>
            <div className="flex flex-wrap gap-1">
              {student.competitionsOlympiads && student.competitionsOlympiads.length > 0 ? (
                student.competitionsOlympiads.map((comp) => (
                  <span key={comp} className="bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-1 rounded text-xs font-medium">
                    {comp}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground text-xs italic">No participation records entered</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
