"use client";

import type { ReactNode } from "react";
import { ZoomPanViewport } from "@/components/generate/zoom-pan-viewport";
import { pageRuleCss, type PrintMargins } from "@/lib/print/paper";
import { cn } from "@/lib/utils";

/**
 * The on-screen preview every print page uses: zoom (wheel, pinch, buttons), drag to move,
 * double-tap / fit. Hidden when printing. Changing `resetKey` (e.g. the paper size) refits it.
 */
export function PrintPreview({
  children,
  resetKey,
  fitMode = "contain",
  className,
}: {
  children: ReactNode;
  resetKey?: string | number;
  fitMode?: "contain" | "width";
  className?: string;
}) {
  return (
    <ZoomPanViewport
      resetKey={resetKey}
      fitMode={fitMode}
      className={cn(
        "order-1 xl:order-2 h-[46dvh] sm:h-[52dvh] xl:h-[calc(100dvh-2rem)] sticky top-2 xl:top-4 z-20 w-full print:hidden",
        className
      )}
    >
      {children}
    </ZoomPanViewport>
  );
}

/** Sets the browser print page size and margins from the page's paper settings. */
export function PrintPageStyle({ pageW, pageH, margins }: { pageW: number; pageH: number; margins: PrintMargins }) {
  return <style dangerouslySetInnerHTML={{ __html: `@media print { ${pageRuleCss(pageW, pageH, margins)} }` }} />;
}
