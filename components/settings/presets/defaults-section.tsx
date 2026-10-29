"use client";

import { saveStudentEntryPresetsToDb } from "@/lib/utils/student-entry-presets";
import { GUARDIAN_DEFAULT_PRESET_OPTIONS, RELIGION_DEFAULT_PRESET_OPTIONS, MEDIUM_OF_INSTRUCTION_DEFAULT_PRESET_OPTIONS } from "@/lib/constants/student-options";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast-banner";
import { Save, Compass, Sparkles, BookOpen, UserCheck, CheckCircle2, Sliders } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { InfoTooltip } from "@/components/settings/presets/info-tooltip";
import type { PresetAddressesState } from "./use-preset-addresses";

export function DefaultsSection({ presets }: { presets: PresetAddressesState }) {
  const { activeSection, isSaving, setIsSaving, setStudentPresets, studentPresets } = presets;
  return (
    <>
      {activeSection === "defaults" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-5 border-b bg-gradient-to-r from-amber-500/10 via-background to-background">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Student Data Entry Defaults
                  </CardTitle>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const ok = await saveStudentEntryPresetsToDb(studentPresets);
                      if (ok) {
                        showToast({ title: "Student entry defaults saved successfully!", type: "success" });
                      } else {
                        showToast({ title: "Saved locally.", type: "info" });
                      }
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold px-3 h-8 shadow-xs cursor-pointer shrink-0"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Default Guardian Relationship */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-amber-500" />
                      Default Relationship with Guardian
                    </Label>
                    <InfoTooltip content="When student admission or Excel bulk upload has an empty Guardian relationship, it will automatically default to this selection." />
                  </div>
                  <CustomSelect
                    value={studentPresets.defaultGuardianRelationship}
                    onChange={(val) => setStudentPresets((prev) => ({ ...prev, defaultGuardianRelationship: val }))}
                    options={GUARDIAN_DEFAULT_PRESET_OPTIONS}
                    placeholder="Select default guardian relationship..."
                  />
                </div>

                {/* 2. Default Religion */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Default Religion
                    </Label>
                    <InfoTooltip content="When Religion is left blank or unselected, newly registered or bulk-uploaded students will automatically receive this religion." />
                  </div>
                  <CustomSelect
                    value={studentPresets.defaultReligion}
                    onChange={(val) => setStudentPresets((prev) => ({ ...prev, defaultReligion: val }))}
                    options={RELIGION_DEFAULT_PRESET_OPTIONS}
                    placeholder="Select default religion..."
                  />
                </div>

                {/* 3. Auto-sync Guardian Name */}
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3.5 min-h-[76px]">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="autoFillGuardianName" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Auto-Fill Guardian Name
                    </Label>
                    <InfoTooltip content="If Guardian is set to Father, Guardian's Name will automatically copy Father's Name if left blank. If Mother, it will copy Mother's Name." />
                  </div>
                  <input
                    id="autoFillGuardianName"
                    type="checkbox"
                    checked={studentPresets.autoFillGuardianName}
                    onChange={(e) => setStudentPresets((prev) => ({ ...prev, autoFillGuardianName: e.target.checked }))}
                    className="h-4.5 w-4.5 rounded border-border text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                {/* 4. Default Mother Tongue */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Compass className="h-3.5 w-3.5 text-purple-500" />
                      Default Mother Tongue
                    </Label>
                    <InfoTooltip content="Default spoken language at home for registered students when left empty." />
                  </div>
                  <CustomSelect
                    value={studentPresets.defaultMotherTongue}
                    onChange={(val) => setStudentPresets((prev) => ({ ...prev, defaultMotherTongue: val }))}
                    options={[
                      { label: "Bengali", value: "Bengali" },
                      { label: "Hindi", value: "Hindi" },
                      { label: "Urdu", value: "Urdu" },
                      { label: "English", value: "English" },
                      { label: "None (No Default)", value: "None" },
                    ]}
                    placeholder="Select default mother tongue..."
                  />
                </div>

                {/* 5. Default Medium of Instruction */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3.5 md:col-span-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                      Default Medium of Instruction
                    </Label>
                    <InfoTooltip content="Default medium of instruction for registered students when left empty." />
                  </div>
                  <CustomSelect
                    value={studentPresets.defaultMediumOfInstruction}
                    onChange={(val) => setStudentPresets((prev) => ({ ...prev, defaultMediumOfInstruction: val }))}
                    options={MEDIUM_OF_INSTRUCTION_DEFAULT_PRESET_OPTIONS}
                    placeholder="Select default medium..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
