"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { getSavedClassPresets } from "@/lib/utils/marks-config";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AttendanceRegisterPrintable,
  ACTIVE_STATUSES,
} from "@/components/students/attendance-register-printable";
import type { Student } from "@/lib/types";
import { Printer, Users } from "lucide-react";
import { PrintPreview, PrintPageStyle } from "@/components/print/print-preview";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";
import { usePaperSettings } from "@/components/print/use-paper-settings";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";


function AttendanceRegisterContent() {
  const searchParams = useSearchParams();
  const classPresets = useMemo(() => getSavedClassPresets(), []);

  const [selectedClass, setSelectedClass] = useState(
    searchParams.get("class") || classPresets[0]?.code || "V"
  );
  const [selectedSection, setSelectedSection] = useState(
    searchParams.get("section") || "A"
  );
  const paperSettings = usePaperSettings("attendance-paper-settings", {
    paper: "A4",
    orientation: "landscape",
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
  });
  const { paper, orientation, margins, pageW, pageH } = paperSettings;


  const { profile: schoolProfile } = useSchoolProfile();

  const sectionsForClass = useMemo(() => {
    const preset = classPresets.find((p) => p.code === selectedClass);
    return preset?.sections || ["A", "B"];
  }, [classPresets, selectedClass]);

  const {
    data: rawStudents = [],
    isLoading,
    isError,
  } = useQuery<Student[]>({
    queryKey: ["attendance-register-students", selectedClass, selectedSection],
    queryFn: async () => {
      const res = await fetch(
        `/api/students?paginated=false&projection=full&class=${encodeURIComponent(selectedClass)}&section=${encodeURIComponent(selectedSection)}`
      );
      if (!res.ok) throw new Error("Failed to fetch students");
      const json = await res.json();
      return json.data || [];
    },
  });

  const students = useMemo(() => {
    return rawStudents
      .filter((s) => ACTIVE_STATUSES.includes(s.currentStatus))
      .sort((a, b) => (a.presentRoll || 0) - (b.presentRoll || 0));
  }, [rawStudents]);

  const isEmpty = !isLoading && students.length === 0;

  const portalRef = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    let el = document.getElementById("attendance-register-print-portal") as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "attendance-register-print-portal";
      document.body.appendChild(el);
    }
    portalRef.current = el;
    setPortalReady(true);
    return () => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
      portalRef.current = null;
    };
  }, []);

  return (
    <div className="p-3 sm:p-5 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-4 items-start print:block print:p-0 print:m-0 print:max-w-none">
      {/* Sidebar */}
      <aside className="order-2 lg:order-1 print:hidden lg:sticky lg:top-4 space-y-3 bg-card border rounded-2xl p-3 shadow-2xs">
        <PageHeader back="/generate" title="Attendance Register" />

        <div className="space-y-2 border-t pt-3">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Class
          </p>
          <Select
            value={selectedClass}
            onValueChange={(val) => {
              if (!val) return;
              setSelectedClass(val);
              const preset = classPresets.find((p) => p.code === val);
              const secs = preset?.sections || ["A", "B"];
              if (!secs.includes(selectedSection)) {
                setSelectedSection(secs[0] || "A");
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classPresets.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  Class {p.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Section
          </p>
          <Select value={selectedSection} onValueChange={(val) => val && setSelectedSection(val)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sectionsForClass.map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Student count */}
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {isLoading ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <span className="font-semibold">
              {students.length} active student{students.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Paper & Margin + Print */}
        <div className="border-t pt-2 space-y-2">
          <PaperSettingsPanel settings={paperSettings} orientations variant="bare" />
          <Button
            onClick={() => window.print()}
            disabled={isEmpty || isLoading}
            className="h-9 w-full gap-1.5 font-bold rounded-xl shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </aside>

      {isLoading ? (
        <div className="min-w-0 w-full flex justify-center items-center h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 bg-muted/15 border rounded-2xl print:hidden">
          <div className="text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Spinner className="h-5 w-5" />
            Loading students...
          </div>
        </div>
      ) : isError ? (
        <div className="min-w-0 w-full flex justify-center items-center h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 text-sm text-destructive border rounded-2xl print:hidden">
          Failed to load students.
        </div>
      ) : isEmpty ? (
        <div className="min-w-0 w-full flex justify-center items-center h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 text-sm text-muted-foreground border rounded-2xl print:hidden">
          No active students in Class {selectedClass}-{selectedSection}.
        </div>
      ) : (
        <PrintPreview
          fitMode="width"
          resetKey={`${selectedClass}-${selectedSection}-${paper}-${orientation}`}
          className="min-w-0 w-full h-[46dvh] sm:h-[52dvh] lg:h-[calc(100dvh-2rem)] sticky top-2 lg:top-4 z-20 order-1 lg:order-2 print:hidden"
        >
          <AttendanceRegisterPrintable
            students={students}
            className={selectedClass}
            section={selectedSection}
            schoolLogoUrl={schoolProfile?.schoolLogoUrl || "/school-logo.png"}
          />
        </PrintPreview>
      )}

      <PrintPageStyle pageW={pageW} pageH={pageH} margins={margins} />

      {/* Print portal: rendered at body level so print CSS can isolate it */}
      {portalReady && portalRef.current && !isEmpty && !isLoading && createPortal(
        <AttendanceRegisterPrintable
          students={students}
          className={selectedClass}
          section={selectedSection}
          schoolLogoUrl={schoolProfile?.schoolLogoUrl || "/school-logo.png"}
        />,
        portalRef.current
      )}
    </div>
  );
}

export default function AttendanceRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      }
    >
      <AttendanceRegisterContent />
    </Suspense>
  );
}
