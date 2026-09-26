"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  GraduationCap,
  ArrowRight,
  School,
  CheckCircle2,
  Sliders,
  Sparkles,
  Save,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getAdmissionSettings, saveAdmissionSettings } from "@/lib/data/admission";

export default function AcademicSessionClient() {
  const [currentYear, setCurrentYear] = useState<string>("2026");
  const [upcomingYear, setUpcomingYear] = useState<string>("2027");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    getAdmissionSettings()
      .then((settings) => {
        if (settings?.currentAcademicYear) {
          const yr = String(settings.currentAcademicYear);
          setCurrentYear(yr);
          setUpcomingYear(String(Number(yr) + 1 || 2027));
        }
      })
      .catch((err) => {
        console.warn("Could not load admission settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSaveSession = async () => {
    if (!currentYear.trim()) {
      toast.error("Academic Year is required");
      return;
    }

    setSaving(true);
    try {
      await saveAdmissionSettings({
        currentAcademicYear: currentYear.trim(),
      });
      toast.success(`Academic Session updated to ${currentYear.trim()}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update academic session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Active Academic Session Configuration */}
      <Card className="border shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Academic Session Configuration</h3>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-bold text-primary">
              Active: {currentYear}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Current Active Session</label>
              <Input
                value={currentYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentYear(val);
                  const num = parseInt(val);
                  if (!isNaN(num)) {
                    setUpcomingYear(String(num + 1));
                  }
                }}
                disabled={loading}
                placeholder="2026"
                className="h-9 font-mono font-bold text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Upcoming Target Session</label>
              <Input
                value={upcomingYear}
                onChange={(e) => setUpcomingYear(e.target.value)}
                disabled={loading}
                placeholder="2027"
                className="h-9 font-mono font-bold text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span>Secondary Section (Classes V – X)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Standard Academic Session • January to December</p>
            </div>

            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Higher Secondary (Classes XI – XII)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Semester Examination Cycle • Sem 1 to Sem 4</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveSession}
              disabled={saving || loading}
              size="sm"
              className="h-8 px-4 text-xs font-semibold gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Session Settings</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student Promotion Portal Card */}
      <Card className="border shadow-xs bg-primary/[0.02]">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground">Student Promotion Desk</h3>
              <p className="text-xs text-muted-foreground">
                Promote students class-by-class based on examination marks, assign ranks, and manage overrides.
              </p>
            </div>
          </div>

          <Link href="/students/promotion" className="shrink-0 w-full sm:w-auto">
            <Button size="sm" className="h-9 w-full sm:w-auto px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
              <span>Open Promotion Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
