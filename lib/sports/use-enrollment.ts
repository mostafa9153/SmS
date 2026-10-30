"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { useAcademicYear } from "@/lib/hooks/use-academic-year";
import { useRefreshSports } from "./use-sports-events";
import type { SportsEvent, SportsParticipant } from "./types";

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Enrol, remove and chest-number actions for one event. Each refreshes every sports query. */
export function useEnrollment(eventId: string, event: SportsEvent | undefined) {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const academicYear = useAcademicYear();
  const refresh = useRefreshSports();

  const enroll = async (studentIds: string[]): Promise<boolean> => {
    if (!studentIds.length) return false;
    setIsEnrolling(true);
    try {
      const { enrolledCount } = await apiFetch<{ enrolledCount: number }>("/api/sports/registrations", {
        method: "POST",
        json: { eventId, studentIds },
      });
      toast.success(`Enrolled ${enrolledCount} student(s)`);
      refresh();
      return true;
    } catch (err) {
      toast.error(message(err, "Failed to enroll students"));
      return false;
    } finally {
      setIsEnrolling(false);
    }
  };

  const remove = async (p: SportsParticipant) => {
    try {
      const { undoId } = await apiFetch<{ undoId?: string }>(
        `/api/sports/registrations?eventId=${eventId}&studentId=${p.studentId}`,
        { method: "DELETE" },
      );
      toastWithUndo(`${p.studentName} removed`, undoId, refresh);
      refresh();
    } catch (err) {
      toast.error(message(err, "Removal failed"));
    }
  };

  const updateChestNumber = async (studentId: string, chestNumber: string): Promise<boolean> => {
    if (!chestNumber.trim()) return false;
    try {
      const { undoId } = await apiFetch<{ undoId?: string }>("/api/sports/athletes", {
        method: "POST",
        json: { studentId, chestNumber: chestNumber.trim(), academicYear: event?.academicYear ?? academicYear },
      });
      toastWithUndo("Chest number updated", undoId, refresh);
      refresh();
      return true;
    } catch (err) {
      toast.error(message(err, "Update failed"));
      return false;
    }
  };

  return { enroll, remove, updateChestNumber, isEnrolling };
}
