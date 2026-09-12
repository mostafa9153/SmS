"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
import {
  getSavedAddressPresetsConfig,
  fetchAddressPresetsConfigFromDb,
  compileAddressString,
  parseAddressString,
  AddressPresetsConfig,
  DEFAULT_ADDRESS_PRESETS_CONFIG,
} from "@/lib/utils/preset-addresses";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import { MapPin, Edit3, Settings, RotateCcw } from "lucide-react";

interface SmartAddressInputProps {
  value: string;
  onChange: (val: string) => void;
  pincodeValue: string;
  onPincodeChange: (pin: string) => void;
  error?: string;
  pincodeError?: string;
}

export function SmartAddressInput({
  value,
  onChange,
  pincodeValue,
  onPincodeChange,
  error,
  pincodeError,
}: SmartAddressInputProps) {
  const uid = useId();
  const [config, setConfig] = useState<AddressPresetsConfig>(DEFAULT_ADDRESS_PRESETS_CONFIG);
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Structured address fields
  const [village, setVillage] = useState("");
  const [postOffice, setPostOffice] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [district, setDistrict] = useState("");

  // Custom write-in toggle states
  const [villageIsCustom, setVillageIsCustom] = useState(false);
  const [poIsCustom, setPoIsCustom] = useState(false);
  const [psIsCustom, setPsIsCustom] = useState(false);
  const [distIsCustom, setDistIsCustom] = useState(false);

  // Load presets config & setup real-time listener
  useEffect(() => {
    setConfig(getSavedAddressPresetsConfig());
    fetchAddressPresetsConfigFromDb().then((data) => {
      setConfig(data);
    });

    const handleConfigUpdate = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      }
    };

    window.addEventListener("sms_address_presets_config_updated", handleConfigUpdate);
    return () => {
      window.removeEventListener("sms_address_presets_config_updated", handleConfigUpdate);
    };
  }, []);

  // Parse incoming raw address on initial load or reset
  useEffect(() => {
    if (value) {
      const parsed = parseAddressString(value);
      if (parsed.village || parsed.postOffice || parsed.policeStation || parsed.district) {
        setVillage(parsed.village);
        setPostOffice(parsed.postOffice);
        setPoliceStation(parsed.policeStation);
        setDistrict(parsed.district);

        // Check if values match existing presets
        if (parsed.village && !config.villages.some((v) => v.toLowerCase() === parsed.village.toLowerCase())) {
          setVillageIsCustom(true);
        }
        if (parsed.postOffice && !config.postOffices.some((p) => p.name.toLowerCase() === parsed.postOffice.toLowerCase())) {
          setPoIsCustom(true);
        }
        if (parsed.policeStation && !config.policeStations.some((ps) => ps.toLowerCase() === parsed.policeStation.toLowerCase())) {
          setPsIsCustom(true);
        }
        if (parsed.district && !config.districts.some((d) => d.toLowerCase() === parsed.district.toLowerCase())) {
          setDistIsCustom(true);
        }
      }
    }
  }, [value, config]);

  // Sync back to parent when any structured field changes (in auto mode)
  const updateAddress = (
    newVillage: string,
    newPo: string,
    newPs: string,
    newDist: string
  ) => {
    if (isManualOverride) return;

    const compiled = compileAddressString({
      village: newVillage,
      postOffice: newPo,
      policeStation: newPs,
      district: newDist,
    });

    onChange(compiled);
  };

  const handleVillageChange = (val: string) => {
    setVillage(val);
    updateAddress(val, postOffice, policeStation, district);
  };

  const handlePostOfficeChange = (val: string) => {
    setPostOffice(val);
    updateAddress(village, val, policeStation, district);
  };

  const handlePoliceStationChange = (val: string) => {
    setPoliceStation(val);
    updateAddress(village, postOffice, val, district);
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    updateAddress(village, postOffice, policeStation, val);
  };

  const toggleManualOverride = () => {
    if (isManualOverride) {
      setIsManualOverride(false);
      const compiled = compileAddressString({
        village,
        postOffice,
        policeStation,
        district,
      });
      onChange(compiled);
    } else {
      setIsManualOverride(true);
    }
  };

  // Village Options
  const villageSelectOptions = useMemo(() => {
    const list = config.villages.map((v) => ({ label: v, value: v }));
    if (village && !list.some((o) => o.value.toLowerCase() === village.toLowerCase())) {
      list.push({ label: `✏️ Custom: ${village}`, value: village });
    }
    list.push({ label: "✏️ Other (Write Custom...)", value: "__other__" });
    return list;
  }, [config.villages, village]);

  // Post Office Options
  const poSelectOptions = useMemo(() => {
    const list = config.postOffices.map((po) => ({
      label: po.pincode ? `${po.name} (${po.pincode})` : po.name,
      value: po.name,
    }));
    if (postOffice && !list.some((o) => o.value.toLowerCase() === postOffice.toLowerCase())) {
      list.push({ label: `✏️ Custom: ${postOffice}`, value: postOffice });
    }
    list.push({ label: "✏️ Other (Write Custom...)", value: "__other__" });
    return list;
  }, [config.postOffices, postOffice]);

  // Police Station Options
  const psSelectOptions = useMemo(() => {
    const list = config.policeStations.map((ps) => ({ label: ps, value: ps }));
    if (policeStation && !list.some((o) => o.value.toLowerCase() === policeStation.toLowerCase())) {
      list.push({ label: `✏️ Custom: ${policeStation}`, value: policeStation });
    }
    list.push({ label: "✏️ Other (Write Custom...)", value: "__other__" });
    return list;
  }, [config.policeStations, policeStation]);

  // District Options
  const distSelectOptions = useMemo(() => {
    const list = config.districts.map((d) => ({ label: d, value: d }));
    if (district && !list.some((o) => o.value.toLowerCase() === district.toLowerCase())) {
      list.push({ label: `✏️ Custom: ${district}`, value: district });
    }
    list.push({ label: "✏️ Other (Write Custom...)", value: "__other__" });
    return list;
  }, [config.districts, district]);

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-card/60 p-3.5 sm:p-4 shadow-xs">
      {/* Top Header: Title, Settings Link & Manual Edit Icon */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-foreground">Address Details</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Settings Icon: Directly navigates to Presets Settings tab */}
          <a
            href="/settings?tab=presets"
            target="_blank"
            rel="noopener noreferrer"
            title="Configure Address Presets in Settings"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </a>

          {/* Edit Icon: Toggles direct text edit mode */}
          <button
            type="button"
            onClick={toggleManualOverride}
            title={isManualOverride ? "Switch back to dropdowns" : "Edit address text directly"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors cursor-pointer",
              isManualOverride
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border/80 text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            )}
          >
            {isManualOverride ? (
              <RotateCcw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Edit3 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {!isManualOverride ? (
        /* 4 Unified CustomSelect Dropdowns with Preset Options + Write-in Field */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {/* 1. Village (Vill) */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Village (Vill) <span className="text-destructive">*</span>
            </Label>
            <CustomSelect
              value={villageIsCustom ? "__other__" : village}
              onChange={(val) => {
                if (val === "__other__") {
                  setVillageIsCustom(true);
                  handleVillageChange("");
                } else {
                  setVillageIsCustom(false);
                  handleVillageChange(val);
                }
              }}
              options={villageSelectOptions}
              placeholder="-- Select Village --"
              searchable={villageSelectOptions.length > 5}
              triggerClassName="h-9 py-1 text-xs rounded-xl"
            />
            {villageIsCustom && (
              <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <Input
                  autoFocus
                  value={village}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  placeholder="Type custom village name..."
                  className="text-xs h-8 rounded-lg bg-background border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20 text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            )}
          </div>

          {/* 2. Post Office (P.O) */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Post Office (P.O) <span className="text-destructive">*</span>
            </Label>
            <CustomSelect
              value={poIsCustom ? "__other__" : postOffice}
              onChange={(val) => {
                if (val === "__other__") {
                  setPoIsCustom(true);
                  handlePostOfficeChange("");
                } else {
                  setPoIsCustom(false);
                  handlePostOfficeChange(val);

                  // Auto-fill pincode when preset post office is picked
                  const matchedPo = config.postOffices.find(
                    (p) => p.name.trim().toLowerCase() === val.trim().toLowerCase()
                  );
                  if (matchedPo && matchedPo.pincode) {
                    onPincodeChange(matchedPo.pincode);
                  }
                }
              }}
              options={poSelectOptions}
              placeholder="-- Select Post Office --"
              searchable={poSelectOptions.length > 5}
              triggerClassName="h-9 py-1 text-xs rounded-xl"
            />
            {poIsCustom && (
              <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <Input
                  autoFocus
                  value={postOffice}
                  onChange={(e) => handlePostOfficeChange(e.target.value)}
                  placeholder="Type custom Post Office..."
                  className="text-xs h-8 rounded-lg bg-background border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20 text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            )}
          </div>

          {/* 3. Police Station (P.S) */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Police Station (P.S) <span className="text-destructive">*</span>
            </Label>
            <CustomSelect
              value={psIsCustom ? "__other__" : policeStation}
              onChange={(val) => {
                if (val === "__other__") {
                  setPsIsCustom(true);
                  handlePoliceStationChange("");
                } else {
                  setPsIsCustom(false);
                  handlePoliceStationChange(val);
                }
              }}
              options={psSelectOptions}
              placeholder="-- Select Police Station --"
              searchable={psSelectOptions.length > 5}
              triggerClassName="h-9 py-1 text-xs rounded-xl"
            />
            {psIsCustom && (
              <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <Input
                  autoFocus
                  value={policeStation}
                  onChange={(e) => handlePoliceStationChange(e.target.value)}
                  placeholder="Type custom Police Station..."
                  className="text-xs h-8 rounded-lg bg-background border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20 text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            )}
          </div>

          {/* 4. District (Dist) */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              District (Dist) <span className="text-destructive">*</span>
            </Label>
            <CustomSelect
              value={distIsCustom ? "__other__" : district}
              onChange={(val) => {
                if (val === "__other__") {
                  setDistIsCustom(true);
                  handleDistrictChange("");
                } else {
                  setDistIsCustom(false);
                  handleDistrictChange(val);
                }
              }}
              options={distSelectOptions}
              placeholder="-- Select District --"
              searchable={distSelectOptions.length > 5}
              triggerClassName="h-9 py-1 text-xs rounded-xl"
            />
            {distIsCustom && (
              <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <Input
                  autoFocus
                  value={district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  placeholder="Type custom District..."
                  className="text-xs h-8 rounded-lg bg-background border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20 text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Manual Override Textarea */
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">
            Custom Full Address (Direct Text Editing)
          </Label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            placeholder="e.g. Vill- ..., P.O- ..., P.S- ..., Dist- ..."
            className="w-full text-xs rounded-xl bg-background border border-border/80 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-foreground"
          />
        </div>
      )}

      {/* Clean Address Line */}
      <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/30 px-3 py-2 rounded-xl min-h-[38px]">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
            Address:
          </span>
          <p className="text-xs font-semibold text-foreground break-words">
            {value ? (
              value
            ) : (
              <span className="text-muted-foreground/40 font-normal">--</span>
            )}
          </p>
        </div>

        {/* Pincode Field Beside Full Address */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Label htmlFor={`pin-${uid}`} className="text-xs font-semibold text-muted-foreground shrink-0">
            PIN:
          </Label>
          <Input
            id={`pin-${uid}`}
            value={pincodeValue || ""}
            onChange={(e) => onPincodeChange(e.target.value)}
            maxLength={6}
            placeholder=""
            className="text-xs h-8 w-24 rounded-lg bg-background border-border/80 font-mono font-medium text-center"
          />
        </div>
      </div>

      {/* Validation Errors */}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      {pincodeError && <p className="text-xs text-destructive font-medium">{pincodeError}</p>}
    </div>
  );
}
