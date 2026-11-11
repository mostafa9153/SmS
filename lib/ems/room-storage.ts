// EMS Allocation Storage Utility (rooms live in the rooms table: lib/rooms)
import type { ExamAllocation } from "./types";

const ALLOCATIONS_STORAGE_KEY = "sms_ems_saved_allocations_v1";
const ACTIVE_ALLOCATION_STORAGE_KEY = "sms_ems_active_allocation_v1";

// Maximum number of full exam allocations to retain (last 10 seat arrangements)
const MAX_SAVED_ALLOCATIONS = 10;

// In-memory runtime cache for resilience if storage quota is strictly exhausted
let memoryAllocations: ExamAllocation[] | null = null;
let memoryActiveAllocation: ExamAllocation | null = null;


// Safely write to storage with fallback
function safeWriteItem(key: string, value: any): boolean {
  if (typeof window === "undefined") return false;
  try {
    const serialized = JSON.stringify(value);
    try {
      localStorage.setItem(key, serialized);
      try {
        sessionStorage.removeItem(key);
      } catch {}
      return true;
    } catch (err: any) {
      console.warn(`[EMS Storage] localStorage setItem failed for key "${key}", attempting fallback:`, err?.message || err);
      try {
        localStorage.removeItem(key);
      } catch {}
      try {
        sessionStorage.setItem(key, serialized);
        return true;
      } catch (sessionErr) {
        console.warn(`[EMS Storage] sessionStorage setItem also failed for key "${key}":`, sessionErr);
        try {
          sessionStorage.removeItem(key);
        } catch {}
        return false;
      }
    }
  } catch (serializationErr) {
    console.error(`[EMS Storage] JSON stringify failed for key "${key}":`, serializationErr);
    return false;
  }
}

/**
 * Robust DB Sync helper for EMS data key-value persistence via /api/school-config.
 * Validates HTTP response status and handles error logging gracefully.
 */
