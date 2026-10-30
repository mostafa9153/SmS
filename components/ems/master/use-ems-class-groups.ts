"use client";

import { normalizeClassCode, normalizeSectionCode, isHigherSecondaryClass, toShortStream } from "@/lib/ems/seat-arrangement-algorithm";
import { calculateHsStudentStats } from "@/components/ems/auto-allocation-wizard";
import { ClassGroupConfig, ClassGroupSectionConfig, calculateSectionStudentStats, getSectionsForClass, sortClassGroups } from "@/components/ems/master/class-groups";
import type { EmsCore } from "./use-ems-core";

export function useEmsClassGroups(ctx: EmsCore) {
  const { allStudents, availableClasses, classGroups, getCustomSectionOrders, rosterModalState, setClassGroups, setRosterModalState, setSelectedClasses } = ctx;
  // Handler: Add a new class group with ALL its sections pre-selected (only picks unassigned classes)
  const handleAddClassGroup = () => {
    const existingCodes = new Set(classGroups.map((g) => normalizeClassCode(g.class)));
    const nextClass = availableClasses.find((c) => !existingCodes.has(normalizeClassCode(c)));
    if (!nextClass) return; // All available classes already added

    const isHs = isHigherSecondaryClass(nextClass);
    let newSections: ClassGroupSectionConfig[] = [];
    const initialStream = "ALL";
    const initialGender = "ALL";
    let initialRegFrom = "";
    let initialRegTo = "";

    if (isHs) {
      const stats = calculateHsStudentStats(allStudents, nextClass, "ALL", "ALL");
      initialRegFrom = stats.minRegNo;
      initialRegTo = stats.maxRegNo;
      newSections = [
        {
          section: "ALL",
          rollFrom: 1,
          rollTo: 9999,
          enrolledCount: stats.count,
          totalEnrolled: stats.totalEnrolled,
        },
      ];
    } else {
      const allSecs = getSectionsForClass(nextClass, allStudents);
      const savedOrders = getCustomSectionOrders();
      const savedOrderForClass = savedOrders[normalizeClassCode(nextClass)];
      let orderedSecs = allSecs;
      if (savedOrderForClass && savedOrderForClass.length > 0) {
        orderedSecs = [...allSecs].sort((a, b) => {
          const idxA = savedOrderForClass.indexOf(a);
          const idxB = savedOrderForClass.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });
      }
      newSections = orderedSecs.map((sec) => {
        const stats = calculateSectionStudentStats(allStudents, nextClass, sec);
        return {
          section: sec,
          rollFrom: stats.rollFrom,
          rollTo: stats.rollTo,
          enrolledCount: stats.count,
          totalEnrolled: stats.totalEnrolled,
          minRoll: stats.minRoll,
          maxRoll: stats.maxRoll,
        };
      });
    }

    const newGroup: ClassGroupConfig = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      class: nextClass,
      sections: newSections,
      stream: isHs ? initialStream : undefined,
      gender: isHs ? initialGender : undefined,
      regNoFrom: isHs ? initialRegFrom : undefined,
      regNoTo: isHs ? initialRegTo : undefined,
    };

    setClassGroups((prev) => sortClassGroups([...prev, newGroup]));
  };

  // Handler: Change the class of a group and auto-populate all its sections (swapping if already assigned)
  const handleChangeGroupClass = (groupId: string, newClassCode: string) => {
    const targetGroup = classGroups.find((g) => g.id === groupId);
    if (!targetGroup || targetGroup.class === newClassCode) return;

    const oldClassCode = targetGroup.class;
    const conflictingGroup = classGroups.find(
      (g) => g.id !== groupId && normalizeClassCode(g.class) === normalizeClassCode(newClassCode)
    );

    const buildGroupForClass = (cls: string): Partial<ClassGroupConfig> => {
      const isHs = isHigherSecondaryClass(cls);
      if (isHs) {
        const stats = calculateHsStudentStats(allStudents, cls, "ALL", "ALL");
        return {
          class: cls,
          stream: "ALL",
          gender: "ALL",
          regNoFrom: stats.minRegNo,
          regNoTo: stats.maxRegNo,
          sections: [
            {
              section: "ALL",
              rollFrom: 1,
              rollTo: 9999,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
            },
          ],
        };
      }

      const allSecs = getSectionsForClass(cls, allStudents);
      const sections = allSecs.map((sec) => {
        const stats = calculateSectionStudentStats(allStudents, cls, sec);
        return {
          section: sec,
          rollFrom: stats.rollFrom,
          rollTo: stats.rollTo,
          enrolledCount: stats.count,
          totalEnrolled: stats.totalEnrolled,
          minRoll: stats.minRoll,
          maxRoll: stats.maxRoll,
        };
      });
      return {
        class: cls,
        stream: undefined,
        gender: undefined,
        regNoFrom: undefined,
        regNoTo: undefined,
        sections,
      };
    };

    setClassGroups((prev) =>
      sortClassGroups(
        prev.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              ...buildGroupForClass(newClassCode),
            };
          }
          if (conflictingGroup && g.id === conflictingGroup.id) {
            return {
              ...g,
              ...buildGroupForClass(oldClassCode),
            };
          }
          return g;
        })
      )
    );
  };

  // Handler: Update HS fields (stream, gender, reg ranges)
  const handleUpdateHsGroup = (
    groupId: string,
    updates: Partial<{ stream: string; gender: string; regNoFrom: string; regNoTo: string }>
  ) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;

        const streamChanged = updates.stream !== undefined && updates.stream !== g.stream;
        const genderChanged = updates.gender !== undefined && updates.gender !== g.gender;

        let nextRegFrom = updates.regNoFrom !== undefined ? updates.regNoFrom : g.regNoFrom;
        let nextRegTo = updates.regNoTo !== undefined ? updates.regNoTo : g.regNoTo;

        // When gender or stream changes without explicit reg range input, auto-fill matching DB range directly into the inputs
        if ((streamChanged || genderChanged) && updates.regNoFrom === undefined && updates.regNoTo === undefined) {
          const freshStats = calculateHsStudentStats(
            allStudents,
            g.class,
            updates.stream ?? g.stream ?? "ALL",
            updates.gender ?? g.gender ?? "ALL"
          );
          nextRegFrom = freshStats.minRegNo;
          nextRegTo = freshStats.maxRegNo;
        }

        const updated = {
          ...g,
          ...updates,
          regNoFrom: nextRegFrom,
          regNoTo: nextRegTo,
        };

        const stats = calculateHsStudentStats(
          allStudents,
          updated.class,
          updated.stream || "ALL",
          updated.gender || "ALL",
          updated.regNoFrom,
          updated.regNoTo,
          g.excludedStudentIds || []
        );
        return {
          ...updated,
          sections: [
            {
              section: "ALL",
              rollFrom: 1,
              rollTo: 9999,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
              excludedStudentIds: g.excludedStudentIds || [],
            },
          ],
        };
      })
    );
  };

  // Handler: Reset HS registration number ranges to DB min/max
  const handleResetHsRegNos = (groupId: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const stats = calculateHsStudentStats(
          allStudents,
          g.class,
          g.stream || "ALL",
          g.gender || "ALL",
          undefined,
          undefined,
          g.excludedStudentIds || []
        );
        return {
          ...g,
          regNoFrom: stats.minRegNo,
          regNoTo: stats.maxRegNo,
          sections: [
            {
              section: "ALL",
              rollFrom: 1,
              rollTo: 9999,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
              excludedStudentIds: g.excludedStudentIds || [],
            },
          ],
        };
      })
    );
  };

  // Handlers for Student Roster Modal (Manual inclusion/exclusion)
  const handleOpenRosterForSection = (group: ClassGroupConfig, sec: ClassGroupSectionConfig) => {
    const targetClass = normalizeClassCode(group.class);
    const targetSec = normalizeSectionCode(sec.section);
    const sectionStudents = allStudents.filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      return (
        normalizeClassCode(s.presentClass) === targetClass &&
        normalizeSectionCode(s.presentSection) === targetSec
      );
    });

    setRosterModalState({
      open: true,
      groupId: group.id,
      sectionName: sec.section,
      classCode: group.class,
      title: `Class ${group.class} - Section ${sec.section}`,
      students: sectionStudents,
      rollFrom: sec.rollFrom,
      rollTo: sec.rollTo,
      isHs: false,
      excludedIds: sec.excludedStudentIds || [],
    });
  };

  const handleOpenRosterForHs = (group: ClassGroupConfig) => {
    const targetClass = normalizeClassCode(group.class);
    const streamShort = group.stream && group.stream !== "ALL" ? toShortStream(group.stream) : null;
    const isBoyFilter =
      group.gender && group.gender !== "ALL"
        ? group.gender.toLowerCase().startsWith("boy") || group.gender.toLowerCase() === "male"
        : null;

    const hsStudents = allStudents.filter((s) => {
      if (s.currentStatus && s.currentStatus !== "Continuing") return false;
      if (normalizeClassCode(s.presentClass) !== targetClass) return false;
      if (streamShort && toShortStream(s.academicStream) !== streamShort) return false;
      if (isBoyFilter !== null) {
        if (isBoyFilter && s.gender !== "Male") return false;
        if (!isBoyFilter && s.gender !== "Female") return false;
      }
      return true;
    });

    setRosterModalState({
      open: true,
      groupId: group.id,
      classCode: group.class,
      title: `Class ${group.class} (${group.stream || "ALL"} Stream)`,
      students: hsStudents,
      regNoFrom: group.regNoFrom,
      regNoTo: group.regNoTo,
      isHs: true,
      excludedIds: group.excludedStudentIds || [],
    });
  };

  const handleSaveRosterExclusions = (excludedIds: string[]) => {
    if (rosterModalState.isHs) {
      setClassGroups((prev) =>
        prev.map((g) => {
          if (g.id !== rosterModalState.groupId) return g;
          const stats = calculateHsStudentStats(
            allStudents,
            g.class,
            g.stream || "ALL",
            g.gender || "ALL",
            g.regNoFrom,
            g.regNoTo,
            excludedIds
          );
          return {
            ...g,
            excludedStudentIds: excludedIds,
            sections: [
              {
                section: "ALL",
                rollFrom: 1,
                rollTo: 9999,
                enrolledCount: stats.count,
                totalEnrolled: stats.totalEnrolled,
                excludedStudentIds: excludedIds,
              },
            ],
          };
        })
      );
    } else {
      setClassGroups((prev) =>
        prev.map((g) => {
          if (g.id !== rosterModalState.groupId) return g;
          return {
            ...g,
            sections: g.sections.map((s) => {
              if (s.section !== rosterModalState.sectionName) return s;
              const stats = calculateSectionStudentStats(
                allStudents,
                g.class,
                s.section,
                s.rollFrom,
                s.rollTo,
                excludedIds
              );
              return {
                ...s,
                excludedStudentIds: excludedIds,
                enrolledCount: stats.count,
                totalEnrolled: stats.totalEnrolled,
              };
            }),
          };
        })
      );
    }
  };

  // Handler: Remove an entire class group (keeps Step 1 selectedClasses in sync)
  const handleRemoveClassGroup = (groupId: string) => {
    const target = classGroups.find((g) => g.id === groupId);
    if (target) {
      const norm = normalizeClassCode(target.class);
      setSelectedClasses((prev) =>
        prev.filter((c) => normalizeClassCode(c) !== norm)
      );
    }
    setClassGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Handler: Remove a specific section from a group
  const handleRemoveSection = (groupId: string, sectionToRemove: string) => {
    setClassGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              sections: g.sections.filter((s) => s.section !== sectionToRemove),
            }
          : g
      )
    );
  };

  // Handler: Add a section back to a group with its auto-detected student stats
  const handleAddSectionToGroup = (groupId: string, sectionToAdd: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.sections.some((s) => s.section === sectionToAdd)) return g;
        const stats = calculateSectionStudentStats(allStudents, g.class, sectionToAdd);
        const newSec: ClassGroupSectionConfig = {
          section: sectionToAdd,
          rollFrom: stats.rollFrom,
          rollTo: stats.rollTo,
          enrolledCount: stats.count,
          totalEnrolled: stats.totalEnrolled,
          minRoll: stats.minRoll,
          maxRoll: stats.maxRoll,
        };
        const updated = [...g.sections, newSec].sort((a, b) =>
          a.section.localeCompare(b.section)
        );
        return {
          ...g,
          sections: updated,
        };
      })
    );
  };

  // Handler: Update roll range for a section
  const handleUpdateSectionRoll = (
    groupId: string,
    sectionName: string,
    field: "rollFrom" | "rollTo",
    value: number
  ) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          sections: g.sections.map((s) => {
            if (s.section !== sectionName) return s;
            const updatedRollFrom = field === "rollFrom" ? value : s.rollFrom;
            const updatedRollTo = field === "rollTo" ? value : s.rollTo;
            const stats = calculateSectionStudentStats(
              allStudents,
              g.class,
              sectionName,
              updatedRollFrom,
              updatedRollTo,
              s.excludedStudentIds || []
            );
            return {
              ...s,
              [field]: value,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
              minRoll: stats.minRoll,
              maxRoll: stats.maxRoll,
            };
          }),
        };
      })
    );
  };

  // Handler: Reset a single section back to its database roll range
  const handleResetSectionRoll = (groupId: string, sectionName: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          sections: g.sections.map((s) => {
            if (s.section !== sectionName) return s;
            const stats = calculateSectionStudentStats(
              allStudents,
              g.class,
              sectionName,
              undefined,
              undefined,
              s.excludedStudentIds || []
            );
            return {
              ...s,
              rollFrom: stats.rollFrom,
              rollTo: stats.rollTo,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
              minRoll: stats.minRoll,
              maxRoll: stats.maxRoll,
            };
          }),
        };
      })
    );
  };

  // Handler: Reset all sections in a group to their database roll ranges
  const handleResetGroupRolls = (groupId: string) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          sections: g.sections.map((s) => {
            const stats = calculateSectionStudentStats(
              allStudents,
              g.class,
              s.section,
              undefined,
              undefined,
              s.excludedStudentIds || []
            );
            return {
              ...s,
              rollFrom: stats.rollFrom,
              rollTo: stats.rollTo,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
              minRoll: stats.minRoll,
              maxRoll: stats.maxRoll,
            };
          }),
        };
      })
    );
  };

  // Handler: Add all unselected sections to a group at once
  const handleAddAllSectionsToGroup = (groupId: string, sectionsToAdd: string[]) => {
    setClassGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const existingNames = new Set(g.sections.map((s) => s.section));
        const newSecs: ClassGroupSectionConfig[] = sectionsToAdd
          .filter((s) => !existingNames.has(s))
          .map((sec) => {
            const stats = calculateSectionStudentStats(allStudents, g.class, sec);
            return {
              section: sec,
              rollFrom: stats.rollFrom,
              rollTo: stats.rollTo,
              enrolledCount: stats.count,
              totalEnrolled: stats.totalEnrolled,
              minRoll: stats.minRoll,
              maxRoll: stats.maxRoll,
            };
          });
        const updated = [...g.sections, ...newSecs].sort((a, b) =>
          a.section.localeCompare(b.section)
        );
        return {
          ...g,
          sections: updated,
        };
      })
    );
  };

  return {
    handleAddAllSectionsToGroup,
    handleAddClassGroup,
    handleAddSectionToGroup,
    handleChangeGroupClass,
    handleOpenRosterForHs,
    handleOpenRosterForSection,
    handleRemoveClassGroup,
    handleRemoveSection,
    handleResetGroupRolls,
    handleResetHsRegNos,
    handleResetSectionRoll,
    handleSaveRosterExclusions,
    handleUpdateHsGroup,
    handleUpdateSectionRoll,
  };
}