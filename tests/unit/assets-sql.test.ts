/**
 * Runs the rooms + assets migrations in PGlite and exercises the ledger RPCs:
 * add (counted / serial), move, condition, write-off value, room count,
 * undo of each, idempotent replay, append-only ledger, grants.
 */
import { randomUUID as uid } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

type Row = Record<string, unknown>;
type Result = { event_id: string; codes?: string[]; changed?: number; replayed: boolean };

const sql = (f: string) => readFileSync(join(process.cwd(), "supabase/migrations", f), "utf8");
const actor = uid();
let db: PGlite;
let bench: string, fan: string, computer: string, fund: string;

const q = async (text: string, params: unknown[] = []) => (await db.query<Row>(text, params)).rows;
const one = async (text: string, params: unknown[] = []) => (await q(text, params))[0];
const call = async (fn: string, args: Record<string, unknown>): Promise<Result> => {
  const keys = Object.keys(args);
  const named = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
  return (await one(`select public.${fn}(${named}) as r`, keys.map((k) => args[k]))).r as Result;
};
const fails = async (fn: string, args: Record<string, unknown>) => {
  try {
    await call(fn, args);
    return "succeeded";
  } catch (e) {
    return (e as Error).message;
  }
};
const base = () => ({ p_actor: actor, p_request_id: uid() });
const stock = async (room: string, item: string, cond = "working") =>
  Number((await one(`select coalesce(max(qty),0) n from asset_stock where room_id=$1 and item_id=$2 and condition=$3`, [room, item, cond])).n);
