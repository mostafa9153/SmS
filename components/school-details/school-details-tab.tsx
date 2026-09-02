"use client";

import { useState, useEffect } from "react";
import { 
  Building, 
  GraduationCap, 
  Save, 
  Plus, 
  Sparkles, 
  Layers, 
  Users, 
  MapPin, 
  Phone, 
  Award, 
  ShieldCheck,
  Edit2,
  Trash2,
  School,
  Lock,
  X,
  Calculator,
  RotateCcw,
  CheckCircle2,
  Info,
  Sliders,
  BookOpen,
  Check,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast-banner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import {
  type ClassMarksScheme,
  type PromotionPolicy,
  DEFAULT_MARKS_SCHEMES,
  DEFAULT_PROMOTION_POLICY,
  MASTER_SUBJECT_BANK,
  getSavedMarksSchemes,
  saveMarksSchemes,
  getSavedPromotionPolicy,
  savePromotionPolicy,
  computeSchemeTotals,
} from "@/lib/utils/marks-config";

// Interface for School Profile
interface SchoolProfileData {
  schoolName: string;
  schoolCode: string;
  udiseCode: string;
  boardAffiliation: string;
  establishedYear: string;
  schoolCategory: string;
  schoolType: string;
  mediumOfInstruction: string;
  headmasterName: string;
  schoolEmail: string;
  schoolPhone: string;
  altPhone: string;
  schoolWebsite: string;
  schoolAddress: string;
  village: string;
  policeStation: string;
  district: string;
  state: string;
  pincode: string;
  schoolMotto: string;
}

// Interface for Class Item
interface ClassItem {
  id: string;
  name: string;
  code: string;
  sections: string[];
  stream?: string;
  classTeacher?: string;
  roomNo?: string;
  capacity?: number;
  isAutoPass: boolean;
  status: "Active" | "Inactive";
}

/**
 * Helper to identify Higher Secondary classes (Classes XI and XII / 11 and 12).
 * Stream is ONLY applicable to Classes XI and XII.
 */
export function isHigherSecondaryClass(code?: string, name?: string): boolean {
  const normCode = (code || "").trim().toUpperCase();
  const normName = (name || "").trim().toUpperCase();
  return (
    normCode === "XI" ||
    normCode === "XII" ||
    normCode === "11" ||
    normCode === "12" ||
    normName.includes("XI") ||
    normName.includes("XII") ||
    normName.includes("11") ||
    normName.includes("12")
  );
}

/**
 * Returns the next available section letter (A -> B -> C -> D ...)
 */
export function getNextAvailableLetter(existing: string[]): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const set = new Set(existing.map((x) => x.trim().toUpperCase()));
  for (let char of alphabet) {
    if (!set.has(char)) return char;
  }
  return "+";
}

const DEFAULT_SCHOOL_PROFILE: SchoolProfileData = {
  schoolName: "Marigachi High School (H.S.)",
  schoolCode: "MHS-1965",
  udiseCode: "19111305602",
  boardAffiliation: "WBBSE / WBCHSE",
  establishedYear: "1965",
  schoolCategory: "Higher Secondary (Class V to XII)",
  schoolType: "Co-educational (Day School)",
  mediumOfInstruction: "Bengali (First Language)",
  headmasterName: "Dr. A. K. Mondal",
  schoolEmail: "contact@marigachihighschool.in",
  schoolPhone: "+91 98765 43210",
  altPhone: "03218-245678",
  schoolWebsite: "https://marigachihighschool.in",
  schoolAddress: "Marigachi, Mathurapur II, South 24 Parganas, West Bengal - 743349",
  village: "Marigachi",
  policeStation: "Mathurapur",
  district: "South 24 Parganas",
  state: "West Bengal",
  pincode: "743349",
  schoolMotto: "Knowledge, Character, Excellence (আলো থেকে আলো)",
};

const DEFAULT_CLASSES: ClassItem[] = [
  { id: "c-5", name: "Class V", code: "V", sections: ["A", "B"], classTeacher: "S. Roy", roomNo: "Room 101", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-6", name: "Class VI", code: "VI", sections: ["A", "B"], classTeacher: "P. Mondal", roomNo: "Room 102", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-7", name: "Class VII", code: "VII", sections: ["A", "B"], classTeacher: "R. Mukherjee", roomNo: "Room 103", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-8", name: "Class VIII", code: "VIII", sections: ["A", "B"], classTeacher: "K. Das", roomNo: "Room 104", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-9", name: "Class IX", code: "IX", sections: ["A", "B"], classTeacher: "T. Banerjee", roomNo: "Room 201", capacity: 130, isAutoPass: false, status: "Active" },
  { id: "c-10", name: "Class X", code: "X", sections: ["A", "B"], classTeacher: "A. Halder", roomNo: "Room 202", capacity: 130, isAutoPass: false, status: "Active" },
  { id: "c-11", name: "Class XI", code: "XI", sections: ["A", "B"], stream: "Arts / Science / Commerce", classTeacher: "B. Naskar", roomNo: "Room 301", capacity: 140, isAutoPass: false, status: "Active" },
  { id: "c-12", name: "Class XII", code: "XII", sections: ["A", "B"], stream: "Arts / Science / Commerce", classTeacher: "S. Bhattacharya", roomNo: "Room 302", capacity: 140, isAutoPass: false, status: "Active" },
];

