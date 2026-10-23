"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { getSavedClassPresets } from "@/lib/utils/marks-config";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AttendanceRegisterPrintable,
  ACTIVE_STATUSES,
} from "@/components/students/attendance-register-printable";
import type { Student } from "@/lib/types";
import {
  ArrowLeft,
  Printer,
  ZoomIn,
  ZoomOut,
  Users,
  Loader2,
} from "lucide-react";

function AttendanceRegisterContent() {
  const searchParams = useSearchParams();
  const classPresets = useMemo(() => getSavedClassPresets(), []);

  const [selectedClass, setSelectedClass] = useState(
    searchParams.get("class") || classPresets[0]?.code || "V"
  );
  const [selectedSection, setSelectedSection] = useState(
    searchParams.get("section") || "A"
  );
  const [scale, setScale] = useState(0.55);

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
      <aside className="print:hidden lg:sticky lg:top-4 space-y-3 bg-card border rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Link
            href="/generate"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-8 w-8 rounded-xl shrink-0"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-base font-bold tracking-tight">
            Attendance Register
          </h1>
        </div>

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
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <span className="font-semibold">
              {students.length} active student{students.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Zoom + Print */}
        <div className="flex items-center gap-2 border-t pt-3">
          <div className="hidden sm:flex items-center border rounded-xl bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-7"
              onClick={() => setScale((s) => Math.max(0.3, s - 0.05))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={() => setScale(0.55)}
              title="Reset zoom"
              className="text-[11px] font-mono w-10 text-center font-bold flex items-center justify-center"
            >
              {Math.round(scale * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-7"
              onClick={() => setScale((s) => Math.min(1.3, s + 0.05))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            onClick={() => window.print()}
            disabled={isEmpty || isLoading}
            className="h-9 flex-1 gap-1.5 font-bold rounded-xl shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </aside>

      {/* Canvas (screen preview only) */}
      <div
        className="min-w-0 w-full flex justify-center py-4 bg-muted/15 border rounded-2xl overflow-x-auto custom-scrollbar print:hidden"
      >
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading students...
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-sm text-destructive">
            Failed to load students.
          </div>
        ) : isEmpty ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No active students in Class {selectedClass}-{selectedSection}.
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
            className="transition-transform duration-150 print:transform-none"
          >
            <AttendanceRegisterPrintable
              students={students}
              className={selectedClass}
              section={selectedSection}
              schoolLogoUrl={
                schoolProfile?.schoolLogoUrl || "/school-logo.png"
              }
            />
          </div>
        )}
      </div>

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
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AttendanceRegisterContent />
    </Suspense>
  );
}
