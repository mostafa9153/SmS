"use client";

import { useInvoiceCore } from "./use-invoice-core";
import { useInvoiceStudentSelect } from "./use-invoice-student-select";
import { useInvoiceBulkData } from "./use-invoice-bulk-data";
import { useInvoiceFees } from "./use-invoice-fees";
import { useInvoicePrint } from "./use-invoice-print";

export function useInvoiceGenerator() {
  const core = useInvoiceCore();
  const student = useInvoiceStudentSelect(core);
  const bulk = useInvoiceBulkData(core);
  const fees = useInvoiceFees(core);
  const print = useInvoicePrint({ ...core, ...bulk });

  return { ...core, ...student, ...bulk, ...fees, ...print };
}

export type InvoiceGeneratorState = ReturnType<typeof useInvoiceGenerator>;
