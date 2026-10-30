"use client";

import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, ChevronDown } from "lucide-react";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";
import { CustomSelect } from "@/components/ui/custom-select";

import type { BlankPadState } from "./use-blank-pad-generator";

export function PaperFormatCard({ pad }: { pad: BlankPadState }) {
  const { fontStyle, handleFontStyleChange, padData, paperSettings, setPadData } = pad;
  return (
    <Card className="rounded-2xl border shadow-2xs">
      <CardHeader className="p-3.5 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Format & Geometry
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 pt-0 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Border Design</Label>
          <div className="relative">
            <CustomSelect
              value={padData.borderStyle}
              onChange={(v: string) => setPadData((prev) => ({
                  ...prev,
                  borderStyle: v as "ornate" | "single" | "none",
                }))}
              className="w-full"
              searchable={false}
              options={[
                { value: "ornate", label: "Classic Ornate Double Border" },
                { value: "single", label: "Minimalist Single Line" },
                { value: "none", label: "Full Bleed (No Outer Border)" },
              ]}
            />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* School Name Typography Style (3 Styles: Classic Serif, 3D Embossed, Modern Stylish) */}
        <div className="space-y-1.5 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">School Name Style</Label>
            <span className="text-[10px] text-muted-foreground uppercase font-mono">{fontStyle}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleFontStyleChange("classic")}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                fontStyle === "classic"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <span className="text-xs font-serif font-black">Serif</span>
              <span className="text-[9px] opacity-75">Classic</span>
            </button>

            <button
              type="button"
              onClick={() => handleFontStyleChange("3d")}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                fontStyle === "3d"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <span className="text-xs font-black [font-family:'Cinzel_Decorative','Cinzel',serif] [text-shadow:_1px_1px_0px_#27387d,_2px_2px_0px_#101736] text-[#14206b]">
                3D Chisel
              </span>
              <span className="text-[9px] opacity-75">Architectural</span>
            </button>

            <button
              type="button"
              onClick={() => handleFontStyleChange("stylish")}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                fontStyle === "stylish"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <span className="text-xs font-extrabold [font-family:'Cinzel',serif] tracking-wider text-slate-800">
                Modern
              </span>
              <span className="text-[9px] opacity-75">Royal</span>
            </button>
          </div>
        </div>

        <PaperSettingsPanel settings={paperSettings} variant="section" defaultOpen />
      </CardContent>
    </Card>
  );
}
