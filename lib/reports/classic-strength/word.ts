import type { TableRow, TableCell } from "docx";
import type { Student } from "@/lib/types";
import { todayIST } from "@/lib/utils/date";
import { currentYearIST } from "@/lib/utils/academic-year";
import { computeClassicStrengthData } from "@/lib/reports/classic-strength/compute";

// ─────────────────────────────────────────────────────────────────────────────
// WORD DOCUMENT EXPORT USING DOCX (.docx)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportClassicStrengthWord(
  students: Student[],
  schoolName = "MARIGACHI HIGH SCHOOL (H. S.)",
  customDate?: string,
  academicYear = String(currentYearIST())
) {
  const data = computeClassicStrengthData(students, schoolName, customDate, academicYear);

  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    WidthType,
    AlignmentType,
    VerticalAlign,
    PageOrientation,
    BorderStyle,
  } = await import("docx");

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  };

  const createCell = (
    text: string | number,
    opts: {
      bold?: boolean;
      italic?: boolean;
      color?: string;
      rowSpan?: number;
      colSpan?: number;
      size?: number;
    } = {}
  ) => {
    return new TableCell({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: String(text),
              bold: opts.bold ?? false,
              italics: opts.italic ?? false,
              color: opts.color ?? "000000",
              size: (opts.size || 9.5) * 2,
            }),
          ],
        }),
      ],
      borders: cellBorder,
      verticalAlign: VerticalAlign.CENTER,
      rowSpan: opts.rowSpan,
      columnSpan: opts.colSpan,
    });
  };

  // Build Top Table Rows
  const table1Rows: TableRow[] = [];

  // Header 1
  table1Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Class", { bold: true, rowSpan: 2, color: "004080" }),
        createCell("Boys", { bold: true, colSpan: 2, color: "008000" }),
        createCell("Total Boys", { bold: true, rowSpan: 2, color: "008000" }),
        createCell("Boys in Class", { bold: true, rowSpan: 2, color: "006600" }),
        createCell("Girls", { bold: true, colSpan: 2, color: "C00000" }),
        createCell("Total Girls", { bold: true, rowSpan: 2, color: "C00000" }),
        createCell("Girls in Class", { bold: true, rowSpan: 2, color: "800000" }),
        createCell("Total Hindu", { bold: true, rowSpan: 2, color: "002060" }),
        createCell("Total Muslim", { bold: true, rowSpan: 2, color: "008000" }),
        createCell("Total Students", { bold: true, rowSpan: 2 }),
        createCell("Students in Class", { bold: true, rowSpan: 2, color: "7030A0" }),
        createCell("Total Student", { bold: true, rowSpan: 2, color: "800000" }),
      ],
    })
  );

  // Header 2
  table1Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Hindu", { bold: true, color: "002060" }),
        createCell("Muslim", { bold: true, color: "008000" }),
        createCell("Hindu", { bold: true, color: "C00000" }),
        createCell("Muslim", { bold: true, color: "008000" }),
      ],
    })
  );

  // Data Rows
  data.sectionRows.forEach((r) => {
    const cells: TableCell[] = [];
    cells.push(createCell(r.displayLabel, { bold: true, color: "004080" }));
    cells.push(createCell(r.boysHindu, { color: "002060" }));
    cells.push(createCell(r.boysMuslim, { color: "008000" }));
    cells.push(createCell(r.totalBoys, { bold: true, color: "006600" }));

    if (r.isFirstInSection) {
      cells.push(
        createCell(r.boysInClass, {
          bold: true,
          italic: true,
          color: "006600",
          rowSpan: r.sectionCountInClass,
        })
      );
    }

    cells.push(createCell(r.girlsHindu, { color: "C00000" }));
    cells.push(createCell(r.girlsMuslim, { color: "008000" }));
    cells.push(createCell(r.totalGirls, { bold: true, italic: true, color: "C00000" }));

    if (r.isFirstInSection) {
      cells.push(
        createCell(r.girlsInClass, {
          bold: true,
          italic: true,
          color: "800000",
          rowSpan: r.sectionCountInClass,
        })
      );
      cells.push(
        createCell(r.totalHindu, {
          bold: true,
          italic: true,
          color: "002060",
          rowSpan: r.sectionCountInClass,
        })
      );
      cells.push(
        createCell(r.totalMuslim, {
          bold: true,
          italic: true,
          color: "008000",
          rowSpan: r.sectionCountInClass,
        })
      );
    }

    cells.push(createCell(r.totalStudents, { bold: true }));

    if (r.isFirstInSection) {
      cells.push(
        createCell(r.studentsInClass, {
          bold: true,
          italic: true,
          color: "7030A0",
          rowSpan: r.sectionCountInClass,
        })
      );
    }

    if (r.isFirstInStage) {
      cells.push(
        createCell(r.stageTotal, {
          bold: true,
          italic: true,
          color: "800000",
          rowSpan: r.stageRowCount,
        })
      );
    }

    table1Rows.push(new TableRow({ cantSplit: true, children: cells }));
  });

  // Top Totals Row
  table1Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Total", { bold: true, color: "004080" }),
        createCell(data.totals.boysHindu, { bold: true, color: "002060" }),
        createCell(data.totals.boysMuslim, { bold: true, color: "008000" }),
        createCell(data.totals.totalBoys, { bold: true, color: "006600" }),
        createCell(data.totals.totalBoys, { bold: true, color: "006600" }),
        createCell(data.totals.girlsHindu, { bold: true, color: "008000" }),
        createCell(data.totals.girlsMuslim, { bold: true, color: "008000" }),
        createCell(data.totals.totalGirls, { bold: true, color: "C00000" }),
        createCell(data.totals.totalGirls, { bold: true, color: "800000" }),
        createCell(data.totals.totalHindu, { bold: true, color: "002060" }),
        createCell(data.totals.totalMuslim, { bold: true, color: "008000" }),
        createCell("Total Students", { bold: true, color: "C00000", colSpan: 2 }),
        createCell(data.totals.totalStudents, { bold: true, color: "800000" }),
      ],
    })
  );

  // Build Bottom Table (Side-by-Side)
  const table2Rows: TableRow[] = [];

  // Bottom Header 1
  table2Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Class", { bold: true, rowSpan: 2, color: "004080" }),
        createCell("Boys", { bold: true, colSpan: 2, color: "008000" }),
        createCell("Girls", { bold: true, colSpan: 2, color: "C00000" }),
        createCell("Total", { bold: true, rowSpan: 2, color: "004080" }),
        createCell("Boys", { bold: true, rowSpan: 2, color: "006600" }),
        createCell("Girls", { bold: true, rowSpan: 2, color: "800000" }),
        createCell("Deferentials", { bold: true, rowSpan: 2, color: "002060" }),
        createCell("Hindu", { bold: true, rowSpan: 2, color: "002060" }),
        createCell("Muslim", { bold: true, rowSpan: 2, color: "008000" }),
        createCell("Total Student", { bold: true, rowSpan: 2, color: "800000" }),
      ],
    })
  );

  // Bottom Header 2
  table2Rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCell("Hindu", { bold: true, color: "002060" }),
        createCell("Muslim", { bold: true, color: "008000" }),
        createCell("Hindu", { bold: true, color: "C00000" }),
        createCell("Muslim", { bold: true, color: "008000" }),
      ],
    })
  );

  // Bottom Data Rows (8 classes)
  for (let i = 0; i < 8; i++) {
    const cs = data.classSummaries[i];
    const diff = data.differentials[i] || null;

    table2Rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          createCell(cs.classLevel, { bold: true, italic: true, color: "004080" }),
          createCell(cs.boysHindu, { italic: true, color: "002060" }),
          createCell(cs.boysMuslim, { italic: true, color: "008000" }),
          createCell(cs.girlsHindu, { italic: true, color: "002060" }),
          createCell(cs.girlsMuslim, { italic: true, color: "008000" }),
          createCell(cs.totalStudents, { bold: true, italic: true, color: "004080" }),
          createCell(diff && diff.label !== "Total Hindu/Muslim" ? diff.boys : "", { color: "002060" }),
          createCell(diff && diff.label !== "Total Hindu/Muslim" ? diff.girls : "", { color: "800000" }),
          createCell(diff ? diff.label : "", {
            bold: true,
            color: diff?.label === "Total Hindu/Muslim" ? "002060" : "4F6228",
          }),
          createCell(diff ? diff.hindu : "", { color: "002060" }),
          createCell(diff ? diff.muslim : "", { color: "008000" }),
          createCell(diff && diff.label !== "Total Hindu/Muslim" ? diff.total : "", {
            bold: true,
            color: "800000",
          }),
        ],
      })
    );
  }

  // Create Document in Landscape A4 Orientation
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 16838, // Exactly A4 Landscape width (297 mm in dxa)
              height: 11906, // Exactly A4 Landscape height (210 mm in dxa)
            },
            margin: {
              top: 400, // Compact ~0.28 in margin to ensure single A4 page fit
              bottom: 400,
              left: 400,
              right: 400,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: data.schoolName,
                bold: true,
                color: "800000",
                size: 28, // 14pt
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: data.reportTitle,
                bold: true,
                italics: true,
                color: "002060",
                size: 20, // 10pt
              }),
            ],
          }),
          new Table({
            rows: table1Rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ spacing: { before: 120, after: 80 } }),
          new Table({
            rows: table2Rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          // Document Signature & Footer Block
          new Paragraph({ spacing: { before: 180 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Generated from Marigachi High School SMS",
                            size: 16, // 8pt
                            italics: true,
                            color: "666666",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: "Headmaster / TIC Signature",
                            bold: true,
                            size: 18, // 9pt
                            color: "000000",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Students_Strength_${data.academicYear}_${todayIST()}.docx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
