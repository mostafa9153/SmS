"use client";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, PenTool } from "lucide-react";

import type { BlankPadState } from "./use-blank-pad-generator";

export function LetterModeHeader({ pad }: { pad: BlankPadState }) {
  const { letterMode, padData, setLetterMode, setPadData, setStructuredLetter, structuredLetter } = pad;
  return (
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
  );
}