async function syncKeyToDb(key: string, value: any): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn(
        `[EMS Storage] DB Sync failed for key "${key}" (HTTP status ${res.status}):`,
        errData.error || res.statusText
      );
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[EMS Storage] Network error syncing "${key}" to DB:`, err?.message || err);
    return false;
  }
}
// Retrieve saved exam allocations
export function getSavedAllocations(): ExamAllocation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALLOCATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryAllocations = parsed;
        return parsed;
      }
    }
    // Check sessionStorage fallback
    const sessionRaw = sessionStorage.getItem(ALLOCATIONS_STORAGE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (Array.isArray(parsed)) {
        memoryAllocations = parsed;
        return parsed;
      }
    }
    return memoryAllocations || [];
  } catch (err) {
    console.error("[EMS Storage] Error reading allocations:", err);
    return memoryAllocations || [];
  }
}

/**
 * Fetch saved allocations directly from Supabase / API Database and sync locally
 */
export async function fetchAllocationsFromDb(): Promise<ExamAllocation[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/school-config?key=ems_allocations");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        const dbAllocations: ExamAllocation[] = data.data.slice(0, MAX_SAVED_ALLOCATIONS);
        safePersistAllocations(dbAllocations);
        return dbAllocations;
      }
    }
  } catch (err) {
    console.warn("[EMS Storage] Could not fetch allocations from DB:", err);
  }
  return getSavedAllocations();
}/**
 * Quota-safe writer for allocations.
 * Progressively prunes older allocations when localStorage quota is exceeded.
 */
function safePersistAllocations(allocations: ExamAllocation[]): void {
  if (typeof window === "undefined") return;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    memoryAllocations = [];
    try {
      localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify([]));
    } catch {
      try {
        localStorage.removeItem(ALLOCATIONS_STORAGE_KEY);
      } catch {}
    }
    try {
      sessionStorage.removeItem(ALLOCATIONS_STORAGE_KEY);
    } catch {}
    return;
  }

  // Always enforce max limit on allocations retained
  const cappedAllocations = allocations.slice(0, MAX_SAVED_ALLOCATIONS);
  memoryAllocations = cappedAllocations;

  let savedSuccessfully = false;

  // Progressive eviction loop: try saving capped list, then 4, 3, 2, 1 if QuotaExceededError is thrown
  for (let count = cappedAllocations.length; count >= 1; count--) {
    const subset = cappedAllocations.slice(0, count);
    try {
      localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(subset));
      savedSuccessfully = true;
      try {
        sessionStorage.removeItem(ALLOCATIONS_STORAGE_KEY);
      } catch {}
      if (count < cappedAllocations.length) {
        console.warn(
          `[EMS Storage] Pruned older allocations to fit browser storage quota (retained ${count} of ${cappedAllocations.length}).`
        );
      }
      break;
    } catch (err: any) {
      // If quota exceeded, continue loop to try smaller subset
      console.warn(`[EMS Storage] localStorage quota exceeded attempting to save ${count} allocations, evicting oldest...`);
    }
  }

  // If even a single allocation failed to fit in localStorage, fallback to sessionStorage and memory
  if (!savedSuccessfully) {
    // Remove stale data from localStorage so it doesn't shadow sessionStorage fallback
    try {
      localStorage.removeItem(ALLOCATIONS_STORAGE_KEY);
    } catch {}

    try {
      sessionStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(cappedAllocations.slice(0, 1)));
      console.info("[EMS Storage] Saved latest allocation to sessionStorage as fallback.");
    } catch (sessionErr) {
      console.warn("[EMS Storage] Storage completely exhausted. Allocation preserved in runtime memory cache.", sessionErr);
      try {
        sessionStorage.removeItem(ALLOCATIONS_STORAGE_KEY);
      } catch {}
    }
  }
}

// Save an allocation
export function saveAllocation(allocation: ExamAllocation): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  try {
    const allocations = getSavedAllocations();
    const index = allocations.findIndex((a) => a.id === allocation.id);
    const updated: ExamAllocation = {
      ...allocation,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      allocations[index] = updated;
    } else {
      allocations.unshift(updated);
    }

    // Persist safely with quota management
    safePersistAllocations(allocations);

    // Update active allocation
    saveActiveAllocation(updated);

    // DB Sync with res.ok check
    return syncKeyToDb("ems_allocations", allocations.slice(0, MAX_SAVED_ALLOCATIONS));
  } catch (err) {
    console.error("[EMS Storage] Error saving allocation:", err);
    return Promise.resolve(false);
  }
}

// Active allocation helpers
export function getActiveAllocation(): ExamAllocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_ALLOCATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memoryActiveAllocation = parsed;
        return parsed;
      }
    }
    const sessionRaw = sessionStorage.getItem(ACTIVE_ALLOCATION_STORAGE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && typeof parsed === "object") {
        memoryActiveAllocation = parsed;
        return parsed;
      }
    }
    return memoryActiveAllocation;
  } catch (err) {
    console.error("[EMS Storage] Error reading active allocation:", err);
    return memoryActiveAllocation;
  }
}

export function saveActiveAllocation(allocation: ExamAllocation): void {
  if (typeof window === "undefined") return;
  memoryActiveAllocation = allocation;
  safeWriteItem(ACTIVE_ALLOCATION_STORAGE_KEY, allocation);
}

function clearActiveAllocation(): void {
  if (typeof window === "undefined") return;
  memoryActiveAllocation = null;
  try {
    localStorage.removeItem(ACTIVE_ALLOCATION_STORAGE_KEY);
  } catch {}
  try {
    sessionStorage.removeItem(ACTIVE_ALLOCATION_STORAGE_KEY);
  } catch {}
}

// Get allocation by ID
function getAllocationById(id: string): ExamAllocation | undefined {
  const allocations = getSavedAllocations();
  const found = allocations.find((a) => a.id === id);
  if (found) return found;
  const active = getActiveAllocation();
  if (active && active.id === id) return active;
  if (memoryAllocations) {
    const memFound = memoryAllocations.find((a) => a.id === id);
    if (memFound) return memFound;
  }
  return undefined;
}

export function deleteAllocation(id: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  try {
    const allocations = getSavedAllocations().filter((a) => a.id !== id);
    safePersistAllocations(allocations);

    // If active allocation was deleted, clear it
    const active = getActiveAllocation();
    if (active && active.id === id) {
      clearActiveAllocation();
    }

    // DB Sync with res.ok check
    return syncKeyToDb("ems_allocations", allocations);
  } catch (err) {
    console.error("[EMS Storage] Error deleting allocation:", err);
    return Promise.resolve(false);
  }
}

// Swap two seats in an allocation
export function updateSeatSwap(
  allocationId: string,
  roomId: string,
  seatId1: string,
  seatId2: string
): ExamAllocation | null {
  const allocation = getAllocationById(allocationId);
  if (!allocation) return null;

  const roomAlloc = allocation.roomAllocations.find((r) => r.roomId === roomId);
  if (!roomAlloc) return null;

  const s1 = roomAlloc.seats.find((s) => s.seatId === seatId1);
  const s2 = roomAlloc.seats.find((s) => s.seatId === seatId2);
  if (!s1 || !s2) return null;

  // Swap student properties between s1 and s2
  const tempStudent = {
    studentId: s1.studentId,
    studentName: s1.studentName,
    studentRoll: s1.studentRoll,
    studentClass: s1.studentClass,
    studentSection: s1.studentSection,
    studentRegNo: s1.studentRegNo,
    studentStream: s1.studentStream,
    studentGender: s1.studentGender,
    schoolId: s1.schoolId,
    fatherName: s1.fatherName,
    contact: s1.contact,
    isVacant: s1.isVacant,
  };

  s1.studentId = s2.studentId;
  s1.studentName = s2.studentName;
  s1.studentRoll = s2.studentRoll;
  s1.studentClass = s2.studentClass;
  s1.studentSection = s2.studentSection;
  s1.studentRegNo = s2.studentRegNo;
  s1.studentStream = s2.studentStream;
  s1.studentGender = s2.studentGender;
  s1.schoolId = s2.schoolId;
  s1.fatherName = s2.fatherName;
  s1.contact = s2.contact;
  s1.isVacant = s2.isVacant;

  s2.studentId = tempStudent.studentId;
  s2.studentName = tempStudent.studentName;
  s2.studentRoll = tempStudent.studentRoll;
  s2.studentClass = tempStudent.studentClass;
  s2.studentSection = tempStudent.studentSection;
  s2.studentRegNo = tempStudent.studentRegNo;
  s2.studentStream = tempStudent.studentStream;
  s2.studentGender = tempStudent.studentGender;
  s2.schoolId = tempStudent.schoolId;
  s2.fatherName = tempStudent.fatherName;
  s2.contact = tempStudent.contact;
  s2.isVacant = tempStudent.isVacant;

  saveAllocation(allocation);
  return allocation;
}
