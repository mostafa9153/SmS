"use client";

import React, { useState, useEffect } from "react";
import { showToast } from "@/components/ui/toast-banner";
import { type ClassMarksScheme, type PromotionPolicy, type MarksSplitVariation, DEFAULT_MARKS_SCHEMES, DEFAULT_PROMOTION_POLICY, DEFAULT_HS_SPLIT_VARIATIONS, getSavedMarksSchemes, saveMarksSchemes, getSavedPromotionPolicy, savePromotionPolicy, getDefaultHsSubjectMarks, isSubjectLab, isDefaultLabSubject } from "@/lib/utils/marks-config";
import { syncMarksSchemeSubjectToRoutine, syncRemoveMarksSchemeSubjectFromRoutine } from "@/lib/routine/routine-sync";
import { useConfirm } from "@/components/ui/confirm-dialog";


export function useMarksScheme() {
  const confirm = useConfirm();
  const [marksSchemes, setMarksSchemes] = useState<ClassMarksScheme[]>(DEFAULT_MARKS_SCHEMES);
  const [editingScheme, setEditingScheme] = useState<ClassMarksScheme | null>(null);
  const [editSchemeSubjectCount, setEditSchemeSubjectCount] = useState<number>(5);
  const [editScheme1stWritten, setEditScheme1stWritten] = useState<number>(20);
  const [editScheme1stPractical, setEditScheme1stPractical] = useState<number>(0);
  const [editScheme2ndWritten, setEditScheme2ndWritten] = useState<number>(30);
  const [editScheme2ndPractical, setEditScheme2ndPractical] = useState<number>(0);
  const [editSchemeAnnualWritten, setEditSchemeAnnualWritten] = useState<number>(50);
  const [editSchemeAnnualPractical, setEditSchemeAnnualPractical] = useState<number>(0);
  const [editSchemeOddWritten, setEditSchemeOddWritten] = useState<number>(40);
  const [editSchemeOddPractical, setEditSchemeOddPractical] = useState<number>(10);
  const [editSchemeEvenWritten, setEditSchemeEvenWritten] = useState<number>(40);
  const [editSchemeEvenPractical, setEditSchemeEvenPractical] = useState<number>(10);
  const [editSchemeOddSemMarks, setEditSchemeOddSemMarks] = useState<number>(50);
  const [editSchemeEvenSemMarks, setEditSchemeEvenSemMarks] = useState<number>(50);
  const [editSchemeNotes, setEditSchemeNotes] = useState<string>("");
  const [editVariations, setEditVariations] = useState<MarksSplitVariation[]>(DEFAULT_HS_SPLIT_VARIATIONS);
  const [editSubjectBreakdown, setEditSubjectBreakdown] = useState<
    Record<string, { written?: number; practical?: number }>
  >({});

  // Class Subject Selection State
  const [selectedSubjectClass, setSelectedSubjectClass] = useState<string>("V");
  const [selectedSubjectStream, setSelectedSubjectStream] = useState<"all" | "Common" | "Science" | "Arts" | "Commerce">("all");
  const [selectedNewSubjectToAdd, setSelectedNewSubjectToAdd] = useState<string>("");
  const [customSubjectName, setCustomSubjectName] = useState<string>("");
  const [newSubjectIsLab, setNewSubjectIsLab] = useState<boolean>(false);

  // Promotion & Pass Criteria State
  const [promotionPolicy, setPromotionPolicy] = useState<PromotionPolicy>(DEFAULT_PROMOTION_POLICY);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  useEffect(() => {
    try {
      const loadedSchemes = getSavedMarksSchemes();
      setMarksSchemes(loadedSchemes);
      const loadedPolicy = getSavedPromotionPolicy();
      setPromotionPolicy(loadedPolicy);
    } catch (e) {
      console.error("Failed to load local marks schemes", e);
    }

    import("@/lib/utils/school-config-client").then(({ fetchSchoolConfigClient }) => {
      fetchSchoolConfigClient()
        .then((data) => {
          if (data) {
            if (data.marks_schemes && Array.isArray(data.marks_schemes) && data.marks_schemes.length > 0) {
              setMarksSchemes(data.marks_schemes);
              localStorage.setItem("sms_marks_distribution_schemes", JSON.stringify(data.marks_schemes));
            }
            if (data.promotion_policy) {
              setPromotionPolicy(data.promotion_policy);
              localStorage.setItem("sms_promotion_pass_policy", JSON.stringify(data.promotion_policy));
            }
          }
        })
        .catch((err) => console.warn("Failed to sync marks scheme from DB:", err));
    });

    const handleMarksUpdate = () => {
      const fresh = getSavedMarksSchemes();
      setMarksSchemes(fresh);
    };
    window.addEventListener("sms_marks_schemes_updated", handleMarksUpdate);
    return () => {
      window.removeEventListener("sms_marks_schemes_updated", handleMarksUpdate);
    };
  }, []);

  const handleSavePromotionPolicy = () => {
    setIsSavingPolicy(true);
    try {
      savePromotionPolicy(promotionPolicy);
      showToast({
        type: "success",
        title: "Promotion Policy Saved",
        description: `Pass threshold set to ${promotionPolicy.subjectPassPercentage}% per subject.`,
      });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleOpenEditScheme = (scheme: ClassMarksScheme) => {
    setEditingScheme(scheme);
    setEditSchemeSubjectCount(scheme.subjectCount || 5);
    setEditScheme1stWritten(scheme.firstSummativeWritten || 0);
    setEditScheme1stPractical(scheme.firstSummativePractical || 0);
    setEditScheme2ndWritten(scheme.secondSummativeWritten || 0);
    setEditScheme2ndPractical(scheme.secondSummativePractical || 0);
    setEditSchemeAnnualWritten(scheme.annualWritten || 0);
    setEditSchemeAnnualPractical(scheme.annualPractical || 0);

    const isHs = scheme.classCode === "XI" || scheme.classCode === "XII" || scheme.isSemesterSystem;

    const oddW = scheme.oddSemesterWritten !== undefined
      ? scheme.oddSemesterWritten
      : (scheme.firstSummativeWritten !== undefined ? scheme.firstSummativeWritten : 40);
    const oddP = scheme.oddSemesterPractical !== undefined
      ? scheme.oddSemesterPractical
      : (scheme.firstSummativePractical !== undefined ? scheme.firstSummativePractical : 10);
    const evenW = scheme.evenSemesterWritten !== undefined
      ? scheme.evenSemesterWritten
      : (scheme.secondSummativeWritten !== undefined ? scheme.secondSummativeWritten : 40);
    const evenP = scheme.evenSemesterPractical !== undefined
      ? scheme.evenSemesterPractical
      : (scheme.secondSummativePractical !== undefined ? scheme.secondSummativePractical : 10);

    setEditSchemeOddWritten(oddW);
    setEditSchemeOddPractical(oddP);
    setEditSchemeEvenWritten(evenW);
    setEditSchemeEvenPractical(evenP);
    setEditSchemeOddSemMarks(oddW + oddP);
    setEditSchemeEvenSemMarks(evenW + evenP);
    setEditSchemeNotes(scheme.notes || "");

    const initialBreakdown: Record<string, { written?: number; practical?: number }> = {};
    const existingBreakdown = scheme.subjectMarksBreakdown || {};

    (scheme.subjects || []).forEach((sub) => {
      if (existingBreakdown[sub]) {
        initialBreakdown[sub] = { ...existingBreakdown[sub] };
      } else if (isHs) {
        const smart = getDefaultHsSubjectMarks(sub);
        initialBreakdown[sub] = { written: smart.written, practical: smart.practical };
      } else {
        initialBreakdown[sub] = {
          written: scheme.firstSummativeWritten || 0,
          practical: scheme.firstSummativePractical || 0,
        };
      }
    });
    setEditSubjectBreakdown(initialBreakdown);
  };

  const handleSaveEditScheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheme) return;

    const isHs = editingScheme.classCode === "XI" || editingScheme.classCode === "XII" || editingScheme.isSemesterSystem;

    const updated: ClassMarksScheme[] = marksSchemes.map((s) => {
      if (s.classCode === editingScheme.classCode) {
        return {
          ...s,
          subjectCount: editSchemeSubjectCount,
          firstSummativeWritten: isHs ? editSchemeOddWritten : editScheme1stWritten,
          firstSummativePractical: isHs ? editSchemeOddPractical : editScheme1stPractical,
          secondSummativeWritten: isHs ? editSchemeEvenWritten : editScheme2ndWritten,
          secondSummativePractical: isHs ? editSchemeEvenPractical : editScheme2ndPractical,
          annualWritten: isHs ? editSchemeEvenWritten : editSchemeAnnualWritten,
          annualPractical: isHs ? editSchemeEvenPractical : editSchemeAnnualPractical,
          oddSemesterWritten: editSchemeOddWritten,
          oddSemesterPractical: editSchemeOddPractical,
          oddSemesterMarks: editSchemeOddWritten + editSchemeOddPractical,
          evenSemesterWritten: editSchemeEvenWritten,
          evenSemesterPractical: editSchemeEvenPractical,
          evenSemesterMarks: editSchemeEvenWritten + editSchemeEvenPractical,
          subjectMarksBreakdown: Object.keys(editSubjectBreakdown).length > 0 ? editSubjectBreakdown : undefined,
          notes: editSchemeNotes.trim() || undefined,
        };
      }
      return s;
    });

    setMarksSchemes(updated);
    saveMarksSchemes(updated);
    setEditingScheme(null);

    showToast({
      type: "success",
      title: "Scheme Updated",
      description: `Evaluation scheme for ${editingScheme.className} updated successfully.`,
    });
  };

  const handleResetDefaultSchemes = async () => {
    if (await confirm("Reset all class marks evaluation schemes to standard WBBSE & WBCHSE defaults?")) {
      setMarksSchemes(DEFAULT_MARKS_SCHEMES);
      saveMarksSchemes(DEFAULT_MARKS_SCHEMES);
      showToast({
        type: "info",
        title: "Defaults Restored",
        description: "Standard WBBSE & WBCHSE marks distribution restored.",
      });
    }
  };

  const handleToggleSubjectLab = (classCode: string, subjectName: string) => {
    const target = marksSchemes.find((s) => s.classCode === classCode);
    if (!target) return;

    const cleanSub = subjectName.trim();
    const currentIsLab = isSubjectLab(target, cleanSub);
    const newIsLab = !currentIsLab;

    let currentLabList = Array.isArray(target.labSubjects) ? [...target.labSubjects] : [];
    if (!target.labSubjects) {
      currentLabList = (target.subjects || []).filter((sub) => isDefaultLabSubject(sub));
    }

    let nextLabList: string[];
    if (newIsLab) {
      if (!currentLabList.some((s) => s.toLowerCase().trim() === cleanSub.toLowerCase().trim())) {
        nextLabList = [...currentLabList, cleanSub];
      } else {
        nextLabList = currentLabList;
      }
    } else {
      nextLabList = currentLabList.filter((s) => s.toLowerCase().trim() !== cleanSub.toLowerCase().trim());
    }

    const updated = marksSchemes.map((s) => {
      if (s.classCode === classCode) {
        return {
          ...s,
          labSubjects: nextLabList,
        };
      }
      return s;
    });

    setMarksSchemes(updated);
    saveMarksSchemes(updated);
    syncMarksSchemeSubjectToRoutine(classCode, cleanSub, newIsLab);

    showToast({
      type: "success",
      title: newIsLab ? "Lab Class Configured" : "Lab Disabled",
      description: `"${cleanSub}" ${newIsLab ? "has a 2-period Practical Lab in Routine." : "is set to Theory only."}`,
    });
  };

  const handleAddSubjectToClass = (classCode: string, subjectName: string, isLabParam?: boolean) => {
    const cleanSub = subjectName.trim();
    if (!cleanSub) return;

    const target = marksSchemes.find((s) => s.classCode === classCode);
    if (!target) return;

    const existing = target.subjects || [];
    if (existing.some((x) => x.toLowerCase().trim() === cleanSub.toLowerCase().trim())) {
      showToast({
        type: "info",
        title: "Subject Already Added",
        description: `"${cleanSub}" is already present in ${target.className} curriculum.`,
      });
      return;
    }

    const effectiveIsLab = isLabParam !== undefined ? isLabParam : newSubjectIsLab;
    const newSubs = [...existing, cleanSub];

    let currentLabList = Array.isArray(target.labSubjects) ? [...target.labSubjects] : [];
    if (!target.labSubjects) {
      currentLabList = existing.filter((sub) => isDefaultLabSubject(sub));
    }

    const nextLabList = effectiveIsLab && !currentLabList.some((s) => s.toLowerCase().trim() === cleanSub.toLowerCase().trim())
      ? [...currentLabList, cleanSub]
      : currentLabList.filter((s) => s.toLowerCase().trim() !== cleanSub.toLowerCase().trim());

    const updated = marksSchemes.map((s) => {
      if (s.classCode === classCode) {
        return {
          ...s,
          subjects: newSubs,
          subjectCount: newSubs.length,
          labSubjects: nextLabList,
        };
      }
      return s;
    });

    setMarksSchemes(updated);
    saveMarksSchemes(updated);
    syncMarksSchemeSubjectToRoutine(classCode, cleanSub, effectiveIsLab);

    showToast({
      type: "success",
      title: "Subject Added",
      description: `Added "${cleanSub}" (${effectiveIsLab ? "Theory + Lab" : "Theory"}) to ${target.className}.`,
    });

    setSelectedNewSubjectToAdd("");
    setCustomSubjectName("");
    setNewSubjectIsLab(false);
  };

  const handleRemoveSubjectFromClass = (classCode: string, subjectToRemove: string) => {
    const target = marksSchemes.find((s) => s.classCode === classCode);
    if (!target) return;
    const existing = target.subjects || [];
    if (existing.length <= 1) {
      showToast({
        type: "error",
        title: "Cannot Remove",
        description: "A class must have at least one subject in its marks scheme.",
      });
      return;
    }

    const updated = marksSchemes.map((s) => {
      if (s.classCode === classCode) {
        const newSubs = (s.subjects || []).filter((sub) => sub !== subjectToRemove);
        return {
          ...s,
          subjects: newSubs,
          subjectCount: newSubs.length,
        };
      }
      return s;
    });

    setMarksSchemes(updated);
    saveMarksSchemes(updated);
    syncRemoveMarksSchemeSubjectFromRoutine(classCode, subjectToRemove);

    showToast({
      type: "success",
      title: "Subject Removed",
      description: `Removed "${subjectToRemove}" from ${target.className}.`,
    });
  };

  return {
    customSubjectName,
    editScheme1stPractical,
    editScheme1stWritten,
    editScheme2ndPractical,
    editScheme2ndWritten,
    editSchemeAnnualPractical,
    editSchemeAnnualWritten,
    editSchemeSubjectCount,
    editSubjectBreakdown,
    editVariations,
    editingScheme,
    handleAddSubjectToClass,
    handleOpenEditScheme,
    handleRemoveSubjectFromClass,
    handleResetDefaultSchemes,
    handleSaveEditScheme,
    handleSavePromotionPolicy,
    handleToggleSubjectLab,
    isSavingPolicy,
    marksSchemes,
    newSubjectIsLab,
    promotionPolicy,
    selectedNewSubjectToAdd,
    selectedSubjectClass,
    selectedSubjectStream,
    setCustomSubjectName,
    setEditScheme1stPractical,
    setEditScheme1stWritten,
    setEditScheme2ndPractical,
    setEditScheme2ndWritten,
    setEditSchemeAnnualPractical,
    setEditSchemeAnnualWritten,
    setEditSubjectBreakdown,
    setEditVariations,
    setEditingScheme,
    setNewSubjectIsLab,
    setPromotionPolicy,
    setSelectedNewSubjectToAdd,
    setSelectedSubjectClass,
    setSelectedSubjectStream,
  };
}

export type MarksSchemeState = ReturnType<typeof useMarksScheme>;
