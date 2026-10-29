"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Underline, Minus, Plus } from "lucide-react";

import type { BlankPadState } from "./use-blank-pad-generator";

export function StructuredComposer({ pad }: { pad: BlankPadState }) {
  const { bodyFontSize, padData, setBodyFontSize, setStructuredLetter, structuredLetter } = pad;
  return (
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
  );
}
