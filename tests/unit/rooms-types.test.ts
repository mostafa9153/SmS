import { describe, expect, it } from "vitest";
import { emsToRoomInput, parseRoomInput, roomToEms, sanitizeLayout, type RoomRow } from "@/lib/rooms/types";

const row: RoomRow = {
  id: "room-101",
  name: "Room 41",
  kind: "classroom",
  floor: "4th Floor",
  building: null,
  notes: null,
  is_exam_room: true,
  ems_layout: [
    { columnIndex: 1, columnLabel: "Column 1 (Window Side)", benchCount: 8, seatsPerBench: 2 },
    { columnIndex: 2, columnLabel: "Column 2", benchCount: 7, seatsPerBench: 3 },
  ],
  default_seats_per_bench: 2,
  custodian_staff_id: null,
  sort_order: 1,
  archived_at: null,
  created_at: "2026-11-11T00:00:00Z",
  updated_at: "2026-11-11T00:00:00Z",
};

describe("rooms types", () => {
  it("maps a row to the EMS shape with the same id and computed capacity", () => {
    const ems = roomToEms(row);
    expect(ems.id).toBe("room-101");
    expect(ems.roomNumber).toBe("Room 41");
    expect(ems.building).toBeUndefined();
    expect(ems.columns[0].columnLabel).toBe("Column 1");
    expect(ems.totalCapacity).toBe(8 * 2 + 7 * 3);
  });

  it("round-trips an EMS room into an exam-room body", () => {
    const body = emsToRoomInput(roomToEms(row));
    expect(body).toMatchObject({ name: "Room 41", floor: "4th Floor", is_exam_room: true, default_seats_per_bench: 2 });
    expect(body.ems_layout).toHaveLength(2);
  });

  it("clamps and renumbers layout columns", () => {
    const cols = sanitizeLayout([{ benchCount: -3, seatsPerBench: 9 }, null, "x"]);
    expect(cols).toEqual([
      { columnIndex: 1, columnLabel: "Column 1", benchCount: 0, seatsPerBench: 6 },
      { columnIndex: 2, columnLabel: "Column 2", benchCount: 0, seatsPerBench: 2 },
      { columnIndex: 3, columnLabel: "Column 3", benchCount: 0, seatsPerBench: 2 },
    ]);
    expect(sanitizeLayout("bad")).toEqual([]);
  });

  it("validates input", () => {
    expect(parseRoomInput({ name: "  " }, false)).toEqual({ error: "Room name is required." });
    expect(parseRoomInput({ name: "Store", kind: "garage" }, false)).toEqual({ error: "Unknown room type." });
    expect(parseRoomInput({ floor: "  1st  " }, true)).toEqual({ value: { floor: "1st" } });
    expect(parseRoomInput({ name: "Office", kind: "office", is_exam_room: "yes" }, false)).toEqual({
      value: { name: "Office", kind: "office", is_exam_room: false },
    });
  });
});