const undo = (event: string) => call("asset_undo", { p_event_id: event, p_actor: actor, p_request_id: uid() });

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE TABLE public.staff_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text);
    CREATE TABLE public.system_config (key text PRIMARY KEY, value jsonb NOT NULL);
  `);
  await db.exec(sql("20261111_rooms_master.sql"));
  await db.exec(sql("20261112_assets_module.sql"));
  await db.exec(`insert into rooms(id, name) values ('r1','Room 1'), ('r2','Room 2'), ('old','Old room')`);
  const id = async (name: string) => (await one(`select id from asset_items where name=$1`, [name])).id as string;
  bench = await id("Bench");
  fan = await id("Fan");
  computer = await id("Computer");
  fund = (await one(`insert into asset_funds(name, financial_year) values ('Composite Grant','2026-27') returning id`)).id as string;
});

describe("assets migration", () => {
  it("seeds the catalog with one EMS bench item and serial IT items", async () => {
    const rows = await q(`select name, tracking, ems_role from asset_items where name in ('Bench','Computer','Fan') order by name`);
    expect(rows).toEqual([
      { name: "Bench", tracking: "count", ems_role: "bench" },
      { name: "Computer", tracking: "serial", ems_role: null },
      { name: "Fan", tracking: "count", ems_role: null },
    ]);
    await db.exec(sql("20261112_assets_module.sql"));
    expect(Number((await one(`select count(*) n from asset_items where name='Bench'`)).n)).toBe(1);
  });

  it("adds counted stock, replays a retried request once, and undoes it", async () => {
    const args = { ...base(), p_kind: "opening", p_room_id: "r1", p_item_id: bench, p_qty: 20 };
    const first = await call("asset_add", args);
    const again = await call("asset_add", args);
    expect(again.event_id).toBe(first.event_id);
    expect(again.replayed).toBe(true);
    expect(await stock("r1", bench)).toBe(20);
    await undo(first.event_id);
    expect(await stock("r1", bench)).toBe(0);
    expect(await fails("asset_undo", { p_event_id: first.event_id, p_actor: actor, p_request_id: uid() })).toMatch(/AST:already_undone/);
  });

  it("creates serial units with yearly codes, fund and price", async () => {
    const r = await call("asset_add", {
      ...base(), p_kind: "purchase", p_room_id: "r1", p_item_id: computer, p_qty: 2,
      p_unit_price: 35000, p_fund_id: fund, p_occurred_on: "2026-12-10", p_serials: ["SN1", ""],
    });
    expect(r.codes).toEqual(["AST/2026/0001", "AST/2026/0002"]);
    const units = await q(`select code, serial_no, unit_price::float price from asset_units order by code`);
    expect(units).toEqual([
      { code: "AST/2026/0001", serial_no: "SN1", price: 35000 },
      { code: "AST/2026/0002", serial_no: null, price: 35000 },
    ]);
    const e = await one(`select value::float value, fund_name from asset_events where id=$1`, [r.event_id]);
    expect(e).toEqual({ value: 70000, fund_name: "Composite Grant 2026-27" });
  });

  it("moves counted stock between rooms and refuses more than is there", async () => {
    await call("asset_add", { ...base(), p_kind: "opening", p_room_id: "r1", p_item_id: bench, p_qty: 10 });
    const m = await call("asset_change", { ...base(), p_kind: "move", p_item_id: bench, p_room_id: "r1", p_condition: "working", p_qty: 4, p_to_room_id: "r2" });
    expect([await stock("r1", bench), await stock("r2", bench)]).toEqual([6, 4]);
    expect(await fails("asset_change", { ...base(), p_kind: "move", p_item_id: bench, p_room_id: "r1", p_condition: "working", p_qty: 99, p_to_room_id: "r2" }))
      .toMatch(/AST:not_enough_stock/);
    await undo(m.event_id);
    expect([await stock("r1", bench), await stock("r2", bench)]).toEqual([10, 0]);
  });

  it("refuses an undo once the stock has moved on", async () => {
    const add = await call("asset_add", { ...base(), p_kind: "opening", p_room_id: "r2", p_item_id: fan, p_qty: 3 });
    await call("asset_change", { ...base(), p_kind: "move", p_item_id: fan, p_room_id: "r2", p_condition: "working", p_qty: 3, p_to_room_id: "r1" });
    expect(await fails("asset_undo", { p_event_id: add.event_id, p_actor: actor, p_request_id: uid() })).toMatch(/AST:state_changed/);
    expect(await stock("r1", fan)).toBe(3);
  });

  it("changes condition within a room", async () => {
    const c = await call("asset_change", { ...base(), p_kind: "condition", p_item_id: fan, p_room_id: "r1", p_condition: "working", p_qty: 2, p_to_condition: "damaged" });
    expect([await stock("r1", fan), await stock("r1", fan, "damaged")]).toEqual([1, 2]);
    await undo(c.event_id);
    expect([await stock("r1", fan), await stock("r1", fan, "damaged")]).toEqual([3, 0]);
  });

  it("values a counted write-off at the average known cost, and undo brings it back", async () => {
    await call("asset_add", { ...base(), p_kind: "purchase", p_room_id: "r1", p_item_id: fan, p_qty: 2, p_unit_price: 1500 });
    await call("asset_add", { ...base(), p_kind: "purchase", p_room_id: "r1", p_item_id: fan, p_qty: 2, p_unit_price: 2500 });
    const w = await call("asset_change", { ...base(), p_kind: "write_off", p_item_id: fan, p_room_id: "r1", p_condition: "working", p_qty: 1, p_reason: "condemned" });
    const e = await one(`select unit_cost::float cost, value::float value, reason from asset_events where id=$1`, [w.event_id]);
    expect(e).toEqual({ cost: 2000, value: 2000, reason: "condemned" });
    expect(await stock("r1", fan)).toBe(6);
    await undo(w.event_id);
    expect(await stock("r1", fan)).toBe(7);
  });

  it("writes off and moves a serial unit by id", async () => {
    const u = (await one(`select id from asset_units where code='AST/2026/0001'`)).id as string;
    const mv = { ...base(), p_kind: "move", p_item_id: computer, p_room_id: "r1", p_condition: "working", p_unit_id: u, p_to_room_id: "r2" };
    await call("asset_change", mv);
    expect((await one(`select room_id from asset_units where id=$1`, [u])).room_id).toBe("r2");
    expect(await fails("asset_change", { ...mv, p_request_id: uid() })).toMatch(/AST:state_changed/);
    const w = await call("asset_change", { ...base(), p_kind: "write_off", p_item_id: computer, p_room_id: "r2", p_condition: "working", p_unit_id: u, p_reason: "lost" });
    expect(await one(`select value::float value from asset_events where id=$1`, [w.event_id])).toEqual({ value: 35000 });
    expect((await one(`select status from asset_units where id=$1`, [u])).status).toBe("written_off");
    await undo(w.event_id);
    expect((await one(`select status from asset_units where id=$1`, [u])).status).toBe("active");
  });

  it("counts a room in one batch, refuses a stale count, and undoes the batch", async () => {
    const before = [await stock("r1", bench), await stock("r1", fan)];
    const lines = [
      { item_id: bench, condition: "working", counted: before[0] + 2, expected: before[0] },
      { item_id: fan, condition: "working", counted: before[1] - 1, expected: before[1] },
      { item_id: bench, condition: "damaged", counted: 0, expected: 0 },
    ];
    const stale = lines.map((l, i) => (i === 0 ? { ...l, expected: l.expected + 5 } : l));
    expect(await fails("asset_count", { ...base(), p_room_id: "r1", p_lines: JSON.stringify(stale) })).toMatch(/AST:stale_count:Bench/);
    const r = await call("asset_count", { ...base(), p_room_id: "r1", p_lines: JSON.stringify(lines) });
    expect(r.changed).toBe(2);
    expect([await stock("r1", bench), await stock("r1", fan)]).toEqual([before[0] + 2, before[1] - 1]);
    await undo(r.event_id);
    expect([await stock("r1", bench), await stock("r1", fan)]).toEqual(before);
  });

  it("refuses serial items on the count screen and bad input", async () => {
    const lines = JSON.stringify([{ item_id: computer, condition: "working", counted: 1, expected: 0 }]);
    expect(await fails("asset_count", { ...base(), p_room_id: "r1", p_lines: lines })).toMatch(/AST:serial_not_counted/);
    expect(await fails("asset_add", { ...base(), p_kind: "opening", p_room_id: "r1", p_item_id: bench, p_qty: 0 })).toMatch(/AST:bad_qty/);
    expect(await fails("asset_add", { ...base(), p_kind: "opening", p_room_id: "nope", p_item_id: bench, p_qty: 1 })).toMatch(/AST:room_not_found/);
    expect(await fails("asset_change", { ...base(), p_kind: "condition", p_item_id: fan, p_room_id: "r1", p_condition: "working", p_qty: 1, p_to_condition: "working" }))
      .toMatch(/AST:bad_target/);
  });

  it("does not add to an archived room", async () => {
    await db.exec(`update rooms set archived_at = now() where id = 'old'`);
    expect(await fails("asset_add", { ...base(), p_kind: "opening", p_room_id: "old", p_item_id: bench, p_qty: 1 })).toMatch(/AST:room_not_found/);
  });

  it("keeps the ledger append-only", async () => {
    expect(await fails("asset_undo", { p_event_id: uid(), p_actor: actor, p_request_id: uid() })).toMatch(/AST:event_not_found/);
    await expect(db.exec(`delete from asset_events`)).rejects.toThrow(/AST:append_only/);
    await expect(db.exec(`update asset_events set qty = 1`)).rejects.toThrow(/AST:append_only/);
  });

  it("reports balances for counted and serial items together", async () => {
    const rows = await q(`select item_id, sum(qty)::int n from asset_room_balance where room_id='r1' and condition='working' group by item_id`);
    const n = (item: string) => rows.find((r) => r.item_id === item)?.n;
    expect(n(computer)).toBe(1);
    expect(n(bench)).toBe(await stock("r1", bench));
  });

  it("is server-only", async () => {
    const g = await one(`select has_table_privilege('anon','public.asset_stock','SELECT') a,
                                has_table_privilege('authenticated','public.asset_room_balance','SELECT') b,
                                has_function_privilege('anon','public.asset_undo(uuid,uuid,uuid)','EXECUTE') c,
                                has_function_privilege('service_role','public.asset_undo(uuid,uuid,uuid)','EXECUTE') d`);
    expect(g).toEqual({ a: false, b: false, c: false, d: true });
  });
});
