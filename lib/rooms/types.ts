import type { EmsRoom, RoomColumnConfig } from "@/lib/ems/types";
import { calculateRoomCapacity, cleanColumnLabel } from "@/lib/ems/room-utils";

export const ROOM_KINDS = ["classroom", "hall", "lab", "office", "store", "staff", "other"] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

/** A row of public.rooms (supabase/migrations/20261111_rooms_master.sql). */
export interface RoomRow {
  id: string;
  name: string;
  kind: RoomKind;
  floor: string | null;
  building: string | null;
  notes: string | null;
  is_exam_room: boolean;
  ems_layout: RoomColumnConfig[];
  default_seats_per_bench: number;
  custodian_staff_id: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields a client may set. */
export interface RoomInput {
  name: string;
  kind?: RoomKind;
  floor?: string | null;
  building?: string | null;
  notes?: string | null;
  is_exam_room?: boolean;
  ems_layout?: RoomColumnConfig[];
  default_seats_per_bench?: number;
}

const text = (v: unknown, max = 120): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};
const int = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function sanitizeLayout(columns: unknown): RoomColumnConfig[] {
  if (!Array.isArray(columns)) return [];
  return columns.slice(0, 20).map((c, i) => {
    const col = (c ?? {}) as Partial<RoomColumnConfig>;
    const columnIndex = i + 1;
    return {
      columnIndex,
      columnLabel: cleanColumnLabel(text(col.columnLabel, 40) ?? undefined, columnIndex),
      benchCount: int(col.benchCount, 0, 200, 0),
      seatsPerBench: int(col.seatsPerBench, 1, 6, 2),
    };
  });
}

/** Validate a create/update body. Returns an error message or the clean patch. */
export function parseRoomInput(body: unknown, partial: boolean): { error: string } | { value: Partial<RoomInput> } {
  const b = (body ?? {}) as Record<string, unknown>;
  const value: Partial<RoomInput> = {};
  if (!partial || "name" in b) {
    const name = text(b.name, 80);
    if (!name) return { error: "Room name is required." };
    value.name = name;
  }
  if ("kind" in b) {
    if (!ROOM_KINDS.includes(b.kind as RoomKind)) return { error: "Unknown room type." };
    value.kind = b.kind as RoomKind;
  }
  if ("floor" in b) value.floor = text(b.floor, 60);
  if ("building" in b) value.building = text(b.building, 80);
  if ("notes" in b) value.notes = text(b.notes, 500);
  if ("is_exam_room" in b) value.is_exam_room = b.is_exam_room === true;
  if ("ems_layout" in b) value.ems_layout = sanitizeLayout(b.ems_layout);
  if ("default_seats_per_bench" in b) value.default_seats_per_bench = int(b.default_seats_per_bench, 1, 6, 2);
  return { value };
}

/** EMS shape of an exam room. The id is the rooms.id, so saved allocations keep resolving. */
export function roomToEms(r: RoomRow): EmsRoom {
  const columns = sanitizeLayout(r.ems_layout);
  return {
    id: r.id,
    roomNumber: r.name,
    floor: r.floor ?? undefined,
    building: r.building ?? undefined,
    notes: r.notes ?? undefined,
    columns,
    defaultSeatsPerBench: r.default_seats_per_bench,
    totalCapacity: calculateRoomCapacity(columns),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Body for saving an EMS room through /api/rooms. */
export function emsToRoomInput(room: EmsRoom): RoomInput {
  return {
    name: room.roomNumber,
    floor: room.floor ?? null,
    building: room.building ?? null,
    notes: room.notes ?? null,
    is_exam_room: true,
    ems_layout: room.columns,
    default_seats_per_bench: room.defaultSeatsPerBench,
  };
}
