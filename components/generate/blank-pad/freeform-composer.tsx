"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlignLeft, AlignCenter, AlignJustify, Minus, Plus } from "lucide-react";

import type { BlankPadState } from "./use-blank-pad-generator";

export function FreeformComposer({ pad }: { pad: BlankPadState }) {
  const { bodyAlign, bodyFontSize, padData, setBodyAlign, setBodyFontSize, setPadData } = pad;
  return (
    <div className="space-y-3">
      {/* Body Font Size & Alignment Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Font Size Adjuster */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-semibold text-muted-foreground">
              Body Font Size
            </Label>
            <span className="text-[10px] font-mono font-bold text-primary">
              {bodyFontSize}px
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBodyFontSize((s) => Math.max(10, s - 1))}
              className="h-7 w-7 p-0 text-xs cursor-pointer"
              title="Decrease font size"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="flex-1 text-center font-mono text-xs font-semibold bg-muted/30 py-1 rounded-lg border">
              {bodyFontSize}px
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBodyFontSize((s) => Math.min(24, s + 1))}
              className="h-7 w-7 p-0 text-xs cursor-pointer"
              title="Increase font size"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Text Alignment */}
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold text-muted-foreground">
            Alignment
          </Label>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setBodyAlign("left")}
              className={`h-7 rounded-lg border text-xs flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                bodyAlign === "left"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <AlignLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setBodyAlign("center")}
              className={`h-7 rounded-lg border text-xs flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                bodyAlign === "center"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <AlignCenter className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setBodyAlign("justify")}
              className={`h-7 rounded-lg border text-xs flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                bodyAlign === "justify"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <AlignJustify className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Textarea for Letter Content */}
      <div className="space-y-1 pt-1">
        <Textarea
          placeholder="Type official letter, notice, or correspondence body here (or leave blank for handwriting)..."
          value={padData.bodyContent || ""}
          onChange={(e) =>
            setPadData((prev) => ({ ...prev, bodyContent: e.target.value }))
          }
          rows={8}
          className="text-xs font-serif leading-relaxed resize-y"
        />
      </div>
    </div>
  );
}
