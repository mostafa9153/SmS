"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Layers,
  Award,
  Users,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  User,
  Info,
  Building,
  Sliders,
  Save,
  RotateCcw,
  X,
  FlaskConical,
  Landmark,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  syncClassTeachersToRoutine,
  syncConfiguredClassesToRoutine,
} from "@/lib/routine/routine-sync";
import {
  getClassStreamList,
} from "@/lib/utils/school-profile";

// Interface for Class Item
export interface ClassItem {
  id: string;
  name: string;
  code: string;
  sections: string[];
  stream?: string;
  streamSections?: Record<string, string[]>;
  classTeacher?: string;
  sectionTeachers?: Record<string, string>;
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
  for (const char of alphabet) {
    if (!set.has(char)) return char;
  }
  return "+";
}

export const DEFAULT_CLASSES: ClassItem[] = [
  { id: "c-5", name: "Class V", code: "V", sections: ["A", "B"], classTeacher: "S. Roy", roomNo: "Room 101", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-6", name: "Class VI", code: "VI", sections: ["A", "B"], classTeacher: "P. Mondal", roomNo: "Room 102", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-7", name: "Class VII", code: "VII", sections: ["A", "B"], classTeacher: "R. Mukherjee", roomNo: "Room 103", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-8", name: "Class VIII", code: "VIII", sections: ["A", "B"], classTeacher: "K. Das", roomNo: "Room 104", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-9", name: "Class IX", code: "IX", sections: ["A", "B"], classTeacher: "T. Banerjee", roomNo: "Room 201", capacity: 130, isAutoPass: false, status: "Active" },
  { id: "c-10", name: "Class X", code: "X", sections: ["A", "B"], classTeacher: "A. Halder", roomNo: "Room 202", capacity: 130, isAutoPass: false, status: "Active" },
  { id: "c-11", name: "Class XI", code: "XI", sections: ["A", "B"], stream: "Arts", streamSections: { "Arts": ["A", "B"] }, classTeacher: "B. Naskar", roomNo: "Room 301", capacity: 140, isAutoPass: false, status: "Active" },
  { id: "c-12", name: "Class XII", code: "XII", sections: ["A", "B"], stream: "Arts", streamSections: { "Arts": ["A", "B"] }, classTeacher: "S. Bhattacharya", roomNo: "Room 302", capacity: 140, isAutoPass: false, status: "Active" },
];

