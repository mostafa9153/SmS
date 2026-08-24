"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Sparkles, 
  Calendar, 
  Building2,
  Users,
  ShieldCheck,
  TrendingUp,
  Table as TableIcon,
  ChevronDown
} from "lucide-react";
import { getStudents } from "@/lib/data/students";
import { computeClassicStrengthData, exportClassicStrengthExcel } from "@/lib/reports/classic-strength-report";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";

export default function ReportsPage() {
  const [sessionYear, setSessionYear] = useState<string>("2026");
  const [asOnDate, setAsOnDate] = useState<string>(
    new Date().toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "numeric" })
  );

  const { data: allStudents = [], isLoading, refetch } = useQuery({
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

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none">
      {/* Top Header - Hidden in Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Official Institutional Reports</span>
            <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
              WB Standard
            </span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-36">
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

          <Button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs active:scale-95 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel (.xlsx)
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-1.5 border-border/80 font-semibold text-xs px-4 py-2 rounded-xl shadow-2xs hover:bg-muted active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4 text-primary" />
            Print / Save PDF (A4)
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
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
          
          {/* Document Header */}
          <div className="text-center py-6 px-4 border-b border-border/70 bg-muted/20 print:bg-transparent print:border-black print:py-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground print:text-black uppercase">
              {reportData.schoolName}
            </h2>
            <p className="text-sm sm:text-base font-bold text-foreground/90 mt-1 uppercase tracking-wide print:text-black">
              {reportData.reportTitle}
            </p>
          </div>

          {/* Document Body */}
          <div className="p-4 sm:p-6 space-y-6 print:p-2 print:space-y-4">
            
            {/* Table 1: Main Section Matrix Table */}
            <div className="overflow-x-auto border border-border/80 rounded-xl print:border-black">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  {/* Top Tier Header */}
                  <tr className="bg-muted/60 font-bold border-b border-border/80 text-foreground print:bg-gray-100 print:text-black print:border-black">
                    <th rowSpan={2} className="border-r border-border/80 px-3 py-2 text-left font-bold min-w-[70px] print:border-black">
                      Class
                    </th>
                    <th colSpan={4} className="border-r border-border/80 py-1.5 font-bold bg-sky-500/10 text-sky-800 dark:text-sky-300 print:bg-transparent print:text-black print:border-black">
                      Boys
                    </th>
                    <th colSpan={4} className="border-r border-border/80 py-1.5 font-bold bg-pink-500/10 text-pink-800 dark:text-pink-300 print:bg-transparent print:text-black print:border-black">
                      Girls
                    </th>
                    <th rowSpan={2} className="border-r border-border/80 px-2 py-2 font-bold min-w-[65px] print:border-black">
                      Total Hindu
                    </th>
                    <th rowSpan={2} className="border-r border-border/80 px-2 py-2 font-bold min-w-[65px] print:border-black">
                      Total Muslim
                    </th>
                    <th rowSpan={2} className="border-r border-border/80 px-2 py-2 font-bold min-w-[70px] print:border-black">
                      Total Students
                    </th>
                    <th rowSpan={2} className="px-2 py-2 font-bold min-w-[75px] bg-primary/5 text-primary print:text-black print:bg-transparent">
                      Students in Class
                    </th>
                  </tr>
                  {/* Sub Tier Header */}
                  <tr className="bg-muted/40 font-semibold border-b border-border/80 text-muted-foreground text-[11px] print:bg-gray-50 print:text-black print:border-black">
                    <th className="border-r border-border/80 px-2 py-1 print:border-black">Hindu</th>
                    <th className="border-r border-border/80 px-2 py-1 print:border-black">Muslim</th>
                    <th className="border-r border-border/80 px-2 py-1 font-bold text-foreground print:border-black">Total Boys</th>
                    <th className="border-r border-border/80 px-2 py-1 font-bold text-sky-700 dark:text-sky-400 print:border-black">Boys in Class</th>
                    
                    <th className="border-r border-border/80 px-2 py-1 print:border-black">Hindu</th>
                    <th className="border-r border-border/80 px-2 py-1 print:border-black">Muslim</th>
                    <th className="border-r border-border/80 px-2 py-1 font-bold text-foreground print:border-black">Total Girls</th>
                    <th className="border-r border-border/80 px-2 py-1 font-bold text-pink-700 dark:text-pink-400 print:border-black">Girls in Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 print:divide-black">
                  {reportData.sectionRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors print:border-b print:border-black">
                      <td className="border-r border-border/80 px-3 py-1.5 font-bold text-left text-foreground bg-muted/10 print:border-black print:text-black">
                        {r.displayLabel}
                      </td>
                      <td className="border-r border-border/80 px-2 py-1.5 print:border-black">{r.boysHindu}</td>
                      <td className="border-r border-border/80 px-2 py-1.5 print:border-black">{r.boysMuslim}</td>
                      <td className="border-r border-border/80 px-2 py-1.5 font-semibold text-foreground print:border-black">{r.totalBoys}</td>
                      <td className="border-r border-border/80 px-2 py-1.5 font-bold text-sky-700 dark:text-sky-400 bg-sky-500/5 print:bg-transparent print:text-black print:border-black">
                        {r.boysInClass}
                      </td>

                      <td className="border-r border-border/80 px-2 py-1.5 print:border-black">{r.girlsHindu}</td>
                      <td className="border-r border-border/80 px-2 py-1.5 print:border-black">{r.girlsMuslim}</td>
                      <td className="border-r border-border/80 px-2 py-1.5 font-semibold text-foreground print:border-black">{r.totalGirls}</td>
                      <td className="border-r border-border/80 px-2 py-1.5 font-bold text-pink-700 dark:text-pink-400 bg-pink-500/5 print:bg-transparent print:text-black print:border-black">
                        {r.girlsInClass}
                      </td>

                      <td className="border-r border-border/80 px-2 py-1.5 font-semibold text-foreground print:border-black">{r.totalHindu}</td>
                      <td className="border-r border-border/80 px-2 py-1.5 font-semibold text-foreground print:border-black">{r.totalMuslim}</td>
                      <td className="border-r border-border/80 px-2 py-1.5 font-bold text-foreground print:border-black">{r.totalStudents}</td>
                      <td className="px-2 py-1.5 font-bold text-primary bg-primary/5 print:text-black print:bg-transparent">
                        {r.studentsInClass}
                      </td>
                    </tr>
                  ))}

                  {/* Grand Totals Row */}
                  <tr className="bg-muted/80 font-black text-foreground border-t-2 border-border/90 text-xs print:bg-gray-200 print:text-black print:border-black">
                    <td className="border-r border-border/80 px-3 py-2 text-left font-black print:border-black">
                      Total
                    </td>
                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.boysHindu}</td>
                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.boysMuslim}</td>
                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.totalBoys}</td>
                    <td className="border-r border-border/80 px-2 py-2 text-sky-700 dark:text-sky-300 print:text-black print:border-black">
                      {reportData.totals.totalBoys}
                    </td>

                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.girlsHindu}</td>
                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.girlsMuslim}</td>
                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.totalGirls}</td>
                    <td className="border-r border-border/80 px-2 py-2 text-pink-700 dark:text-pink-300 print:text-black print:border-black">
                      {reportData.totals.totalGirls}
                    </td>

                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.totalHindu}</td>
                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.totalMuslim}</td>
                    <td className="border-r border-border/80 px-2 py-2 print:border-black">{reportData.totals.totalStudents}</td>
                    <td className="px-2 py-2 text-primary font-black print:text-black">
                      {reportData.totals.totalStudents}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Dual Summary Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-3">
              
              {/* Left Summary: Class Breakdown */}
              <div className="border border-border/80 rounded-xl overflow-hidden print:border-black">
                <div className="bg-muted/60 px-3.5 py-2 border-b border-border/80 print:bg-gray-100 print:border-black">
                  <h3 className="text-xs font-bold text-foreground print:text-black uppercase tracking-wider">
                    Class-Wise Aggregate Summary
                  </h3>
                </div>
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-muted/30 text-[11px] font-semibold text-muted-foreground border-b border-border/80 print:text-black print:border-black">
                      <th rowSpan={2} className="border-r border-border/80 px-2 py-1 text-left print:border-black">Class</th>
                      <th colSpan={2} className="border-r border-border/80 px-2 py-1 print:border-black">Boys</th>
                      <th colSpan={2} className="border-r border-border/80 px-2 py-1 print:border-black">Girls</th>
                      <th rowSpan={2} className="px-2 py-1 font-bold text-foreground print:text-black">Total</th>
                    </tr>
                    <tr className="bg-muted/20 text-[10px] text-muted-foreground border-b border-border/80 print:text-black print:border-black">
                      <th className="border-r border-border/80 px-1.5 py-0.5 print:border-black">Hindu</th>
                      <th className="border-r border-border/80 px-1.5 py-0.5 print:border-black">Muslim</th>
                      <th className="border-r border-border/80 px-1.5 py-0.5 print:border-black">Hindu</th>
                      <th className="border-r border-border/80 px-1.5 py-0.5 print:border-black">Muslim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 print:divide-black">
                    {reportData.classSummaries.map((cs, idx) => (
                      <tr key={idx} className="hover:bg-muted/15 print:border-b print:border-black">
                        <td className="border-r border-border/80 px-2 py-1 font-bold text-left print:border-black">
                          Class {cs.classLevel}
                        </td>
                        <td className="border-r border-border/80 px-1.5 py-1 print:border-black">{cs.boysHindu}</td>
                        <td className="border-r border-border/80 px-1.5 py-1 print:border-black">{cs.boysMuslim}</td>
                        <td className="border-r border-border/80 px-1.5 py-1 print:border-black">{cs.girlsHindu}</td>
                        <td className="border-r border-border/80 px-1.5 py-1 print:border-black">{cs.girlsMuslim}</td>
                        <td className="px-2 py-1 font-bold text-foreground print:text-black">{cs.totalStudents}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/60 font-black text-foreground border-t-2 border-border/80 print:bg-gray-100 print:text-black print:border-black">
                      <td className="border-r border-border/80 px-2 py-1.5 text-left print:border-black">Total</td>
                      <td className="border-r border-border/80 px-1.5 py-1.5 print:border-black">{reportData.totals.boysHindu}</td>
                      <td className="border-r border-border/80 px-1.5 py-1.5 print:border-black">{reportData.totals.boysMuslim}</td>
                      <td className="border-r border-border/80 px-1.5 py-1.5 print:border-black">{reportData.totals.girlsHindu}</td>
                      <td className="border-r border-border/80 px-1.5 py-1.5 print:border-black">{reportData.totals.girlsMuslim}</td>
                      <td className="px-2 py-1.5 font-black text-primary print:text-black">{reportData.totals.totalStudents}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Summary: Stage Differentials */}
              <div className="border border-border/80 rounded-xl overflow-hidden print:border-black">
                <div className="bg-muted/60 px-3.5 py-2 border-b border-border/80 print:bg-gray-100 print:border-black">
                  <h3 className="text-xs font-bold text-foreground print:text-black uppercase tracking-wider">
                    Stage Differentials (Deferencials)
                  </h3>
                </div>
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-muted/30 text-[11px] font-semibold text-muted-foreground border-b border-border/80 print:text-black print:border-black">
                      <th className="border-r border-border/80 px-3 py-1.5 text-left print:border-black">Stage / Group</th>
                      <th className="border-r border-border/80 px-2 py-1.5 print:border-black">Boys</th>
                      <th className="border-r border-border/80 px-2 py-1.5 print:border-black">Girls</th>
                      <th className="border-r border-border/80 px-2 py-1.5 print:border-black">Hindu</th>
                      <th className="border-r border-border/80 px-2 py-1.5 print:border-black">Muslim</th>
                      <th className="px-2 py-1.5 font-bold text-foreground print:text-black">Total Student</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 print:divide-black">
                    {reportData.differentials.map((d, idx) => {
                      const isGrand = idx === reportData.differentials.length - 1;
                      return (
                        <tr 
                          key={idx} 
                          className={isGrand ? "bg-muted/60 font-black text-foreground border-t-2 border-border/80 print:bg-gray-100 print:text-black print:border-black" : "hover:bg-muted/15 print:border-b print:border-black"}
                        >
                          <td className="border-r border-border/80 px-3 py-1.5 font-bold text-left print:border-black">
                            {d.label}
                          </td>
                          <td className="border-r border-border/80 px-2 py-1.5 print:border-black">{d.boys}</td>
                          <td className="border-r border-border/80 px-2 py-1.5 print:border-black">{d.girls}</td>
                          <td className="border-r border-border/80 px-2 py-1.5 print:border-black">{d.hindu}</td>
                          <td className="border-r border-border/80 px-2 py-1.5 print:border-black">{d.muslim}</td>
                          <td className="px-2 py-1.5 font-black text-primary print:text-black">{d.total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

          {/* Document Footer (Visible in Print) */}
          <div className="hidden print:flex justify-between items-center px-6 py-4 mt-8 border-t border-black text-[11px] font-semibold text-black">
            <span>Generated from Marigachi High School SMS</span>
            <span>Headmaster / TIC Signature</span>
          </div>

        </div>
      )}
    </div>
  );
}
