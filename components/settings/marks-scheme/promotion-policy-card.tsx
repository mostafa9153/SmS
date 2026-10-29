"use client";

import { Sliders, CheckCircle2, Trophy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { MarksSchemeState } from "./use-marks-scheme";

export function PromotionPolicyCard({ ms }: { ms: MarksSchemeState }) {
  const { handleSavePromotionPolicy, isSavingPolicy, promotionPolicy, setPromotionPolicy } = ms;
  return (
    <Card className="border bg-card shadow-xs overflow-hidden">
      <CardHeader className="p-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Promotion &amp; Pass Criteria Policy</span>
                <Badge variant="outline" className="text-[10px] bg-background font-medium">
                  Session &amp; Promotion Rules
                </Badge>
              </CardTitle>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSavePromotionPolicy}
            disabled={isSavingPolicy}
            className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSavingPolicy ? "Saving..." : "Save Policy"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Classes V – VIII (RTE Auto-Promotion)</span>
            </span>
            <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 font-semibold px-2.5 py-1">
              100% Auto-Pass
            </Badge>
          </div>

          <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Class IX &amp; X Per-Subject Pass %</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min={0}
                max={100}
                value={promotionPolicy.subjectPassPercentage ?? 30}
                onChange={(e) =>
                  setPromotionPolicy((prev) => ({
                    ...prev,
                    subjectPassPercentage: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  }))
                }
                className="font-mono text-sm font-bold rounded-lg border border-blue-300 bg-background px-2 py-1 w-16 text-blue-700 dark:text-blue-400 text-center"
              />
              <span className="text-xs font-bold text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
