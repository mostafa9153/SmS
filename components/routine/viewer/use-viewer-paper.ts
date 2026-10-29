"use client";

import { usePaperSettings } from "@/components/print/use-paper-settings";


export function useViewerPaper() {
  // The timetable stretches to the paper width, so any size/orientation/margin prints
  const paperSettings = usePaperSettings("routine-paper-settings", {
    paper: "A3",
    papers: ["A3", "A4"],
    orientation: "landscape",
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const handlePrint = () => {
    window.print();
  };

  return {
    handlePrint,
    paperSettings,
  };
}

export type ViewerPaperState = ReturnType<typeof useViewerPaper>;
