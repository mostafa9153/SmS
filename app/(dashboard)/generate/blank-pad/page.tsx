"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import {
  BlankPadPrintableView,
  BlankPadData,
  BlankPadFontStyle,
  LetterMode,
  StructuredLetterData,
} from "@/components/certificate/blank-pad-printable-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Printer,
  ArrowLeft,
  RotateCcw,
  FileText,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Underline,
  Minus,
  Plus,
  Sparkles,
  PenTool,
} from "lucide-react";
import { useSchoolProfile, getEffectiveHeadTitle } from "@/lib/utils/school-profile";
import {
  getDocumentSequence,
  saveDocumentSequence,
  formatDocumentNumber,
} from "@/lib/utils/document-sequence";

function BlankPadGeneratorContent() {
  const { profile: schoolProfile } = useSchoolProfile();
  const currentYear = new Date().getFullYear();

  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const [padSeq, setPadSeq] = useState<number>(() =>
    getDocumentSequence("blank-pad", currentYear)
  );
  const [isRefLocked, setIsRefLocked] = useState<boolean>(true);
  const [isDateLocked, setIsDateLocked] = useState<boolean>(true);
  const [customRefNo, setCustomRefNo] = useState<string>("");
  const [customDate, setCustomDate] = useState<string>("");

  const [letterMode, setLetterMode] = useState<LetterMode>("structured");

  const [fontStyle, setFontStyle] = useState<BlankPadFontStyle>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sms_blank_pad_font_style");
      if (saved === "classic" || saved === "3d" || saved === "stylish") {
        return saved as BlankPadFontStyle;
      }
    }
    return "classic";
  });

  const handleFontStyleChange = (newStyle: BlankPadFontStyle) => {
    setFontStyle(newStyle);
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_blank_pad_font_style", newStyle);
    }
  };

  const [bodyFontSize, setBodyFontSize] = useState<number>(15);
  const [bodyLineHeight, setBodyLineHeight] = useState<"normal" | "relaxed" | "loose">("relaxed");
  const [bodyAlign, setBodyAlign] = useState<"left" | "justify" | "center">("left");

  const autoRefNo = formatDocumentNumber(
    "blank-pad",
    padSeq,
    currentYear,
    schoolProfile?.schoolCode
  );
  const liveDate = getLiveDate();

  const effectiveRefNo = isRefLocked ? autoRefNo : customRefNo;
  const effectiveDate = isDateLocked ? liveDate : customDate;

  const [structuredLetter, setStructuredLetter] = useState<StructuredLetterData>({
    recipientPrefix: "",
    recipientText: "",
    recipientAlign: "left",
    subjectPrefix: "Sub:",
    subjectText: "",
    subjectAlign: "center",
    subjectBold: true,
    subjectUnderline: true,
    salutationText: "",
    salutationAlign: "left",
    bodyText: "",
    bodyAlign: "justify",
    thankingText: "",
    thankingAlign: "left",
    signoffPrefix: "",
    signoffDesignation: "",
    signoffInstitution: "",
    signoffAlign: "right",
  });

  const [padData, setPadData] = useState<BlankPadData>({
    paperSize: "A4",
    fontStyle: "classic",
    letterMode: "structured",
    bodyFontSize: 15,
    bodyLineHeight: "relaxed",
    bodyAlign: "left",
    showRefDate: true,
    refNo: autoRefNo,
    issueDate: liveDate,
    showWatermark: true,
    watermarkOpacity: 0.08,
    borderStyle: "ornate",
    showSignature: false,
    signatoryTitle: schoolProfile ? getEffectiveHeadTitle(schoolProfile) : "Teacher-in-Charge",
    includeSignatureImage: false,
    bodyContent: "",
  });

  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  const [previewScale, setPreviewScale] = useState<number>(0.85);

  // Auto-fit scale on mobile screen size on initial load
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPreviewScale(padData.paperSize === "A4" ? 0.44 : 0.58);
      }
    }
  }, [padData.paperSize]);

  const handlePrint = () => {
    const nextSeq = padSeq + 1;
    saveDocumentSequence("blank-pad", nextSeq, currentYear);

    let hasAdvanced = false;
    const advanceToNext = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      window.removeEventListener("afterprint", advanceToNext);
      setPadSeq(nextSeq);
      if (isRefLocked) {
        setCustomRefNo("");
      }
    };

    window.addEventListener("afterprint", advanceToNext, { once: true });

    setTimeout(() => {
      window.print();
      advanceToNext();
    }, 60);
  };

  const handleReset = () => {
    const seq = getDocumentSequence("blank-pad", currentYear);
    setPadSeq(seq);
    setIsRefLocked(true);
    setIsDateLocked(true);
    setCustomRefNo("");
    setCustomDate("");
    setFontStyle("classic");
    setLetterMode("structured");
    setBodyFontSize(15);
    setBodyLineHeight("relaxed");
    setBodyAlign("left");
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_blank_pad_font_style", "classic");
    }
    setStructuredLetter({
      recipientPrefix: "",
      recipientText: "",
      recipientAlign: "left",
      subjectPrefix: "Sub:",
      subjectText: "",
      subjectAlign: "center",
      subjectBold: true,
      subjectUnderline: true,
      salutationText: "",
      salutationAlign: "left",
      bodyText: "",
      bodyAlign: "justify",
      thankingText: "",
      thankingAlign: "left",
      signoffPrefix: "",
      signoffDesignation: "",
      signoffInstitution: "",
      signoffAlign: "right",
    });
    setPadData({
      paperSize: "A4",
      fontStyle: "classic",
      letterMode: "structured",
      bodyFontSize: 15,
      bodyLineHeight: "relaxed",
      bodyAlign: "left",
      showRefDate: true,
      refNo: formatDocumentNumber("blank-pad", seq, currentYear, schoolProfile?.schoolCode),
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
    <div className="p-2 sm:p-4 md:p-6 max-w-[1700px] mx-auto space-y-3 sm:space-y-4 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Studio Header: Hidden in Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-card border rounded-2xl p-3 sm:p-4 shadow-2xs print:hidden">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/generate"
            className="p-2 rounded-xl border bg-muted/40 hover:bg-muted text-foreground transition-all shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                Blank Pad & Letterhead
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono uppercase font-semibold">
                {padData.paperSize} Portrait
              </Badge>
            </div>
          </div>
        </div>

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
      </div>

      {/* Mobile Tab Switcher: Visible only on mobile/tablet (< xl) */}
      <div className="flex xl:hidden border rounded-2xl p-1 bg-muted/40 shadow-2xs gap-1 print:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("form")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === "form"
              ? "bg-background text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenTool className="h-3.5 w-3.5 text-primary" />
          <span>Editor & Settings</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab("preview");
            if (previewScale > 0.6) {
              setPreviewScale(padData.paperSize === "A4" ? 0.44 : 0.58);
            }
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === "preview"
              ? "bg-background text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span>Sheet Preview</span>
        </button>
      </div>

      {/* Main Studio Grid: Unwraps in Print */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 print:block print:w-full print:m-0 print:p-0">
        {/* Left Form Controls: Hidden in Print */}
        <div className={`xl:col-span-4 space-y-4 print:hidden ${mobileTab === "preview" ? "hidden xl:block" : "block"}`}>
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
                    setPreviewScale(typeof window !== "undefined" && window.innerWidth < 768 ? 0.44 : 0.85);
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
                    setPreviewScale(typeof window !== "undefined" && window.innerWidth < 768 ? 0.58 : 1.0);
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {/* Ref No Input with Lock/Unlock */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          Ref No
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            if (isRefLocked) {
                              setCustomRefNo(autoRefNo);
                              setIsRefLocked(false);
                            } else {
                              setIsRefLocked(true);
                            }
                          }}
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                            isRefLocked
                              ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                              : "text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                          }`}
                          title={isRefLocked ? "Auto-locked (Click to edit)" : "Unlocked (Click to lock auto sequence)"}
                        >
                          {isRefLocked ? (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>Auto</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3" />
                              <span>Custom</span>
                            </>
                          )}
                        </button>
                      </div>
                      <Input
                        value={isRefLocked ? autoRefNo : customRefNo}
                        readOnly={isRefLocked}
                        onChange={(e) => setCustomRefNo(e.target.value)}
                        placeholder="e.g. MHS/NOT/26/01"
                        className={`h-8 text-xs font-mono ${
                          isRefLocked
                            ? "bg-muted/50 cursor-not-allowed font-semibold text-foreground select-all"
                            : "bg-background border-amber-500/50 focus:border-amber-500"
                        }`}
                      />
                    </div>

                    {/* Date Input with Lock/Unlock */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          Date
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            if (isDateLocked) {
                              setCustomDate(liveDate);
                              setIsDateLocked(false);
                            } else {
                              setIsDateLocked(true);
                            }
                          }}
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                            isDateLocked
                              ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                              : "text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                          }`}
                          title={isDateLocked ? "Auto-locked (Click to edit)" : "Unlocked (Click to lock live date)"}
                        >
                          {isDateLocked ? (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>Live</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3" />
                              <span>Custom</span>
                            </>
                          )}
                        </button>
                      </div>
                      <Input
                        value={isDateLocked ? liveDate : customDate}
                        readOnly={isDateLocked}
                        onChange={(e) => setCustomDate(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className={`h-8 text-xs font-mono ${
                          isDateLocked
                            ? "bg-muted/50 cursor-not-allowed font-semibold text-foreground"
                            : "bg-background border-amber-500/50 focus:border-amber-500"
                        }`}
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <Label className="text-[10px] text-muted-foreground shrink-0">Opacity</Label>
                    <div className="flex items-center gap-1.5 flex-1 max-w-full sm:max-w-[200px]">
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

          {/* 3. Letter Mode Switcher & Content Area */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Letter Composer
                </CardTitle>
                <div className="flex items-center gap-1">
                  {letterMode === "structured" &&
                    (structuredLetter.recipientText ||
                      structuredLetter.recipientPrefix ||
                      structuredLetter.subjectText ||
                      structuredLetter.salutationText ||
                      structuredLetter.bodyText ||
                      structuredLetter.thankingText ||
                      structuredLetter.signoffPrefix ||
                      structuredLetter.signoffDesignation) && (
                      <button
                        type="button"
                        onClick={() =>
                          setStructuredLetter({
                            recipientPrefix: "",
                            recipientText: "",
                            recipientAlign: "left",
                            subjectPrefix: "Sub:",
                            subjectText: "",
                            subjectAlign: "center",
                            subjectBold: true,
                            subjectUnderline: true,
                            salutationText: "",
                            salutationAlign: "left",
                            bodyText: "",
                            bodyAlign: "justify",
                            thankingText: "",
                            thankingAlign: "left",
                            signoffPrefix: "",
                            signoffDesignation: "",
                            signoffInstitution: "",
                            signoffAlign: "right",
                          })
                        }
                        className="text-[10px] text-muted-foreground hover:text-destructive underline mr-1 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  {letterMode === "freeform" && padData.bodyContent && (
                    <button
                      type="button"
                      onClick={() => setPadData((prev) => ({ ...prev, bodyContent: "" }))}
                      className="text-[10px] text-muted-foreground hover:text-destructive underline mr-1 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setLetterMode("structured")}
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        letterMode === "structured"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <PenTool className="h-3 w-3 text-primary" />
                      Structured
                    </button>
                    <button
                      type="button"
                      onClick={() => setLetterMode("freeform")}
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        letterMode === "freeform"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileText className="h-3 w-3" />
                      Freeform
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 pt-0 space-y-3.5">
              {/* STRUCTURED LETTER COMPOSER MODE */}
              {letterMode === "structured" ? (
                <div className="space-y-3">
                  {/* Section 1: To / Recipient */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-foreground">
                        1. Recipient (To / প্রতি)
                      </Label>
                      <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40">
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredLetter((prev) => ({ ...prev, recipientAlign: "left" }))
                          }
                          className={`p-1 rounded text-xs cursor-pointer ${
                            (structuredLetter.recipientAlign ?? "left") === "left"
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground"
                          }`}
                          title="Align Left"
                        >
                          <AlignLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredLetter((prev) => ({ ...prev, recipientAlign: "center" }))
                          }
                          className={`p-1 rounded text-xs cursor-pointer ${
                            structuredLetter.recipientAlign === "center"
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground"
                          }`}
                          title="Align Center"
                        >
                          <AlignCenter className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredLetter((prev) => ({ ...prev, recipientAlign: "right" }))
                          }
                          className={`p-1 rounded text-xs cursor-pointer ${
                            structuredLetter.recipientAlign === "right"
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground"
                          }`}
                          title="Align Right"
                        >
                          <AlignRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-1.5">
                      <Input
                        value={structuredLetter.recipientPrefix ?? ""}
                        onChange={(e) =>
                          setStructuredLetter((prev) => ({
                            ...prev,
                            recipientPrefix: e.target.value,
                          }))
                        }
                        placeholder="Prefix (To,)"
                        className="h-8 text-xs font-serif sm:col-span-1"
                      />
                      <div className="sm:col-span-3">
                        <Textarea
                          value={structuredLetter.recipientText ?? ""}
                          onChange={(e) =>
                            setStructuredLetter((prev) => ({
                              ...prev,
                              recipientText: e.target.value,
                            }))
                          }
                          placeholder="Recipient details, designation & address (multi-line)..."
                          rows={2}
                          className="text-xs font-serif min-h-[34px] resize-y"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Subject */}
                  <div className="space-y-1.5 pt-1 border-t">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label className="text-[11px] font-semibold text-foreground">
                        2. Subject (বিষয়)
                      </Label>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40">
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, subjectAlign: "left" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              structuredLetter.subjectAlign === "left"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Align Left"
                          >
                            <AlignLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, subjectAlign: "center" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              (structuredLetter.subjectAlign ?? "center") === "center"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Center Align (Standard)"
                          >
                            <AlignCenter className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, subjectAlign: "right" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              structuredLetter.subjectAlign === "right"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Align Right"
                          >
                            <AlignRight className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40">
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({
                                ...prev,
                                subjectBold: prev.subjectBold === false ? true : false,
                              }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              structuredLetter.subjectBold !== false
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Toggle Bold"
                          >
                            <Bold className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({
                                ...prev,
                                subjectUnderline: prev.subjectUnderline === false ? true : false,
                              }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              structuredLetter.subjectUnderline !== false
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Toggle Underline"
                          >
                            <Underline className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-1.5">
                      <Input
                        value={structuredLetter.subjectPrefix ?? "Sub:"}
                        onChange={(e) =>
                          setStructuredLetter((prev) => ({
                            ...prev,
                            subjectPrefix: e.target.value,
                          }))
                        }
                        placeholder="Sub:"
                        className="h-8 text-xs font-serif sm:col-span-1"
                      />
                      <Input
                        value={structuredLetter.subjectText ?? ""}
                        onChange={(e) =>
                          setStructuredLetter((prev) => ({
                            ...prev,
                            subjectText: e.target.value,
                          }))
                        }
                        placeholder="Subject line of the letter / notice..."
                        className="h-8 text-xs font-serif sm:col-span-3"
                      />
                    </div>
                  </div>

                  {/* Section 3: Salutation */}
                  <div className="space-y-1.5 pt-1 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-foreground">
                        3. Salutation (সম্বোধন)
                      </Label>
                      <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40">
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredLetter((prev) => ({ ...prev, salutationAlign: "left" }))
                          }
                          className={`p-1 rounded text-xs cursor-pointer ${
                            (structuredLetter.salutationAlign ?? "left") === "left"
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground"
                          }`}
                          title="Align Left"
                        >
                          <AlignLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredLetter((prev) => ({ ...prev, salutationAlign: "center" }))
                          }
                          className={`p-1 rounded text-xs cursor-pointer ${
                            structuredLetter.salutationAlign === "center"
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground"
                          }`}
                          title="Align Center"
                        >
                          <AlignCenter className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <Input
                      value={structuredLetter.salutationText ?? ""}
                      onChange={(e) =>
                        setStructuredLetter((prev) => ({
                          ...prev,
                          salutationText: e.target.value,
                        }))
                      }
                      placeholder="e.g. Respected Sir, / মাননীয় মহাশয়,"
                      className="h-8 text-xs font-serif"
                    />
                  </div>

                  {/* Section 4: Body Content & Font Size */}
                  <div className="space-y-1.5 pt-1 border-t">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <Label className="text-[11px] font-semibold text-foreground">
                        4. Body Content (মূল বক্তব্য)
                      </Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Font size stepper */}
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setBodyFontSize((s) => Math.max(10, s - 1))}
                            className="h-6 w-6 p-0 text-xs cursor-pointer"
                            title="Decrease text size"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </Button>
                          <span className="text-[10px] font-mono font-bold text-primary w-8 text-center">
                            {bodyFontSize}px
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setBodyFontSize((s) => Math.min(24, s + 1))}
                            className="h-6 w-6 p-0 text-xs cursor-pointer"
                            title="Increase text size"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                        </div>

                        {/* Alignment buttons */}
                        <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40">
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, bodyAlign: "left" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              structuredLetter.bodyAlign === "left"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Align Left"
                          >
                            <AlignLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, bodyAlign: "center" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              structuredLetter.bodyAlign === "center"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Align Center"
                          >
                            <AlignCenter className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, bodyAlign: "justify" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              (structuredLetter.bodyAlign ?? "justify") === "justify"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Justify (Standard Letter)"
                          >
                            <AlignJustify className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <Textarea
                      value={structuredLetter.bodyText ?? ""}
                      onChange={(e) =>
                        setStructuredLetter((prev) => ({
                          ...prev,
                          bodyText: e.target.value,
                        }))
                      }
                      placeholder="Write letter paragraphs here..."
                      rows={6}
                      className="text-xs font-serif leading-relaxed resize-y"
                    />
                  </div>

                  {/* Section 5: Thanking Note */}
                  <div className="space-y-1.5 pt-1 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-foreground">
                        5. Thanking Note (ধন্যবাদান্তে)
                      </Label>
                      <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40">
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredLetter((prev) => ({ ...prev, thankingAlign: "left" }))
                          }
                          className={`p-1 rounded text-xs cursor-pointer ${
                            (structuredLetter.thankingAlign ?? "left") === "left"
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground"
                          }`}
                          title="Align Left"
                        >
                          <AlignLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredLetter((prev) => ({ ...prev, thankingAlign: "center" }))
                          }
                          className={`p-1 rounded text-xs cursor-pointer ${
                            structuredLetter.thankingAlign === "center"
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground"
                          }`}
                          title="Align Center"
                        >
                          <AlignCenter className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredLetter((prev) => ({ ...prev, thankingAlign: "right" }))
                          }
                          className={`p-1 rounded text-xs cursor-pointer ${
                            structuredLetter.thankingAlign === "right"
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground"
                          }`}
                          title="Align Right"
                        >
                          <AlignRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <Input
                      value={structuredLetter.thankingText ?? ""}
                      onChange={(e) =>
                        setStructuredLetter((prev) => ({
                          ...prev,
                          thankingText: e.target.value,
                        }))
                      }
                      placeholder="e.g. Thanking you, / ধন্যবাদান্তে, / By Order,"
                      className="h-8 text-xs font-serif"
                    />
                  </div>

                  {/* Section 6: Signoff / Closing (When bottom signature is off) */}
                  {!padData.showSignature && (
                    <div className="space-y-1.5 pt-1 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-foreground">
                          6. Signoff / Closing (স্বাক্ষর ও সমাপ্তি)
                        </Label>
                        <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-muted/40">
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, signoffAlign: "left" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              structuredLetter.signoffAlign === "left"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Align Left"
                          >
                            <AlignLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, signoffAlign: "center" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              structuredLetter.signoffAlign === "center"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Align Center"
                          >
                            <AlignCenter className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setStructuredLetter((prev) => ({ ...prev, signoffAlign: "right" }))
                            }
                            className={`p-1 rounded text-xs cursor-pointer ${
                              (structuredLetter.signoffAlign ?? "right") === "right"
                                ? "bg-background text-primary shadow-2xs font-bold"
                                : "text-muted-foreground"
                            }`}
                            title="Align Right (Standard)"
                          >
                            <AlignRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <Input
                        value={structuredLetter.signoffPrefix ?? ""}
                        onChange={(e) =>
                          setStructuredLetter((prev) => ({
                            ...prev,
                            signoffPrefix: e.target.value,
                          }))
                        }
                        placeholder="Prefix (e.g. Yours faithfully, / বিনীত, / ভবদীয়,)"
                        className="h-8 text-xs font-serif"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* FREEFORM / BLANK PAD MODE */
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Preview Column: Full width in Print */}
        <div className={`xl:col-span-8 print:w-full print:m-0 print:p-0 ${mobileTab === "form" ? "hidden xl:block" : "block"}`}>
          <div className="sticky top-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 print:hidden px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-mono">
                  {isA4 ? "A4: 210mm × 297mm" : "A5: 148mm × 210mm"}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {letterMode === "structured" ? "Structured Letter" : "Freeform Mode"}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewScale((s) => Math.max(0.3, Number((s - 0.05).toFixed(2))))}
                  className="h-7 w-7 p-0 text-xs"
                  title="Zoom Out"
                >
                  -
                </Button>
                <span className="text-[11px] font-mono text-muted-foreground w-11 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewScale((s) => Math.min(1.5, Number((s + 0.05).toFixed(2))))}
                  className="h-7 w-7 p-0 text-xs"
                  title="Zoom In"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      const isMobile = window.innerWidth < 768;
                      setPreviewScale(isMobile ? (isA4 ? 0.44 : 0.58) : (isA4 ? 0.85 : 1.0));
                    }
                  }}
                  className="h-7 px-2 text-[10px]"
                >
                  Fit Width
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrint}
                  className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex xl:hidden items-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3 w-3" />
                  Print
                </Button>
              </div>
            </div>

            {/* Printable Canvas Container */}
            <div
              id="printable-pad-canvas"
              className="w-full overflow-x-auto bg-muted/20 border rounded-2xl p-2 sm:p-4 md:p-8 flex justify-center items-start shadow-inner print:p-0 print:border-none print:bg-transparent print:w-full print:block print:shadow-none"
            >
              <div
                style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
                className="transition-transform duration-150 print:transform-none print:w-full print:h-full print:m-0 print:p-0 print:block"
              >
                <BlankPadPrintableView
                  data={{
                    ...padData,
                    fontStyle,
                    letterMode,
                    structuredLetter,
                    bodyFontSize,
                    bodyLineHeight,
                    bodyAlign,
                    refNo: effectiveRefNo,
                    issueDate: effectiveDate,
                  }}
                  schoolProfile={schoolProfile}
                />
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
