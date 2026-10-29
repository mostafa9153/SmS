"use client";

import { apiFetch } from "@/lib/api/client";
import React, { useState, useEffect } from "react";
import { showToast } from "@/components/ui/toast-banner";
import { createClient } from "@/lib/supabase/client";
import { syncClassTeachersToRoutine, syncConfiguredClassesToRoutine, parseClassSectionLabel } from "@/lib/routine/routine-sync";
import { getClassStreamList } from "@/lib/utils/school-profile";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ClassItem } from "@/components/settings/class-management/types";
import { DEFAULT_CLASSES } from "@/components/settings/class-management/constants";
import { getNextAvailableLetter, isHigherSecondaryClass } from "@/components/settings/class-management/helpers";

export function useClassManagement() {
  const confirm = useConfirm();
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

    apiFetch("/api/school-config", { method: "POST", json: { key: "class_management", value: updated } })
      .then(() => {
        import("@/lib/utils/school-config-client").then(({ invalidateSchoolConfigClientCache }) =>
          invalidateSchoolConfigClientCache()
        );
      })
      .catch((err) => console.warn("Background DB sync for classes failed:", err));
  };

  useEffect(() => {
    const sanitizeWithDefaultSectionTeacher = (list: ClassItem[]): ClassItem[] => {
      return list.map((c) => {
        const isHs = isHigherSecondaryClass(c.code, c.name);
        const sTeachers = c.sectionTeachers ? { ...c.sectionTeachers } : {};
        if (c.classTeacher && Object.keys(sTeachers).length === 0) {
          const firstSec = c.sections && c.sections.length > 0 ? c.sections[0] : "A";
          sTeachers[firstSec] = c.classTeacher;
          sTeachers[`Section ${firstSec}`] = c.classTeacher;
        }
        return {
          ...c,
          stream: isHs ? (c.stream || "Arts / Science / Commerce") : undefined,
          sectionTeachers: Object.keys(sTeachers).length > 0 ? sTeachers : undefined,
        };
      });
    };

    // 1. LocalStorage
    try {
      const savedClasses = localStorage.getItem("sms_class_management");
      if (savedClasses) {
        const parsed = JSON.parse(savedClasses) as ClassItem[];
        setClasses(sanitizeWithDefaultSectionTeacher(parsed));
      }
    } catch (e) {
      console.error("Failed to load local class presets", e);
    }

    // 2. Database fetch
    import("@/lib/utils/school-config-client").then(({ fetchSchoolConfigClient }) => {
      fetchSchoolConfigClient()
        .then((data) => {
          if (data && data.class_management && Array.isArray(data.class_management) && data.class_management.length > 0) {
            const sanitized = sanitizeWithDefaultSectionTeacher(data.class_management);
            setClasses(sanitized);
            localStorage.setItem("sms_class_management", JSON.stringify(sanitized));
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

    // 4. Routine teacher assignments check to automatically backfill section teachers
    try {
      const rawRoutine = localStorage.getItem("sms_routine_state");
      const localTeachers: { name: string; classTeacherOf?: string | null }[] = rawRoutine
        ? JSON.parse(rawRoutine)?.teachers || []
        : [];

      supabase
        .from("routine_teacher_availability")
        .select("teacher_name, class_teacher_of")
        .not("class_teacher_of", "is", null)
        .then(({ data: dbAvail }) => {
          const assignments: { teacherName: string; label: string }[] = [];

          localTeachers.forEach((t) => {
            if (t.name && t.classTeacherOf && t.classTeacherOf !== "__none__") {
              assignments.push({ teacherName: t.name, label: t.classTeacherOf });
            }
          });

          if (dbAvail && dbAvail.length > 0) {
            dbAvail.forEach((a: any) => {
              if (a.teacher_name && a.class_teacher_of && a.class_teacher_of !== "__none__") {
                if (!assignments.some((x) => x.teacherName.toLowerCase() === a.teacher_name.toLowerCase())) {
                  assignments.push({ teacherName: a.teacher_name, label: a.class_teacher_of });
                }
              }
            });
          }

          if (assignments.length > 0) {
            setClasses((prev) => {
              let changed = false;
              const next = prev.map((cls) => {
                const sTeachers = { ...(cls.sectionTeachers || {}) };
                let clsChanged = false;

                assignments.forEach(({ teacherName, label }) => {
                  const parsed = parseClassSectionLabel(label);
                  if (parsed && parsed.className.toLowerCase() === cls.name.toLowerCase()) {
                    const cleanSec = parsed.section.replace(/^Section\s+/i, "");
                    if (!sTeachers[cleanSec] && !sTeachers[`Section ${cleanSec}`]) {
                      sTeachers[cleanSec] = teacherName;
                      sTeachers[`Section ${cleanSec}`] = teacherName;
                      clsChanged = true;
                    }
                  }
                });

                if (clsChanged) {
                  changed = true;
                  return { ...cls, sectionTeachers: sTeachers };
                }
                return cls;
              });

              if (changed) {
                if (typeof window !== "undefined") {
                  localStorage.setItem("sms_class_management", JSON.stringify(next));
                }
                return next;
              }
              return prev;
            });
          }
        });
    } catch (e) {
      console.warn("Routine state teacher mapping:", e);
    }
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
        secs.forEach((sec, idx) => {
          const t =
            newSectionTeachers[`${st} - ${sec}`] ||
            newSectionTeachers[`${st}::${sec}`] ||
            newSectionTeachers[`${sec} (${st})`] ||
            newSectionTeachers[`Sec ${sec} (${st})`] ||
            newSectionTeachers[sec] ||
            newSectionTeachers[`Section ${sec}`] ||
            (idx === 0 && st === activeStreamsList[0] ? newTeacher : "");
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
      finalSections.forEach((sec, idx) => {
        const t =
          newSectionTeachers[sec] ||
          newSectionTeachers[`Section ${sec}`] ||
          (idx === 0 ? newTeacher : "");
        if (t && t.trim()) {
          finalSectionTeachers[sec] = t.trim();
          finalSectionTeachers[`Section ${sec}`] = t.trim();
        }
      });
    }
    const primaryTeacher =
      finalSectionTeachers[finalSections[0]] ||
      Object.values(finalSectionTeachers)[0] ||
      newTeacher.trim() ||
      undefined;

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
    const secs = cls.sections && cls.sections.length > 0 ? [...cls.sections] : ["A"];
    setEditSections(secs);
    setEditStream(cls.stream || "Arts / Science / Commerce");

    const streamSecs: Record<string, string[]> = cls.streamSections
      ? { ...cls.streamSections }
      : {};
    const streamsList = getClassStreamList(cls.stream || "Arts / Science / Commerce");
    streamsList.forEach((s) => {
      if (!streamSecs[s] || !Array.isArray(streamSecs[s]) || streamSecs[s].length === 0) {
        streamSecs[s] = [...secs];
      }
    });
    setEditStreamSections(streamSecs);

    setEditTeacher(cls.classTeacher || "");
    const sTeachers: Record<string, string> = cls.sectionTeachers ? { ...cls.sectionTeachers } : {};
    if (cls.classTeacher && Object.keys(sTeachers).length === 0) {
      const firstSec = secs[0] || "A";
      sTeachers[firstSec] = cls.classTeacher;
      sTeachers[`Section ${firstSec}`] = cls.classTeacher;
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
        const nextSecTeachers = c.sectionTeachers ? { ...c.sectionTeachers } : undefined;
        if (nextSecTeachers) {
          delete nextSecTeachers[sectionToRemove];
          delete nextSecTeachers[`Section ${sectionToRemove}`];
          delete nextSecTeachers[`Sec ${sectionToRemove}`];
        }
        return {
          ...c,
          sections: c.sections.filter((s) => s !== sectionToRemove),
          sectionTeachers: nextSecTeachers && Object.keys(nextSecTeachers).length > 0 ? nextSecTeachers : undefined,
        };
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
            "";
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
        const t = editSectionTeachers[sec] || editSectionTeachers[`Section ${sec}`] || "";
        if (t && t.trim()) {
          finalSectionTeachers[sec] = t.trim();
          finalSectionTeachers[`Section ${sec}`] = t.trim();
        }
      });
    }
    const primaryTeacher =
      finalSectionTeachers[finalSections[0]] ||
      Object.values(finalSectionTeachers)[0] ||
      undefined;

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

  const handleDeleteClass = async (id: string, name: string) => {
    if (await confirm({ title: `Are you sure you want to remove ${name} from class management?`, destructive: true })) {
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

  return {
    classes,
    editAutoPass,
    editCapacity,
    editClassCode,
    editClassName,
    editNextLetter,
    editRoom,
    editSectionTeachers,
    editSections,
    editStream,
    editStreamSections,
    editingClass,
    handleAddAddModalStreamSection,
    handleAddClass,
    handleAddEditModalStreamSection,
    handleAddEditSection,
    handleAddNewModalSection,
    handleDeleteClass,
    handleOpenEditClass,
    handleQuickAddSection,
    handleQuickAddStreamSection,
    handleQuickRemoveSection,
    handleQuickRemoveStreamSection,
    handleRemoveAddModalStreamSection,
    handleRemoveEditModalStreamSection,
    handleRemoveEditSection,
    handleRemoveNewModalSection,
    handleSaveEditClass,
    isAddClassOpen,
    isAddingHs,
    isEditingHs,
    newAutoPass,
    newCapacity,
    newClassCode,
    newClassName,
    newNextLetter,
    newRoom,
    newSectionTeachers,
    newSections,
    newStream,
    newStreamSections,
    setEditAutoPass,
    setEditCapacity,
    setEditRoom,
    setEditSectionTeachers,
    setEditStream,
    setEditStreamSections,
    setEditingClass,
    setIsAddClassOpen,
    setNewAutoPass,
    setNewCapacity,
    setNewClassCode,
    setNewClassName,
    setNewRoom,
    setNewSectionTeachers,
    setNewStream,
    setNewStreamSections,
    staffList,
    toggleEditStream,
    toggleNewStream,
  };
}

export type ClassManagementState = ReturnType<typeof useClassManagement>;