export function SchoolDetailsTab() {
  // Navigation between the requested options: School Profile, Class Management & Marks Scheme
  const [subOption, setSubOption] = useState<"profile" | "classes" | "marks_scheme">("profile");

  // Profile Form State
  const [profile, setProfile] = useState<SchoolProfileData>(DEFAULT_SCHOOL_PROFILE);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Class Management State
  const [classes, setClasses] = useState<ClassItem[]>(DEFAULT_CLASSES);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);

  // Marks Scheme State (Classes V to XII)
  const [marksSchemes, setMarksSchemes] = useState<ClassMarksScheme[]>(DEFAULT_MARKS_SCHEMES);
  const [editingScheme, setEditingScheme] = useState<ClassMarksScheme | null>(null);
  const [editSchemeSubjectCount, setEditSchemeSubjectCount] = useState<number>(5);
  const [editScheme1stWritten, setEditScheme1stWritten] = useState<number>(20);
  const [editScheme1stPractical, setEditScheme1stPractical] = useState<number>(0);
  const [editScheme2ndWritten, setEditScheme2ndWritten] = useState<number>(30);
  const [editScheme2ndPractical, setEditScheme2ndPractical] = useState<number>(0);
  const [editSchemeAnnualWritten, setEditSchemeAnnualWritten] = useState<number>(50);
  const [editSchemeAnnualPractical, setEditSchemeAnnualPractical] = useState<number>(0);
  const [editSchemeNotes, setEditSchemeNotes] = useState<string>("");

  // Class Subject Selection State
  const [selectedSubjectClass, setSelectedSubjectClass] = useState<string>("V");
  const [selectedNewSubjectToAdd, setSelectedNewSubjectToAdd] = useState<string>("");
  const [customSubjectName, setCustomSubjectName] = useState<string>("");

  // Add Class Form State
  const [newClassName, setNewClassName] = useState("");
  const [newClassCode, setNewClassCode] = useState("");
  const [newSections, setNewSections] = useState<string[]>(["A", "B"]);
  const [newStream, setNewStream] = useState("Arts / Science / Commerce");
  const [newTeacher, setNewTeacher] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newCapacity, setNewCapacity] = useState("120");
  const [newAutoPass, setNewAutoPass] = useState("false");

  // Edit Class Form State (with locked Name & Code, and clickable Sections)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassCode, setEditClassCode] = useState("");
  const [editSections, setEditSections] = useState<string[]>(["A", "B"]);
  const [editStream, setEditStream] = useState("Arts / Science / Commerce");
  const [editTeacher, setEditTeacher] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editCapacity, setEditCapacity] = useState("120");
  const [editAutoPass, setEditAutoPass] = useState("false");

  // Promotion & Pass Criteria State
  const [promotionPolicy, setPromotionPolicy] = useState<PromotionPolicy>(DEFAULT_PROMOTION_POLICY);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Load saved state from localStorage if present
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("sms_school_profile");
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
      const savedClasses = localStorage.getItem("sms_class_management");
      if (savedClasses) {
        const parsed = JSON.parse(savedClasses) as ClassItem[];
        // Ensure stream is only kept for Class XI and XII
        const sanitized = parsed.map((c) => ({
          ...c,
          stream: isHigherSecondaryClass(c.code, c.name) ? (c.stream || "Arts / Science / Commerce") : undefined,
        }));
        setClasses(sanitized);
      }
      const loadedSchemes = getSavedMarksSchemes();
      setMarksSchemes(loadedSchemes);
      const loadedPolicy = getSavedPromotionPolicy();
      setPromotionPolicy(loadedPolicy);
    } catch (e) {
      console.error("Failed to load local school details", e);
    }
  }, []);

  const handleSavePromotionPolicy = () => {
    setIsSavingPolicy(true);
    savePromotionPolicy(promotionPolicy);
    setTimeout(() => {
      setIsSavingPolicy(false);
      showToast({
        type: "success",
        title: "Policy Saved",
        description: "Promotion & Pass Criteria Policy updated successfully.",
      });
    }, 400);
  };

  // Open Edit Scheme Modal
  const handleOpenEditScheme = (scheme: ClassMarksScheme) => {
    setEditingScheme(scheme);
    setEditSchemeSubjectCount(scheme.subjectCount);
    setEditScheme1stWritten(scheme.firstSummativeWritten);
    setEditScheme1stPractical(scheme.firstSummativePractical || 0);
    setEditScheme2ndWritten(scheme.secondSummativeWritten);
    setEditScheme2ndPractical(scheme.secondSummativePractical || 0);
    setEditSchemeAnnualWritten(scheme.annualWritten);
    setEditSchemeAnnualPractical(scheme.annualPractical || 0);
    setEditSchemeNotes(scheme.notes || "");
  };

  // Save Edited Scheme
  const handleSaveEditScheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheme) return;

    const updatedScheme: ClassMarksScheme = {
      ...editingScheme,
      subjectCount: Number(editSchemeSubjectCount) || 1,
      firstSummativeWritten: Number(editScheme1stWritten) || 0,
      firstSummativePractical: Number(editScheme1stPractical) || 0,
      secondSummativeWritten: Number(editScheme2ndWritten) || 0,
      secondSummativePractical: Number(editScheme2ndPractical) || 0,
      annualWritten: Number(editSchemeAnnualWritten) || 0,
      annualPractical: Number(editSchemeAnnualPractical) || 0,
      notes: editSchemeNotes.trim() || undefined,
    };

    const updatedList = marksSchemes.map((s) => (s.classCode === editingScheme.classCode ? updatedScheme : s));
    setMarksSchemes(updatedList);
    saveMarksSchemes(updatedList);

    showToast({
      type: "success",
      title: "Marks Structure Updated",
      description: `Evaluation marks structure for ${editingScheme.className} updated. All result pages will now use this scheme!`,
    });

    setEditingScheme(null);
  };

  // Reset to West Bengal Defaults
  const handleResetDefaultSchemes = () => {
    if (window.confirm("Reset all class marks schemes to standard West Bengal Board (WBBSE/WBCHSE) defaults?")) {
      setMarksSchemes(DEFAULT_MARKS_SCHEMES);
      saveMarksSchemes(DEFAULT_MARKS_SCHEMES);
      showToast({
        type: "success",
        title: "Reset to WB Defaults",
        description: "Standard marks distribution for Classes V to XII restored successfully.",
      });
    }
  };

  // Add Subject to Class
  const handleAddSubjectToClass = (classCode: string, subjectName: string) => {
    const cleanName = subjectName.trim();
    if (!cleanName) return;

    const target = marksSchemes.find((s) => s.classCode === classCode);
    if (!target) return;

    const existing = target.subjects || [];
    if (existing.includes(cleanName)) {
      showToast({
        type: "info",
        title: "Subject Already Added",
        description: `${cleanName} is already assigned to Class ${classCode}.`,
      });
      return;
    }

    const updatedSubjects = [...existing, cleanName];
    const updatedList = marksSchemes.map((s) => {
      if (s.classCode === classCode) {
        return {
          ...s,
          subjects: updatedSubjects,
          subjectCount: updatedSubjects.length,
        };
      }
      return s;
    });

    setMarksSchemes(updatedList);
    saveMarksSchemes(updatedList);
    setSelectedNewSubjectToAdd("");
    setCustomSubjectName("");

    showToast({
      type: "success",
      title: "Subject Added",
      description: `Added "${cleanName}" to Class ${classCode} (${updatedSubjects.length} subjects total).`,
    });
  };

  // Remove Subject from Class
  const handleRemoveSubjectFromClass = (classCode: string, subjectToRemove: string) => {
    const target = marksSchemes.find((s) => s.classCode === classCode);
    if (!target) return;

    const existing = target.subjects || [];
    if (existing.length <= 1) {
      showToast({
        type: "error",
        title: "Cannot Remove",
        description: "A class must have at least one subject.",
      });
      return;
    }

    const updatedSubjects = existing.filter((sub) => sub !== subjectToRemove);
    const updatedList = marksSchemes.map((s) => {
      if (s.classCode === classCode) {
        return {
          ...s,
          subjects: updatedSubjects,
          subjectCount: updatedSubjects.length,
        };
      }
      return s;
    });

    setMarksSchemes(updatedList);
    saveMarksSchemes(updatedList);

    showToast({
      type: "success",
      title: "Subject Removed",
      description: `Removed "${subjectToRemove}" from Class ${classCode}.`,
    });
  };

  // Save Profile Handler
  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    try {
      localStorage.setItem("sms_school_profile", JSON.stringify(profile));
      setTimeout(() => {
        setIsSavingProfile(false);
        showToast({
          type: "success",
          title: "School Profile Saved",
          description: "Institutional metadata and contact credentials updated successfully.",
        });
      }, 500);
    } catch (e) {
      setIsSavingProfile(false);
      showToast({
        type: "error",
        title: "Save Failed",
        description: "Could not save profile details.",
      });
    }
  };

  // Add Class Handler
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassCode.trim()) {
      showToast({
        type: "error",
        title: "Missing Information",
        description: "Class name and class code are required.",
      });
      return;
    }

    const isHs = isHigherSecondaryClass(newClassCode, newClassName);

    const newClassItem: ClassItem = {
      id: `c-${Date.now()}`,
      name: newClassName.trim(),
      code: newClassCode.trim().toUpperCase(),
      sections: newSections.length > 0 ? newSections : ["A"],
      stream: isHs ? newStream : undefined,
      classTeacher: newTeacher.trim() || undefined,
      roomNo: newRoom.trim() || undefined,
      capacity: parseInt(newCapacity, 10) || 100,
      isAutoPass: newAutoPass === "true",
      status: "Active",
    };

    const updated = [...classes, newClassItem];
    setClasses(updated);
    localStorage.setItem("sms_class_management", JSON.stringify(updated));

    showToast({
      type: "success",
      title: "Class Added",
      description: `${newClassName} has been added to class management.`,
    });

    // Reset Form
    setNewClassName("");
    setNewClassCode("");
    setNewSections(["A", "B"]);
    setNewStream("Arts / Science / Commerce");
    setNewTeacher("");
    setNewRoom("");
    setNewCapacity("120");
    setNewAutoPass("false");
    setIsAddClassOpen(false);
  };

  // Open Edit Class Modal (Locks Name & Code, sets interactive sections)
  const handleOpenEditClass = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassCode(cls.code);
    setEditSections(cls.sections && cls.sections.length > 0 ? [...cls.sections] : ["A"]);
    setEditStream(cls.stream || "Arts / Science / Commerce");
    setEditTeacher(cls.classTeacher || "");
    setEditRoom(cls.roomNo || "");
    setEditCapacity(String(cls.capacity || 120));
    setEditAutoPass(cls.isAutoPass ? "true" : "false");
  };

  // Section click-add & click-remove helpers for Edit modal
  const handleAddEditSection = (sectionLetter: string) => {
    const letter = sectionLetter.trim().toUpperCase();
    if (!letter || editSections.includes(letter)) return;
    const updated = [...editSections, letter].sort();
    setEditSections(updated);
  };

  const handleRemoveEditSection = (sectionToRemove: string) => {
    if (editSections.length <= 1) {
      showToast({
        type: "info",
        title: "Section Required",
        description: "A class must have at least one section.",
      });
      return;
    }
    setEditSections((prev) => prev.filter((s) => s !== sectionToRemove));
  };

  // Section click-add & click-remove helpers for Add modal
  const handleAddNewModalSection = (sectionLetter: string) => {
    const letter = sectionLetter.trim().toUpperCase();
    if (!letter || newSections.includes(letter)) return;
    const updated = [...newSections, letter].sort();
    setNewSections(updated);
  };

  const handleRemoveNewModalSection = (sectionToRemove: string) => {
    if (newSections.length <= 1) {
      showToast({
        type: "info",
        title: "Section Required",
        description: "A class must have at least one section.",
      });
      return;
    }
    setNewSections((prev) => prev.filter((s) => s !== sectionToRemove));
  };

  // Save Edited Class Handler
  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    const isHs = isHigherSecondaryClass(editClassCode, editClassName);

    const updated = classes.map((c) => {
      if (c.id === editingClass.id) {
        return {
          ...c,
          // Preserving name and code as locked
          sections: editSections.length > 0 ? editSections : ["A"],
          stream: isHs ? editStream : undefined,
          classTeacher: editTeacher.trim() || undefined,
          roomNo: editRoom.trim() || undefined,
          capacity: parseInt(editCapacity, 10) || 100,
          isAutoPass: editAutoPass === "true",
        };
      }
      return c;
    });

    setClasses(updated);
    localStorage.setItem("sms_class_management", JSON.stringify(updated));

    showToast({
      type: "success",
      title: "Class Updated",
      description: `${editClassName} details and sections updated successfully.`,
    });

    setEditingClass(null);
  };

  // Delete Class Handler
  const handleDeleteClass = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from class management?`)) {
      const updated = classes.filter((c) => c.id !== id);
      setClasses(updated);
      localStorage.setItem("sms_class_management", JSON.stringify(updated));
      showToast({
        type: "success",
        title: "Class Removed",
        description: `${name} has been removed.`,
      });
    }
  };

  // Quick Append Section to Class directly from row
  const handleQuickAddSection = (classId: string) => {
    const target = classes.find((c) => c.id === classId);
    if (!target) return;

    const nextSec = getNextAvailableLetter(target.sections);
    const updated = classes.map((c) => {
      if (c.id === classId) {
        return { ...c, sections: [...c.sections, nextSec].sort() };
      }
      return c;
    });

    setClasses(updated);
    localStorage.setItem("sms_class_management", JSON.stringify(updated));
    showToast({
      type: "success",
      title: "Section Added",
      description: `Added Section ${nextSec} to ${target.name}.`,
    });
  };

  // Quick Remove Section from Class directly from row
  const handleQuickRemoveSection = (classId: string, sectionToRemove: string) => {
    const target = classes.find((c) => c.id === classId);
    if (!target) return;

    if (target.sections.length <= 1) {
      showToast({
        type: "info",
        title: "Cannot Remove",
        description: "A class must have at least one active section.",
      });
      return;
    }

    const updated = classes.map((c) => {
      if (c.id === classId) {
        return { ...c, sections: c.sections.filter((s) => s !== sectionToRemove) };
      }
      return c;
    });

    setClasses(updated);
    localStorage.setItem("sms_class_management", JSON.stringify(updated));
    showToast({
      type: "success",
      title: "Section Removed",
      description: `Removed Section ${sectionToRemove} from ${target.name}.`,
    });
  };

  const isAddingHs = isHigherSecondaryClass(newClassCode, newClassName);
  const isEditingHs = isHigherSecondaryClass(editClassCode, editClassName);

  const editNextLetter = getNextAvailableLetter(editSections);
  const newNextLetter = getNextAvailableLetter(newSections);

  return (
    <div className="space-y-6">
      {/* Sub-option Switcher / Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-2xl p-2.5 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl">
          <button
            type="button"
            onClick={() => setSubOption("profile")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
              subOption === "profile"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Building className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>School Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setSubOption("classes")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
              subOption === "classes"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Class Management</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/20 bg-background/60">
              {classes.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setSubOption("marks_scheme")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
              subOption === "marks_scheme"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Award className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span>Exam Marks Scheme</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/20 bg-background/60 text-violet-700 dark:text-violet-300">
              V - XII
            </Badge>
          </button>
        </div>

        {/* Top Action Buttons for different tabs */}
        <div className="flex items-center gap-2 px-2">
          {subOption === "profile" && (
            <Button
              size="sm"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="bg-primary text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Save className="h-4 w-4" />
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </Button>
          )}



        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPTION 1: SCHOOL PROFILE (স্কুল প্রোফাইল)                                */}
      {/* ========================================================================= */}
      {subOption === "profile" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Header Banner */}
          <div className="rounded-2xl border bg-gradient-to-r from-amber-500/10 via-background to-background p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-xs shrink-0">
                  <School className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {profile.schoolName}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                    <span>UDISE+: <strong className="font-mono text-foreground">{profile.udiseCode}</strong></span>
                    <span>•</span>
                    <span>Affiliation: <strong className="text-foreground">{profile.boardAffiliation}</strong></span>
                    <span>•</span>
                    <span>Est: <strong className="font-mono text-foreground">{profile.establishedYear}</strong></span>
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-xs py-1 px-2.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Institution
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Detailed Form */}
            <div className="lg:col-span-2 space-y-5">
              {/* 1. Basic Metadata */}
              <Card className="border bg-card shadow-2xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    Institutional Identity & Accreditation
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Basic identification, government codes, and educational board details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="schoolName" className="text-xs">Official School Name *</Label>
                    <Input
                      id="schoolName"
                      value={profile.schoolName}
                      onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                      className="text-xs font-medium"
                      placeholder="e.g. Marigachi High School (H.S.)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="udiseCode" className="text-xs">UDISE+ Code *</Label>
                    <Input
                      id="udiseCode"
                      value={profile.udiseCode}
                      onChange={(e) => setProfile({ ...profile, udiseCode: e.target.value })}
                      className="text-xs font-mono"
                      placeholder="11-digit UDISE Code"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="schoolCode" className="text-xs">School Index / Registration Code</Label>
                    <Input
                      id="schoolCode"
                      value={profile.schoolCode}
                      onChange={(e) => setProfile({ ...profile, schoolCode: e.target.value })}
                      className="text-xs font-mono"
                      placeholder="e.g. MHS-1965"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="boardAffiliation" className="text-xs">Board / Council Affiliation</Label>
                    <Input
                      id="boardAffiliation"
                      value={profile.boardAffiliation}
                      onChange={(e) => setProfile({ ...profile, boardAffiliation: e.target.value })}
                      className="text-xs"
                      placeholder="e.g. WBBSE / WBCHSE"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="establishedYear" className="text-xs">Year of Establishment</Label>
                    <Input
                      id="establishedYear"
                      value={profile.establishedYear}
                      onChange={(e) => setProfile({ ...profile, establishedYear: e.target.value })}
                      className="text-xs font-mono"
                      placeholder="e.g. 1965"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="schoolCategory" className="text-xs">School Level / Category</Label>
                    <Input
                      id="schoolCategory"
                      value={profile.schoolCategory}
                      onChange={(e) => setProfile({ ...profile, schoolCategory: e.target.value })}
                      className="text-xs"
                      placeholder="Higher Secondary (V - XII)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mediumOfInstruction" className="text-xs">Medium of Instruction</Label>
                    <Input
                      id="mediumOfInstruction"
                      value={profile.mediumOfInstruction}
                      onChange={(e) => setProfile({ ...profile, mediumOfInstruction: e.target.value })}
                      className="text-xs"
                      placeholder="Bengali / English"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Administration & Contact */}
              <Card className="border bg-card shadow-2xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Administration & Contact Information
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Institutional contact details for communication, notices, and certificates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="headmasterName" className="text-xs">Headmaster / Principal / TIC Name</Label>
                    <Input
                      id="headmasterName"
                      value={profile.headmasterName}
                      onChange={(e) => setProfile({ ...profile, headmasterName: e.target.value })}
                      className="text-xs font-medium"
                      placeholder="e.g. Dr. A. K. Mondal"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="schoolEmail" className="text-xs">Official Contact Email *</Label>
                    <Input
                      id="schoolEmail"
                      type="email"
                      value={profile.schoolEmail}
                      onChange={(e) => setProfile({ ...profile, schoolEmail: e.target.value })}
                      className="text-xs"
                      placeholder="e.g. contact@marigachihighschool.in"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="schoolPhone" className="text-xs">Primary Telephone / Mobile</Label>
                    <Input
                      id="schoolPhone"
                      value={profile.schoolPhone}
                      onChange={(e) => setProfile({ ...profile, schoolPhone: e.target.value })}
                      className="text-xs"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="altPhone" className="text-xs">Alternate Helpline / Landline</Label>
                    <Input
                      id="altPhone"
                      value={profile.altPhone}
                      onChange={(e) => setProfile({ ...profile, altPhone: e.target.value })}
                      className="text-xs"
                      placeholder="03218-245678"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="schoolWebsite" className="text-xs">Institutional Website URL</Label>
                    <Input
                      id="schoolWebsite"
                      value={profile.schoolWebsite}
                      onChange={(e) => setProfile({ ...profile, schoolWebsite: e.target.value })}
                      className="text-xs"
                      placeholder="https://marigachihighschool.in"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Address & Location */}
              <Card className="border bg-card shadow-2xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    Geographical Address & Location
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Campus location details printed on admit cards, transfer certificates, and grade reports.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="schoolAddress" className="text-xs">Full Address Line *</Label>
                    <Input
                      id="schoolAddress"
                      value={profile.schoolAddress}
                      onChange={(e) => setProfile({ ...profile, schoolAddress: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="village" className="text-xs">Village / Area / Ward</Label>
                    <Input
                      id="village"
                      value={profile.village}
                      onChange={(e) => setProfile({ ...profile, village: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="policeStation" className="text-xs">Police Station / Block</Label>
                    <Input
                      id="policeStation"
                      value={profile.policeStation}
                      onChange={(e) => setProfile({ ...profile, policeStation: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="district" className="text-xs">District</Label>
                    <Input
                      id="district"
                      value={profile.district}
                      onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pincode" className="text-xs">Postal PIN Code</Label>
                    <Input
                      id="pincode"
                      value={profile.pincode}
                      onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Brand Assets & Quick Summary */}
            <div className="space-y-5">
              <Card className="border bg-card shadow-2xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    School Crest & Motto
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-center">
                  <div className="mx-auto h-28 w-28 rounded-2xl border-2 border-dashed border-primary/30 p-2 flex items-center justify-center bg-muted/20">
                    <img
                      src="/logo.png"
                      alt="School Crest"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Official School Emblem used on official marksheets, ID cards, and reports.
                  </p>

                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="schoolMotto" className="text-xs">School Motto / Tagline</Label>
                    <Input
                      id="schoolMotto"
                      value={profile.schoolMotto}
                      onChange={(e) => setProfile({ ...profile, schoolMotto: e.target.value })}
                      className="text-xs italic"
                      placeholder="e.g. Knowledge, Character, Excellence"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="w-full bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {isSavingProfile ? "Saving..." : "Save Profile Details"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Info Box */}
              <Card className="border border-blue-500/20 bg-blue-500/5 shadow-2xs">
                <CardContent className="p-4 space-y-2.5 text-xs">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Institution Profile Summary
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    This profile information is dynamically referenced by the report generator, marksheet printing module, and government compliance exports.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION 2: CLASS MANAGEMENT (ক্লাস ম্যানেজমেন্ট)                           */}
      {/* ========================================================================= */}
      {subOption === "classes" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Summary KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border bg-card/90 shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Total Classes</p>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">{classes.length}</h3>
                </div>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="border bg-card/90 shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Active Sections</p>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    {classes.reduce((sum, c) => sum + c.sections.length, 0)}
                  </h3>
                </div>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="border bg-card/90 shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">RTE Auto-Pass Classes</p>
                  <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                    {classes.filter((c) => c.isAutoPass).length}
                  </h3>
                </div>
                <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="border bg-card/90 shadow-2xs p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Total Student Capacity</p>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    {classes.reduce((sum, c) => sum + (c.capacity || 0), 0)}
                  </h3>
                </div>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Classes Grid */}
          <div className="rounded-2xl border bg-card/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Configured Classes & Sections
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage active grades, section allotments, class teachers, and promotion rules.
                </p>
              </div>

              {/* Add New Class Button - Exactly here in the card header */}
              <Button
                size="sm"
                onClick={() => setIsAddClassOpen(true)}
                className="bg-primary text-primary-foreground text-xs font-semibold gap-1.5 self-start sm:self-auto shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Add New Class
              </Button>
            </div>

            <div className="divide-y divide-border/60">
              {classes.map((cls) => {
                const isHs = isHigherSecondaryClass(cls.code, cls.name);
                return (
                  <div
                    key={cls.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    {/* Left: Class Badge & Info */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-[200px]">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
                        {cls.code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{cls.name}</h4>
                          {cls.isAutoPass ? (
                            <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200">
                              RTE Auto-Pass (V-VIII)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200">
                              Exam / Merit Based
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                          {/* Stream is ONLY displayed for Class XI and XII */}
                          {isHs && cls.stream && (
                            <>
                              <span>Stream: <strong className="text-foreground font-medium">{cls.stream}</strong></span>
                              <span>•</span>
                            </>
                          )}
                          {cls.roomNo && (
                            <>
                              <span>{cls.roomNo}</span>
                              <span>•</span>
                            </>
                          )}
                          {cls.capacity && (
                            <span>Cap: {cls.capacity}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Sections List with Click-to-Remove and Click-to-Add */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground mr-1">Sections:</span>
                      {cls.sections.map((sec) => (
                        <Badge
                          key={sec}
                          className="bg-accent text-foreground hover:bg-accent font-bold text-xs pl-2.5 pr-1.5 py-0.5 rounded-lg border border-border flex items-center gap-1.5 group transition-all"
                        >
                          <span>Section {sec}</span>
                          <button
                            type="button"
                            onClick={() => handleQuickRemoveSection(cls.id, sec)}
                            title={`Click to remove Section ${sec}`}
                            className="text-muted-foreground hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-full h-3.5 w-3.5 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleQuickAddSection(cls.id)}
                        title={`Click to add Section ${getNextAvailableLetter(cls.sections)}`}
                        className="h-6 px-2 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Section</span>
                      </button>
                    </div>

                    {/* Right: Teacher & Actions (Edit + Delete) */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                      <div className="text-left md:text-right text-xs">
                        <span className="text-muted-foreground text-[10px] block">Class In-charge</span>
                        <span className="font-semibold text-foreground">{cls.classTeacher || "Not Assigned"}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Edit Class Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditClass(cls)}
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                          title={`Edit ${cls.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        {/* Delete Class Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClass(cls.id, cls.name)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title={`Delete ${cls.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {classes.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No classes configured. Click &quot;Add New Class&quot; to configure.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT CLASS MODAL DIALOG (Name & Code LOCKED, Sections CLICK ADD & REMOVE) */}
      {/* ========================================================================= */}
      <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleSaveEditClass}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                Edit Class Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update class information, sections, teacher, or capacity for {editingClass?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3.5 py-4">
              {/* 1. Class Name and Roman/Code - LOCKED / READ-ONLY */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editClassName" className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Lock className="h-3 w-3 text-amber-500" />
                    <span>Class Name</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal text-muted-foreground border-border/60">
                      Locked
                    </Badge>
                  </Label>
                  <Input
                    id="editClassName"
                    value={editClassName}
                    disabled
                    readOnly
                    className="text-xs bg-muted/60 text-muted-foreground cursor-not-allowed border-dashed select-none"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editClassCode" className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Lock className="h-3 w-3 text-amber-500" />
                    <span>Roman / Code</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal text-muted-foreground border-border/60">
                      Locked
                    </Badge>
                  </Label>
                  <Input
                    id="editClassCode"
                    value={editClassCode}
                    disabled
                    readOnly
                    className="text-xs font-mono bg-muted/60 text-muted-foreground cursor-not-allowed border-dashed select-none"
                  />
                </div>
              </div>

              {/* 2. Interactive Sections - Click ✕ to remove, Click button to add */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Class Sections
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Click ✕ to remove • Click button to add
                  </span>
                </div>

                <div className="p-3 rounded-xl border bg-muted/30 space-y-2.5">
                  {/* Current Active Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {editSections.map((sec) => (
                      <Badge
                        key={sec}
                        className="bg-primary/10 text-primary hover:bg-rose-500/10 hover:text-rose-600 border border-primary/20 hover:border-rose-300 font-bold text-xs pl-2.5 pr-1.5 py-1 rounded-lg flex items-center gap-1.5 transition-all group shadow-2xs"
                      >
                        <span>Section {sec}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditSection(sec)}
                          title={`Click to remove Section ${sec}`}
                          className="h-4 w-4 rounded-full bg-primary/10 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}

                    {/* Quick Add Next Letter Button */}
                    <button
                      type="button"
                      onClick={() => handleAddEditSection(editNextLetter)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title={`Add Section ${editNextLetter}`}
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Section {editNextLetter}</span>
                    </button>
                  </div>

                  {/* Quick-add letters palette */}
                  <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground mr-1">Quick Add:</span>
                    {["A", "B", "C", "D", "E", "F"].map((letter) => {
                      const isAlreadyAdded = editSections.includes(letter);
                      return (
                        <button
                          key={letter}
                          type="button"
                          disabled={isAlreadyAdded}
                          onClick={() => handleAddEditSection(letter)}
                          className={cn(
                            "h-5 min-w-[20px] px-1 rounded text-[10px] font-bold transition-colors cursor-pointer",
                            isAlreadyAdded
                              ? "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-40"
                              : "bg-background hover:bg-primary hover:text-primary-foreground border text-foreground shadow-2xs"
                          )}
                          title={isAlreadyAdded ? `Section ${letter} already added` : `Click to add Section ${letter}`}
                        >
                          +{letter}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stream option ONLY for Class XI and XII */}
              {isEditingHs && (
                <div className="space-y-1 animate-in fade-in-50">
                  <Label htmlFor="editStream" className="text-xs flex items-center justify-between">
                    <span>Academic Stream</span>
                    <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200">
                      XI & XII Only
                    </Badge>
                  </Label>
                  <CustomSelect
                    value={editStream}
                    onChange={(val) => setEditStream(val)}
                    options={[
                      { label: "Arts / Science / Commerce (Combined)", value: "Arts / Science / Commerce" },
                      { label: "Science", value: "Science" },
                      { label: "Arts", value: "Arts" },
                      { label: "Commerce", value: "Commerce" },
                      { label: "Vocational", value: "Vocational" },
                    ]}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editTeacher" className="text-xs">Class In-charge</Label>
                  <Input
                    id="editTeacher"
                    value={editTeacher}
                    onChange={(e) => setEditTeacher(e.target.value)}
                    placeholder="Teacher Name"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editRoom" className="text-xs">Room Number</Label>
                  <Input
                    id="editRoom"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    placeholder="e.g. Room 204"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editCapacity" className="text-xs">Student Capacity</Label>
                  <Input
                    id="editCapacity"
                    type="number"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    placeholder="120"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editAutoPass" className="text-xs">Promotion Policy</Label>
                  <CustomSelect
                    value={editAutoPass}
                    onChange={(val) => setEditAutoPass(val)}
                    options={[
                      { label: "Exam Merit Based", value: "false" },
                      { label: "RTE Act 100% Auto-Pass", value: "true" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingClass(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs bg-primary text-primary-foreground">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ADD NEW CLASS MODAL DIALOG                                               */}
      {/* ========================================================================= */}
      <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleAddClass}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Add New Class
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure a new class, grade level, and its corresponding sections.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3.5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="className" className="text-xs">Class Name *</Label>
                  <Input
                    id="className"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. Class IX"
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="classCode" className="text-xs">Roman / Code *</Label>
                  <Input
                    id="classCode"
                    value={newClassCode}
                    onChange={(e) => setNewClassCode(e.target.value)}
                    placeholder="e.g. IX or XI"
                    className="text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Interactive Sections for Add New Class */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Class Sections
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Click ✕ to remove • Click button to add
                  </span>
                </div>

                <div className="p-3 rounded-xl border bg-muted/30 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {newSections.map((sec) => (
                      <Badge
                        key={sec}
                        className="bg-primary/10 text-primary hover:bg-rose-500/10 hover:text-rose-600 border border-primary/20 hover:border-rose-300 font-bold text-xs pl-2.5 pr-1.5 py-1 rounded-lg flex items-center gap-1.5 transition-all group shadow-2xs"
                      >
                        <span>Section {sec}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewModalSection(sec)}
                          title={`Click to remove Section ${sec}`}
                          className="h-4 w-4 rounded-full bg-primary/10 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleAddNewModalSection(newNextLetter)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title={`Add Section ${newNextLetter}`}
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Section {newNextLetter}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground mr-1">Quick Add:</span>
                    {["A", "B", "C", "D", "E", "F"].map((letter) => {
                      const isAlreadyAdded = newSections.includes(letter);
                      return (
                        <button
                          key={letter}
                          type="button"
                          disabled={isAlreadyAdded}
                          onClick={() => handleAddNewModalSection(letter)}
                          className={cn(
                            "h-5 min-w-[20px] px-1 rounded text-[10px] font-bold transition-colors cursor-pointer",
                            isAlreadyAdded
                              ? "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-40"
                              : "bg-background hover:bg-primary hover:text-primary-foreground border text-foreground shadow-2xs"
                          )}
                          title={isAlreadyAdded ? `Section ${letter} already added` : `Click to add Section ${letter}`}
                        >
                          +{letter}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stream option ONLY for Class XI and XII */}
              {isAddingHs && (
                <div className="space-y-1 animate-in fade-in-50">
                  <Label htmlFor="stream" className="text-xs flex items-center justify-between">
                    <span>Academic Stream</span>
                    <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200">
                      XI & XII Only
                    </Badge>
                  </Label>
                  <CustomSelect
                    value={newStream}
                    onChange={(val) => setNewStream(val)}
                    options={[
                      { label: "Arts / Science / Commerce (Combined)", value: "Arts / Science / Commerce" },
                      { label: "Science", value: "Science" },
                      { label: "Arts", value: "Arts" },
                      { label: "Commerce", value: "Commerce" },
                      { label: "Vocational", value: "Vocational" },
                    ]}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="teacher" className="text-xs">Class Teacher</Label>
                  <Input
                    id="teacher"
                    value={newTeacher}
                    onChange={(e) => setNewTeacher(e.target.value)}
                    placeholder="Teacher Name"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room" className="text-xs">Room Number</Label>
                  <Input
                    id="room"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="e.g. Room 204"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="capacity" className="text-xs">Student Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    placeholder="120"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="autoPass" className="text-xs">Promotion Policy</Label>
                  <CustomSelect
                    value={newAutoPass}
                    onChange={(val) => setNewAutoPass(val)}
                    options={[
                      { label: "Exam Merit Based", value: "false" },
                      { label: "RTE Act 100% Auto-Pass", value: "true" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddClassOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs bg-primary text-primary-foreground">
                Add Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* OPTION 3: EXAM MARKS DISTRIBUTION & EVALUATION SCHEME (নম্বর বিভাজন)      */}
      {/* ========================================================================= */}
      {subOption === "marks_scheme" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200 pb-28">
          {/* Master Evaluation Table Card */}
          <Card className="border bg-card shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <span>Exam Marks Distribution</span>
                      <Badge variant="outline" className="text-[10px] bg-background font-mono font-medium">
                        Class V – XII
                      </Badge>
                    </CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDefaultSchemes}
                    className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Restore Defaults</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Class</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Subjects</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">1st Summative</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">2nd Summative</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">3rd / Annual Exam</th>
                      <th className="px-4 py-2.5 text-right font-bold text-foreground bg-primary/5 border-l border-r border-primary/15">
                        Total Marks (All Evaluations)
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {marksSchemes.map((scheme) => {
                      const totals = computeSchemeTotals(scheme);
                      const has1stPractical = (scheme.firstSummativePractical || 0) > 0;
                      const has2ndPractical = (scheme.secondSummativePractical || 0) > 0;
                      const hasAnnualPractical = (scheme.annualPractical || 0) > 0;

                      return (
                        <tr key={scheme.classCode} className="hover:bg-muted/30 transition-colors">
                          {/* Class Name & Code */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary font-mono shrink-0">
                                {scheme.classCode}
                              </div>
                              <div className="font-bold text-foreground">{scheme.className}</div>
                            </div>
                          </td>

                          {/* Number of Subjects */}
                          <td className="px-3 py-3 text-center">
                            <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 bg-background shadow-2xs">
                              {scheme.subjectCount} Sub
                            </Badge>
                          </td>

                          {/* 1st Summative */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <div className="font-bold font-mono text-foreground text-xs">
                                {totals.firstExamTotal} <span className="text-[10px] text-muted-foreground font-normal">Marks</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {scheme.firstSummativeWritten}
                                {has1stPractical && <span className="text-amber-600 font-semibold">+{scheme.firstSummativePractical}p</span>}
                                <span> × {scheme.subjectCount}</span>
                              </div>
                            </div>
                          </td>

                          {/* 2nd Summative */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <div className="font-bold font-mono text-foreground text-xs">
                                {totals.secondExamTotal} <span className="text-[10px] text-muted-foreground font-normal">Marks</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {scheme.secondSummativeWritten}
                                {has2ndPractical && <span className="text-amber-600 font-semibold">+{scheme.secondSummativePractical}p</span>}
                                <span> × {scheme.subjectCount}</span>
                              </div>
                            </div>
                          </td>

                          {/* 3rd / Annual */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <div className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-xs">
                                {totals.annualExamTotal} <span className="text-[10px] text-muted-foreground font-normal">Marks</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {scheme.annualWritten}
                                {hasAnnualPractical && <span className="text-amber-600 font-semibold">+{scheme.annualPractical}p</span>}
                                <span> × {scheme.subjectCount}</span>
                              </div>
                            </div>
                          </td>

                          {/* Grand Total Column */}
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-xs bg-primary/5 border-l border-r border-primary/15">
                            <span className="inline-flex items-center text-primary bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-md shadow-2xs">
                              {totals.grandTotal} Marks
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditScheme(scheme)}
                              className="h-7 text-xs px-2.5 gap-1.5 hover:border-primary hover:text-primary transition-all shadow-2xs"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Edit Marks</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ========================================================================= */}
          {/* CLASS-WISE SUBJECT SELECTION                                              */}
          {/* ========================================================================= */}
          <Card className="border bg-card shadow-xs overflow-visible">
            <CardHeader className="p-3.5 sm:p-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-xs sm:text-sm font-bold">
                    Class Subjects
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-4 space-y-3.5 overflow-visible">
              {/* Class Selector Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border">
                {marksSchemes.map((scheme) => {
                  const isSelected = selectedSubjectClass === scheme.classCode;
                  return (
                    <button
                      key={scheme.classCode}
                      type="button"
                      onClick={() => setSelectedSubjectClass(scheme.classCode)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                        isSelected
                          ? "bg-background text-primary shadow-xs border border-primary/20 font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      )}
                    >
                      <span>{scheme.className}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium",
                        isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {(scheme.subjects || []).length} Sub
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Class Subject Manager */}
              {(() => {
                const activeScheme = marksSchemes.find((s) => s.classCode === selectedSubjectClass) || marksSchemes[0];
                const activeSubjects = activeScheme.subjects || [];

                const SUBJECT_PALETTES = [
                  "bg-blue-50/80 text-blue-700 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50",
                  "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
                  "bg-violet-50/80 text-violet-700 border-violet-200/80 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/50",
                  "bg-amber-50/80 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
                  "bg-rose-50/80 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50",
                  "bg-cyan-50/80 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900/50",
                  "bg-indigo-50/80 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/50",
                  "bg-teal-50/80 text-teal-700 border-teal-200/80 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/50",
                ];

                const selectOptions = MASTER_SUBJECT_BANK.flatMap((cat) =>
                  cat.subjects.map((sub) => ({
                    label: sub,
                    value: sub,
                    category: cat.category,
                    disabled: activeSubjects.includes(sub),
                  }))
                );

                return (
                  <div className="space-y-3 pt-0.5">
                    {/* Selected Subjects Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl border bg-muted/15 min-h-[50px]">
                      {activeSubjects.length > 0 ? (
                        activeSubjects.map((subj, idx) => {
                          const palette = SUBJECT_PALETTES[idx % SUBJECT_PALETTES.length];
                          return (
                            <div
                              key={subj}
                              className={cn(
                                "border font-medium text-xs pl-2.5 pr-1 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs group transition-all duration-150",
                                palette
                              )}
                            >
                              <span className="text-[10px] opacity-70 font-mono font-bold">#{idx + 1}</span>
                              <span className="font-semibold">{subj}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubjectFromClass(activeScheme.classCode, subj)}
                                title={`Remove ${subj}`}
                                className="h-4 w-4 rounded-full hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer opacity-70 hover:opacity-100"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No subjects selected for {activeScheme.className}.</span>
                      )}
                    </div>

                    {/* Add Subject Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl border bg-card">
                      <div className="w-full sm:flex-1">
                        <CustomSelect
                          value={selectedNewSubjectToAdd}
                          onChange={(val) => {
                            setSelectedNewSubjectToAdd(val);
                            if (val) setCustomSubjectName("");
                          }}
                          placeholder="Select from subject bank..."
                          options={selectOptions}
                          className="w-full text-xs"
                        />
                      </div>

                      <div className="w-full sm:w-48">
                        <Input
                          placeholder="Or custom subject..."
                          value={customSubjectName}
                          onChange={(e) => {
                            setCustomSubjectName(e.target.value);
                            if (e.target.value) setSelectedNewSubjectToAdd("");
                          }}
                          className="h-9 text-xs"
                        />
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const subToAdd = selectedNewSubjectToAdd || customSubjectName;
                          if (subToAdd) {
                            handleAddSubjectToClass(activeScheme.classCode, subToAdd);
                          } else {
                            showToast({
                              type: "info",
                              title: "Select Subject",
                              description: "Please choose or type a subject to add.",
                            });
                          }
                        }}
                        className="w-full sm:w-auto h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground px-4 shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Card 3: Promotion & Pass Criteria Policy */}
          <Card className="border bg-card shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <span>Promotion & Pass Criteria Policy</span>
                      <Badge variant="outline" className="text-[10px] bg-background font-medium">
                        Session & Promotion Rules
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      RTE Act compliance and minimum passing percentage rules for annual class transitions.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleSavePromotionPolicy}
                  disabled={isSavingPolicy}
                  className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingPolicy ? "Saving..." : "Save Policy"}</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule A: Class 5 to 8 Auto-Pass (RTE) */}
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Classes V – VIII (RTE Auto-Promotion)
                    </span>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                      Right to Education Act: No detention policy up to Elementary stage.
                    </p>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 font-semibold px-2.5 py-1">
                    100% Auto-Pass
                  </Badge>
                </div>

                {/* Rule B: Class 9 to 12 Minimum Pass Percentage */}
                <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-blue-600" />
                      Classes IX – XII Pass Cutoff
                    </span>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-400/80">
                      Minimum required overall score across evaluations to be promoted.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={promotionPolicy.minPassPercentage}
                      onChange={(e) =>
                        setPromotionPolicy((prev) => ({
                          ...prev,
                          minPassPercentage: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                        }))
                      }
                      className="font-mono text-sm font-bold rounded-lg border border-blue-300 bg-background px-2 py-1 w-16 text-blue-700 dark:text-blue-400 text-center"
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Edit Class Marks Scheme */}
      <Dialog open={!!editingScheme} onOpenChange={(open) => !open && setEditingScheme(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Calculator className="h-4 w-4 text-primary" />
              <span>Configure Marks: {editingScheme?.className}</span>
            </DialogTitle>
          </DialogHeader>

          {editingScheme && (
            <form onSubmit={handleSaveEditScheme} className="space-y-3 pt-1">
              {/* Number of Subjects */}
              <div className="space-y-1 p-2.5 rounded-lg border bg-muted/30">
                <Label htmlFor="schemeSubjects" className="text-xs font-semibold flex items-center justify-between">
                  <span>Number of Subjects *</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Class {editingScheme.classCode}
                  </Badge>
                </Label>
                <Input
                  id="schemeSubjects"
                  type="number"
                  min="1"
                  max="15"
                  value={editSchemeSubjectCount}
                  onChange={(e) => setEditSchemeSubjectCount(parseInt(e.target.value, 10) || 1)}
                  className="text-xs font-bold font-mono h-8"
                  required
                />
              </div>

              {/* 1st Summative Marks */}
              <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-xs font-bold text-foreground">1st Summative</span>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    Total: {editSchemeSubjectCount * ((Number(editScheme1stWritten) || 0) + (Number(editScheme1stPractical) || 0))} Marks
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editScheme1stWritten}
                      onChange={(e) => setEditScheme1stWritten(parseFloat(e.target.value) || 0)}
                      className="text-xs font-mono h-7"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Practical / Oral</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editScheme1stPractical}
                      onChange={(e) => setEditScheme1stPractical(parseFloat(e.target.value) || 0)}
                      className="text-xs font-mono h-7"
                    />
                  </div>
                </div>
              </div>

              {/* 2nd Summative Marks */}
              <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-xs font-bold text-foreground">2nd Summative</span>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    Total: {editSchemeSubjectCount * ((Number(editScheme2ndWritten) || 0) + (Number(editScheme2ndPractical) || 0))} Marks
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editScheme2ndWritten}
                      onChange={(e) => setEditScheme2ndWritten(parseFloat(e.target.value) || 0)}
                      className="text-xs font-mono h-7"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Practical / Oral</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editScheme2ndPractical}
                      onChange={(e) => setEditScheme2ndPractical(parseFloat(e.target.value) || 0)}
                      className="text-xs font-mono h-7"
                    />
                  </div>
                </div>
              </div>

              {/* 3rd / Annual Exam Marks */}
              <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-xs font-bold text-foreground">3rd / Annual Exam</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    Total: {editSchemeSubjectCount * ((Number(editSchemeAnnualWritten) || 0) + (Number(editSchemeAnnualPractical) || 0))} Marks
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editSchemeAnnualWritten}
                      onChange={(e) => setEditSchemeAnnualWritten(parseFloat(e.target.value) || 0)}
                      className="text-xs font-mono h-7"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Practical / Project</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editSchemeAnnualPractical}
                      onChange={(e) => setEditSchemeAnnualPractical(parseFloat(e.target.value) || 0)}
                      className="text-xs font-mono h-7"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview of Grand Total */}
              <div className="rounded-lg p-2.5 bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Grand Total Marks:</span>
                <span className="font-mono font-extrabold text-xs text-primary">
                  {editSchemeSubjectCount * (
                    (Number(editScheme1stWritten) || 0) +
                    (Number(editScheme1stPractical) || 0) +
                    (Number(editScheme2ndWritten) || 0) +
                    (Number(editScheme2ndPractical) || 0) +
                    (Number(editSchemeAnnualWritten) || 0) +
                    (Number(editSchemeAnnualPractical) || 0)
                  )}{" "}
                  Marks
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingScheme(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  Save Scheme
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

