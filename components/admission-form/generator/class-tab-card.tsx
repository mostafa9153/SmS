"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/ui/custom-select";
import { Layers, GraduationCap, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

import type { AdmissionGeneratorState } from "./use-admission-form-generator";

export function ClassTabCard({ gen }: { gen: AdmissionGeneratorState }) {
  const { activeTab, admissionCategory, effectiveFormClass, formatClassOptions, selectedFormClass, setActiveTab, setAdmissionCategory, setSelectedFormClass } = gen;
  return (
    <Card className="shadow-xs border-border/80 rounded-2xl overflow-hidden">
      <CardHeader className="p-4 pb-3 bg-muted/40 border-b">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>Admission Type & Format</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary border-primary/30 bg-primary/5">
            Class {effectiveFormClass || "V"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 space-y-3.5">
        {/* Admission Type: New Admission vs Re-Admission */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-foreground">Admission Type</Label>
            <span className="text-[10px] text-muted-foreground font-medium">Header Stamp</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdmissionCategory("new")}
              className={cn(
                "py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                admissionCategory === "new"
                  ? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs scale-[1.01]"
                  : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", admissionCategory === "new" ? "bg-emerald-600" : "bg-muted-foreground/40")} />
              <span>New Admission</span>
            </button>
            <button
              type="button"
              onClick={() => setAdmissionCategory("re")}
              className={cn(
                "py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                admissionCategory === "re"
                  ? "border-orange-600 bg-orange-500/15 text-orange-700 dark:text-orange-300 font-bold shadow-2xs scale-[1.01]"
                  : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", admissionCategory === "re" ? "bg-orange-600" : "bg-muted-foreground/40")} />
              <span>Re-Admission</span>
            </button>
          </div>
        </div>
          {/* 2 Format Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("v-ix");
                if (selectedFormClass === "XI" || selectedFormClass === "XII") {
                  setSelectedFormClass("V");
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer",
                activeTab === "v-ix"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-[1.01]"
                  : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="h-5 w-5 mb-1.5" />
              <span className="text-xs font-bold">Class V – IX</span>
              <span className="text-[10px] opacity-80 mt-0.5">Junior &amp; High School</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("xi");
                if (selectedFormClass !== "XI" && selectedFormClass !== "XII") {
                  setSelectedFormClass("XI");
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer",
                activeTab === "xi"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-[1.01]"
                  : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <GraduationCap className="h-5 w-5 mb-1.5" />
              <span className="text-xs font-bold">Class XI</span>
              <span className="text-[10px] opacity-80 mt-0.5">Higher Secondary</span>
            </button>
          </div>

          {/* Dynamic Class Dropdown from School Database Configuration */}
          <div className="pt-2.5 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span>
                  {activeTab === "v-ix" ? "Select Class (V – IX):" : "Select Class (XI – XII):"}
                </span>
              </Label>
              <span className="text-[10px] text-muted-foreground font-medium">Prints in Office Use</span>
            </div>

            <CustomSelect
              value={selectedFormClass}
              onChange={(val) => setSelectedFormClass(String(val))}
              options={formatClassOptions}
              searchable={false}
              placeholder={`Class ${selectedFormClass}`}
              triggerClassName="h-9 text-xs font-bold rounded-xl bg-background border-border/80 text-foreground"
            />
          </div>
        </CardContent>
      </Card>
  );
}
