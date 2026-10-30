"use client";

import type { EmsPrintStudioProps } from "./props";
import { useState, useEffect, useMemo, useRef } from "react";
import { PrintDocType, ExamHalf } from "@/lib/ems/types";
import { getSavedSchoolProfile, SchoolProfileData } from "@/lib/utils/school-profile";
import { getDynamicSubjectsForClasses, getDatabaseSubjectsForClass, syncAllEmsConfigsFromDb, formatRoomName } from "@/lib/ems/ems-config-loader";
import { isHigherSecondaryClass } from "@/lib/ems/seat-arrangement-algorithm";
import { getSavedMarksSchemes } from "@/lib/utils/marks-config";


export function useEmsPrintStudio({
  allocation,
  defaultRoomId = "ALL",
  defaultDoc = "admit",
  onBackToStep4,
  onViewBlueprint,
  onClose,
  isDialog = false,
}: EmsPrintStudioProps) {
  const [activeDoc, setActiveDoc] = useState<PrintDocType>(defaultDoc);
  const [targetRoomId, setTargetRoomId] = useState<string>(defaultRoomId);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [admitCardsPerPage, setAdmitCardsPerPage] = useState<number>(8);
  const [benchSlipsPerPage, setBenchSlipsPerPage] = useState<number>(33);
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [isRoomPopoverOpen, setIsRoomPopoverOpen] = useState<boolean>(false);
  const [roomSearch, setRoomSearch] = useState<string>("");
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>(getSavedSchoolProfile());
  const [mounted, setMounted] = useState<boolean>(false);

  const roomPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  // Click outside listener for room selector popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        roomPopoverRef.current &&
        !roomPopoverRef.current.contains(event.target as Node)
      ) {
        setIsRoomPopoverOpen(false);
      }
    };
    if (isRoomPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRoomPopoverOpen]);

  // Options & Settings state
  const [examHalf, setExamHalf] = useState<ExamHalf>("1st Half");
  const [issueDate, setIssueDate] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  });
  const [showAdmitSignature, setShowAdmitSignature] = useState<boolean>(true);
  const [includeBackSideRoutine, setIncludeBackSideRoutine] = useState<boolean>(true);

  // Dynamically extract unique classes in this exam allocation
  const uniqueClasses = useMemo(() => {
    return Array.from(
      new Set(
        (allocation.summary?.classesAllocated || allocation.roomAllocations?.flatMap((r) => r.classesPresent || []) || [])
          .map((c) => c.split("-")[0].trim())
      )
    );
  }, [allocation]);

  // Dynamically extract only the subjects saved in Settings for the classes in this exam allocation
  const availableSubjects = useMemo(() => {
    const subsSet = new Set<string>();
    uniqueClasses.forEach((cls) => {
      const classSubs = getDatabaseSubjectsForClass(cls);
      classSubs.forEach((sub) => {
        if (sub && sub.trim()) subsSet.add(sub.trim());
      });
    });

    if (subsSet.size === 0) {
      const allSchemes = getSavedMarksSchemes();
      allSchemes.forEach((s) => {
        (s.subjects || []).forEach((sub) => {
          if (sub && sub.trim()) subsSet.add(sub.trim().replace(/\s*\([^)]*\)/g, "").trim());
        });
      });
    }

    if (subsSet.size === 0) {
      return [
        "Bengali",
        "English",
        "Mathematics",
        "Physical Science",
        "Life Science",
        "History",
        "Geography",
        "Health & Physical Education",
      ];
    }

    return Array.from(subsSet);
  }, [uniqueClasses]);

  // Helper to load clean preset subjects for any class
  const loadPresetSubjectsForClass = (cls: string): string[] => {
    const cleanCls = (cls || "VII").trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
    const subs = getDatabaseSubjectsForClass(cleanCls, [], false);
    if (subs && subs.length > 0) return subs;
    return isHigherSecondaryClass(cleanCls)
      ? ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biology"]
      : ["Bengali", "English", "Mathematics", "Physical Science", "Life Science", "History", "Geography"];
  };

  const [classSubjectsConfig, setClassSubjectsConfig] = useState<Record<string, { headers: string[]; dates: string[] }>>(() => {
    const init: Record<string, { headers: string[]; dates: string[] }> = {};
    uniqueClasses.forEach((cls) => {
      const subs = loadPresetSubjectsForClass(cls);
      init[cls] = {
        headers: subs,
        dates: Array(subs.length).fill(""),
      };
    });
    return init;
  });

  const [selectedClassTab, setSelectedClassTab] = useState<string>(() => uniqueClasses[0] || "");

  // Update classSubjectsConfig whenever uniqueClasses change or missing
  useEffect(() => {
    setClassSubjectsConfig((prev) => {
      let changed = false;
      const updated = { ...prev };
      uniqueClasses.forEach((cls) => {
        if (!updated[cls] || updated[cls].headers.length === 0) {
          const subs = loadPresetSubjectsForClass(cls);
          updated[cls] = {
            headers: subs,
            dates: Array(subs.length).fill(""),
          };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });

    if (uniqueClasses.length > 0 && (!selectedClassTab || !uniqueClasses.includes(selectedClassTab))) {
      setSelectedClassTab(uniqueClasses[0]);
    }
  }, [uniqueClasses]);

  const activeClass = selectedClassTab || uniqueClasses[0] || "";
  const activeClassConfig = classSubjectsConfig[activeClass] || {
    headers: getDynamicSubjectsForClasses(uniqueClasses, allocation.examType),
    dates: Array(getDynamicSubjectsForClasses(uniqueClasses, allocation.examType).length).fill(""),
  };

  const getClassesForSubject = (subjectName: string): string[] => {
    if (!subjectName) return [];
    const clean = subjectName.trim().toLowerCase();
    return uniqueClasses.filter((c) => {
      const list = classSubjectsConfig[c]?.headers || [];
      return list.some((s) => s.trim().toLowerCase() === clean);
    });
  };

  const handleActiveHeaderChange = (index: number, val: string) => {
    setClassSubjectsConfig((prev) => {
      const cur = prev[activeClass] || { headers: [...activeClassConfig.headers], dates: [...activeClassConfig.dates] };
      const nextHeaders = [...cur.headers];
      nextHeaders[index] = val;
      return { ...prev, [activeClass]: { ...cur, headers: nextHeaders } };
    });
  };

  const handleActiveDateChange = (index: number, val: string) => {
    setClassSubjectsConfig((prev) => {
      const cur = prev[activeClass] || { headers: [...activeClassConfig.headers], dates: [...activeClassConfig.dates] };
      const nextDates = [...cur.dates];
      nextDates[index] = val;
      return { ...prev, [activeClass]: { ...cur, dates: nextDates } };
    });
  };

  const handleActiveAddSubject = () => {
    setClassSubjectsConfig((prev) => {
      const cur = prev[activeClass] || { headers: [...activeClassConfig.headers], dates: [...activeClassConfig.dates] };
      if (cur.headers.length >= 10) return prev;
      return {
        ...prev,
        [activeClass]: {
          headers: [...cur.headers, `Subject ${cur.headers.length + 1}`],
          dates: [...cur.dates, ""],
        },
      };
    });
  };

  const handleActiveRemoveSubject = (index: number) => {
    setClassSubjectsConfig((prev) => {
      const cur = prev[activeClass] || { headers: [...activeClassConfig.headers], dates: [...activeClassConfig.dates] };
      if (cur.headers.length <= 1) return prev;
      return {
        ...prev,
        [activeClass]: {
          headers: cur.headers.filter((_, i) => i !== index),
          dates: cur.dates.filter((_, i) => i !== index),
        },
      };
    });
  };

  const handleActiveResetSubjects = () => {
    const defaults = loadPresetSubjectsForClass(activeClass);
    setClassSubjectsConfig((prev) => ({
      ...prev,
      [activeClass]: {
        headers: defaults,
        dates: Array(defaults.length).fill(""),
      },
    }));
  };

  const handleActiveFillConsecutiveDates = (startOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + startOffset);
    const newDates: string[] = [];
    const cur = new Date(d);
    const count = activeClassConfig.headers.length;
    while (newDates.length < count) {
      if (cur.getDay() !== 0) {
        const day = String(cur.getDate()).padStart(2, "0");
        const month = String(cur.getMonth() + 1).padStart(2, "0");
        newDates.push(`${day}/${month}`);
      }
      cur.setDate(cur.getDate() + 1);
    }
    setClassSubjectsConfig((prev) => ({
      ...prev,
      [activeClass]: {
        ...activeClassConfig,
        dates: newDates,
      },
    }));
  };

  const [examHeaders, setExamHeaders] = useState<string[]>(() =>
    getDynamicSubjectsForClasses(uniqueClasses, allocation.examType)
  );
  const [examDates, setExamDates] = useState<string[]>(() =>
    Array(getDynamicSubjectsForClasses(uniqueClasses, allocation.examType).length || 6).fill("")
  );

  useEffect(() => {
    // Fetch freshest school profile & configs from database
    syncAllEmsConfigsFromDb().then(({ profile }) => {
      setSchoolProfile(profile);
    });
  }, []);

  // Real-time listener for school profile changes across tabs/windows
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setSchoolProfile(e.detail);
      }
    };
    window.addEventListener("sms_school_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("sms_school_profile_updated", handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (defaultRoomId) {
      setTargetRoomId(defaultRoomId);
    }
  }, [defaultRoomId]);

  useEffect(() => {
    if (defaultDoc) {
      setActiveDoc(defaultDoc);
    }
  }, [defaultDoc]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 120);
  };

  // Keyboard shortcut: Ctrl + P to trigger print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Total student & room calculations
  const rooms = allocation.roomAllocations || [];
  const selectedRooms =
    targetRoomId === "ALL"
      ? rooms
      : rooms.filter((r) => r.roomId === targetRoomId);

  const totalOccupiedStudents = selectedRooms.reduce(
    (acc, r) => acc + r.seats.filter((s) => !s.isVacant && s.studentName).length,
    0
  );

  const allRoomsTotalStudents = rooms.reduce(
    (acc, r) => acc + r.seats.filter((s) => !s.isVacant && s.studentName).length,
    0
  );

  const cardsPerPage = orientation === "landscape" ? 20 : 21;
  const effectiveSlipsPerPage =
    benchSlipsPerPage === 33 || benchSlipsPerPage === 32
      ? 33
      : benchSlipsPerPage === 24
        ? 24
        : orientation === "landscape"
          ? 56
          : 57;

  const totalPagesAdmit = Math.ceil(totalOccupiedStudents / (admitCardsPerPage === 8 ? 8 : cardsPerPage)) || 1;
  const totalPagesSlips = Math.ceil(totalOccupiedStudents / effectiveSlipsPerPage) || 1;
  const totalPagesAttendance =
    selectedRooms.reduce((acc, r) => {
      const studentCount = r.seats.filter((s) => !s.isVacant && s.studentName).length;
      return acc + Math.max(1, Math.ceil(studentCount / 50));
    }, 0) || 1;
  const totalPagesGate = selectedRooms.length || 1;

  const currentTotalPages =
    activeDoc === "admit"
      ? totalPagesAdmit
      : activeDoc === "slips"
        ? totalPagesSlips
        : activeDoc === "attendance"
          ? totalPagesAttendance
          : totalPagesGate;

  // Selected room metadata for display
  const activeRoomObj = rooms.find((r) => r.roomId === targetRoomId);

  // Filtered rooms for room selector search
  const filteredRooms = rooms.filter((r) => {
    if (!roomSearch.trim()) return true;
    const q = roomSearch.toLowerCase();
    const formatted = formatRoomName(r.roomNumber).toLowerCase();
    return (
      formatted.includes(q) ||
      (r.floor && r.floor.toLowerCase().includes(q)) ||
      (r.building && r.building.toLowerCase().includes(q))
    );
  });

  const handleHeaderChange = (index: number, val: string) => {
    const updated = [...examHeaders];
    updated[index] = val;
    setExamHeaders(updated);
  };

  const handleDateChange = (index: number, val: string) => {
    const updated = [...examDates];
    updated[index] = val;
    setExamDates(updated);
  };

  const handleAddSubjectColumn = () => {
    if (examHeaders.length >= 10) return;
    const nextIdx = examHeaders.length + 1;
    setExamHeaders([...examHeaders, `Subject ${nextIdx}`]);
    setExamDates([...examDates, ""]);
  };

  const handleRemoveSubjectColumn = (index: number) => {
    if (examHeaders.length <= 1) return;
    setExamHeaders(examHeaders.filter((_, i) => i !== index));
    setExamDates(examDates.filter((_, i) => i !== index));
  };

  const handleResetSubjects = () => {
    const defaultSubs = getDynamicSubjectsForClasses(uniqueClasses, allocation.examType);
    setExamHeaders(defaultSubs);
    setExamDates(Array(defaultSubs.length).fill(""));
  };

  const setTodayDate = () => {
    const d = new Date();
    setIssueDate(
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    );
  };

  const backAction = onBackToStep4 || onClose;

  return {
    activeClass,
    activeClassConfig,
    activeDoc,
    activeRoomObj,
    admitCardsPerPage,
    allRoomsTotalStudents,
    allocation,
    availableSubjects,
    backAction,
    benchSlipsPerPage,
    classSubjectsConfig,
    currentTotalPages,
    examHalf,
    filteredRooms,
    getClassesForSubject,
    handleActiveAddSubject,
    handleActiveDateChange,
    handleActiveHeaderChange,
    handleActiveRemoveSubject,
    handleActiveResetSubjects,
    handlePrint,
    includeBackSideRoutine,
    isDialog,
    isOptionsOpen,
    isRoomPopoverOpen,
    issueDate,
    mounted,
    onBackToStep4,
    onClose,
    orientation,
    roomPopoverRef,
    roomSearch,
    rooms,
    schoolProfile,
    setActiveDoc,
    setAdmitCardsPerPage,
    setBenchSlipsPerPage,
    setExamHalf,
    setIncludeBackSideRoutine,
    setIsOptionsOpen,
    setIsRoomPopoverOpen,
    setIssueDate,
    setOrientation,
    setRoomSearch,
    setSelectedClassTab,
    setShowAdmitSignature,
    setTargetRoomId,
    setTodayDate,
    showAdmitSignature,
    targetRoomId,
    totalOccupiedStudents,
    uniqueClasses,
  };
}

export type EmsPrintStudioState = ReturnType<typeof useEmsPrintStudio>;
