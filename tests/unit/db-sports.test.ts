import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; op: string; filters: [string, unknown][]; payload?: unknown };
type Reply = { data?: unknown; error?: { message: string; code?: string } | null };

// Chainable stand-in for the Supabase client: each awaited query asks `respond` for its result.
let respond: (call: Call) => Reply;
const calls: Call[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const call: Call = { table, op: "select", filters: [] };
      const builder: Record<string, unknown> = {
        then: (resolve: (r: unknown) => unknown, reject: (e: unknown) => unknown) => {
          calls.push(call);
          try {
            const r = respond(call);
            return Promise.resolve(resolve({ data: r.data ?? null, error: r.error ?? null }));
          } catch (e) {
            return Promise.resolve(reject(e));
          }
        },
      };
      for (const m of ["select", "order", "limit", "maybeSingle", "single"]) builder[m] = () => builder;
      for (const m of ["eq", "neq", "in", "not"]) builder[m] = (col: string, val: unknown) => (call.filters.push([`${m}:${col}`, val]), builder);
      for (const m of ["insert", "upsert", "update", "delete"]) builder[m] = (payload?: unknown) => ((call.op = m), (call.payload = payload), builder);
      return builder;
    },
  }),
}));

const { enrollStudentsInEvent, getSportsEvents, SportsRuleError } = await import("@/lib/sports/db-sports");

const EVENT = { id: "E1", name: "100m", academic_year: 2026, max_participants: null };

beforeEach(() => {
  calls.length = 0;
});

describe("enrollStudentsInEvent", () => {
  it("refuses more students than the event allows", async () => {
    respond = (c) => {
      if (c.table === "sports_events") return { data: { ...EVENT, max_participants: 2 } };
      if (c.table === "sports_event_registrations") return { data: [{ student_id: "S1" }] };
      return { data: null };
    };
    await expect(enrollStudentsInEvent("E1", ["S2", "S3"])).rejects.toBeInstanceOf(SportsRuleError);
    expect(calls.some((c) => c.op !== "select")).toBe(false);
  });

  it("enforces the per-student limit in strict mode", async () => {
    respond = (c) => {
      if (c.table === "sports_events") return { data: EVENT };
      if (c.table === "system_config") return { data: { value: { maxEventsPerStudent: 1, enforcementMode: "strict" } } };
      if (c.table === "sports_event_registrations") {
        // First call: this event's registrations; second: counts for the year.
        return c.filters.some(([f]) => f === "eq:event_id") ? { data: [] } : { data: [{ student_id: "S2" }] };
      }
      return { data: null };
    };
    await expect(enrollStudentsInEvent("E1", ["S2"])).rejects.toThrow(/limit/);
  });

  it("retries chest numbers after a clash and gives the lowest free numbers", async () => {
    let athleteInserts = 0;
    respond = (c) => {
      if (c.table === "sports_events") return { data: EVENT };
      if (c.table === "system_config") return { data: null };
      if (c.table === "sports_athletes" && c.op === "select") {
        // After the clash another request has taken 101.
        return { data: athleteInserts === 0 ? [] : [{ student_id: "X", chest_number: "101" }] };
      }
      if (c.table === "sports_athletes" && c.op === "insert") {
        athleteInserts++;
        return athleteInserts === 1 ? { error: { message: "duplicate", code: "23505" } } : {};
      }
      return { data: [] };
    };
    const result = await enrollStudentsInEvent("E1", ["S1", "S2"]);
    expect(result.enrolledCount).toBe(2);
    const last = calls.filter((c) => c.table === "sports_athletes" && c.op === "insert").pop();
    expect((last!.payload as { chest_number: string }[]).map((r) => r.chest_number)).toEqual(["102", "103"]);
  });

  it("surfaces a failed registration write instead of reporting success", async () => {
    respond = (c) => {
      if (c.table === "sports_events") return { data: EVENT };
      if (c.table === "sports_event_registrations" && c.op === "upsert") return { error: { message: "boom" } };
      return { data: c.table === "system_config" ? null : [] };
    };
    await expect(enrollStudentsInEvent("E1", ["S1"])).rejects.toThrow(/boom/);
  });
});

describe("getSportsEvents", () => {
  it("does not count results of students no longer registered", async () => {
    respond = (c) => {
      if (c.table === "sports_events") return { data: [{ ...EVENT }] };
      if (c.table === "sports_event_registrations") return { data: [{ event_id: "E1", student_id: "S1" }] };
      if (c.table === "sports_event_results") {
        return {
          data: [
            { event_id: "E1", student_id: "S1", best_score: "12.1", rank_position: 1 },
            { event_id: "E1", student_id: "GONE", best_score: "11.9", rank_position: 1 },
          ],
        };
      }
      return { data: [] };
    };
    const [event] = await getSportsEvents(2026);
    expect(event).toMatchObject({ participantCount: 1, scoredCount: 1, podiumCount: 1 });
  });

  it("throws on a DB error instead of returning made-up events", async () => {
    respond = () => ({ error: { message: "relation does not exist" } });
    await expect(getSportsEvents(2026)).rejects.toThrow(/relation/);
  });
});
