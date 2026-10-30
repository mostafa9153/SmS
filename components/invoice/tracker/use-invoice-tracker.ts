"use client";

import { useTrackerCore } from "./use-tracker-core";
import { useTrackerDerived } from "./use-tracker-derived";
import { useTrackerActions } from "./use-tracker-actions";
import { useTrackerSettlement } from "./use-tracker-settlement";
import type { InvoiceTrackerModalProps } from "./props";

export function useInvoiceTracker(props: InvoiceTrackerModalProps) {
  const core = useTrackerCore(props);
  const derived = useTrackerDerived(core);
  const actions = useTrackerActions({ ...core, ...derived });
  const settle = useTrackerSettlement(core);

  return { ...core, ...derived, ...actions, ...settle };
}

export type InvoiceTrackerState = ReturnType<typeof useInvoiceTracker>;
