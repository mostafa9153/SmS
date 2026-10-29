import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { pageRuleCss, pageSizeMm } from "@/lib/print/paper";
import { readSavedPaper, type PaperSettings } from "@/components/print/use-paper-settings";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";

const settings = (over: Partial<PaperSettings> = {}): PaperSettings => ({
  papers: ["A5", "A4"],
  paper: "A4",
  setPaper: () => {},
  orientation: "portrait",
  setOrientation: () => {},
  margins: { top: 5, right: 6, bottom: 7, left: 8 },
  setMargins: () => {},
  setMargin: () => {},
  save: () => {},
  pageW: 210,
  pageH: 297,
  ...over,
});

describe("print paper", () => {
  it("turns the page for landscape and writes the @page rule", () => {
    expect(pageSizeMm("A5")).toEqual({ pageW: 148, pageH: 210 });
    expect(pageSizeMm("A4", "landscape")).toEqual({ pageW: 297, pageH: 210 });
    expect(pageRuleCss(210, 297, { top: 1, right: 2, bottom: 3, left: 4 })).toBe(
      "@page { size: 210mm 297mm; margin: 1mm 2mm 3mm 4mm; }"
    );
  });

  it("keeps settings saved by the old pages (paperSize or paper) and drops junk", () => {
    const m = { top: 0, right: 0, bottom: 0, left: 0 };
    expect(readSavedPaper(JSON.stringify({ paperSize: "A4", margins: m }))).toEqual({ paper: "A4", margins: m });
    expect(readSavedPaper(JSON.stringify({ paper: "A3", orientation: "landscape" }))).toEqual({ paper: "A3", orientation: "landscape" });
    expect(readSavedPaper(JSON.stringify({ paper: "Letter", orientation: "up", margins: { top: "x" } }))).toEqual({});
    expect(readSavedPaper(JSON.stringify({ paper: "A3" }), ["A5", "A4"])).toEqual({}); // size this page cannot print
    expect(readSavedPaper("{broken")).toEqual({});
    expect(readSavedPaper(null)).toEqual({});
  });

  it("panel shows margins, or hides them when locked", () => {
    const open = renderToStaticMarkup(<PaperSettingsPanel settings={settings()} defaultOpen orientations />);
    expect(open).toContain("Margin (mm)");
    expect(open).toContain("landscape");
    expect(open).toContain('aria-pressed="true"');
    // three one-click margins; the current one (none of them here) is not pressed
    expect(open).toContain("None");
    expect(open).toContain("Narrow");
    expect(open).toContain("Normal");
    const zero = renderToStaticMarkup(
      <PaperSettingsPanel settings={settings({ margins: { top: 0, right: 0, bottom: 0, left: 0 } })} defaultOpen />
    );
    expect(zero).toMatch(/aria-pressed="true"[^>]*>None/);
    const locked = renderToStaticMarkup(<PaperSettingsPanel settings={settings()} defaultOpen lockMargins />);
    expect(locked).not.toContain("Margin (mm)");
  });
});
