/**
 * Runs the rooms master migration in PGlite: EMS blob import (ids kept,
 * malformed entries skipped, idempotent), constraints, custodian FK, grants.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

type Row = Record<string, unknown>;

const MIGRATION = readFileSync(join(process.cwd(), "supabase/migrations/20261111_rooms_master.sql"), "utf8");
let db: PGlite;

const q = async (text: string, params: unknown[] = []) => (await db.query<Row>(text, params)).rows;
const sqlFails = async (text: string): Promise<string> => {
  try {
    await db.exec(text);
    return "succeeded";
  } catch (e) {
    return (e as Error).message;
  }
};

const BLOB = [
  { id: "room-101", roomNumber: "Room 41", floor: "4th Floor", columns: [{ columnIndex: 1, columnLabel: "Column 1", benchCount: 8, seatsPerBench: 2 }], defaultSeatsPerBench: 2 },
  { id: "room-1789587943133", roomNumber: "  ", floor: "", columns: "bad", defaultSeatsPerBench: "x" },
  { id: "room-dup", roomNumber: "room 41", columns: [] },
  { roomNumber: "No id" },
  "not an object",
];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE TABLE public.staff_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text);
    CREATE TABLE public.system_config (key text PRIMARY KEY, value jsonb NOT NULL);
  `);
  await db.query(`insert into system_config(key, value) values ('ems_rooms', $1::jsonb)`, [JSON.stringify(BLOB)]);
  await db.exec(MIGRATION);
});

describe("rooms master migration", () => {
  it("imports valid EMS rooms with their old ids and skips malformed entries", async () => {
    const rows = await q(`select id, name, floor, is_exam_room, kind, sort_order,
                                 jsonb_array_length(ems_layout) cols, default_seats_per_bench seats
                          from rooms order by sort_order`);
    expect(rows).toEqual([
      { id: "room-101", name: "Room 41", floor: "4th Floor", is_exam_room: true, kind: "classroom", sort_order: 1, cols: 1, seats: 2 },
      { id: "room-1789587943133", name: "Room 2", floor: null, is_exam_room: true, kind: "classroom", sort_order: 2, cols: 0, seats: 2 },
      { id: "room-dup", name: "room 41 (2)", floor: null, is_exam_room: true, kind: "classroom", sort_order: 3, cols: 0, seats: 2 },
    ]);
  });

  it("is idempotent and leaves the blob untouched", async () => {
    await db.exec(MIGRATION);
    expect((await q(`select count(*)::int n from rooms`))[0].n).toBe(3);
    expect((await q(`select jsonb_array_length(value) n from system_config where key='ems_rooms'`))[0].n).toBe(5);
  });

  it("generates text ids for new non-exam rooms and touches updated_at", async () => {
    const [r] = await q(`insert into rooms(name, kind) values ('Office', 'office') returning id, is_exam_room, updated_at`);
    expect(typeof r.id).toBe("string");
    expect(r.is_exam_room).toBe(false);
    const [u] = await q(`update rooms set notes = 'x' where id = $1 returning updated_at`, [r.id]);
    expect(u.updated_at).not.toBeNull();
  });

  it("rejects bad data", async () => {
    expect(await sqlFails(`insert into rooms(name) values ('  ')`)).toMatch(/check/i);
    expect(await sqlFails(`insert into rooms(name, kind) values ('X', 'garage')`)).toMatch(/check/i);
    expect(await sqlFails(`insert into rooms(name, ems_layout) values ('X', '{}')`)).toMatch(/check/i);
    expect(await sqlFails(`insert into rooms(name) values (' ROOM 41 ')`)).toMatch(/duplicate|unique/i);
  });

  it("allows an archived room's name to be reused", async () => {
    await db.exec(`insert into rooms(name) values ('Temp'); update rooms set archived_at = now() where name = 'Temp'`);
    expect(await sqlFails(`insert into rooms(name) values ('Temp')`)).toBe("succeeded");
  });

  it("sets the order of the given rooms in one call", async () => {
    await q(`select asset_rooms_set_order($1::text[])`, [["room-dup", "room-101"]]);
    const rows = await q(`select id, sort_order from rooms where id in ('room-dup','room-101') order by sort_order`);
    expect(rows).toEqual([{ id: "room-dup", sort_order: 0 }, { id: "room-101", sort_order: 1 }]);
  });

  it("keeps the room when its optional in-charge is deleted", async () => {
    const [s] = await q(`insert into staff_profiles(full_name) values ('T') returning id`);
    await q(`update rooms set custodian_staff_id = $1 where id = 'room-101'`, [s.id]);
    await q(`delete from staff_profiles where id = $1`, [s.id]);
    const [r] = await q(`select custodian_staff_id from rooms where id = 'room-101'`);
    expect(r.custodian_staff_id).toBeNull();
  });

  it("is server-only: anon and authenticated have no access", async () => {
    const [g] = await q(`select has_table_privilege('anon', 'public.rooms', 'SELECT') a,
                                has_table_privilege('authenticated', 'public.rooms', 'SELECT') b,
                                has_table_privilege('service_role', 'public.rooms', 'INSERT') s,
                                has_function_privilege('anon', 'public.asset_touch_updated_at()', 'EXECUTE') f,
                                has_function_privilege('anon', 'public.asset_rooms_set_order(text[])', 'EXECUTE') o,
                                has_function_privilege('service_role', 'public.asset_rooms_set_order(text[])', 'EXECUTE') so`);
    expect(g).toEqual({ a: false, b: false, s: true, f: false, o: false, so: true });
  });
});
