"use client";

import React, { useState, useEffect } from "react";
import {
  getSavedAddressPresetsConfig,
  saveAddressPresetsConfigToDb,
  fetchAddressPresetsConfigFromDb,
  DEFAULT_ADDRESS_PRESETS_CONFIG,
  AddressPresetsConfig,
} from "@/lib/utils/preset-addresses";
import {
  getSavedBankPresets,
  saveBankPresetsToDb,
  fetchBankPresetsFromDb,
  DEFAULT_BANK_PRESETS,
  BankPresetItem,
} from "@/lib/utils/bank-presets";
import {
  getSavedSchoolPresets,
  saveSchoolPresetsToDb,
  fetchSchoolPresetsFromDb,
  DEFAULT_SCHOOL_PRESETS,
} from "@/lib/utils/school-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Building,
  Mail,
  ShieldCheck,
  Compass,
  Landmark,
  School,
} from "lucide-react";

type PresetSection = "address" | "bank" | "school";

export function PresetAddressesTab() {
  const [activeSection, setActiveSection] = useState<PresetSection>("address");

  // 1. Address Presets State
  const [addressConfig, setAddressConfig] = useState<AddressPresetsConfig>(DEFAULT_ADDRESS_PRESETS_CONFIG);
  const [newVillage, setNewVillage] = useState("");
  const [newPoName, setNewPoName] = useState("");
  const [newPoPin, setNewPoPin] = useState("");
  const [newPs, setNewPs] = useState("");
  const [newDist, setNewDist] = useState("");

  // 2. Bank Presets State
  const [bankPresets, setBankPresets] = useState<BankPresetItem[]>(DEFAULT_BANK_PRESETS);
  const [newBankName, setNewBankName] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newBankIfsc, setNewBankIfsc] = useState("");

  // 3. School Presets State
  const [schoolPresets, setSchoolPresets] = useState<string[]>(DEFAULT_SCHOOL_PRESETS);
  const [newSchoolName, setNewSchoolName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initial loads from local storage
    setAddressConfig(getSavedAddressPresetsConfig());
    setBankPresets(getSavedBankPresets());
    setSchoolPresets(getSavedSchoolPresets());
    setIsLoading(false);

    // Sync from database
    Promise.all([
      fetchAddressPresetsConfigFromDb().then(setAddressConfig),
      fetchBankPresetsFromDb().then(setBankPresets),
      fetchSchoolPresetsFromDb().then(setSchoolPresets),
    ]).catch((err) => {
      console.warn("Could not load presets from DB:", err);
    });
  }, []);

  // Save All Changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const [addrOk, bankOk, schoolOk] = await Promise.all([
        saveAddressPresetsConfigToDb(addressConfig),
        saveBankPresetsToDb(bankPresets),
        saveSchoolPresetsToDb(schoolPresets),
      ]);

      if (addrOk && bankOk && schoolOk) {
        showToast({ title: "All system presets saved successfully!", type: "success" });
      } else {
        showToast({ title: "Saved locally. DB sync partially completed.", type: "info" });
      }
    } catch (err) {
      showToast({ title: "Error saving presets to database", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (activeSection === "address") {
      if (confirm("Reset all address presets (Villages, P.O, P.S, Districts) to defaults?")) {
        setAddressConfig(DEFAULT_ADDRESS_PRESETS_CONFIG);
        saveAddressPresetsConfigToDb(DEFAULT_ADDRESS_PRESETS_CONFIG);
        showToast({ title: "Reset address presets to defaults", type: "info" });
      }
    } else if (activeSection === "bank") {
      if (confirm("Reset local bank & IFSC presets to defaults?")) {
        setBankPresets(DEFAULT_BANK_PRESETS);
        saveBankPresetsToDb(DEFAULT_BANK_PRESETS);
        showToast({ title: "Reset bank presets to defaults", type: "info" });
      }
    } else if (activeSection === "school") {
      if (confirm("Reset feeder / previous school presets to defaults?")) {
        setSchoolPresets(DEFAULT_SCHOOL_PRESETS);
        saveSchoolPresetsToDb(DEFAULT_SCHOOL_PRESETS);
        showToast({ title: "Reset school presets to defaults", type: "info" });
      }
    }
  };

  // --- Address Handlers ---
  const addVillage = () => {
    const trimmed = newVillage.trim();
    if (!trimmed) return;
    if (addressConfig.villages.includes(trimmed)) {
      showToast({ title: "Village already exists", type: "info" });
      return;
    }
    setAddressConfig((prev) => ({ ...prev, villages: [...prev.villages, trimmed] }));
    setNewVillage("");
  };

  const removeVillage = (v: string) => {
    setAddressConfig((prev) => ({
      ...prev,
      villages: prev.villages.filter((item) => item !== v),
    }));
  };

  const addPostOffice = () => {
    const name = newPoName.trim();
    const pin = newPoPin.trim();
    if (!name) return;
    if (addressConfig.postOffices.some((po) => po.name.toLowerCase() === name.toLowerCase())) {
      showToast({ title: "Post office already exists", type: "info" });
      return;
    }
    setAddressConfig((prev) => ({
      ...prev,
      postOffices: [...prev.postOffices, { name, pincode: pin }],
    }));
    setNewPoName("");
    setNewPoPin("");
  };

  const removePostOffice = (name: string) => {
    setAddressConfig((prev) => ({
      ...prev,
      postOffices: prev.postOffices.filter((item) => item.name !== name),
    }));
  };

  const addPoliceStation = () => {
    const trimmed = newPs.trim();
    if (!trimmed) return;
    if (addressConfig.policeStations.includes(trimmed)) {
      showToast({ title: "Police station already exists", type: "info" });
      return;
    }
    setAddressConfig((prev) => ({
      ...prev,
      policeStations: [...prev.policeStations, trimmed],
    }));
    setNewPs("");
  };

  const removePoliceStation = (ps: string) => {
    setAddressConfig((prev) => ({
      ...prev,
      policeStations: prev.policeStations.filter((item) => item !== ps),
    }));
  };

  const addDistrict = () => {
    const trimmed = newDist.trim();
    if (!trimmed) return;
    if (addressConfig.districts.includes(trimmed)) {
      showToast({ title: "District already exists", type: "info" });
      return;
    }
    setAddressConfig((prev) => ({
      ...prev,
      districts: [...prev.districts, trimmed],
    }));
    setNewDist("");
  };

  const removeDistrict = (d: string) => {
    setAddressConfig((prev) => ({
      ...prev,
      districts: prev.districts.filter((item) => item !== d),
    }));
  };

  // --- Bank Handlers ---
  const addBankPreset = () => {
    const bName = newBankName.trim();
    const brName = newBranchName.trim();
    const ifsc = newBankIfsc.trim().toUpperCase();

    if (!bName || !brName || !ifsc) {
      showToast({ title: "Please fill Bank Name, Branch, and IFSC Code", type: "error" });
      return;
    }

    if (ifsc.length !== 11) {
      showToast({ title: "IFSC code must be exactly 11 characters", type: "error" });
      return;
    }

    const newItem: BankPresetItem = {
      id: `b_${Date.now()}`,
      bankName: bName,
      branchName: brName,
      ifsc,
    };

    setBankPresets((prev) => [...prev, newItem]);
    setNewBankName("");
    setNewBranchName("");
    setNewBankIfsc("");
    showToast({ title: `Added ${bName} (${brName})`, type: "success" });
  };

  const removeBankPreset = (id: string) => {
    setBankPresets((prev) => prev.filter((item) => item.id !== id));
  };

  // --- School Handlers ---
  const addSchoolPreset = () => {
    const trimmed = newSchoolName.trim();
    if (!trimmed) return;
    if (schoolPresets.includes(trimmed)) {
      showToast({ title: "School already exists in presets", type: "info" });
      return;
    }
    setSchoolPresets((prev) => [...prev, trimmed]);
    setNewSchoolName("");
    showToast({ title: "Added feeder school preset", type: "success" });
  };

  const removeSchoolPreset = (name: string) => {
    setSchoolPresets((prev) => prev.filter((s) => s !== name));
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
            <Building className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              System Presets & Quick-Fill Hub
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure predefined options for Addresses, Local Bank Branches & IFSC Codes, and Feeder Schools to accelerate student registration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-semibold rounded-xl border-border hover:bg-muted cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs px-4 shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
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

      {/* Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveSection("address")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeSection === "address"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          📍 Address Presets
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("bank")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeSection === "bank"
              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Landmark className="h-3.5 w-3.5" />
          🏦 Bank & IFSC Presets
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("school")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeSection === "school"
              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30 shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <School className="h-3.5 w-3.5" />
          🏫 Previous / Feeder Schools
        </button>
      </div>

      {/* SECTION 1: Address Presets */}
      {activeSection === "address" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in-50 duration-200">
          {/* 1. Villages (Vill) */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <CardTitle className="text-sm font-bold">Villages (Vill)</CardTitle>
                  <CardDescription className="text-xs">Pre-saved village names for the dropdown</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addVillage()}
                  placeholder="Enter village name..."
                  className="text-xs h-9 rounded-xl bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addVillage}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {addressConfig.villages.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => removeVillage(v)}
                      className="text-emerald-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Post Offices (P.O) + Pincode */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <CardTitle className="text-sm font-bold">Post Offices (P.O) & Pincodes</CardTitle>
                  <CardDescription className="text-xs">Selecting a P.O in the form auto-fills its PIN</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newPoName}
                  onChange={(e) => setNewPoName(e.target.value)}
                  placeholder="Post Office name..."
                  className="text-xs h-9 rounded-xl bg-background flex-1"
                />
                <Input
                  value={newPoPin}
                  onChange={(e) => setNewPoPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPostOffice()}
                  placeholder="PIN (e.g. 743349)"
                  maxLength={6}
                  className="text-xs h-9 w-28 rounded-xl bg-background text-center font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addPostOffice}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {addressConfig.postOffices.map((po) => (
                  <span
                    key={po.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40"
                  >
                    {po.name}
                    {po.pincode && (
                      <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded text-blue-900 dark:text-blue-200">
                        {po.pincode}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePostOffice(po.name)}
                      className="text-blue-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3. Police Stations (P.S) */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-sm font-bold">Police Stations (P.S)</CardTitle>
                  <CardDescription className="text-xs">Pre-saved police stations for the dropdown</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newPs}
                  onChange={(e) => setNewPs(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPoliceStation()}
                  placeholder="e.g. Mathurapur, Mandirbazar..."
                  className="text-xs h-9 rounded-xl bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addPoliceStation}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {addressConfig.policeStations.map((ps) => (
                  <span
                    key={ps}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                  >
                    {ps}
                    <button
                      type="button"
                      onClick={() => removePoliceStation(ps)}
                      className="text-purple-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. Districts (Dist) */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <CardTitle className="text-sm font-bold">Districts (Dist)</CardTitle>
                  <CardDescription className="text-xs">Pre-saved districts for the dropdown</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newDist}
                  onChange={(e) => setNewDist(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDistrict()}
                  placeholder="e.g. South 24 Parganas..."
                  className="text-xs h-9 rounded-xl bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addDistrict}
                  className="h-9 px-3 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
                {addressConfig.districts.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeDistrict(d)}
                      className="text-amber-600 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 2: Bank & IFSC Presets */}
      {activeSection === "bank" && (
        <Card className="rounded-2xl border border-border/80 shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <CardTitle className="text-sm font-bold">Local Bank Branches & IFSC Codes</CardTitle>
                  <CardDescription className="text-xs">
                    Selecting a bank branch in the student form will automatically fill its 11-digit IFSC code
                  </CardDescription>
                </div>
              </div>
              <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg">
                {bankPresets.length} Branches
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Add Bank Form */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-foreground block">
                ➕ Add New Local Bank Branch
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Bank Name *
                  </Label>
                  <Input
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="e.g. State Bank of India"
                    className="text-xs h-9 rounded-xl bg-background"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Branch Name *
                  </Label>
                  <Input
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g. Mathurapur"
                    className="text-xs h-9 rounded-xl bg-background"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    IFSC Code (11 Chars) *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newBankIfsc}
                      onChange={(e) => setNewBankIfsc(e.target.value.toUpperCase())}
                      maxLength={11}
                      placeholder="e.g. SBIN0001234"
                      className="text-xs h-9 rounded-xl bg-background font-mono uppercase font-semibold"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addBankPreset}
                      className="h-9 px-4 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Configured Banks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {bankPresets.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background hover:shadow-xs transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-foreground truncate">{b.bankName}</p>
                    <p className="text-[11px] text-muted-foreground">Branch: {b.branchName}</p>
                    <span className="inline-block font-mono text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded mt-1">
                      {b.ifsc}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeBankPreset(b.id)}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                    title="Delete bank preset"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: Feeder / Previous Schools */}
      {activeSection === "school" && (
        <Card className="rounded-2xl border border-border/80 shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <CardTitle className="text-sm font-bold">Feeder / Previous School Presets</CardTitle>
                  <CardDescription className="text-xs">
                    Local primary and feeder schools that appear in the student previous schooling dropdown
                  </CardDescription>
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
    </div>
  );
}
