"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSportsConfig } from "@/lib/sports/use-sports-config";
import { Sliders, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SportsRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SportsRulesModal({ open, onOpenChange }: SportsRulesModalProps) {
  const { config, saveConfig } = useSportsConfig();

  const [limit, setLimit] = useState<number>(config.maxEventsPerStudent);
  const [mode, setMode] = useState<"warning" | "strict">(config.enforcementMode);
  const [isSaving, setIsSaving] = useState(false);

  // Start from the saved rules each time the dialog opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setLimit(config.maxEventsPerStudent);
      setMode(config.enforcementMode);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const saved = await saveConfig({
        maxEventsPerStudent: limit,
        enforcementMode: mode,
      });
      if (!saved) throw new Error("Failed to save rules");
      toast.success("Sports participation rules updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save rules");
    } finally {
      setIsSaving(false);
    }
  };

  const limitPresets = [1, 2, 3, 4, 5, 0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sliders className="h-4 w-4" />
            </div>
            <DialogTitle>Participation Rules & Limits</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Max Events Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">
              Max Games per Student
            </Label>
            <div className="grid grid-cols-6 gap-1.5">
              {limitPresets.map((num) => {
                const isSelected = limit === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLimit(num)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all active:scale-95 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {num === 0 ? "∞ Unlimited" : `${num} Events`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enforcement Mode */}
          {limit > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                Rule Enforcement
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("warning")}
                  className={`p-3 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
                    mode === "warning"
                      ? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 shadow-2xs"
                      : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Soft Warning</span>
                  </div>
                  <span className="text-[10px] opacity-80 mt-1">
                    Shows warning badge when exceeded, allows override.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("strict")}
                  className={`p-3 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
                    mode === "strict"
                      ? "bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-200 shadow-2xs"
                      : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
                    <span>Strict Block</span>
                  </div>
                  <span className="text-[10px] opacity-80 mt-1">
                    Blocks checkbox once student hits {limit} events.
                  </span>
                </button>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="rounded-xl font-bold shadow-2xs"
            >
              {isSaving ? "Saving..." : "Save Rules"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
