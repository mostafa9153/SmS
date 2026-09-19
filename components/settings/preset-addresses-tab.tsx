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
import {
  getSavedStudentEntryPresets,
  saveStudentEntryPresetsToDb,
  fetchStudentEntryPresetsFromDb,
  DEFAULT_STUDENT_ENTRY_PRESETS,
  StudentEntryPresets,
} from "@/lib/utils/student-entry-presets";
import {
  GUARDIAN_DEFAULT_PRESET_OPTIONS,
  RELIGION_DEFAULT_PRESET_OPTIONS,
  MEDIUM_OF_INSTRUCTION_DEFAULT_PRESET_OPTIONS,
} from "@/lib/constants/student-options";
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
  Sparkles,
  BookOpen,
  Key,
  UserCheck,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { getAdmissionSettings, saveAdmissionSettings } from "@/lib/data/admission";
import { FeePresetManager } from "@/components/settings/fee-preset-manager";
import { Receipt } from "lucide-react";
import { useSearchParams } from "next/navigation";

type PresetSection = "defaults" | "fee" | "address" | "bank" | "school" | "ai";
const VALID_PRESET_SECTIONS: PresetSection[] = ["defaults", "fee", "address", "bank", "school", "ai"];

export function PresetAddressesTab() {
  const searchParams = useSearchParams();
  const sectionParam = (searchParams.get("section") || searchParams.get("tab")) as PresetSection;
  const initialSection = sectionParam && VALID_PRESET_SECTIONS.includes(sectionParam) ? sectionParam : "defaults";
  const [activeSection, setActiveSectionState] = useState<PresetSection>(initialSection);

  const setActiveSection = (section: PresetSection) => {
    setActiveSectionState(section);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (section === "defaults") {
        url.searchParams.delete("section");
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("section", section);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // 0. Student Entry Defaults State
  const [studentPresets, setStudentPresets] = useState<StudentEntryPresets>(DEFAULT_STUDENT_ENTRY_PRESETS);

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

  // 4. AI OCR Configuration State
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai">("gemini");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("gemini-1.5-flash");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initial loads from local storage
    setStudentPresets(getSavedStudentEntryPresets());
    setAddressConfig(getSavedAddressPresetsConfig());
    setBankPresets(getSavedBankPresets());
    setSchoolPresets(getSavedSchoolPresets());
    setIsLoading(false);

    // Sync from database
    Promise.all([
      fetchStudentEntryPresetsFromDb().then(setStudentPresets),
      fetchAddressPresetsConfigFromDb().then(setAddressConfig),
      fetchBankPresetsFromDb().then(setBankPresets),
      fetchSchoolPresetsFromDb().then(setSchoolPresets),
      getAdmissionSettings().then((s) => {
        if (s) {
          if (s.aiProvider) setAiProvider(s.aiProvider);
          if (s.aiApiKey) setAiApiKey(s.aiApiKey);
          if (s.aiModel) setAiModel(s.aiModel);
        }
      }),
    ]).catch((err) => {
      console.warn("Could not load presets from DB:", err);
    });
  }, []);

  // Save All Changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const [studentOk, addrOk, bankOk, schoolOk] = await Promise.all([
        saveStudentEntryPresetsToDb(studentPresets),
        saveAddressPresetsConfigToDb(addressConfig),
        saveBankPresetsToDb(bankPresets),
        saveSchoolPresetsToDb(schoolPresets),
        saveAdmissionSettings({
          schoolId: "default",
          aiProvider,
          aiApiKey: aiApiKey.trim(),
          aiModel,
        }),
      ]);

      if (studentOk && addrOk && bankOk && schoolOk) {
        showToast({ title: "All system presets & AI settings saved successfully!", type: "success" });
      } else {
        showToast({ title: "Saved locally. DB sync completed.", type: "info" });
      }
    } catch (err) {
      showToast({ title: "Error saving presets to database", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (activeSection === "defaults") {
      if (confirm("Reset Student Entry Defaults to system initial defaults?")) {
        setStudentPresets(DEFAULT_STUDENT_ENTRY_PRESETS);
        saveStudentEntryPresetsToDb(DEFAULT_STUDENT_ENTRY_PRESETS);
        showToast({ title: "Reset student entry defaults", type: "info" });
      }
    } else if (activeSection === "address") {
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
    } else if (activeSection === "ai") {
      if (confirm("Reset AI configuration to defaults (Google Gemini 1.5 Flash)?")) {
        setAiProvider("gemini");
        setAiModel("gemini-1.5-flash");
        setAiApiKey("");
        saveAdmissionSettings({
          schoolId: "default",
          aiProvider: "gemini",
          aiModel: "gemini-1.5-flash",
          aiApiKey: "",
        });
        showToast({ title: "Reset AI settings to defaults", type: "info" });
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

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl border-border hover:bg-muted cursor-pointer h-10 sm:h-9"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs px-4 shadow-xs cursor-pointer h-10 sm:h-9"
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
      <div className="flex items-center gap-2 border-b border-border/60 pb-2 overflow-x-auto flex-nowrap custom-scrollbar scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSection("defaults")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]",
            activeSection === "defaults"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <UserCheck className="h-3.5 w-3.5 text-amber-500" />
          ⚡ Student Entry Defaults
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("fee")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]",
            activeSection === "fee"
              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30 shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Receipt className="h-3.5 w-3.5 text-purple-500" />
          🧾 Invoice Fee Presets (3 Tiers)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("address")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]",
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
            "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]",
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
            "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]",
            activeSection === "school"
              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30 shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <School className="h-3.5 w-3.5" />
          🏫 Previous / Feeder Schools
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("ai")}
          className={cn(
            "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]",
            activeSection === "ai"
              ? "bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-500/30 shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-pink-500" />
          ✨ AI &amp; OCR Vision Key
        </button>
      </div>

      {/* SECTION 0: Student Entry Defaults */}
      {activeSection === "defaults" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="pb-4 border-b bg-gradient-to-r from-amber-500/10 via-background to-background">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                      Student Data Entry Defaults
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Configure fallback values for new student registrations and Excel bulk uploads when fields are left blank.
                    </CardDescription>
                  </div>
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
            <CardContent className="p-5 space-y-6">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Default Guardian Relationship */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-amber-500" />
                      Default Relationship with Guardian
                    </Label>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      Auto Fallback
                    </span>
                  </div>
                  <CustomSelect
                    value={studentPresets.defaultGuardianRelationship}
                    onChange={(val) => setStudentPresets((prev) => ({ ...prev, defaultGuardianRelationship: val }))}
                    options={GUARDIAN_DEFAULT_PRESET_OPTIONS}
                    placeholder="Select default guardian relationship..."
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    When student admission or Excel bulk upload has an empty Guardian relationship, it will automatically default to this selection.
                  </p>
                </div>

                {/* 2. Default Religion */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Default Religion
                    </Label>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      Auto Fallback
                    </span>
                  </div>
                  <CustomSelect
                    value={studentPresets.defaultReligion}
                    onChange={(val) => setStudentPresets((prev) => ({ ...prev, defaultReligion: val }))}
                    options={RELIGION_DEFAULT_PRESET_OPTIONS}
                    placeholder="Select default religion..."
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    When Religion is left blank or unselected, newly registered or bulk-uploaded students will automatically receive this religion.
                  </p>
                </div>

                {/* 3. Auto-sync Guardian Name */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Auto-Fill Guardian Name
                    </Label>
                    <input
                      type="checkbox"
                      checked={studentPresets.autoFillGuardianName}
                      onChange={(e) => setStudentPresets((prev) => ({ ...prev, autoFillGuardianName: e.target.checked }))}
                      className="h-4 w-4 rounded border-border text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    If Guardian is set to <strong>Father</strong>, Guardian&apos;s Name will automatically copy <strong>Father&apos;s Name</strong> if left blank. If <strong>Mother</strong>, it will copy <strong>Mother&apos;s Name</strong>.
                  </p>
                </div>

                {/* 4. Default Mother Tongue */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Compass className="h-3.5 w-3.5 text-purple-500" />
                      Default Mother Tongue
                    </Label>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      Auto Fallback
                    </span>
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
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Default spoken language at home for registered students when left empty.
                  </p>
                </div>

                {/* 5. Default Medium of Instruction */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                      Default Medium of Instruction
                    </Label>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      Auto Fallback
                    </span>
                  </div>
                  <CustomSelect
                    value={studentPresets.defaultMediumOfInstruction}
                    onChange={(val) => setStudentPresets((prev) => ({ ...prev, defaultMediumOfInstruction: val }))}
                    options={MEDIUM_OF_INSTRUCTION_DEFAULT_PRESET_OPTIONS}
                    placeholder="Select default medium..."
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Default medium of instruction for registered students when left empty.
                  </p>
                </div>
              </div>

              {/* Real-Time Rule Summary Callout */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-amber-500" />
                  Active Auto-Fill Rules Preview
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1 text-xs">
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Blank Guardian Relation</span>
                    <span className="font-semibold text-foreground">
                      {studentPresets.defaultGuardianRelationship === "None" ? "Leave Blank" : studentPresets.defaultGuardianRelationship || "Father"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Blank Guardian Name</span>
                    <span className="font-semibold text-foreground">
                      {studentPresets.autoFillGuardianName ? "Auto-synced from Parent" : "Manual entry only"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Blank Religion</span>
                    <span className="font-semibold text-foreground">
                      {studentPresets.defaultReligion === "None" ? "Leave Blank" : studentPresets.defaultReligion || "Hinduism"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Blank Mother Tongue</span>
                    <span className="font-semibold text-foreground">
                      {studentPresets.defaultMotherTongue === "None" ? "Leave Blank" : studentPresets.defaultMotherTongue || "Bengali"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Blank Medium</span>
                    <span className="font-semibold text-foreground">
                      {studentPresets.defaultMediumOfInstruction === "None" ? "Leave Blank" : studentPresets.defaultMediumOfInstruction || "Bengali"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION: Invoice Fee Presets (3 Tiers: Class 5-8, 9-10, 11-12) */}
      {activeSection === "fee" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <FeePresetManager />
        </div>
      )}

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

      {/* SECTION 4: AI Model & Vision OCR Configuration */}
      {activeSection === "ai" && (
        <Card className="rounded-2xl border border-border/80 shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">1. AI Model &amp; Vision OCR Configuration</CardTitle>
                <CardDescription className="text-xs">
                  The AI OCR scanner runs automatically on your camera captures and physical admission form images.
                  You can use Google Gemini (Recommended &amp; Free Tier) or OpenAI.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  AI Service Provider
                </Label>
                <CustomSelect
                  value={aiProvider}
                  onChange={(val) => {
                    setAiProvider(val as "gemini" | "openai");
                    if (val === "gemini") setAiModel("gemini-1.5-flash");
                    if (val === "openai") setAiModel("gpt-4o-mini");
                  }}
                  options={[
                    { value: "gemini", label: "Google Gemini (Recommended - Fast & Free)" },
                    { value: "openai", label: "OpenAI (GPT-4o Vision)" },
                  ]}
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  OCR Model
                </Label>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="gemini-1.5-flash or gpt-4o-mini"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">
                  API Key *
                </Label>
                <div className="relative">
                  <Key className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="Paste your Gemini API Key (starts with AIzaSy...)"
                    className="pl-9 h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Your API Key is stored securely in your database and is only invoked for OCR extractions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
