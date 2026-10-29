"use client";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Printer, RotateCcw } from "lucide-react";

import type { BlankPadState } from "./use-blank-pad-generator";

export function StudioHeader({ pad }: { pad: BlankPadState }) {
  const { handlePrint, handleReset, padData } = pad;
  return (
    <PageHeader
      title="Blank Pad & Letterhead"
      back="/generate"
      badge={
        <Badge variant="outline" className="text-[10px] font-mono uppercase font-semibold">
          {padData.paperSize} Portrait
        </Badge>
      }
      className="gap-2.5 sm:gap-3 bg-card border rounded-2xl p-3 sm:p-4 shadow-2xs print:hidden"
      actions={
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-9 flex-1 sm:flex-none rounded-xl text-xs gap-1.5 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>

        <Button
          size="sm"
          onClick={handlePrint}
          className="h-9 flex-1 sm:flex-none rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" />
          Print Pad
        </Button>
      </div>
      }
    />
  );
}
