"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer, PackageOpen } from "lucide-react";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { useAcademicYear } from "@/lib/hooks/use-academic-year";
import { sessionYears } from "@/lib/utils/academic-year";
import { compareStudentsByClassAndRoll } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";

const DISTRIBUTION_ITEM_PRESETS = [
  { label: "Sabuj Sathi (Bicycle)", value: "Sabuj Sathi (Bicycle)" },
  { label: "School Uniform / Dress", value: "School Uniform / Dress" },
  { label: "Text Books & Exercise Books", value: "Text Books & Exercise Books" },
  { label: "School Shoes", value: "School Shoes" },
  { label: "School Bags", value: "School Bags" },
  { label: "Custom / Other", value: "custom" },
];

const CLASS_OPTIONS = [
  { label: "All Classes", value: "all" },
  { label: "Class Pre-Primary", value: "Pre-Primary" },
  { label: "Class I", value: "I" },
  { label: "Class II", value: "II" },
  { label: "Class III", value: "III" },
  { label: "Class IV", value: "IV" },
  { label: "Class V", value: "V" },
  { label: "Class VI", value: "VI" },
  { label: "Class VII", value: "VII" },
  { label: "Class VIII", value: "VIII" },
  { label: "Class IX", value: "IX" },
  { label: "Class X", value: "X" },
  { label: "Class XI", value: "XI" },
  { label: "Class XII", value: "XII" },
];

const SECTION_OPTIONS = [
  { label: "All Sections", value: "all" },
  { label: "Section A", value: "A" },
  { label: "Section B", value: "B" },
  { label: "Section C", value: "C" },
  { label: "Section D", value: "D" },
];

const GENDER_OPTIONS = [
  { label: "All Genders", value: "all" },
  { label: "Boys Only", value: "male" },
  { label: "Girls Only", value: "female" },
];

