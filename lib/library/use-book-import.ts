"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { IMPORT_TEMPLATE_HEADERS, parseImportRows, rowsFromGrid, type ImportPlanItem, type ImportRowError } from "./import";
import { newRequestId } from "./request-id";
import { libraryWrite, useRefreshLibrary } from "./use-catalog";

type Step = "pick" | "reading" | "preview" | "saving";

/** State for the Excel import dialog (K2): read the sheet, preview against the catalog, then commit once. */
export function useBookImport(onDone: () => void) {
  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [plan, setPlan] = useState<ImportPlanItem[]>([]);
  const [errors, setErrors] = useState<ImportRowError[]>([]);
  const requestId = useRef(newRequestId());
  const refresh = useRefreshLibrary();

  const reset = () => {
    setStep("pick");
    setPlan([]);
    setErrors([]);
    setFileName("");
  };

  const readFile = async (file: File) => {
    setStep("reading");
    setFileName(file.name);
    try {
      // Read raw cell values (not display text: a numeric ISBN would show as 9.78E+12) and find
      // the header by library column names; the shared student parser guesses headers differently.
      const XLSX = await import("xlsx");
      const isText = /\.(csv|tsv|txt)$/i.test(file.name);
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", raw: isText });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid = ws ? (XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true }) as unknown[][]) : [];
      const sheet = rowsFromGrid(grid);
      const parsed = sheet ? parseImportRows(sheet.headers, sheet.rows, sheet.rowNumbers) : null;
      if (!parsed || parsed.missingTitleColumn) {
        toast.error("\"বইয়ের নাম\" column পাওয়া যায়নি। Template দেখে নিন।");
        return reset();
      }
      setErrors(parsed.errors);
      const next = parsed.entries.length
        ? await apiFetch<ImportPlanItem[]>("/api/library/books/import", { method: "POST", json: { mode: "preview", entries: parsed.entries } })
        : [];
      setPlan(next);
      // A new file is a new import; a retry of the same preview keeps its id (D8).
      requestId.current = newRequestId();
      setStep("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "File পড়া যায়নি");
      reset();
    }
  };

  const commit = async () => {
    const entries = plan.filter((p) => p.kind !== "skip").map((p) => p.entry);
    if (!entries.length || step === "saving") return;
    setStep("saving");
    try {
      const r = await libraryWrite<{ created: number; copies: number; skipped: number }>(
        "/api/library/books/import",
        "POST",
        { mode: "commit", entries },
        requestId.current,
      );
      toastWithUndo(`${r.data.created}টি নতুন বই, ${r.data.copies}টি কপি যোগ হলো`, r.undoId, refresh);
      refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import হয়নি");
      setStep("preview");
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      IMPORT_TEMPLATE_HEADERS.map(([, label]) => label),
      ["পথের পাঁচালী", "বিভূতিভূষণ বন্দ্যোপাধ্যায়", "", "উপন্যাস", "বাংলা", "", "", "", 2, 120],
    ]);
    ws["!cols"] = IMPORT_TEMPLATE_HEADERS.map(([f]) => ({ wch: f === "title" || f === "author" ? 28 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Books");
    XLSX.writeFile(wb, "library-import-template.xlsx");
  };

  const counts = {
    newTitles: plan.filter((p) => p.kind === "new").length,
    newCopies: plan.filter((p) => p.kind === "new").reduce((n, p) => n + p.entry.copies, 0),
    added: plan.filter((p) => p.kind === "add").reduce((n, p) => n + p.entry.copies, 0),
    skipped: plan.filter((p) => p.kind === "skip").length,
  };

  return { step, fileName, plan, errors, counts, readFile, commit, reset, downloadTemplate };
}
