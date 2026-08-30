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
  X
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
  // Navigation between the two requested options: School Profile & Class Management
  const [subOption, setSubOption] = useState<"profile" | "classes">("profile");

  // Profile Form State
  const [profile, setProfile] = useState<SchoolProfileData>(DEFAULT_SCHOOL_PROFILE);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Class Management State
  const [classes, setClasses] = useState<ClassItem[]>(DEFAULT_CLASSES);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);

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
    } catch (e) {
      console.error("Failed to load local school details", e);
    }
  }, []);

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
        </div>

        {/* Top Action Button - ONLY for School Profile (top Add New Class removed to prevent duplicate) */}
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
    </div>
  );
}
