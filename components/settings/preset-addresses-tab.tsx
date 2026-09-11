"use client";

import React, { useState, useEffect } from "react";
import { 
  getSavedPresetAddresses, 
  savePresetAddressesToDb, 
  fetchPresetAddressesFromDb,
  DEFAULT_PRESET_ADDRESSES,
  PresetAddressItem 
} from "@/lib/utils/preset-addresses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast-banner";
import { MapPin, Save, RefreshCw, CheckCircle2, Building2 } from "lucide-react";

export function PresetAddressesTab() {
  const [addresses, setAddresses] = useState<PresetAddressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 1. Initial load from local storage
    setAddresses(getSavedPresetAddresses());
    setIsLoading(false);

    // 2. Sync from database
    fetchPresetAddressesFromDb()
      .then((dbData) => {
        setAddresses(dbData);
      })
      .catch((err) => {
        console.warn("Could not load preset addresses from DB", err);
      });
  }, []);

  const handleChange = (id: string, field: keyof PresetAddressItem, val: string) => {
    setAddresses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await savePresetAddressesToDb(addresses);
      if (success) {
        showToast({ title: "Predefined addresses saved successfully!", type: "success" });
      } else {
        showToast({ title: "Saved locally. DB sync failed.", type: "info" });
      }
    } catch (err) {
      showToast({ title: "Error saving predefined addresses", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all 5 predefined addresses to default values?")) {
      setAddresses(DEFAULT_PRESET_ADDRESSES);
      savePresetAddressesToDb(DEFAULT_PRESET_ADDRESSES);
      showToast({ title: "Reset to default predefined addresses", type: "info" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 rounded-2xl border bg-card/50 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-xl" />
        <div className="h-[300px] w-full bg-muted/60 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-card/90 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              Predefined Addresses (A1 - A5)
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure 5 quick-fill addresses. Teachers can click A1, A2, A3, A4, or A5 on student registration forms to auto-fill address and pincode.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-semibold rounded-xl border-border hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs px-4 shadow-xs"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Addresses
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 5 Preset Address Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((item) => (
          <Card key={item.id} className="rounded-2xl border border-border/80 shadow-xs hover:shadow-md transition-all">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                    {item.label}
                  </span>
                  <CardTitle className="text-sm font-bold">Preset {item.label}</CardTitle>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  Checkbox Button: {item.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Short Title / Area Name
                </Label>
                <Input
                  value={item.title}
                  onChange={(e) => handleChange(item.id, "title", e.target.value)}
                  placeholder="e.g. Marigachi Main"
                  className="text-xs rounded-xl bg-background border-border/80"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Full Address
                </Label>
                <textarea
                  value={item.address}
                  onChange={(e) => handleChange(item.id, "address", e.target.value)}
                  rows={2}
                  placeholder="e.g. Vill+P.O- Marigachi, P.S- Mathurapur, Dist- South 24 Parganas"
                  className="w-full text-xs rounded-xl bg-background border border-border/80 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Pincode
                </Label>
                <Input
                  value={item.pincode}
                  onChange={(e) => handleChange(item.id, "pincode", e.target.value)}
                  maxLength={6}
                  placeholder="e.g. 743349"
                  className="text-xs rounded-xl bg-background border-border/80 w-36"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
