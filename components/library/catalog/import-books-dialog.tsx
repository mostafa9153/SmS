"use client";

import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import type { ImportPlanItem } from "@/lib/library/import";
import { useBookImport } from "@/lib/library/use-book-import";

/** K2: pick an Excel/CSV file, see what it will add, then import it in one step (undoable). */
export function ImportBooksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl">{open && <ImportBody onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

const KIND_META: Record<ImportPlanItem["kind"], { label: string; className: string }> = {
  new: { label: "নতুন", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  add: { label: "কপি যোগ", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  skip: { label: "বাদ", className: "bg-muted text-muted-foreground" },
};

function ImportBody({ onDone }: { onDone: () => void }) {
  const im = useBookImport(onDone);
  const toImport = im.counts.newTitles + im.plan.filter((p) => p.kind === "add").length;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Excel থেকে বই যোগ</DialogTitle>
      </DialogHeader>

      {im.step === "pick" && (
        <div className="space-y-3">
          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 cursor-pointer hover:bg-muted/40">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-semibold">Excel বা CSV file বাছাই করুন</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void im.readFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <Button variant="outline" size="sm" onClick={im.downloadTemplate}>
            <Download /> Template
          </Button>
        </div>
      )}

      {im.step === "reading" && <Spinner label={`${im.fileName} পড়া হচ্ছে…`} className="py-12" />}

      {(im.step === "preview" || im.step === "saving") && (
        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="নতুন বই" value={im.counts.newTitles} />
            <StatCard label="নতুন বইয়ের কপি" value={im.counts.newCopies} />
            <StatCard label="আগের বইয়ে কপি" value={im.counts.added} />
            <StatCard label="বাদ / ভুল" value={im.counts.skipped + im.errors.length} valueClassName={im.counts.skipped + im.errors.length ? "text-amber-600" : undefined} />
          </div>

          {im.errors.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm max-h-32 overflow-y-auto">
              {im.errors.map((e) => (
                <div key={`${e.row}-${e.message}`}>
                  সারি {e.row}: {e.message}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border max-h-[45vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold">সারি</th>
                  <th className="px-2 py-1.5 text-left font-semibold">বই</th>
                  <th className="px-2 py-1.5 text-right font-semibold">কপি</th>
                  <th className="px-2 py-1.5 text-left font-semibold">ফল</th>
                </tr>
              </thead>
              <tbody>
                {im.plan.map((p, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="px-2 py-1.5 tabular-nums text-xs text-muted-foreground">{p.entry.rows.join(", ")}</td>
                    <td className="px-2 py-1.5 min-w-0">
                      <div className="font-medium break-words">{p.entry.book.title}</div>
                      {p.entry.book.author && <div className="text-xs text-muted-foreground break-words">{p.entry.book.author}</div>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{p.entry.copies}</td>
                    <td className="px-2 py-1.5 text-xs">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 font-semibold", KIND_META[p.kind].className)}>
                        {KIND_META[p.kind].label}
                      </span>
                      {p.kind === "add" && <div className="mt-0.5 text-muted-foreground">{p.bookCode}</div>}
                      {p.kind === "skip" && <div className="mt-0.5 text-muted-foreground">{p.reason}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DialogFooter>
        {im.step === "preview" || im.step === "saving" ? (
          <>
            <Button variant="outline" onClick={im.reset} disabled={im.step === "saving"}>
              অন্য file
            </Button>
            <Button onClick={im.commit} disabled={!toImport || im.step === "saving"}>
              <Upload /> {im.step === "saving" ? "Import হচ্ছে…" : `Import করো (${toImport})`}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={onDone}>
            বন্ধ
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
