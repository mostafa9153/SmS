"use client";

import { useViewerCore } from "./use-viewer-core";
import { useViewerEditing } from "./use-viewer-editing";
import { useViewerExport } from "./use-viewer-export";
import { useViewerPaper } from "./use-viewer-paper";
import type { RoutineViewerTabProps } from "./props";

export function useRoutineViewer(props: RoutineViewerTabProps) {
  const core = useViewerCore(props);
  const editing = useViewerEditing(core);
  const output = useViewerExport(core);
  const paper = useViewerPaper();

  return { ...core, ...editing, ...output, ...paper };
}

export type RoutineViewerState = ReturnType<typeof useRoutineViewer>;
