"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal, Lock, Unlock } from "lucide-react";

import type { BlankPadState } from "./use-blank-pad-generator";

export function HeaderElementsCard({ pad }: { pad: BlankPadState }) {
  const { autoRefNo, customDate, customRefNo, isDateLocked, isRefLocked, liveDate, padData, setCustomDate, setCustomRefNo, setIsDateLocked, setIsRefLocked, setPadData } = pad;
  return (
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
  );
}
