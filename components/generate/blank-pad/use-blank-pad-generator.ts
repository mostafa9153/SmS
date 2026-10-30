"use client";

import React, { useState, useEffect } from "react";
import { BlankPadData, BlankPadFontStyle, LetterMode, StructuredLetterData } from "@/components/certificate/blank-pad-printable-view";
import { getEffectiveHeadTitle } from "@/lib/utils/school-profile";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { getDocumentSequence, saveDocumentSequence, formatDocumentNumber } from "@/lib/utils/document-sequence";
import { usePaperSettings } from "@/components/print/use-paper-settings";


export function useBlankPadGenerator() {
  const { profile: schoolProfile } = useSchoolProfile();
  const currentYear = new Date().getFullYear();

  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const [padSeq, setPadSeq] = useState<number>(1);
  const [isRefLocked, setIsRefLocked] = useState<boolean>(true);
  const [isDateLocked, setIsDateLocked] = useState<boolean>(true);
  const [customRefNo, setCustomRefNo] = useState<string>("");
  const [customDate, setCustomDate] = useState<string>("");

  const [letterMode, setLetterMode] = useState<LetterMode>("structured");

  const [fontStyle, setFontStyle] = useState<BlankPadFontStyle>("classic");

  // Auto-sync sequence & font style on mount
  React.useEffect(() => {
    const seq = getDocumentSequence("blank-pad", currentYear);
    setPadSeq(seq);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sms_blank_pad_font_style");
      if (saved === "classic" || saved === "3d" || saved === "stylish") {
        setFontStyle(saved as BlankPadFontStyle);
      }
    }
  }, [currentYear]);

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
      paperSize: paper === "A5" ? "A5" : "A4", // paper size is a saved setting, not part of the reset
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

  // The pad layout is drawn for A4/A5 portrait; the paper panel is the only place the size changes
  const paperSettings = usePaperSettings("blank-pad-paper-settings", {
    paper: "A4",
    papers: ["A4", "A5"],
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const { paper, margins, pageW, pageH } = paperSettings;
  const isA4 = paper === "A4";
  useEffect(() => {
    const paperSize = paper === "A5" ? "A5" : "A4";
    setPadData((prev) => (prev.paperSize === paperSize ? prev : { ...prev, paperSize }));
  }, [paper]);

  return {
    autoRefNo,
    bodyAlign,
    bodyFontSize,
    bodyLineHeight,
    customDate,
    customRefNo,
    effectiveDate,
    effectiveRefNo,
    fontStyle,
    handleFontStyleChange,
    handlePrint,
    handleReset,
    isA4,
    isDateLocked,
    isRefLocked,
    letterMode,
    liveDate,
    margins,
    padData,
    pageH,
    pageW,
    paperSettings,
    schoolProfile,
    setBodyAlign,
    setBodyFontSize,
    setCustomDate,
    setCustomRefNo,
    setIsDateLocked,
    setIsRefLocked,
    setLetterMode,
    setPadData,
    setStructuredLetter,
    structuredLetter,
  };
}

export type BlankPadState = ReturnType<typeof useBlankPadGenerator>;
