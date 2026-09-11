// EMS Room and Allocation Storage Utility
import { EmsRoom, ExamAllocation } from "./types";

const ROOMS_STORAGE_KEY = "sms_ems_saved_rooms_v1";
const ALLOCATIONS_STORAGE_KEY = "sms_ems_saved_allocations_v1";

// Default pre-configured classrooms for immediate use
export const DEFAULT_ROOMS: EmsRoom[] = [
  {
    id: "room-101",
    roomNumber: "Room 101",
    floor: "Ground Floor",
    building: "Main Academic Block",
    defaultSeatsPerBench: 3,
    columns: [
      { columnIndex: 1, columnLabel: "Column 1 (Window Side)", benchCount: 6, seatsPerBench: 3 },
      { columnIndex: 2, columnLabel: "Column 2 (Middle Aisle)", benchCount: 5, seatsPerBench: 3 }, // 1 less bench for door space
      { columnIndex: 3, columnLabel: "Column 3 (Door Side)", benchCount: 6, seatsPerBench: 3 },
    ],
    totalCapacity: 51, // (6*3) + (5*3) + (6*3) = 18 + 15 + 18 = 51
    notes: "Column 2 has 5 benches due to rear exit walkway",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "room-102",
    roomNumber: "Room 102",
    floor: "1st Floor",
    building: "Main Academic Block",
    defaultSeatsPerBench: 3,
    columns: [
      { columnIndex: 1, columnLabel: "Column 1 (Left)", benchCount: 6, seatsPerBench: 3 },
      { columnIndex: 2, columnLabel: "Column 2 (Middle)", benchCount: 6, seatsPerBench: 3 },
      { columnIndex: 3, columnLabel: "Column 3 (Right)", benchCount: 6, seatsPerBench: 3 },
    ],
    totalCapacity: 54, // (6*3) + (6*3) + (6*3) = 54
    notes: "Standard rectangular classroom with 3 equal columns",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "room-201",
    roomNumber: "Hall A (Auditorium)",
    floor: "2nd Floor",
    building: "Centenary Hall",
    defaultSeatsPerBench: 3,
    columns: [
      { columnIndex: 1, columnLabel: "Column 1 (Left Wall)", benchCount: 7, seatsPerBench: 3 },
      { columnIndex: 2, columnLabel: "Column 2 (Center-Left)", benchCount: 8, seatsPerBench: 3 },
      { columnIndex: 3, columnLabel: "Column 3 (Center-Right)", benchCount: 8, seatsPerBench: 3 },
      { columnIndex: 4, columnLabel: "Column 4 (Right Wall)", benchCount: 7, seatsPerBench: 3 },
    ],
    totalCapacity: 90, // (7*3) + (8*3) + (8*3) + (7*3) = 21 + 24 + 24 + 21 = 90
    notes: "Large exam hall suitable for combined board tests",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to calculate total capacity from columns
export function calculateRoomCapacity(columns: EmsRoom["columns"]): number {
  return columns.reduce((total, col) => total + col.benchCount * (col.seatsPerBench || 3), 0);
}

// Retrieve all rooms (with fallback to default rooms)
export function getSavedRooms(): EmsRoom[] {
  if (typeof window === "undefined") return DEFAULT_ROOMS;
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(DEFAULT_ROOMS));
      return DEFAULT_ROOMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ROOMS;
  } catch (err) {
    console.error("Error reading saved rooms from localStorage:", err);
    return DEFAULT_ROOMS;
  }
}

export function saveRooms(rooms: EmsRoom[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  } catch (err) {
    console.error("Error saving rooms to localStorage:", err);
  }

  // Background DB Sync
  try {
    fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "ems_rooms", value: rooms }),
    }).catch((err) => console.warn("Failed to sync rooms to DB:", err));
  } catch {}
}

// Get single room by ID
export function getRoomById(id: string): EmsRoom | undefined {
  const rooms = getSavedRooms();
  return rooms.find((r) => r.id === id);
}

// Save or update a single room
export function saveRoom(room: EmsRoom): void {
  const rooms = getSavedRooms();
  const index = rooms.findIndex((r) => r.id === room.id);
  const updatedRoom = {
    ...room,
    totalCapacity: calculateRoomCapacity(room.columns),
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    rooms[index] = updatedRoom;
  } else {
    rooms.unshift(updatedRoom);
  }
  saveRooms(rooms);
}

// Delete room by ID
export function deleteRoom(id: string): void {
  const rooms = getSavedRooms().filter((r) => r.id !== id);
  saveRooms(rooms);
}

// Retrieve saved exam allocations
export function getSavedAllocations(): ExamAllocation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALLOCATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading allocations:", err);
    return [];
  }
}

// Save an allocation
export function saveAllocation(allocation: ExamAllocation): void {
  if (typeof window === "undefined") return;
  try {
    const allocations = getSavedAllocations();
    const index = allocations.findIndex((a) => a.id === allocation.id);
    const updated = {
      ...allocation,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) {
      allocations[index] = updated;
    } else {
      allocations.unshift(updated);
    }
    localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations));

    // Background DB Sync
    try {
      fetch("/api/school-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ems_allocations", value: allocations }),
      }).catch((err) => console.warn("Failed to sync allocations to DB:", err));
    } catch {}
  } catch (err) {
    console.error("Error saving allocation:", err);
  }
}

// Get allocation by ID
export function getAllocationById(id: string): ExamAllocation | undefined {
  const allocations = getSavedAllocations();
  return allocations.find((a) => a.id === id);
}

export function deleteAllocation(id: string): void {
  const allocations = getSavedAllocations().filter((a) => a.id !== id);
  if (typeof window === "undefined") return;
  localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify(allocations));

  // Background DB Sync
  try {
    fetch("/api/school-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "ems_allocations", value: allocations }),
    }).catch((err) => console.warn("Failed to sync allocations deletion to DB:", err));
  } catch {}
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
  s1.schoolId = s2.schoolId;
  s1.fatherName = s2.fatherName;
  s1.contact = s2.contact;
  s1.isVacant = s2.isVacant;

  s2.studentId = tempStudent.studentId;
  s2.studentName = tempStudent.studentName;
  s2.studentRoll = tempStudent.studentRoll;
  s2.studentClass = tempStudent.studentClass;
  s2.studentSection = tempStudent.studentSection;
  s2.schoolId = tempStudent.schoolId;
  s2.fatherName = tempStudent.fatherName;
  s2.contact = tempStudent.contact;
  s2.isVacant = tempStudent.isVacant;

  saveAllocation(allocation);
  return allocation;
}
