"use client";

import { RoutineClass, DAY_NAMES } from "@/lib/routine/types";
import { showToast } from "@/components/ui/toast-banner";
import { getCellOptions, cellHasTeacher } from "@/lib/routine/routine-groups";
import type { ViewerCoreState } from "./use-viewer-core";

export function useViewerExport(ctx: ViewerCoreState) {
  const { classes, roomMap, routine, settings, subjectMap, teacherMap, teachers } = ctx;
  const handleExportExcel = async () => {
    if (!routine) {
      showToast({ title: "No routine to export", type: "error" });
      return;
    }
    
    try {
      showToast({ title: "Generating styled Excel file...", type: "info" });
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SMS Web App";
      
      const maxPeriods = settings.periodsPerDay;
      const headerRow = ["Day / Class", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
      
      // Reusable styles
      const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
      const dayRowFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
      
      const borderAll: any = {
        top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
      };

      const applyTableStyles = (sheet: any, startRow: number, rowCount: number, colCount: number) => {
        sheet.getColumn(1).width = 20;
        for (let i = 2; i <= colCount; i++) {
          sheet.getColumn(i).width = 23;
        }

        for (let r = startRow; r < startRow + rowCount; r++) {
          for (let c = 1; c <= colCount; c++) {
             const cell = sheet.getCell(r, c);
             cell.border = borderAll;
             cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          }
        }
        
        for (let c = 1; c <= colCount; c++) {
           const cell = sheet.getCell(startRow, c);
           cell.fill = headerFill;
           cell.font = headerFont;
        }
      };

      // --- 1. MASTER (DAY-WISE) SHEET ---
      const wsMaster = workbook.addWorksheet("Master (Day-wise)");
      let mRowIdx = 1;

      settings.workingDays.forEach((dIdx, dPos) => {
        const titleRow = wsMaster.getRow(mRowIdx);
        titleRow.getCell(1).value = "--- " + DAY_NAMES[dIdx] + " ---";
        titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF333333' } };
        titleRow.getCell(1).fill = dayRowFill;
        wsMaster.mergeCells(mRowIdx, 1, mRowIdx, maxPeriods + 1);
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        mRowIdx++;

        const startTblRow = mRowIdx;
        wsMaster.getRow(mRowIdx).values = headerRow;
        mRowIdx++;

        classes.forEach((c) => {
          const classLimit = c.dailyPeriods || maxPeriods;
          const rowData = [c.className + " - " + c.section];

          for (let p = 1; p <= maxPeriods; p++) {
            if (p > classLimit) {
              rowData.push("");
            } else {
              const cellData = routine.grid[c.id]?.[dPos]?.[p - 1];
              if (cellData) {
                if (cellData.gid) {
                  // Parallel group cell: list all options stacked.
                  const text = getCellOptions(cellData)
                    .map((o) => {
                      const s = subjectMap.get(o.sid);
                      const t = teacherMap.get(o.tid);
                      return `${s?.name || "?"} (${t?.shortName || "?"})`;
                    })
                    .join(" | ");
                  rowData.push(text);
                } else {
                  const subj = subjectMap.get(cellData.sid);
                  const tch = teacherMap.get(cellData.tid);
                  rowData.push((subj?.name || "Unknown") + "\n(" + (tch?.shortName || "?") + ")");
                }
              } else {
                 rowData.push("-");
              }
            }
          }
          wsMaster.getRow(mRowIdx).values = rowData;
          wsMaster.getRow(mRowIdx).height = 44;
          mRowIdx++;
        });
        
        applyTableStyles(wsMaster, startTblRow, mRowIdx - startTblRow, maxPeriods + 1);
        mRowIdx += 2;
      });

      // --- 2. MASTER (TEACHER-WISE) SHEET ---
      const wsMasterTeacher = workbook.addWorksheet("Master (Teacher-wise)");
      let mtRowIdx = 1;
      const teacherHeaderRow = ["Teacher / Faculty", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
      const teacherDayRowFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
      const teacherHeaderFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF385723' } };

      const sortedFaculty = [...teachers].sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name));

      settings.workingDays.forEach((dIdx, dPos) => {
        const titleRow = wsMasterTeacher.getRow(mtRowIdx);
        titleRow.getCell(1).value = "--- " + DAY_NAMES[dIdx] + " (Teacher Master) ---";
        titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF274E13' } };
        titleRow.getCell(1).fill = teacherDayRowFill;
        wsMasterTeacher.mergeCells(mtRowIdx, 1, mtRowIdx, maxPeriods + 1);
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        mtRowIdx++;

        const startTblRow = mtRowIdx;
        wsMasterTeacher.getRow(mtRowIdx).values = teacherHeaderRow;
        mtRowIdx++;

        sortedFaculty.forEach((tch) => {
          const rowData: any[] = [
            tch.name + (tch.shortName ? ` (${tch.shortName})` : "") + (tch.primarySubject ? ` [${tch.primarySubject}]` : "")
          ];

          for (let p = 1; p <= maxPeriods; p++) {
            const pPos = p - 1;
            let assignedClass: RoutineClass | null = null;
            let assignedCell: any = null;
            let matchedOpt: { sid: string; tid: string; rid?: string | null } | null = null;

            const seenGroupUnits = new Set<string>();
            for (const c of classes) {
              const cellData = routine.grid[c.id]?.[dPos]?.[pPos];
              if (!cellData || !cellHasTeacher(cellData, tch.id)) continue;
              if (cellData.gid) {
                if (seenGroupUnits.has(cellData.gid)) continue;
                seenGroupUnits.add(cellData.gid);
              }
              const opt = getCellOptions(cellData).find((o) => o.tid === tch.id);
              if (!opt) continue;
              assignedClass = c;
              assignedCell = cellData;
              matchedOpt = opt;
              break;
            }

            if (assignedClass && assignedCell && matchedOpt) {
              const subj = subjectMap.get(matchedOpt.sid);
              const room = matchedOpt.rid ? roomMap.get(matchedOpt.rid) : null;
              let text = `${assignedClass.className}-${assignedClass.section}\n${subj?.name || "Unknown"}`;
              if (assignedCell.lab) text += " (Lab)";
              if (assignedCell.gid) text += " [Group]";
              if (room) text += `\n[${room.name}]`;
              rowData.push(text);
            } else {
              rowData.push("-");
            }
          }

          wsMasterTeacher.getRow(mtRowIdx).values = rowData;
          wsMasterTeacher.getRow(mtRowIdx).height = 44;
          mtRowIdx++;
        });

        applyTableStyles(wsMasterTeacher, startTblRow, mtRowIdx - startTblRow, maxPeriods + 1);
        for (let c = 1; c <= maxPeriods + 1; c++) {
          const hCell = wsMasterTeacher.getCell(startTblRow, c);
          hCell.fill = teacherHeaderFill;
          hCell.font = headerFont;
        }
        mtRowIdx += 2;
      });

      // --- 3. CLASS-WISE SHEET ---
      const wsClass = workbook.addWorksheet("Class-wise");
      let cRowIdx = 1;

      classes.forEach((c) => {
        const titleRow = wsClass.getRow(cRowIdx);
        titleRow.getCell(1).value = "Class: " + c.className + " - " + c.section;
        titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF9C0006' } };
        titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        wsClass.mergeCells(cRowIdx, 1, cRowIdx, maxPeriods + 1);
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow.height = 25;
        cRowIdx++;

        const startTblRow = cRowIdx;
        wsClass.getRow(cRowIdx).values = ["Day", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
        cRowIdx++;

        settings.workingDays.forEach((dIdx, dPos) => {
          const classLimit = c.dailyPeriods || maxPeriods;
          const rowData: any[] = [DAY_NAMES[dIdx]];

          for (let p = 1; p <= maxPeriods; p++) {
            if (p > classLimit) {
              rowData.push("");
            } else {
              const cellData = routine.grid[c.id]?.[dPos]?.[p - 1];
              if (cellData) {
                if (cellData.gid) {
                  const text = getCellOptions(cellData)
                    .map((o) => {
                      const s = subjectMap.get(o.sid);
                      const t = teacherMap.get(o.tid);
                      return `${s?.name || "?"} (${t?.shortName || "?"})`;
                    })
                    .join(" | ");
                  rowData.push(text);
                } else {
                  const subj = subjectMap.get(cellData.sid);
                  const tch = teacherMap.get(cellData.tid);
                  rowData.push((subj?.name || "Unknown") + "\n(" + (tch?.shortName || "?") + ")");
                }
              } else {
                 rowData.push("-");
              }
            }
          }
          wsClass.getRow(cRowIdx).values = rowData;
          wsClass.getRow(cRowIdx).height = 48;
          cRowIdx++;
        });

        applyTableStyles(wsClass, startTblRow, cRowIdx - startTblRow, maxPeriods + 1);
        cRowIdx += 2;
      });

      // --- 4. TEACHER-WISE SHEET ---
      const wsTeacher = workbook.addWorksheet("Teachers");
      let tRowIdx = 1;

      teachers.forEach((tch) => {
        const titleRow = wsTeacher.getRow(tRowIdx);
        titleRow.getCell(1).value = "Teacher: " + tch.name + " (" + tch.shortName + ")";
        titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF006100' } };
        titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
        wsTeacher.mergeCells(tRowIdx, 1, tRowIdx, maxPeriods + 1);
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow.height = 25;
        tRowIdx++;

        const startTblRow = tRowIdx;
        wsTeacher.getRow(tRowIdx).values = ["Day", ...Array.from({ length: maxPeriods }, (_, i) => "Period " + (i + 1))];
        tRowIdx++;

        settings.workingDays.forEach((dIdx, dPos) => {
          const rowData: any[] = [DAY_NAMES[dIdx]];

          for (let p = 1; p <= maxPeriods; p++) {
            let foundCell: any = null;
            let foundClass: any = null;
            let foundOpt: { sid: string; tid: string; rid?: string | null } | null = null;

            const seenGroupUnits4 = new Set<string>();
            for (const c of classes) {
              const cellData = routine.grid[c.id]?.[dPos]?.[p - 1];
              if (!cellData || !cellHasTeacher(cellData, tch.id)) continue;
              if (cellData.gid) {
                if (seenGroupUnits4.has(cellData.gid)) continue;
                seenGroupUnits4.add(cellData.gid);
              }
              const opt = getCellOptions(cellData).find((o) => o.tid === tch.id);
              if (!opt) continue;
              foundCell = cellData;
              foundClass = c;
              foundOpt = opt;
              break;
            }

            if (foundCell && foundClass && foundOpt) {
               const subj = subjectMap.get(foundOpt.sid);
               const groupTag = foundCell.gid ? " [Group]" : "";
               rowData.push((subj?.name || "Unknown") + groupTag + "\n[" + foundClass.className + "-" + foundClass.section + "]");
            } else {
               rowData.push("-");
            }
          }
          wsTeacher.getRow(tRowIdx).values = rowData;
          wsTeacher.getRow(tRowIdx).height = 48;
          tRowIdx++;
        });

        applyTableStyles(wsTeacher, startTblRow, tRowIdx - startTblRow, maxPeriods + 1);
        tRowIdx += 2;
      });

      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "Routine_Export_Pro.xlsx";
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast({ title: "Routine exported beautifully!", type: "success" });
    } catch (err) {
      console.error(err);
      showToast({ title: "Failed to export Excel", type: "error" });
    }
  };


  return {
    handleExportExcel,
  };
}