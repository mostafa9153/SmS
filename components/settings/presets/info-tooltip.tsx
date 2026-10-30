"use client";

import React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


export function InfoTooltip({ content }: { content: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        onClick={(e) => e.preventDefault()}
        className="inline-flex items-center justify-center p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
      >
        <Info className="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-2 text-xs leading-relaxed shadow-lg">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
