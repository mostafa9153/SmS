"use client";

import { useState, useEffect } from "react";
import { getSavedAddressPresetsConfig, saveAddressPresetsConfigToDb, fetchAddressPresetsConfigFromDb, DEFAULT_ADDRESS_PRESETS_CONFIG, AddressPresetsConfig } from "@/lib/utils/preset-addresses";
import { getSavedBankPresets, saveBankPresetsToDb, fetchBankPresetsFromDb, DEFAULT_BANK_PRESETS, BankPresetItem } from "@/lib/utils/bank-presets";
import { getSavedSchoolPresets, saveSchoolPresetsToDb, fetchSchoolPresetsFromDb, DEFAULT_SCHOOL_PRESETS } from "@/lib/utils/school-presets";
import { getSavedStudentEntryPresets, saveStudentEntryPresetsToDb, fetchStudentEntryPresetsFromDb, DEFAULT_STUDENT_ENTRY_PRESETS, StudentEntryPresets } from "@/lib/utils/student-entry-presets";
import { showToast } from "@/components/ui/toast-banner";
import { getAdmissionSettings, saveAdmissionSettings } from "@/lib/data/admission";
import { useSearchParams } from "next/navigation";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PresetSection, VALID_PRESET_SECTIONS } from "@/components/settings/presets/constants";

export function usePresetAddresses() {
  const confirm = useConfirm();
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
  const [newGp, setNewGp] = useState("");
  const [newPoName, setNewPoName] = useState("");
  const [newPoPin, setNewPoPin] = useState("");
  const [newBlock, setNewBlock] = useState("");
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
  const handleResetDefaults = async () => {
    if (activeSection === "defaults") {
      if (await confirm("Reset Student Entry Defaults to system initial defaults?")) {
        setStudentPresets(DEFAULT_STUDENT_ENTRY_PRESETS);
        saveStudentEntryPresetsToDb(DEFAULT_STUDENT_ENTRY_PRESETS);
        showToast({ title: "Reset student entry defaults", type: "info" });
      }
    } else if (activeSection === "address") {
      if (await confirm("Reset all address presets (Villages, P.O, P.S, Districts) to defaults?")) {
        setAddressConfig(DEFAULT_ADDRESS_PRESETS_CONFIG);
        saveAddressPresetsConfigToDb(DEFAULT_ADDRESS_PRESETS_CONFIG);
        showToast({ title: "Reset address presets to defaults", type: "info" });
      }
    } else if (activeSection === "bank") {
      if (await confirm("Reset local bank & IFSC presets to defaults?")) {
        setBankPresets(DEFAULT_BANK_PRESETS);
        saveBankPresetsToDb(DEFAULT_BANK_PRESETS);
        showToast({ title: "Reset bank presets to defaults", type: "info" });
      }
    } else if (activeSection === "school") {
      if (await confirm("Reset feeder / previous school presets to defaults?")) {
        setSchoolPresets(DEFAULT_SCHOOL_PRESETS);
        saveSchoolPresetsToDb(DEFAULT_SCHOOL_PRESETS);
        showToast({ title: "Reset school presets to defaults", type: "info" });
      }
    } else if (activeSection === "ai") {
      if (await confirm("Reset AI configuration to defaults (Google Gemini 1.5 Flash)?")) {
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

  const addGramPanchayat = () => {
    const trimmed = newGp.trim();
    if (!trimmed) return;
    if ((addressConfig.gramPanchayats || []).includes(trimmed)) {
      showToast({ title: "Gram Panchayat already exists", type: "info" });
      return;
    }
    setAddressConfig((prev) => ({
      ...prev,
      gramPanchayats: [...(prev.gramPanchayats || []), trimmed],
    }));
    setNewGp("");
  };

  const removeGramPanchayat = (gp: string) => {
    setAddressConfig((prev) => ({
      ...prev,
      gramPanchayats: (prev.gramPanchayats || []).filter((item) => item !== gp),
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

  const addBlock = () => {
    const trimmed = newBlock.trim();
    if (!trimmed) return;
    if ((addressConfig.blocks || []).includes(trimmed)) {
      showToast({ title: "Block already exists", type: "info" });
      return;
    }
    setAddressConfig((prev) => ({
      ...prev,
      blocks: [...(prev.blocks || []), trimmed],
    }));
    setNewBlock("");
  };

  const removeBlock = (blk: string) => {
    setAddressConfig((prev) => ({
      ...prev,
      blocks: (prev.blocks || []).filter((item) => item !== blk),
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


  return {
    activeSection,
    addBankPreset,
    addBlock,
    addDistrict,
    addGramPanchayat,
    addPoliceStation,
    addPostOffice,
    addSchoolPreset,
    addVillage,
    addressConfig,
    aiApiKey,
    aiModel,
    aiProvider,
    bankPresets,
    handleResetDefaults,
    handleSave,
    isLoading,
    isSaving,
    newBankIfsc,
    newBankName,
    newBlock,
    newBranchName,
    newDist,
    newGp,
    newPoName,
    newPoPin,
    newPs,
    newSchoolName,
    newVillage,
    removeBankPreset,
    removeBlock,
    removeDistrict,
    removeGramPanchayat,
    removePoliceStation,
    removePostOffice,
    removeSchoolPreset,
    removeVillage,
    schoolPresets,
    setActiveSection,
    setAiApiKey,
    setAiModel,
    setAiProvider,
    setIsSaving,
    setNewBankIfsc,
    setNewBankName,
    setNewBlock,
    setNewBranchName,
    setNewDist,
    setNewGp,
    setNewPoName,
    setNewPoPin,
    setNewPs,
    setNewSchoolName,
    setNewVillage,
    setStudentPresets,
    studentPresets,
  };
}

export type PresetAddressesState = ReturnType<typeof usePresetAddresses>;
