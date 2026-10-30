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
      
      // Reusable styles
      const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true };
      
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

      // Master sheets: one table, every working day side by side (day band over its period columns)
      const halfDays: number[] = Array.isArray(settings.halfDays) ? settings.halfDays : [];
      const halfDayPeriods = Number(settings.halfDayPeriods) || maxPeriods;
      const dayPeriodCount = (dIdx: number) => (halfDays.includes(dIdx) ? Math.min(halfDayPeriods, maxPeriods) : maxPeriods);
      const breakAfter: number[] = Array.isArray(settings.breaks) ? settings.breaks : [];
      // [strong band, light tint, zebra tint] per day: days differ by hue, rows by a faint stripe
      const DAY_PALETTE: [string, string, string][] = [
        ["FF2F5D9E", "FFF3F7FD", "FFE3ECF9"],
        ["FF1E8A6E", "FFF2FAF7", "FFDFF3EC"],
        ["FF7B4FA0", "FFF8F4FC", "FFEDE3F6"],
        ["FFC27A12", "FFFEF9F0", "FFFBEBD0"],
        ["FFC0392B", "FFFDF4F3", "FFF9E0DD"],
        ["FF2A8FA8", "FFF2FAFC", "FFDDF1F6"],
        ["FF6B6B6B", "FFF7F7F7", "FFEAEAEA"],
      ];
      const solid = (argb: string): any => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
      const THICK = { style: 'medium', color: { argb: 'FF1F1F1F' } };
      const BREAK_EDGE = { style: 'mediumDashed', color: { argb: 'FFE08A00' } };
      const THIN = { style: 'thin', color: { argb: 'FFD0D0D0' } };

      const buildSideBySide = (
        sheet: any,
        label: string,
        rowLabels: string[],
        cellText: (rowIdx: number, dPos: number, dIdx: number, p: number) => string
      ) => {
        // Column map: 1 = row label, then each day's periods, then the label again so a row is never lost
        const cols: { dPos: number; p: number; col: number }[] = [];
        const dayRange: { first: number; last: number }[] = [];
        let col = 2;
        settings.workingDays.forEach((dIdx, dPos) => {
          const count = dayPeriodCount(dIdx);
          dayRange[dPos] = { first: col, last: col + count - 1 };
          for (let p = 1; p <= count; p++) cols.push({ dPos, p, col: col + p - 1 });
          col += count;
        });
        const lastCol = col; // mirrored label column
        const lastRow = 2 + rowLabels.length;

        // Header: day bands (row 1) over period numbers (row 2)
        sheet.getCell(1, 1).value = label;
        sheet.mergeCells(1, 1, 2, 1);
        sheet.getCell(1, lastCol).value = label;
        sheet.mergeCells(1, lastCol, 2, lastCol);
        settings.workingDays.forEach((dIdx, dPos) => {
          const { first, last } = dayRange[dPos];
          const [strong] = DAY_PALETTE[dPos % DAY_PALETTE.length];
          sheet.getCell(1, first).value = (DAY_NAMES[dIdx] + (halfDays.includes(dIdx) ? " (Half)" : "")).toUpperCase();
          if (last > first) sheet.mergeCells(1, first, 1, last);
          for (let c = first; c <= last; c++) sheet.getCell(1, c).fill = solid(strong);
        });
        cols.forEach(({ dPos, p, col: c }) => {
          const [strong] = DAY_PALETTE[dPos % DAY_PALETTE.length];
          const cell = sheet.getCell(2, c);
          cell.value = breakAfter.includes(p) && p < dayPeriodCount(settings.workingDays[dPos]) ? `P${p}\n▸ break` : `P${p}`;
          cell.fill = solid(strong);
        });

        // Body
        rowLabels.forEach((rowLabel, rIdx) => {
          const r = 3 + rIdx;
          sheet.getCell(r, 1).value = rowLabel;
          sheet.getCell(r, lastCol).value = rowLabel;
          cols.forEach(({ dPos, p, col: c }) => {
            const text = cellText(rIdx, dPos, settings.workingDays[dPos], p);
            sheet.getCell(r, c).value = text;
          });
          sheet.getRow(r).height = 46;
        });

        // Styling pass
        sheet.getColumn(1).width = 28;
        sheet.getColumn(lastCol).width = 28;
        cols.forEach(({ col: c }) => (sheet.getColumn(c).width = 13));
        for (let r = 1; r <= lastRow; r++) {
          for (let c = 1; c <= lastCol; c++) {
            const cell = sheet.getCell(r, c);
            const isLabel = c === 1 || c === lastCol;
            const meta = cols.find((x) => x.col === c);
            const dayRng = meta ? dayRange[meta.dPos] : null;
            const border: any = { top: THIN, bottom: THIN, left: THIN, right: THIN };
            if (dayRng) {
              if (c === dayRng.first) border.left = THICK;
              if (c === dayRng.last) border.right = THICK;
              if (meta && breakAfter.includes(meta.p) && c !== dayRng.last) border.right = BREAK_EDGE;
            }
            if (isLabel) {
              border.left = THICK;
              border.right = THICK;
            }
            if (r <= 2) {
              border.top = THICK;
              if (r === 2) border.bottom = THICK;
            }
            if (r === lastRow) border.bottom = THICK;
            cell.border = border;

            if (r <= 2) {
              cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: r === 1 ? 12 : 10 };
              cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
              if (isLabel) cell.fill = solid('FF1F1F1F');
            } else if (isLabel) {
              cell.font = { bold: true, size: 10 };
              cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
              cell.fill = solid(r % 2 === 0 ? 'FFE9E9E9' : 'FFF6F6F6');
            } else if (meta) {
              const [, tint, zebra] = DAY_PALETTE[meta.dPos % DAY_PALETTE.length];
              const empty = !cell.value || cell.value === "-" || cell.value === "";
              cell.fill = solid(r % 2 === 0 ? zebra : tint);
              cell.font = empty ? { size: 9, color: { argb: 'FFB5B5B5' } } : { size: 9, bold: true, color: { argb: 'FF1A1A1A' } };
              cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            }
          }
        }

        sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
        sheet.pageSetup = {
          orientation: 'landscape',
          paperSize: 8,
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          printTitlesRow: '1:2',
          printTitlesColumn: 'A:A',
        };
      };

      // --- 1. MASTER (DAY-WISE) SHEET: classes x days side by side ---
      const wsMaster = workbook.addWorksheet("Master (Day-wise)");
      buildSideBySide(
        wsMaster,
        "Class",
        classes.map((c) => c.className + " - " + c.section),
        (rIdx, dPos, _dIdx, p) => {
          const c = classes[rIdx];
          if (p > (c.dailyPeriods || maxPeriods)) return "";
          const cellData = routine.grid[c.id]?.[dPos]?.[p - 1];
          if (!cellData) return "-";
          if (cellData.gid) {
            return getCellOptions(cellData)
              .map((o) => `${subjectMap.get(o.sid)?.name || "?"} (${teacherMap.get(o.tid)?.shortName || "?"})`)
              .join(" | ");
          }
          return (subjectMap.get(cellData.sid)?.name || "Unknown") + "\n(" + (teacherMap.get(cellData.tid)?.shortName || "?") + ")";
        }
      );

      // --- 2. MASTER (TEACHER-WISE) SHEET: teachers x days side by side ---
      const wsMasterTeacher = workbook.addWorksheet("Master (Teacher-wise)");
      const sortedFaculty = [...teachers].sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name));
      buildSideBySide(
        wsMasterTeacher,
        "Teacher \\ Day",
        sortedFaculty.map(
          (tch) => tch.name + (tch.shortName ? ` (${tch.shortName})` : "") + (tch.primarySubject ? ` [${tch.primarySubject}]` : "")
        ),
        (rIdx, dPos, _dIdx, p) => {
          const tch = sortedFaculty[rIdx];
          const seenGroupUnits = new Set<string>();
          for (const c of classes) {
            const cellData = routine.grid[c.id]?.[dPos]?.[p - 1];
            if (!cellData || !cellHasTeacher(cellData, tch.id)) continue;
            if (cellData.gid) {
              if (seenGroupUnits.has(cellData.gid)) continue;
              seenGroupUnits.add(cellData.gid);
            }
            const opt = getCellOptions(cellData).find((o) => o.tid === tch.id);
            if (!opt) continue;
            const subj = subjectMap.get(opt.sid);
            const room = opt.rid ? roomMap.get(opt.rid) : null;
            let text = `${c.className}-${c.section}\n${subj?.name || "Unknown"}`;
            if (cellData.lab) text += " (Lab)";
            if (cellData.gid) text += " [Group]";
            if (room) text += `\n[${room.name}]`;
            return text;
          }
          return "-";
        }
      );

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