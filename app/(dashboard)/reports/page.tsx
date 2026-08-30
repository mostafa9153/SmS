"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Download,
  ArrowLeft,
} from "lucide-react";
import { getStudents } from "@/lib/data/students";
import {
  computeClassicStrengthData,
  exportClassicStrengthExcel,
  exportClassicStrengthWord,
  exportClassicStrengthCsv,
} from "@/lib/reports/classic-strength-report";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";

export default function ReportsPage() {
  const router = useRouter();
  const [sessionYear, setSessionYear] = useState<string>("2026");
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">("landscape");
  const [asOnDate, setAsOnDate] = useState<string>(
    new Date().toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "numeric" })
  );

  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["students-all"],
    queryFn: () => getStudents(),
  });

  const reportData = useMemo(() => {
    return computeClassicStrengthData(
      allStudents,
      "MARIGACHI HIGH SCHOOL (H. S.)",
      asOnDate,
      sessionYear
    );
  }, [allStudents, asOnDate, sessionYear]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportClassicStrengthExcel(allStudents, "MARIGACHI HIGH SCHOOL (H. S.)", asOnDate, sessionYear);
  };

  const handleExportWord = () => {
    exportClassicStrengthWord(allStudents, "MARIGACHI HIGH SCHOOL (H. S.)", asOnDate, sessionYear);
  };

  const handleExportCsv = () => {
    exportClassicStrengthCsv(allStudents, "MARIGACHI HIGH SCHOOL (H. S.)", asOnDate, sessionYear);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none font-sans">
      {/* Dynamic Print Page Size CSS to strictly guarantee 1 page in selected orientation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 ${printOrientation} !important;
            margin: ${printOrientation === "landscape" ? "5mm 7mm" : "6mm 5mm"} !important;
          }
        }
      ` }} />

      {/* Action Bar - Hidden in Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            title="Back"
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Students Strength Tabulation</span>
            <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
              Official Format
            </span>
          </h1>
        </div>

        {/* Action Buttons: Excel, Word, CSV, Print */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-32">
            <CustomSelect
              value={sessionYear}
              onChange={(val) => setSessionYear(val)}
              options={[
                { label: "2026 Session", value: "2026" },
                { label: "2025 Session", value: "2025" },
                { label: "2024 Session", value: "2024" },
              ]}
            />
          </div>

          <div className="w-36">
            <CustomSelect
              value={printOrientation}
              onChange={(val) => setPrintOrientation(val as "landscape" | "portrait")}
              options={[
                { label: "Landscape (1-Page)", value: "landscape" },
                { label: "Portrait (1-Page)", value: "portrait" },
              ]}
            />
          </div>

          {/* Excel Export */}
          <Button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel (.xlsx)
          </Button>

          {/* Word Export */}
          <Button
            onClick={handleExportWord}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <FileText className="h-4 w-4" />
            Word (.docx)
          </Button>

          {/* CSV Export */}
          <Button
            onClick={handleExportCsv}
            variant="outline"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl shadow-2xs hover:bg-muted cursor-pointer active:scale-95 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>

          {/* Print / PDF */}
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-1.5 border-border/80 font-semibold text-xs px-3.5 py-2 rounded-xl shadow-2xs hover:bg-muted cursor-pointer active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4 text-primary" />
            Print (1 Page)
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-card border rounded-2xl">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Calculating student demographic matrix...</p>
        </div>
      ) : (
        /* Printable Official Document Container */
        <div
          id="print-report-area"
          className="bg-white text-black border border-black/30 rounded-2xl shadow-sm overflow-hidden p-3 sm:p-5 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none"
        >
          {/* Document Title (Matches Image) */}
          <div className="text-center pb-2 print:pb-0.5">
            <h2
              className="text-lg sm:text-2xl font-bold tracking-tight uppercase print:text-sm sm:print:text-base print:leading-tight"
              style={{ color: "#800000", fontFamily: "serif" }}
            >
              {reportData.schoolName}
            </h2>
            <p
              className="text-xs sm:text-sm font-bold uppercase tracking-wider italic print:text-[9.5px] print:leading-tight print:mt-0.5"
              style={{ color: "#002060", fontFamily: "serif" }}
            >
              {reportData.reportTitle}
            </p>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TABLE 1: SECTION-WISE BREAKDOWN MATRIX                       */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="overflow-x-auto print:overflow-visible border border-black rounded-sm mt-2 print:mt-1 print:border-black">
            <table className="w-full text-xs text-center border-collapse border border-black print:text-[9.5px] print:leading-tight">
              <thead>
                {/* Header Row 1 */}
                <tr className="font-bold border-b border-black text-black print:h-4">
                  <th rowSpan={2} className="border border-black px-2 py-1.5 min-w-[55px] print:px-0.5 print:py-0.5 print:min-w-0"></th>
                  <th colSpan={2} className="border border-black py-1 text-sm font-bold print:py-0.5 print:text-[10px]" style={{ color: "#008000" }}>
                    Boys
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]" style={{ color: "#008000" }}>
                    Total<br />Boys
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]" style={{ color: "#006600" }}>
                    Boys in<br />Class
                  </th>
                  <th colSpan={2} className="border border-black py-1 text-sm font-bold print:py-0.5 print:text-[10px]" style={{ color: "#C00000" }}>
                    Girls
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]" style={{ color: "#C00000" }}>
                    Total<br />Girls
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]" style={{ color: "#800000" }}>
                    Girls in<br />Class
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]" style={{ color: "#002060" }}>
                    Total<br />Hindu
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]" style={{ color: "#008000" }}>
                    Total<br />Muslim
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]">
                    Total<br />Students
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]" style={{ color: "#7030A0" }}>
                    Students<br />in Class
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold leading-tight print:px-0.5 print:py-0.5 print:text-[8.5px]" style={{ color: "#800000" }}>
                    Total<br />Student
                  </th>
                </tr>
                {/* Header Row 2 */}
                <tr className="font-bold border-b border-black text-xs print:text-[8.5px] print:h-3.5">
                  <th className="border border-black px-1 py-0.5 print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>Hindu</th>
                  <th className="border border-black px-1 py-0.5 print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>Muslim</th>
                  <th className="border border-black px-1 py-0.5 print:px-0.5 print:py-0.5" style={{ color: "#C00000" }}>Hindu</th>
                  <th className="border border-black px-1 py-0.5 print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>Muslim</th>
                </tr>
              </thead>
              <tbody>
                {reportData.sectionRows.map((r, idx) => (
                  <tr key={idx} className="border-b border-black text-sm print:text-[9.5px] print:leading-tight print:h-4">
                    {/* Col 1: Class Label */}
                    <td className="border border-black px-2 py-1 font-bold text-left print:px-0.5 print:py-0.5" style={{ color: "#004080" }}>
                      {r.displayLabel}
                    </td>

                    {/* Col 2: Boys Hindu */}
                    <td className="border border-black px-1.5 py-1 print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>
                      {r.boysHindu}
                    </td>

                    {/* Col 3: Boys Muslim */}
                    <td className="border border-black px-1.5 py-1 print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                      {r.boysMuslim}
                    </td>

                    {/* Col 4: Total Boys */}
                    <td className="border border-black px-1.5 py-1 font-bold print:px-0.5 print:py-0.5" style={{ color: "#006600" }}>
                      {r.totalBoys}
                    </td>

                    {/* Col 5: Boys in Class (Merged vertically across sections) */}
                    {r.isFirstInSection && (
                      <td
                        rowSpan={r.sectionCountInClass}
                        className="border border-black px-2 py-1 font-bold italic align-middle text-[1.05rem] print:text-[10px] print:px-0.5 print:py-0.5"
                        style={{ color: "#006600" }}
                      >
                        {r.boysInClass}
                      </td>
                    )}

                    {/* Col 6: Girls Hindu */}
                    <td className="border border-black px-1.5 py-1 print:px-0.5 print:py-0.5" style={{ color: "#C00000" }}>
                      {r.girlsHindu}
                    </td>

                    {/* Col 7: Girls Muslim */}
                    <td className="border border-black px-1.5 py-1 print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                      {r.girlsMuslim}
                    </td>

                    {/* Col 8: Total Girls */}
                    <td className="border border-black px-1.5 py-1 font-bold italic print:px-0.5 print:py-0.5" style={{ color: "#C00000" }}>
                      {r.totalGirls}
                    </td>

                    {/* Col 9: Girls in Class (Merged vertically across sections) */}
                    {r.isFirstInSection && (
                      <td
                        rowSpan={r.sectionCountInClass}
                        className="border border-black px-2 py-1 font-bold italic align-middle text-[1.05rem] print:text-[10px] print:px-0.5 print:py-0.5"
                        style={{ color: "#800000" }}
                      >
                        {r.girlsInClass}
                      </td>
                    )}

                    {/* Col 10: Total Hindu (Merged vertically across sections) */}
                    {r.isFirstInSection && (
                      <td
                        rowSpan={r.sectionCountInClass}
                        className="border border-black px-2 py-1 font-bold italic align-middle text-[1.05rem] print:text-[10px] print:px-0.5 print:py-0.5"
                        style={{ color: "#002060" }}
                      >
                        {r.totalHindu}
                      </td>
                    )}

                    {/* Col 11: Total Muslim (Merged vertically across sections) */}
                    {r.isFirstInSection && (
                      <td
                        rowSpan={r.sectionCountInClass}
                        className="border border-black px-2 py-1 font-bold italic align-middle text-[1.05rem] print:text-[10px] print:px-0.5 print:py-0.5"
                        style={{ color: "#008000" }}
                      >
                        {r.totalMuslim}
                      </td>
                    )}

                    {/* Col 12: Total Students in Section */}
                    <td className="border border-black px-2 py-1 font-bold print:px-0.5 print:py-0.5">
                      {r.totalStudents}
                    </td>

                    {/* Col 13: Students in Class (Merged vertically across sections) */}
                    {r.isFirstInSection && (
                      <td
                        rowSpan={r.sectionCountInClass}
                        className="border border-black px-2 py-1 font-bold italic align-middle text-[1.05rem] print:text-[10px] print:px-0.5 print:py-0.5"
                        style={{ color: "#7030A0" }}
                      >
                        {r.studentsInClass}
                      </td>
                    )}

                    {/* Col 14: Stage Total (Merged vertically: V-VIII, IX-X, XI-XII) */}
                    {r.isFirstInStage && (
                      <td
                        rowSpan={r.stageRowCount}
                        className="border border-black px-2 py-1 font-bold italic align-middle text-[1.15rem] print:text-[10.5px] print:px-0.5 print:py-0.5"
                        style={{ color: "#800000" }}
                      >
                        {r.stageTotal}
                      </td>
                    )}
                  </tr>
                ))}

                {/* Grand Totals Row */}
                <tr className="font-bold border-t-2 border-b-2 border-black text-sm print:text-[9.5px] print:leading-tight print:h-4" style={{ borderBottomStyle: "double" }}>
                  <td className="border border-black px-2 py-1.5 font-black text-left print:px-0.5 print:py-0.5" style={{ color: "#004080" }}>
                    Total
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>
                    {reportData.totals.boysHindu}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                    {reportData.totals.boysMuslim}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#006600" }}>
                    {reportData.totals.totalBoys}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#006600" }}>
                    {reportData.totals.totalBoys}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                    {reportData.totals.girlsHindu}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                    {reportData.totals.girlsMuslim}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#C00000" }}>
                    {reportData.totals.totalGirls}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#800000" }}>
                    {reportData.totals.totalGirls}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>
                    {reportData.totals.totalHindu}
                  </td>
                  <td className="border border-black px-1.5 py-1.5 font-bold print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                    {reportData.totals.totalMuslim}
                  </td>
                  <td colSpan={2} className="border border-black px-2 py-1.5 font-black text-sm print:text-[9.5px] print:px-0.5 print:py-0.5" style={{ color: "#C00000" }}>
                    Total Students
                  </td>
                  <td className="border border-black px-2 py-1.5 font-black text-base print:text-[10.5px] print:px-0.5 print:py-0.5" style={{ color: "#800000" }}>
                    {reportData.totals.totalStudents}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* TABLE 2: SIDE-BY-SIDE CLASS SUMMARY & DEFERENTIALS          */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="overflow-x-auto print:overflow-visible border border-black rounded-sm mt-3 print:mt-1 print:border-black">
            <table className="w-full text-xs text-center border-collapse border border-black print:text-[9.5px] print:leading-tight">
              <thead>
                <tr className="font-bold border-b border-black text-black text-xs print:text-[8.5px] print:h-4">
                  {/* Left Table Headers */}
                  <th rowSpan={2} className="border border-black px-2 py-1 font-bold text-sm print:text-[9.5px] print:py-0.5 print:px-0.5" style={{ color: "#004080" }}>
                    Class
                  </th>
                  <th colSpan={2} className="border border-black py-0.5 text-xs font-bold print:text-[8.5px] print:py-0.5" style={{ color: "#008000" }}>
                    Boys
                  </th>
                  <th colSpan={2} className="border border-black py-0.5 text-xs font-bold print:text-[8.5px] print:py-0.5" style={{ color: "#C00000" }}>
                    Girls
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 min-w-[30px] print:py-0.5 print:px-0.5 print:min-w-0"></th>

                  {/* Spacer / Right Table Headers */}
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold print:text-[8.5px] print:py-0.5 print:px-0.5" style={{ color: "#006600" }}>
                    Boys
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold print:text-[8.5px] print:py-0.5 print:px-0.5" style={{ color: "#800000" }}>
                    Girls
                  </th>
                  <th rowSpan={2} className="border border-black px-3 py-1 font-bold text-sm print:text-[9.5px] print:py-0.5 print:px-0.5" style={{ color: "#002060" }}>
                    Deferentials
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold print:text-[8.5px] print:py-0.5 print:px-0.5" style={{ color: "#002060" }}>
                    Hindu
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold print:text-[8.5px] print:py-0.5 print:px-0.5" style={{ color: "#008000" }}>
                    Muslim
                  </th>
                  <th rowSpan={2} className="border border-black px-2 py-1 text-xs font-bold leading-tight print:text-[8.5px] print:py-0.5 print:px-0.5" style={{ color: "#800000" }}>
                    Total<br />Student
                  </th>
                </tr>
                <tr className="font-bold border-b border-black text-[11px] print:text-[8px] print:h-3.5">
                  <th className="border border-black px-1 py-0.5 print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>Hindu</th>
                  <th className="border border-black px-1 py-0.5 print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>Muslim</th>
                  <th className="border border-black px-1 py-0.5 print:px-0.5 print:py-0.5" style={{ color: "#C00000" }}>Hindu</th>
                  <th className="border border-black px-1 py-0.5 print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>Muslim</th>
                </tr>
              </thead>
              <tbody>
                {reportData.classSummaries.map((cs, i) => {
                  const diff = reportData.differentials[i] || null;
                  return (
                    <tr key={cs.classLevel} className="border-b border-black text-sm print:text-[9.5px] print:leading-tight print:h-4">
                      {/* Left: Class */}
                      <td className="border border-black px-2 py-1 font-bold italic print:px-0.5 print:py-0.5" style={{ color: "#004080" }}>
                        {cs.classLevel}
                      </td>
                      <td className="border border-black px-1.5 py-1 italic print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>
                        {cs.boysHindu}
                      </td>
                      <td className="border border-black px-1.5 py-1 italic print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                        {cs.boysMuslim}
                      </td>
                      <td className="border border-black px-1.5 py-1 italic print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>
                        {cs.girlsHindu}
                      </td>
                      <td className="border border-black px-1.5 py-1 italic print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                        {cs.girlsMuslim}
                      </td>
                      <td className="border border-black px-2 py-1 font-bold italic print:px-0.5 print:py-0.5" style={{ color: "#004080" }}>
                        {cs.totalStudents}
                      </td>

                      {/* Right: Differentials */}
                      <td className="border border-black px-2 py-1 font-semibold print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>
                        {diff && diff.label !== "Total Hindu/Muslim" ? diff.boys : ""}
                      </td>
                      <td className="border border-black px-2 py-1 font-semibold print:px-0.5 print:py-0.5" style={{ color: "#800000" }}>
                        {diff && diff.label !== "Total Hindu/Muslim" ? diff.girls : ""}
                      </td>
                      <td
                        className="border border-black px-3 py-1 font-bold text-left text-[0.95rem] print:text-[9px] print:px-0.5 print:py-0.5"
                        style={{
                          color: diff?.label === "Total Hindu/Muslim" ? "#002060" : "#4F6228",
                        }}
                      >
                        {diff ? (
                          diff.label === "Total Hindu/Muslim" ? (
                            <span className="text-[0.75rem] print:text-[8px]">Total Hindu<span style={{ color: "#008000" }}>/Muslim</span></span>
                          ) : (
                            diff.label
                          )
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="border border-black px-2 py-1 font-bold text-[1.05rem] print:text-[9.5px] print:px-0.5 print:py-0.5" style={{ color: "#002060" }}>
                        {diff ? diff.hindu : ""}
                      </td>
                      <td className="border border-black px-2 py-1 font-bold text-[1.05rem] print:text-[9.5px] print:px-0.5 print:py-0.5" style={{ color: "#008000" }}>
                        {diff ? diff.muslim : ""}
                      </td>
                      <td className="border border-black px-2 py-1 font-black text-[1.1rem] print:text-[10px] print:px-0.5 print:py-0.5" style={{ color: "#800000" }}>
                        {diff && diff.label !== "Total Hindu/Muslim" ? diff.total : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Footer (Visible in Print) */}
          <div className="hidden print:flex justify-between items-center px-3 py-1 mt-2 border-t border-black text-[8.5px] font-semibold text-black">
            <span>Generated from Marigachi High School SMS</span>
            <span>Headmaster / TIC Signature</span>
          </div>

        </div>
      )}
    </div>
  );
}
