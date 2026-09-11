"use client";

import React, { useState, useEffect } from "react";
import { 
  getSavedPresetAddresses, 
  fetchPresetAddressesFromDb,
  PresetAddressItem 
} from "@/lib/utils/preset-addresses";
import { cn } from "@/lib/utils";
import { MapPin, Check } from "lucide-react";

interface PresetAddressButtonsProps {
  onSelectAddress: (address: string, pincode: string) => void;
  currentAddress?: string;
  currentPincode?: string;
}

export function PresetAddressButtons({
  onSelectAddress,
  currentAddress = "",
  currentPincode = "",
}: PresetAddressButtonsProps) {
  const [presets, setPresets] = useState<PresetAddressItem[]>([]);

  useEffect(() => {
    // 1. Initial load
    setPresets(getSavedPresetAddresses());

    // 2. Fetch latest from DB
    fetchPresetAddressesFromDb().then((data) => {
      setPresets(data);
    });

    // 3. Reactive listener for live updates from Settings
    function handleUpdate(e: any) {
      if (e.detail && Array.isArray(e.detail)) {
        setPresets(e.detail);
      }
    }

    window.addEventListener("sms_preset_addresses_updated", handleUpdate);
    return () => {
      window.removeEventListener("sms_preset_addresses_updated", handleUpdate);
    };
  }, []);

  // Determine active preset (if current address matches one of the presets)
  const activePresetId = presets.find(
    (p) => p.address && currentAddress && p.address.trim().toLowerCase() === currentAddress.trim().toLowerCase()
  )?.id;

  const handlePresetClick = (preset: PresetAddressItem) => {
    onSelectAddress(preset.address, preset.pincode);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-semibold text-muted-foreground/80 mr-1 flex items-center gap-1">
        <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        Preset Address:
      </span>
      {presets.map((preset) => {
        const isSelected = activePresetId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetClick(preset)}
            title={`${preset.title || preset.label}: ${preset.address} (${preset.pincode})`}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none active:scale-95 shadow-2xs",
              isSelected
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/25"
                : "bg-muted/40 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300 border-border/80 text-foreground"
            )}
          >
            {isSelected ? (
              <Check className="h-3 w-3 shrink-0 text-white stroke-[3]" />
            ) : (
              <span className="text-[10px] opacity-70">📍</span>
            )}
            <span>{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}