export function ClassManagementTab() {
  const [classes, setClasses] = useState<ClassItem[]>(DEFAULT_CLASSES);
  const [staffList, setStaffList] = useState<{ id: string; full_name: string; designation?: string }[]>([]);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);

  // Add Class Form State
  const [newClassName, setNewClassName] = useState("");
  const [newClassCode, setNewClassCode] = useState("");
  const [newSections, setNewSections] = useState<string[]>(["A", "B"]);
  const [newStream, setNewStream] = useState("Arts");
  const [newStreamSections, setNewStreamSections] = useState<Record<string, string[]>>({
    "Arts": ["A", "B"],
  });
  const [newTeacher, setNewTeacher] = useState("");
  const [newSectionTeachers, setNewSectionTeachers] = useState<Record<string, string>>({});
  const [newRoom, setNewRoom] = useState("");
  const [newCapacity, setNewCapacity] = useState("120");
  const [newAutoPass, setNewAutoPass] = useState("false");

  // Edit Class Form State
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassCode, setEditClassCode] = useState("");
  const [editSections, setEditSections] = useState<string[]>(["A", "B"]);
  const [editStream, setEditStream] = useState("Arts");
  const [editStreamSections, setEditStreamSections] = useState<Record<string, string[]>>({
    "Arts": ["A", "B"],
  });
  const [editTeacher, setEditTeacher] = useState("");
  const [editSectionTeachers, setEditSectionTeachers] = useState<Record<string, string>>({});
  const [editRoom, setEditRoom] = useState("");
  const [editCapacity, setEditCapacity] = useState("120");
  const [editAutoPass, setEditAutoPass] = useState("false");

  // Sync helper
  const updateAndSyncClasses = (updated: ClassItem[]) => {
    setClasses(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_class_management", JSON.stringify(updated));
      window.dispatchEvent(new Event("sms_class_management_updated"));
    }
    syncConfiguredClassesToRoutine(updated).catch((e) => console.warn("syncConfiguredClassesToRoutine:", e));

    fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "class_management", value: updated }),
    })
      .then((res) => {
        if (res.ok) {
          import("@/lib/utils/school-config-client").then(({ invalidateSchoolConfigClientCache }) =>
            invalidateSchoolConfigClientCache()
          );
        }
      })
      .catch((err) => console.warn("Background DB sync for classes failed:", err));
  };

  useEffect(() => {
    // 1. LocalStorage
    try {
      const savedClasses = localStorage.getItem("sms_class_management");
      if (savedClasses) {
        const parsed = JSON.parse(savedClasses) as ClassItem[];
        const sanitized = parsed.map((c) => ({
          ...c,
          stream: isHigherSecondaryClass(c.code, c.name) ? (c.stream || "Arts / Science / Commerce") : undefined,
        }));
        setClasses(sanitized);
      }
    } catch (e) {
      console.error("Failed to load local class presets", e);
    }

    // 2. Database fetch
    import("@/lib/utils/school-config-client").then(({ fetchSchoolConfigClient }) => {
      fetchSchoolConfigClient()
        .then((data) => {
          if (data && data.class_management && Array.isArray(data.class_management) && data.class_management.length > 0) {
            setClasses(data.class_management);
            localStorage.setItem("sms_class_management", JSON.stringify(data.class_management));
          }
        })
        .catch((err) => console.warn("Failed to sync classes from DB:", err));
    });

    // 3. Staff list for class teachers
    const supabase = createClient();
    supabase
      .from("staff_profiles")
      .select("id, full_name, designation")
      .eq("employee_type", "TEACHING")
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setStaffList(data);
        }
      });
  }, []);

  // Handlers
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
    let finalSections = newSections.length > 0 ? newSections : ["A"];
    let finalStreamSections: Record<string, string[]> | undefined = undefined;

    if (isHs) {
      const activeStreamsList = getClassStreamList(newStream);
      const cleanedStreamSections: Record<string, string[]> = {};
      const allSecSet = new Set<string>();
      activeStreamsList.forEach((st) => {
        const secs = (newStreamSections[st] && newStreamSections[st].length > 0)
          ? newStreamSections[st]
          : ["A"];
        cleanedStreamSections[st] = secs;
        secs.forEach((s) => allSecSet.add(s));
      });
      finalStreamSections = cleanedStreamSections;
      finalSections = Array.from(allSecSet).sort();
    }

    const finalSectionTeachers: Record<string, string> = {};
    if (isHs) {
      const activeStreamsList = getClassStreamList(newStream);
      activeStreamsList.forEach((st) => {
        const secs = (newStreamSections[st] && newStreamSections[st].length > 0)
          ? newStreamSections[st]
          : ["A"];
        secs.forEach((sec) => {
          const t =
            newSectionTeachers[`${st} - ${sec}`] ||
            newSectionTeachers[`${st}::${sec}`] ||
            newSectionTeachers[`${sec} (${st})`] ||
            newSectionTeachers[`Sec ${sec} (${st})`] ||
            newSectionTeachers[sec] ||
            newSectionTeachers[`Section ${sec}`] ||
            newTeacher;
          if (t && t.trim()) {
            const val = t.trim();
            finalSectionTeachers[`${st} - ${sec}`] = val;
            finalSectionTeachers[`${st} - Section ${sec}`] = val;
            finalSectionTeachers[`${sec} (${st})`] = val;
            finalSectionTeachers[`Sec ${sec} (${st})`] = val;
            finalSectionTeachers[`${st}::${sec}`] = val;
            if (!finalSectionTeachers[sec]) {
              finalSectionTeachers[sec] = val;
            }
          }
        });
      });
    } else {
      finalSections.forEach((sec) => {
        const t = newSectionTeachers[sec] || newSectionTeachers[`Section ${sec}`] || newTeacher;
        if (t && t.trim()) {
          finalSectionTeachers[sec] = t.trim();
          finalSectionTeachers[`Section ${sec}`] = t.trim();
        }
      });
    }
    const primaryTeacher = Object.values(finalSectionTeachers)[0] || newTeacher.trim() || undefined;

    const newClassItem: ClassItem = {
      id: `c-${Date.now()}`,
      name: newClassName.trim(),
      code: newClassCode.trim().toUpperCase(),
      sections: finalSections,
      stream: isHs ? newStream : undefined,
      streamSections: finalStreamSections,
      classTeacher: primaryTeacher,
      sectionTeachers: Object.keys(finalSectionTeachers).length > 0 ? finalSectionTeachers : undefined,
      roomNo: newRoom.trim() || undefined,
      capacity: parseInt(newCapacity, 10) || 100,
      isAutoPass: newAutoPass === "true",
      status: "Active",
    };

    const updated = [...classes, newClassItem];
    updateAndSyncClasses(updated);
    syncClassTeachersToRoutine(newClassName.trim(), finalSectionTeachers, finalSections);

    showToast({
      type: "success",
      title: "Class Added",
      description: `${newClassName} has been added and class teachers synced.`,
    });

    setNewClassName("");
    setNewClassCode("");
    setNewSections(["A", "B"]);
    setNewStream("Arts / Science / Commerce");
    setNewStreamSections({
      "Arts": ["A", "B"],
      "Science": ["A"],
      "Commerce": ["A"],
    });
    setNewTeacher("");
    setNewSectionTeachers({});
    setNewRoom("");
    setNewCapacity("120");
    setNewAutoPass("false");
    setIsAddClassOpen(false);
  };

  const handleOpenEditClass = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassCode(cls.code);
    setEditSections(cls.sections && cls.sections.length > 0 ? [...cls.sections] : ["A"]);
    setEditStream(cls.stream || "Arts / Science / Commerce");

    const streamSecs: Record<string, string[]> = cls.streamSections
      ? { ...cls.streamSections }
      : {};
    const streamsList = getClassStreamList(cls.stream || "Arts / Science / Commerce");
    streamsList.forEach((s) => {
      if (!streamSecs[s] || !Array.isArray(streamSecs[s]) || streamSecs[s].length === 0) {
        streamSecs[s] = cls.sections && cls.sections.length > 0 ? [...cls.sections] : ["A"];
      }
    });
    setEditStreamSections(streamSecs);

    setEditTeacher(cls.classTeacher || "");
    const sTeachers: Record<string, string> = cls.sectionTeachers ? { ...cls.sectionTeachers } : {};
    if (cls.classTeacher && (!cls.sectionTeachers || Object.keys(cls.sectionTeachers).length === 0)) {
      cls.sections.forEach((sec) => {
        sTeachers[sec] = cls.classTeacher!;
      });
    }
    setEditSectionTeachers(sTeachers);

    setEditRoom(cls.roomNo || "");
    setEditCapacity(String(cls.capacity || 120));
    setEditAutoPass(cls.isAutoPass ? "true" : "false");
  };

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

  const handleAddEditModalStreamSection = (streamName: string, letter: string) => {
    const cleanLetter = letter.trim().toUpperCase();
    if (!cleanLetter) return;
    setEditStreamSections((prev) => {
      const current = prev[streamName] || ["A"];
      if (current.includes(cleanLetter)) return prev;
      return {
        ...prev,
        [streamName]: [...current, cleanLetter].sort(),
      };
    });
  };

  const handleRemoveEditModalStreamSection = (streamName: string, sectionToRemove: string) => {
    setEditStreamSections((prev) => {
      const current = prev[streamName] || ["A"];
      if (current.length <= 1) {
        showToast({
          type: "info",
          title: "Section Required",
          description: `${streamName} must have at least one section.`,
        });
        return prev;
      }
      return {
        ...prev,
        [streamName]: current.filter((s) => s !== sectionToRemove),
      };
    });
  };

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

  const handleAddAddModalStreamSection = (streamName: string, letter: string) => {
    const cleanLetter = letter.trim().toUpperCase();
    if (!cleanLetter) return;
    setNewStreamSections((prev) => {
      const current = prev[streamName] || ["A"];
      if (current.includes(cleanLetter)) return prev;
      return {
        ...prev,
        [streamName]: [...current, cleanLetter].sort(),
      };
    });
  };

  const handleRemoveAddModalStreamSection = (streamName: string, sectionToRemove: string) => {
    setNewStreamSections((prev) => {
      const current = prev[streamName] || ["A"];
      if (current.length <= 1) {
        showToast({
          type: "info",
          title: "Section Required",
          description: `${streamName} must have at least one section.`,
        });
        return prev;
      }
      return {
        ...prev,
        [streamName]: current.filter((s) => s !== sectionToRemove),
      };
    });
  };

  const toggleEditStream = (streamName: "Science" | "Arts" | "Commerce") => {
    const currentStreams = getClassStreamList(editStream);
    let updated: string[];
    if (currentStreams.includes(streamName)) {
      if (currentStreams.length <= 1) {
        showToast({ title: "At least one stream must be active for this class", type: "info" });
        return;
      }
      updated = currentStreams.filter((s) => s !== streamName);
    } else {
      const allPossible = ["Science", "Arts", "Commerce"];
      updated = allPossible.filter((s) => currentStreams.includes(s) || s === streamName);
      setEditStreamSections((prev) => ({
        ...prev,
        [streamName]: prev[streamName] && prev[streamName].length > 0 ? prev[streamName] : ["A"],
      }));
    }
    setEditStream(updated.join(" / "));
  };

  const toggleNewStream = (streamName: "Science" | "Arts" | "Commerce") => {
    const currentStreams = getClassStreamList(newStream);
    let updated: string[];
    if (currentStreams.includes(streamName)) {
      if (currentStreams.length <= 1) {
        showToast({ title: "At least one stream must be active for this class", type: "info" });
        return;
      }
      updated = currentStreams.filter((s) => s !== streamName);
    } else {
      const allPossible = ["Science", "Arts", "Commerce"];
      updated = allPossible.filter((s) => currentStreams.includes(s) || s === streamName);
      setNewStreamSections((prev) => ({
        ...prev,
        [streamName]: prev[streamName] && prev[streamName].length > 0 ? prev[streamName] : ["A"],
      }));
    }
    setNewStream(updated.join(" / "));
  };

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

    updateAndSyncClasses(updated);
    showToast({
      type: "success",
      title: "Section Added",
      description: `Added Section ${nextSec} to ${target.name}.`,
    });
  };

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

    updateAndSyncClasses(updated);
    showToast({
      type: "success",
      title: "Section Removed",
      description: `Removed Section ${sectionToRemove} from ${target.name}.`,
    });
  };

  const handleQuickAddStreamSection = (classId: string, streamName: string) => {
    const target = classes.find((c) => c.id === classId);
    if (!target) return;
    const currentSections = (target.streamSections && target.streamSections[streamName]) || target.sections || ["A"];
    const nextSec = getNextAvailableLetter(currentSections);
    const updatedSecs = [...currentSections, nextSec].sort();

    const nextStreamSections = {
      ...(target.streamSections || {}),
      [streamName]: updatedSecs,
    };

    const allSectionsSet = new Set<string>();
    Object.values(nextStreamSections).forEach((arr) => arr.forEach((s) => allSectionsSet.add(s)));
    const unionSections = Array.from(allSectionsSet).sort();

    const updated = classes.map((c) => {
      if (c.id === classId) {
        return {
          ...c,
          streamSections: nextStreamSections,
          sections: unionSections.length > 0 ? unionSections : target.sections,
        };
      }
      return c;
    });

    updateAndSyncClasses(updated);
    showToast({
      type: "success",
      title: "Section Added",
      description: `Added Section ${nextSec} to ${target.name} (${streamName}).`,
    });
  };

  const handleQuickRemoveStreamSection = (classId: string, streamName: string, sectionToRemove: string) => {
    const target = classes.find((c) => c.id === classId);
    if (!target) return;
    const currentSections = (target.streamSections && target.streamSections[streamName]) || target.sections || ["A"];
    if (currentSections.length <= 1) {
      showToast({
        type: "info",
        title: "Cannot Remove",
        description: `${streamName} must have at least one active section.`,
      });
      return;
    }
    const nextStreamSections = {
      ...(target.streamSections || {}),
      [streamName]: currentSections.filter((s) => s !== sectionToRemove),
    };

    const allSectionsSet = new Set<string>();
    Object.values(nextStreamSections).forEach((arr) => arr.forEach((s) => allSectionsSet.add(s)));
    const unionSections = Array.from(allSectionsSet).sort();

    const updated = classes.map((c) => {
      if (c.id === classId) {
        return {
          ...c,
          streamSections: nextStreamSections,
          sections: unionSections.length > 0 ? unionSections : target.sections,
        };
      }
      return c;
    });

    updateAndSyncClasses(updated);
    showToast({
      type: "success",
      title: "Section Removed",
      description: `Removed Section ${sectionToRemove} from ${target.name} (${streamName}).`,
    });
  };

  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    const isHs = isHigherSecondaryClass(editClassCode, editClassName);
    let finalSections = editSections.length > 0 ? editSections : ["A"];
    let finalStreamSections: Record<string, string[]> | undefined = undefined;

    if (isHs) {
      const activeStreamsList = getClassStreamList(editStream);
      const cleanedStreamSections: Record<string, string[]> = {};
      const allSecSet = new Set<string>();
      activeStreamsList.forEach((st) => {
        const secs = (editStreamSections[st] && editStreamSections[st].length > 0)
          ? editStreamSections[st]
          : ["A"];
        cleanedStreamSections[st] = secs;
        secs.forEach((s) => allSecSet.add(s));
      });
      finalStreamSections = cleanedStreamSections;
      finalSections = Array.from(allSecSet).sort();
    }

    const finalSectionTeachers: Record<string, string> = {};
    if (isHs) {
      const activeStreamsList = getClassStreamList(editStream);
      activeStreamsList.forEach((st) => {
        const secs = (editStreamSections[st] && editStreamSections[st].length > 0)
          ? editStreamSections[st]
          : ["A"];
        secs.forEach((sec) => {
          const t =
            editSectionTeachers[`${st} - ${sec}`] ||
            editSectionTeachers[`${st}::${sec}`] ||
            editSectionTeachers[`${sec} (${st})`] ||
            editSectionTeachers[`Sec ${sec} (${st})`] ||
            editSectionTeachers[sec] ||
            editSectionTeachers[`Section ${sec}`] ||
            editTeacher;
          if (t && t.trim()) {
            const val = t.trim();
            finalSectionTeachers[`${st} - ${sec}`] = val;
            finalSectionTeachers[`${st} - Section ${sec}`] = val;
            finalSectionTeachers[`${sec} (${st})`] = val;
            finalSectionTeachers[`Sec ${sec} (${st})`] = val;
            finalSectionTeachers[`${st}::${sec}`] = val;
            if (!finalSectionTeachers[sec]) {
              finalSectionTeachers[sec] = val;
            }
          }
        });
      });
    } else {
      finalSections.forEach((sec) => {
        const t = editSectionTeachers[sec] || editSectionTeachers[`Section ${sec}`] || editTeacher;
        if (t && t.trim()) {
          finalSectionTeachers[sec] = t.trim();
          finalSectionTeachers[`Section ${sec}`] = t.trim();
        }
      });
    }
    const primaryTeacher = Object.values(finalSectionTeachers)[0] || editTeacher.trim() || undefined;

    const updated = classes.map((c) => {
      if (c.id === editingClass.id) {
        return {
          ...c,
          sections: finalSections,
          stream: isHs ? editStream : undefined,
          streamSections: finalStreamSections,
          classTeacher: primaryTeacher,
          sectionTeachers: Object.keys(finalSectionTeachers).length > 0 ? finalSectionTeachers : undefined,
          roomNo: editRoom.trim() || undefined,
          capacity: parseInt(editCapacity, 10) || 100,
          isAutoPass: editAutoPass === "true",
        };
      }
      return c;
    });

    updateAndSyncClasses(updated);
    syncClassTeachersToRoutine(editClassName, finalSectionTeachers, finalSections);

    showToast({
      type: "success",
      title: "Class Updated",
      description: `${editClassName} details and section teachers updated successfully.`,
    });

    setEditingClass(null);
  };

  const handleDeleteClass = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from class management?`)) {
      const updated = classes.filter((c) => c.id !== id);
      updateAndSyncClasses(updated);
      showToast({
        type: "success",
        title: "Class Removed",
        description: `${name} has been removed.`,
      });
    }
  };

  const isAddingHs = isHigherSecondaryClass(newClassCode, newClassName);
  const isEditingHs = isHigherSecondaryClass(editClassCode, editClassName);

  const editNextLetter = getNextAvailableLetter(editSections);
  const newNextLetter = getNextAvailableLetter(newSections);

  return (
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
              Configured Classes &amp; Sections
            </h3>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddClassOpen(true)}
            className="rounded-xl text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add New Class</span>
          </Button>
        </div>

        <div className="divide-y">
          {classes.map((cls) => {
            const isHs = isHigherSecondaryClass(cls.code, cls.name);
            const activeStreams = isHs ? getClassStreamList(cls.stream) : [];

            return (
              <div
                key={cls.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Left: Class identity & Code */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-[200px]">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary font-mono shrink-0 shadow-2xs">
                    {cls.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">{cls.name}</h4>
                      {cls.isAutoPass && (
                        <Badge variant="outline" className="text-[10px] bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200">
                          Auto-Pass
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>Room: {cls.roomNo || "Not set"}</span>
                      <span>•</span>
                      <span>Cap: {cls.capacity || 100}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Sections or Stream Sections */}
                <div className="flex-1 min-w-[280px]">
                  {isHs && activeStreams.length > 0 ? (
                    <div className="space-y-2">
                      {activeStreams.map((st) => {
                        const sList = (cls.streamSections && cls.streamSections[st]) || cls.sections || ["A"];
                        return (
                          <div key={st} className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-semibold text-muted-foreground min-w-[65px]">{st}:</span>
                            {sList.map((sec) => (
                              <span
                                key={sec}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-foreground border text-[11px] font-mono font-medium"
                              >
                                Sec {sec}
                                <button
                                  type="button"
                                  onClick={() => handleQuickRemoveStreamSection(cls.id, st, sec)}
                                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                                  title="Remove section"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleQuickAddStreamSection(cls.id, st)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-primary/40 text-primary hover:bg-primary/5 text-[11px] font-medium transition-colors"
                              title="Add section"
                            >
                              <Plus className="h-2.5 w-2.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-muted-foreground mr-1">Sections:</span>
                      {cls.sections.map((sec) => (
                        <span
                          key={sec}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border text-xs font-mono font-medium"
                        >
                          Section {sec}
                          <button
                            type="button"
                            onClick={() => handleQuickRemoveSection(cls.id, sec)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                            title="Remove section"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleQuickAddSection(cls.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-primary/40 text-primary hover:bg-primary/5 text-xs font-medium transition-colors"
                        title="Add section"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Section</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Class Teacher & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                  <div className="text-right text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Class Teacher</span>
                    <span className="font-semibold text-foreground">{cls.classTeacher || "Not Assigned"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditClass(cls)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-xl hover:bg-muted"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD CLASS MODAL */}
      <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add New Class</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddClass} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Class Name *</Label>
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Class IX"
                  className="text-xs h-9"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Class Code *</Label>
                <Input
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value)}
                  placeholder="e.g. IX"
                  className="text-xs h-9 uppercase"
                  required
                />
              </div>
            </div>

            {isAddingHs ? (
              <div className="space-y-4 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Higher Secondary Academic Streams (Science, Arts, Commerce)</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Choose which streams are offered and manage their sections
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <CustomSelect
                      value={newStream}
                      onChange={(val) => {
                        setNewStream(val);
                        const list = getClassStreamList(val);
                        setNewStreamSections((prev) => {
                          const next = { ...prev };
                          list.forEach((st) => {
                            if (!next[st] || next[st].length === 0) next[st] = ["A"];
                          });
                          return next;
                        });
                      }}
                      options={[
                        { label: "Arts Only", value: "Arts" },
                        { label: "Science Only", value: "Science" },
                        { label: "Commerce Only", value: "Commerce" },
                        { label: "Science & Arts", value: "Science / Arts" },
                        { label: "Commerce & Arts", value: "Commerce / Arts" },
                        { label: "Science & Commerce", value: "Science / Commerce" },
                        { label: "Arts / Science / Commerce (All 3 Streams)", value: "Arts / Science / Commerce" },
                      ]}
                    />
                  </div>
                </div>

                {/* 3 Stream Interactive Toggle Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      name: "Science",
                      label: "Science Stream",
                      icon: FlaskConical,
                      badgeBg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300",
                      activeBorder: "border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/10",
                    },
                    {
                      name: "Arts",
                      label: "Arts (Humanities)",
                      icon: BookOpen,
                      badgeBg: "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300",
                      activeBorder: "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10",
                    },
                    {
                      name: "Commerce",
                      label: "Commerce Stream",
                      icon: Landmark,
                      badgeBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300",
                      activeBorder: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10",
                    },
                  ].map((streamItem) => {
                    const activeList = getClassStreamList(newStream);
                    const isChecked = activeList.includes(streamItem.name);
                    const Icon = streamItem.icon;
                    return (
                      <button
                        key={streamItem.name}
                        type="button"
                        onClick={() => toggleNewStream(streamItem.name as any)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                          isChecked
                            ? streamItem.activeBorder
                            : "bg-background border-border/80 hover:border-foreground/30 hover:bg-muted/30 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border shrink-0", streamItem.badgeBg)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">{streamItem.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {isChecked ? "Active in Curriculum" : "Disabled / Off"}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                          isChecked ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background"
                        )}>
                          {isChecked && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Per-Stream Sections Config */}
                <div className="space-y-2.5 pt-1">
                  <Label className="text-xs font-semibold text-foreground">Active Sections by Stream:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {getClassStreamList(newStream).map((st) => {
                      const secs = (newStreamSections[st] && newStreamSections[st].length > 0)
                        ? newStreamSections[st]
                        : ["A"];
                      const nextLetter = getNextAvailableLetter(secs);
                      const isSci = st === "Science";
                      const isArts = st === "Arts";
                      return (
                        <div key={st} className="p-3 rounded-xl border bg-background space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                              isSci ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200"
                              : isArts ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200"
                            )}>
                              {st} Sections
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {secs.length} {secs.length === 1 ? "Section" : "Sections"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {secs.map((sec) => (
                              <span
                                key={sec}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium border"
                              >
                                Sec {sec}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAddModalStreamSection(st, sec)}
                                  className="text-muted-foreground hover:text-destructive ml-0.5 cursor-pointer"
                                  title={`Remove Section ${sec}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddAddModalStreamSection(st, nextLetter)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed text-primary text-xs font-medium hover:bg-primary/5 cursor-pointer"
                              title={`Add Section ${nextLetter}`}
                            >
                              <Plus className="h-3 w-3" /> Add {nextLetter}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Non-HS Classes Initial Sections */
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Initial Sections</Label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {newSections.map((sec) => (
                    <span
                      key={sec}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium border"
                    >
                      Sec {sec}
                      <button
                        type="button"
                        onClick={() => handleRemoveNewModalSection(sec)}
                        className="text-muted-foreground hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddNewModalSection(newNextLetter)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed text-primary text-xs font-medium hover:bg-primary/5"
                  >
                    <Plus className="h-3 w-3" /> Add {newNextLetter}
                  </button>
                </div>
              </div>
            )}

            {/* Class Teacher */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Class Teacher (Default)</Label>
              <CustomSelect
                value={newTeacher}
                onChange={(val) => setNewTeacher(val)}
                options={[
                  { label: "Select Class Teacher...", value: "" },
                  ...staffList.map((st) => ({
                    label: `${st.full_name}${st.designation ? ` (${st.designation})` : ""}`,
                    value: st.full_name,
                  })),
                ]}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Room No</Label>
                <Input
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="e.g. 101"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Capacity</Label>
                <Input
                  type="number"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">RTE Auto-Pass</Label>
                <CustomSelect
                  value={newAutoPass}
                  onChange={(val) => setNewAutoPass(val)}
                  options={[
                    { label: "No (Merit / Marks)", value: "false" },
                    { label: "Yes (RTE Auto-Pass)", value: "true" },
                  ]}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddClassOpen(false)}
                className="text-xs h-8.5"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs h-8.5 bg-primary text-primary-foreground font-semibold">
                Add Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT CLASS MODAL */}
      <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Class Details: {editClassName}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEditClass} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Class Name (Locked)</Label>
                <Input value={editClassName} disabled className="text-xs h-9 bg-muted/60" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Class Code (Locked)</Label>
                <Input value={editClassCode} disabled className="text-xs h-9 bg-muted/60" />
              </div>
            </div>

            {/* HS Streams & Sections Configuration */}
            {isEditingHs ? (
              <div className="space-y-4 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/15">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Higher Secondary Academic Streams (Science, Arts, Commerce)</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Choose which streams are active for this class and manage their sections
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <CustomSelect
                      value={editStream}
                      onChange={(val) => {
                        setEditStream(val);
                        const list = getClassStreamList(val);
                        setEditStreamSections((prev) => {
                          const next = { ...prev };
                          list.forEach((st) => {
                            if (!next[st] || next[st].length === 0) next[st] = ["A"];
                          });
                          return next;
                        });
                      }}
                      options={[
                        { label: "Arts Only", value: "Arts" },
                        { label: "Science Only", value: "Science" },
                        { label: "Commerce Only", value: "Commerce" },
                        { label: "Science & Arts", value: "Science / Arts" },
                        { label: "Commerce & Arts", value: "Commerce / Arts" },
                        { label: "Science & Commerce", value: "Science / Commerce" },
                        { label: "Arts / Science / Commerce (All 3 Streams)", value: "Arts / Science / Commerce" },
                      ]}
                    />
                  </div>
                </div>

                {/* 3 Stream Interactive Toggle Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      name: "Science",
                      label: "Science Stream",
                      icon: FlaskConical,
                      badgeBg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300",
                      activeBorder: "border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/10",
                    },
                    {
                      name: "Arts",
                      label: "Arts (Humanities)",
                      icon: BookOpen,
                      badgeBg: "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300",
                      activeBorder: "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10",
                    },
                    {
                      name: "Commerce",
                      label: "Commerce Stream",
                      icon: Landmark,
                      badgeBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300",
                      activeBorder: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10",
                    },
                  ].map((streamItem) => {
                    const activeList = getClassStreamList(editStream);
                    const isChecked = activeList.includes(streamItem.name);
                    const Icon = streamItem.icon;
                    return (
                      <button
                        key={streamItem.name}
                        type="button"
                        onClick={() => toggleEditStream(streamItem.name as any)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                          isChecked
                            ? streamItem.activeBorder
                            : "bg-background border-border/80 hover:border-foreground/30 hover:bg-muted/30 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border shrink-0", streamItem.badgeBg)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">{streamItem.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {isChecked ? "Active in Curriculum" : "Disabled / Off"}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
                          isChecked ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background"
                        )}>
                          {isChecked && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Per-Stream Sections Config */}
                <div className="space-y-2.5 pt-1">
                  <Label className="text-xs font-semibold text-foreground">Active Sections by Stream:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {getClassStreamList(editStream).map((st) => {
                      const secs = (editStreamSections[st] && editStreamSections[st].length > 0)
                        ? editStreamSections[st]
                        : ["A"];
                      const nextLetter = getNextAvailableLetter(secs);
                      const isSci = st === "Science";
                      const isArts = st === "Arts";
                      return (
                        <div key={st} className="p-3 rounded-xl border bg-background space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                              isSci ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200"
                              : isArts ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200"
                            )}>
                              {st} Sections
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {secs.length} {secs.length === 1 ? "Section" : "Sections"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {secs.map((sec) => (
                              <span
                                key={sec}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium border"
                              >
                                Sec {sec}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditModalStreamSection(st, sec)}
                                  className="text-muted-foreground hover:text-destructive ml-0.5 cursor-pointer"
                                  title={`Remove Section ${sec}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddEditModalStreamSection(st, nextLetter)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed text-primary text-xs font-medium hover:bg-primary/5 cursor-pointer"
                              title={`Add Section ${nextLetter}`}
                            >
                              <Plus className="h-3 w-3" /> Add {nextLetter}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-Stream Section Teachers */}
                <div className="space-y-2 pt-1 border-t border-border/60">
                  <Label className="text-xs font-bold text-foreground">Section Class Teachers by Stream</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {getClassStreamList(editStream).flatMap((st) => {
                      const secs = (editStreamSections[st] && editStreamSections[st].length > 0)
                        ? editStreamSections[st]
                        : ["A"];
                      return secs.map((sec) => {
                        const key = `${st} - ${sec}`;
                        const currentTeacher =
                          editSectionTeachers[key] ||
                          editSectionTeachers[`${st}::${sec}`] ||
                          editSectionTeachers[`${sec} (${st})`] ||
                          editSectionTeachers[sec] ||
                          editTeacher;
                        return (
                          <div key={key} className="space-y-1 p-2.5 rounded-xl bg-background border">
                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                              <span>{st}</span>
                              <span className="text-muted-foreground font-mono">Sec {sec}:</span>
                            </span>
                            <CustomSelect
                              value={currentTeacher}
                              onChange={(val) =>
                                setEditSectionTeachers((prev) => ({
                                  ...prev,
                                  [key]: val,
                                  [`${st}::${sec}`]: val,
                                  [`${sec} (${st})`]: val,
                                }))
                              }
                              options={[
                                { label: "Select Teacher...", value: "" },
                                ...staffList.map((stf) => ({
                                  label: `${stf.full_name}${stf.designation ? ` (${stf.designation})` : ""}`,
                                  value: stf.full_name,
                                })),
                              ]}
                            />
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Non-HS Classes (Class V - X) regular sections and teachers */
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Active Sections</Label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {editSections.map((sec) => (
                      <span
                        key={sec}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium border"
                      >
                        Sec {sec}
                        <button
                          type="button"
                          onClick={() => handleRemoveEditSection(sec)}
                          className="text-muted-foreground hover:text-destructive ml-0.5 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddEditSection(editNextLetter)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed text-primary text-xs font-medium hover:bg-primary/5 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add {editNextLetter}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-muted/20 rounded-xl border">
                  <Label className="text-xs font-bold text-foreground">Section Class Teachers</Label>
                  <div className="space-y-2">
                    {editSections.map((sec) => (
                      <div key={sec} className="flex items-center gap-2 text-xs">
                        <span className="w-24 font-mono font-semibold text-muted-foreground">Section {sec}:</span>
                        <CustomSelect
                          value={editSectionTeachers[sec] || editTeacher}
                          onChange={(val) =>
                            setEditSectionTeachers((prev) => ({
                              ...prev,
                              [sec]: val,
                            }))
                          }
                          options={[
                            { label: "Select Teacher...", value: "" },
                            ...staffList.map((st) => ({
                              label: `${st.full_name}${st.designation ? ` (${st.designation})` : ""}`,
                              value: st.full_name,
                            })),
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Room No</Label>
                <Input
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  placeholder="e.g. 101"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Capacity</Label>
                <Input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">RTE Auto-Pass</Label>
                <CustomSelect
                  value={editAutoPass}
                  onChange={(val) => setEditAutoPass(val)}
                  options={[
                    { label: "No (Merit / Marks)", value: "false" },
                    { label: "Yes (RTE Auto-Pass)", value: "true" },
                  ]}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingClass(null)}
                className="text-xs h-8.5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs h-8.5 bg-primary text-primary-foreground font-semibold cursor-pointer">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
