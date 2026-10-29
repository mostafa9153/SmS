"use client";

import { Button } from "@/components/ui/button";
import { Save, RefreshCw, Building } from "lucide-react";
import { SettingsBackButton } from "../settings-back-button";
import { Spinner } from "@/components/ui/spinner";
import { ALL_PRESET_ITEMS } from "@/components/settings/presets/constants";
import type { PresetAddressesState } from "./use-preset-addresses";

export function PresetsHeader({ presets }: { presets: PresetAddressesState }) {
  const { activeSection, handleResetDefaults, handleSave, isSaving } = presets;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-amber-500/5 dark:from-emerald-950/25 dark:via-teal-950/15 dark:to-background shadow-xs">
      <div className="flex items-center gap-3">
        <SettingsBackButton />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 shrink-0 shadow-2xs">
          <Building className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            System Presets & Quick-Fill Hub
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              Active:{" "}
              <strong className="text-foreground font-semibold">
                {ALL_PRESET_ITEMS.find((item) => item.id === activeSection)?.title || "Presets"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetDefaults}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl border-border hover:bg-muted cursor-pointer h-9"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset Defaults
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs px-4 shadow-xs cursor-pointer h-9"
        >
          {isSaving ? (
            <>
              <Spinner className="h-3.5 w-3.5" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save All Presets
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
