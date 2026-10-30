"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sliders } from "lucide-react";

import type { RoutineViewerState } from "./use-routine-viewer";

export function NavigationFooter({ viewer }: { viewer: RoutineViewerState }) {
  const { isFullscreen } = viewer;
  return (
    <>
      {!isFullscreen && (
        <div className="print:hidden pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <Link href="/routine/generate">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              ← Back to Generator Engine
            </Button>
          </Link>
          <Link href="/routine">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5" />
              Adjust Setup Hub Configuration
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}
