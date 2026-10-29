"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, School } from "lucide-react";
import { InfoTooltip } from "@/components/settings/presets/info-tooltip";
import type { PresetAddressesState } from "./use-preset-addresses";

export function SchoolSection({ presets }: { presets: PresetAddressesState }) {
  const { activeSection, addSchoolPreset, newSchoolName, removeSchoolPreset, schoolPresets, setNewSchoolName } = presets;
  return (
    <>
      {activeSection === "school" && (
        <Card className="rounded-2xl border border-border/80 shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-bold">Feeder / Previous School Presets</CardTitle>
                  <InfoTooltip content="Local primary and feeder schools that appear in the student previous schooling dropdown." />
                </div>
              </div>
              <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-lg">
                {schoolPresets.length} Schools
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Add School Form */}
            <div className="flex gap-2 max-w-xl">
              <Input
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSchoolPreset()}
                placeholder="Enter feeder school name (e.g. Marigachi Free Primary School)..."
                className="text-xs h-9 rounded-xl bg-background"
              />
              <Button
                type="button"
                size="sm"
                onClick={addSchoolPreset}
                className="h-9 px-4 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add School
              </Button>
            </div>

            {/* List of Schools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {schoolPresets.map((sch) => (
                <div
                  key={sch}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-background hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <School className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">{sch}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSchoolPreset(sch)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                    title="Delete school preset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