function WelfareReportContent() {
  const searchParams = useSearchParams();
  const { profile: schoolProfile } = useSchoolProfile();

  // URL query params initialization
  const initialClass = searchParams.get("class") || "all";
  const initialSection = searchParams.get("section") || "all";
  const initialGender = searchParams.get("gender") || "all";
  const currentSession = useAcademicYear();
  const urlSession = searchParams.get("sessionYear");

  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedSection, setSelectedSection] = useState<string>(initialSection);
  const [selectedGender, setSelectedGender] = useState<string>(initialGender);
  const [pickedSessionYear, setSessionYear] = useState<string | null>(urlSession);
  const sessionYear = pickedSessionYear ?? currentSession;

  // Distribution item selection
  const [selectedItemKey, setSelectedItemKey] = useState<string>("Sabuj Sathi (Bicycle)");
  const [customItemName, setCustomItemName] = useState<string>("");
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">("landscape");

  const effectiveItemTitle = useMemo(() => {
    if (selectedItemKey === "custom") {
      return customItemName.trim() || "School Welfare Goods";
    }
    return selectedItemKey;
  }, [selectedItemKey, customItemName]);

  // Fetch all students (summary)
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents("summary"),
    staleTime: 5 * 60 * 1000,
  });

  // Filter & sort students
  const filteredStudents = useMemo(() => {
    let list = [...allStudents];

    // Filter by class
    if (selectedClass && selectedClass !== "all") {
      list = list.filter(
        (s) => (s.presentClass || "").trim().toUpperCase() === selectedClass.trim().toUpperCase()
      );
    }

    // Filter by section
    if (selectedSection && selectedSection !== "all") {
      list = list.filter(
        (s) => (s.presentSection || "").trim().toUpperCase() === selectedSection.trim().toUpperCase()
      );
    }

    // Filter by gender
    if (selectedGender && selectedGender !== "all") {
      list = list.filter(
        (s) => (s.gender || "").toLowerCase() === selectedGender.toLowerCase()
      );
    }

    // Filter active/continuing students
    list = list.filter(
      (s) => s.currentStatus !== "Not Admitted" && s.currentStatus !== "Detained"
    );

    // Sort by class, section, roll
    list.sort(compareStudentsByClassAndRoll);

    return list;
  }, [allStudents, selectedClass, selectedSection, selectedGender]);

  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  const schoolName = schoolProfile?.schoolName || "MARIGACHI HIGH SCHOOL (H. S.)";
  const schoolAddress =
    schoolProfile?.schoolAddress ||
    "Vill & P.O - Marigachi, P.S - Baduria, Dist - North 24 Parganas, PIN - 743401";
  const diseCode = schoolProfile?.udiseCode || "19110803502";

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none font-sans">
      {/* Strict A4 Print Page Styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 ${printOrientation} !important;
            margin: ${printOrientation === "landscape" ? "10mm 12mm" : "12mm 10mm"} !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-welfare-area {
            padding: 5mm 6mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `,
        }}
      />

      {/* Action Bar - Hidden during Print */}
      <div className="flex flex-col gap-4 print:hidden">
        <PageHeader
          back
          title="Students Welfare & Goods Distribution Register"
          badge={<span className="text-[11px] sm:text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                Official Register
              </span>}
          actions={<Button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-4 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span>Print (A4)</span>
          </Button>}
        />

        {/* Controls Grid */}
        <div className="bg-muted/40 p-4 rounded-2xl border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Item Dropdown */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Distribution Item
              </label>
              <CustomSelect
                value={selectedItemKey}
                onChange={(val) => setSelectedItemKey(String(val))}
                options={DISTRIBUTION_ITEM_PRESETS}
              />
            </div>

            {/* Custom Item Name (if selected) */}
            {selectedItemKey === "custom" && (
              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Custom Item Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter custom item name..."
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
            )}

            {/* Class Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Class
              </label>
              <CustomSelect
                value={selectedClass}
                onChange={(val) => setSelectedClass(String(val))}
                options={CLASS_OPTIONS}
              />
            </div>

            {/* Section Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Section
              </label>
              <CustomSelect
                value={selectedSection}
                onChange={(val) => setSelectedSection(String(val))}
                options={SECTION_OPTIONS}
              />
            </div>

            {/* Gender Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Gender
              </label>
              <CustomSelect
                value={selectedGender}
                onChange={(val) => setSelectedGender(String(val))}
                options={GENDER_OPTIONS}
              />
            </div>

            {/* Session Year */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Academic Session
              </label>
              <CustomSelect
                value={sessionYear}
                onChange={(val) => setSessionYear(String(val))}
                options={sessionYears(currentSession, 3).map((y) => ({ label: `${y} Session`, value: y }))}
              />
            </div>

            {/* Print Orientation */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Paper Orientation
              </label>
              <CustomSelect
                value={printOrientation}
                onChange={(val) => setPrintOrientation(val as "landscape" | "portrait")}
                options={[
                  { label: "Landscape (A4)", value: "landscape" },
                  { label: "Portrait (A4)", value: "portrait" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-card border rounded-2xl">
          <Spinner className="h-8 w-8 text-primary mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Loading student records...</p>
        </div>
      ) : (
        /* Printable Official Welfare Register Document */
        <div
          id="print-welfare-area"
          className="bg-white text-black border border-black/30 rounded-2xl shadow-sm p-5 sm:p-8 my-4 print:border-none print:shadow-none print:m-0 print:w-full print:rounded-none"
        >
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-black pb-3 print:pb-2.5">
            <h2
              className="text-2xl sm:text-3xl font-black tracking-tight uppercase print:text-2xl print:leading-tight"
              style={{ color: "#800000", fontFamily: "serif" }}
            >
              {schoolName}
            </h2>
            <p className="text-xs sm:text-sm text-black font-semibold print:text-[13px] print:leading-tight mt-0.5">
              {schoolAddress} &bull; DISE Code: {diseCode}
            </p>
            <p
              className="text-sm sm:text-lg font-bold uppercase tracking-wider mt-1.5 print:text-[15px] print:leading-tight"
              style={{ color: "#002060", fontFamily: "serif" }}
            >
              STUDENTS WELFARE & GOODS DISTRIBUTION REGISTER &bull; SESSION {sessionYear}
            </p>

            {/* Scheme / Item & Filter Metadata Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1.5 border-t border-black text-sm print:text-[14px] font-semibold text-black">
              <div>
                <span>Item / Scheme: </span>
                <span className="font-bold underline uppercase">{effectiveItemTitle}</span>
              </div>
              <div>
                <span>Class: </span>
                <span className="font-bold">{selectedClass === "all" ? "All Classes" : selectedClass}</span>
                <span className="mx-2">&bull;</span>
                <span>Section: </span>
                <span className="font-bold">{selectedSection === "all" ? "All Sections" : selectedSection}</span>
                <span className="mx-2">&bull;</span>
                <span>Gender: </span>
                <span className="font-bold">
                  {selectedGender === "all" ? "All" : selectedGender === "male" ? "Boys" : "Girls"}
                </span>
              </div>
              <div>
                <span>Date: </span>
                <span className="font-bold">{currentDateFormatted}</span>
                <span className="mx-2">&bull;</span>
                <span>Total Students: </span>
                <span className="font-bold">{filteredStudents.length}</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto print:overflow-visible mt-2">
            <table className="w-full text-sm sm:text-base text-center border-collapse border-2 border-black print:text-[15px] print:leading-tight">
              <thead>
                <tr className="bg-neutral-100 print:bg-neutral-100 font-bold text-black border-b-2 border-black">
                  <th className="border border-black py-2.5 px-1 w-[46px] text-center">Sl.</th>
                  <th className="border border-black py-2.5 px-1 w-[60px] text-center">Roll</th>
                  <th className="border border-black py-2.5 px-2 text-left min-w-[200px]">Student Name</th>
                  <th className="border border-black py-2.5 px-2 text-left min-w-[190px]">Father&apos;s Name</th>
                  <th className="border border-black py-2.5 px-1 text-center w-[90px] min-w-[80px]">Items</th>
                  <th className="border border-black py-2.5 px-2 text-center min-w-[160px]">Student / Guardian Sign</th>
                  <th className="border border-black py-2.5 px-2 text-center min-w-[100px]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-black py-10 text-center text-muted-foreground font-semibold text-base">
                      No students found matching the selected class/filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student: Student, index: number) => (
                    <tr
                      key={student.id || student.schoolId || index}
                      className="border-b border-black hover:bg-neutral-50/50 print:hover:bg-transparent"
                    >
                      {/* Sl. No. */}
                      <td className="border border-black py-2.5 px-1 font-mono font-bold text-center">
                        {index + 1}
                      </td>

                      {/* Roll */}
                      <td className="border border-black py-2.5 px-1 font-mono font-bold text-center">
                        {student.presentRoll ?? "-"}
                      </td>

                      {/* Student Name */}
                      <td className="border border-black py-2.5 px-2 text-left font-bold text-black uppercase">
                        {student.name}
                      </td>

                      {/* Father's Name */}
                      <td className="border border-black py-2.5 px-2 text-left font-medium text-black uppercase">
                        {student.fatherName || "-"}
                      </td>

                      {/* Items / Blank for manual handwritten entry */}
                      <td className="border border-black py-2.5 px-1 text-center font-medium w-[90px]"></td>

                      {/* Sign */}
                      <td className="border border-black py-2.5 px-2 text-center min-h-[44px] h-[44px]">
                        {/* Generous physical ink signature area */}
                      </td>

                      {/* Remarks */}
                      <td className="border border-black py-2.5 px-2 text-center"></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Institutional Signature Footer */}
          <div className="mt-12 pt-8 flex justify-between items-end text-sm print:text-[14px] font-bold text-black border-t-2 border-black/60">
            <div className="text-center w-64">
              <div className="border-t-2 border-black border-dashed pt-1.5">
                Signature of Dealing / Class Teacher
              </div>
              <div className="text-xs print:text-[12px] font-normal text-muted-foreground mt-0.5">Date: _______________</div>
            </div>

            <div className="text-center w-64">
              <div className="border-t-2 border-black border-dashed pt-1.5">
                Signature of Headmaster / TIC with Seal
              </div>
              <div className="text-xs print:text-[12px] font-normal text-muted-foreground mt-0.5">Date: _______________</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WelfareReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-16">
          <Spinner className="h-8 w-8 text-primary mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Loading Welfare Register...</p>
        </div>
      }
    >
      <WelfareReportContent />
    </Suspense>
  );
}
