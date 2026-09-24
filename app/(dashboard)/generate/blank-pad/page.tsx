"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import {
  BlankPadPrintableView,
  BlankPadData,
} from "@/components/certificate/blank-pad-printable-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/ui/custom-select";
import { PinchZoomViewer } from "@/components/ui/pinch-zoom-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Printer,
  ArrowLeft,
  RotateCcw,
  FileText,
  SlidersHorizontal,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useSchoolProfile, getEffectiveHeadTitle } from "@/lib/utils/school-profile";

function BlankPadGeneratorContent() {
  const { profile: schoolProfile } = useSchoolProfile();

  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const [padData, setPadData] = useState<BlankPadData>({
    paperSize: "A4",
    showRefDate: true,
    refNo: "",
    issueDate: getLiveDate(),
    showWatermark: true,
    watermarkOpacity: 0.08,
    borderStyle: "ornate",
    showSignature: false,
    signatoryTitle: schoolProfile ? getEffectiveHeadTitle(schoolProfile) : "Teacher-in-Charge",
    includeSignatureImage: false,
    bodyContent: "",
  });

  const [previewScale, setPreviewScale] = useState<number>(0.85);

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setPadData({
      paperSize: "A4",
      showRefDate: true,
      refNo: "",
      issueDate: getLiveDate(),
      showWatermark: true,
      watermarkOpacity: 0.08,
      borderStyle: "ornate",
      showSignature: false,
      signatoryTitle: schoolProfile ? getEffectiveHeadTitle(schoolProfile) : "Teacher-in-Charge",
      includeSignatureImage: false,
      bodyContent: "",
    });
  };

  const isA4 = padData.paperSize === "A4";

  return (
    <div className="p-3.5 sm:p-6 max-w-[1700px] mx-auto space-y-4 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Studio Header: Hidden in Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-2xl p-4 shadow-2xs print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/generate"
            className="p-2 rounded-xl border bg-muted/40 hover:bg-muted text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Blank Pad & Letterhead Studio
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase font-semibold">
                {padData.paperSize} Portrait
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-9 rounded-xl text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="h-9 rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Pad
          </Button>
        </div>
      </div>

      {/* Main Studio Grid: Unwraps in Print */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 print:block print:w-full print:m-0 print:p-0">
        {/* Left Form Controls: Hidden in Print */}
        <div className="xl:col-span-4 space-y-4 print:hidden">
          {/* 1. Paper Format & Border */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Format & Geometry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPadData((prev) => ({ ...prev, paperSize: "A4" }));
                    setPreviewScale(0.85);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    padData.paperSize === "A4"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <p className="text-xs">A4 Portrait</p>
                  <p className="text-[10px] opacity-75 font-mono">210 × 297 mm</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPadData((prev) => ({ ...prev, paperSize: "A5" }));
                    setPreviewScale(1.0);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    padData.paperSize === "A5"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <p className="text-xs">A5 Portrait</p>
                  <p className="text-[10px] opacity-75 font-mono">148 × 210 mm</p>
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Border Design</Label>
                <div className="relative">
                  <select
                    value={padData.borderStyle}
                    onChange={(e) =>
                      setPadData((prev) => ({
                        ...prev,
                        borderStyle: e.target.value as "ornate" | "single" | "none",
                      }))
                    }
                    className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 pr-8 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                  >
                    <option value="ornate">Classic Ornate Double Border</option>
                    <option value="single">Minimalist Single Line</option>
                    <option value="none">Full Bleed (No Outer Border)</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Header & Elements Settings */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                Sheet Elements
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-3.5">
              {/* Ref. No. & Date Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ref-toggle" className="text-xs font-medium cursor-pointer">
                    Ref. No. & Date Strip
                  </Label>
                  <Switch
                    id="ref-toggle"
                    checked={padData.showRefDate}
                    onCheckedChange={(checked) =>
                      setPadData((prev) => ({ ...prev, showRefDate: checked }))
                    }
                  />
                </div>

                {padData.showRefDate && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Ref No (Blank for dotted line)</Label>
                      <Input
                        placeholder="e.g. MHS/NOT/2026/01"
                        value={padData.refNo}
                        onChange={(e) =>
                          setPadData((prev) => ({ ...prev, refNo: e.target.value }))
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Date (Blank for dotted line)</Label>
                      <Input
                        placeholder="DD/MM/YYYY"
                        value={padData.issueDate}
                        onChange={(e) =>
                          setPadData((prev) => ({ ...prev, issueDate: e.target.value }))
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Watermark Toggle */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="watermark-toggle" className="text-xs font-medium cursor-pointer">
                    School Crest Watermark
                  </Label>
                  <Switch
                    id="watermark-toggle"
                    checked={padData.showWatermark}
                    onCheckedChange={(checked) =>
                      setPadData((prev) => ({ ...prev, showWatermark: checked }))
                    }
                  />
                </div>

                {padData.showWatermark && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Label className="text-[10px] text-muted-foreground shrink-0">Opacity</Label>
                    <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                      <input
                        type="range"
                        min="0.03"
                        max="0.25"
                        step="0.01"
                        value={padData.watermarkOpacity ?? 0.08}
                        onChange={(e) =>
                          setPadData((prev) => ({
                            ...prev,
                            watermarkOpacity: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] font-mono w-8 text-right text-muted-foreground">
                        {Math.round((padData.watermarkOpacity ?? 0.08) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Signature Footer Toggle */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sign-toggle" className="text-xs font-medium cursor-pointer">
                    Bottom Signature Block
                  </Label>
                  <Switch
                    id="sign-toggle"
                    checked={padData.showSignature}
                    onCheckedChange={(checked) =>
                      setPadData((prev) => ({ ...prev, showSignature: checked }))
                    }
                  />
                </div>

                {padData.showSignature && (
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Signatory Designation</Label>
                      <Input
                        value={padData.signatoryTitle || ""}
                        onChange={(e) =>
                          setPadData((prev) => ({ ...prev, signatoryTitle: e.target.value }))
                        }
                        placeholder="Teacher-in-Charge / Headmaster"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <Label htmlFor="sign-img-toggle" className="text-[11px] text-muted-foreground cursor-pointer">
                        Include Digital Signature
                      </Label>
                      <Switch
                        id="sign-img-toggle"
                        checked={padData.includeSignatureImage}
                        onCheckedChange={(checked) =>
                          setPadData((prev) => ({ ...prev, includeSignatureImage: checked }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Optional Typing / Notice Content Area */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Optional Body Content
                </CardTitle>
                {padData.bodyContent && (
                  <button
                    type="button"
                    onClick={() => setPadData((prev) => ({ ...prev, bodyContent: "" }))}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Clear Text
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-2">
              <Textarea
                placeholder="Leave completely empty for a blank pad, or type formal text/notice here..."
                value={padData.bodyContent || ""}
                onChange={(e) =>
                  setPadData((prev) => ({ ...prev, bodyContent: e.target.value }))
                }
                rows={5}
                className="text-xs font-serif leading-relaxed resize-y"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Preview Column: Full width in Print */}
        <div className="xl:col-span-8 print:w-full print:m-0 print:p-0">
          <div className="sticky top-4 space-y-3">
            <div className="flex items-center justify-between print:hidden px-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {isA4 ? "A4: 210mm × 297mm" : "A5: 148mm × 210mm"}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
                  className="h-7 w-7 p-0 text-xs"
                >
                  -
                </Button>
                <span className="text-[11px] font-mono text-muted-foreground w-12 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewScale((s) => Math.min(1.5, Number((s + 0.1).toFixed(2))))}
                  className="h-7 w-7 p-0 text-xs"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewScale(isA4 ? 0.85 : 1.0)}
                  className="h-7 px-2 text-[10px]"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Printable Canvas Container */}
            <div
              id="printable-pad-canvas"
              className="w-full overflow-auto bg-muted/20 border rounded-2xl p-4 sm:p-8 flex justify-center items-start shadow-inner print:p-0 print:border-none print:bg-transparent print:w-full print:block print:shadow-none"
            >
              <div
                style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
                className="transition-transform duration-150 print:transform-none print:w-full print:h-full print:m-0 print:p-0 print:block"
              >
                <BlankPadPrintableView data={padData} schoolProfile={schoolProfile} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulletproof Native Print CSS */}
      <style jsx global>{`
        @media print {
          header,
          aside,
          nav,
          .print\\:hidden,
          button {
            display: none !important;
          }

          @page {
            size: ${isA4 ? "210mm 297mm" : "148mm 210mm"};
            margin: 0;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: ${isA4 ? "210mm" : "148mm"} !important;
            height: ${isA4 ? "297mm" : "210mm"} !important;
            max-width: ${isA4 ? "210mm" : "148mm"} !important;
            max-height: ${isA4 ? "297mm" : "210mm"} !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #printable-pad-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            width: ${isA4 ? "210mm" : "148mm"} !important;
            max-width: ${isA4 ? "210mm" : "148mm"} !important;
            height: ${isA4 ? "295mm" : "208mm"} !important;
            max-height: ${isA4 ? "295mm" : "208mm"} !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: block !important;
          }

          #printable-pad-canvas > div {
            transform: none !important;
            width: ${isA4 ? "210mm" : "148mm"} !important;
            height: ${isA4 ? "295mm" : "208mm"} !important;
            margin: 0 !important;
            display: block !important;
          }

          #pure-blank-pad-sheet {
            width: ${isA4 ? "210mm" : "148mm"} !important;
            height: ${isA4 ? "295mm" : "208mm"} !important;
            min-width: ${isA4 ? "210mm" : "148mm"} !important;
            max-width: ${isA4 ? "210mm" : "148mm"} !important;
            min-height: ${isA4 ? "295mm" : "208mm"} !important;
            max-height: ${isA4 ? "295mm" : "208mm"} !important;
            margin: 0 auto !important;
            padding: ${isA4 ? "6mm" : "4mm"} !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function BlankPadGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-muted-foreground">
          Loading Blank Pad Studio...
        </div>
      }
    >
      <BlankPadGeneratorContent />
    </Suspense>
  );
}
