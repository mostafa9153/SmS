"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { executeBulkUpload } from "@/lib/data/students";
import type { BulkUploadDetails, UpdateMode } from "@/lib/supabase/bulk-upload/students";
import type { Student } from "@/lib/types";

/** Rows per request: small enough to finish well inside the 60s function limit */
const CHUNK_SIZE = 200;

export interface ImportOptions {
  uploadType: "current_students" | "old_students";
  updateMode: UpdateMode;
  createNew: boolean;
}

export interface ImportProgress {
  total: number;
  done: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  startedAt: number;
  stopping: boolean;
}

export interface ChunkedImportResult {
  batchId?: string;
  stopped: boolean;
  summary: { createdCount: number; updatedCount: number; skippedCount: number; errorCount: number; totalRows: number };
  details: BulkUploadDetails;
}

type SendRow = Partial<Student> & { rowNumber: number };

/**
 * Sends a sheet in chunks under one batch id, so any number of rows fits the function time limit
 * and the progress shown is real. Rows skipped before sending (`preSkipped`) join the report.
 */
export function useChunkedImport() {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const stopRef = useRef(false);
  const running = progress !== null;

  // Leaving mid-import would stop it halfway
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const stop = useCallback(() => {
    stopRef.current = true;
    setProgress((p) => (p ? { ...p, stopping: true } : p));
  }, []);

  const run = useCallback(
    async (rows: SendRow[], options: ImportOptions, preSkipped: BulkUploadDetails["skipped"]): Promise<ChunkedImportResult> => {
      stopRef.current = false;
      const details: BulkUploadDetails = { created: [], updated: [], skipped: [...preSkipped], errors: [] };
      let batchId: string | undefined;
      let stopped = false;
      const tally = () => ({
        created: details.created.length,
        updated: details.updated.length,
        skipped: details.skipped.length,
        failed: details.errors.length,
      });
      setProgress({ total: rows.length, done: 0, ...tally(), startedAt: Date.now(), stopping: false });

      try {
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          if (stopRef.current) {
            stopped = true;
            for (const r of rows.slice(i)) {
              details.skipped.push({ rowNumber: r.rowNumber, name: r.name, reason: "Import stopped before this row" });
            }
            break;
          }
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          let res: any;
          let lastError: unknown;
          // No automatic retry: the server may have saved part of the chunk before failing, and
          // sending it again would add students without an ID a second time
          try {
            res = await executeBulkUpload(chunk, { ...options, batchId });
          } catch (err) {
            lastError = err;
          }
          if (res) {
            batchId ??= res.batchId;
            details.created.push(...(res.details?.created || []));
            details.updated.push(...(res.details?.updated || []));
            details.skipped.push(...(res.details?.skipped || []));
            details.errors.push(...(res.details?.errors || []));
          } else {
            const message = lastError instanceof Error ? lastError.message : "Request failed";
            for (const r of chunk) {
              details.errors.push({ rowNumber: r.rowNumber, name: r.name, message: `Not confirmed (${message}): check the students list before uploading this row again` });
            }
          }
          setProgress((p) => (p ? { ...p, done: Math.min(rows.length, i + chunk.length), ...tally() } : p));
        }
      } finally {
        setProgress(null);
      }

      return {
        batchId,
        stopped,
        summary: {
          createdCount: details.created.length,
          updatedCount: details.updated.length,
          skippedCount: details.skipped.length,
          errorCount: details.errors.length,
          totalRows: rows.length + preSkipped.length,
        },
        details,
      };
    },
    []
  );

  return { progress, run, stop };
}
