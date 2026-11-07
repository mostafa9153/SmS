"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Printer, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { PrintPageStyle, PrintPreview } from "@/components/print/print-preview";
import { NO_MARGINS } from "@/components/print/fixed-sheet-print";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";
import { usePaperSettings } from "@/components/print/use-paper-settings";
import { StickerControls } from "@/components/library/stickers/sticker-controls";
import { StickerSheet } from "@/components/library/stickers/sticker-sheet";
import { PAGE_MM } from "@/lib/library/sticker-layout";
import { useStickerPrint, type StickerSource } from "@/lib/library/use-sticker-print";

export default function LibraryStickersPage() {
  return (
    <Suspense fallback={<Spinner className="py-24" />}>
      <StickersPage />
    </Suspense>
  );
}

function StickersPage() {
  const params = useSearchParams();
  const copiesParam = params.get("copies") ?? "";
  const book = params.get("book");
  const source = useMemo<StickerSource>(
    () => (copiesParam ? { copies: copiesParam.split(",").filter(Boolean) } : book ? { book } : { unprinted: true }),
    [copiesParam, book],
  );
  const s = useStickerPrint(source);
  // A4 only, no margins: the sheet is drawn 1:1 in millimetres (K5).
  const paper = usePaperSettings("library-sticker-paper-settings", { paper: "A4", papers: ["A4"], margins: NO_MARGINS });

  const sheets = s.test ? [[]] : s.pages;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      <PrintPageStyle pageW={PAGE_MM.w} pageH={PAGE_MM.h} margins={NO_MARGINS} />
      <div className="print:hidden space-y-4">
        <PageHeader
          title="Sticker print"
          icon={Tags}
          back="/library/books"
          badge={<span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{s.list.length} · {s.pages.length} pages</span>}
          actions={
            <Button onClick={s.print} disabled={!s.grid || s.problems.length > 0 || (!s.test && s.list.length === 0)}>
              <Printer /> {s.test ? "Test print" : "Print"}
            </Button>
          }
        />

        {s.awaitingConfirm && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <span className="text-sm font-semibold">Did {s.awaitingConfirm.length} stickers print correctly?</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={s.dismissConfirm} disabled={s.saving}>
                No
              </Button>
              <Button size="sm" onClick={s.confirmPrinted} disabled={s.saving}>
                <CheckCircle2 /> Yes, printed
              </Button>
            </div>
          </div>
        )}

        {s.problems.length > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm">{s.problems.join(" · ")}</div>
        )}

        {s.loading || !s.grid ? (
          <Spinner label="Loading…" className="py-16" />
        ) : !s.test && s.total === 0 ? (
          <EmptyState icon={Tags} title="No stickers to print" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <div className="space-y-4">
              <StickerControls
                grid={s.grid}
                startCell={s.startCell}
                onStartCell={s.setStartCell}
                offset={s.offset}
                onOffset={s.setOffset}
                test={s.test}
                onTest={s.setTest}
                onlyUnprinted={s.onlyUnprinted}
                onOnlyUnprinted={s.setOnlyUnprinted}
                showUnprintedFilter={!("unprinted" in source)}
              />
              <PaperSettingsPanel settings={paper} papers={["A4"]} lockMargins />
            </div>
            <PrintPreview resetKey={`${s.pages.length}-${s.test}`} startAt="actual">
              <div className="flex flex-col gap-6">
                {sheets.map((cells, i) => (
                  <div key={i} className="shadow-lg ring-1 ring-black/10">
                    <StickerSheet grid={s.grid!} cells={cells} offset={s.offset} test={s.test} outline />
                  </div>
                ))}
              </div>
            </PrintPreview>
          </div>
        )}
      </div>

      {/* Print copy: 1:1 in mm, one A4 sheet per page, no scaling (K5). */}
      {s.grid && (
        <div className="hidden print:block">
          {sheets.map((cells, i) => (
            <div key={i} style={{ breakAfter: i === sheets.length - 1 ? "auto" : "page" }}>
              <StickerSheet grid={s.grid!} cells={cells} offset={s.offset} test={s.test} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
