import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const { pullExamSetup } = await import("@/lib/ems/exam-setup-sync");

let store: Record<string, string>;
let server: Record<string, unknown>;
let posts: { key: string; value: unknown }[];

beforeEach(() => {
  store = {};
  server = {};
  posts = [];
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => void (store[k] = v),
  });
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      posts.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ success: true }));
    }
    const key = new URL(url, "http://x").searchParams.get("key")!;
    return new Response(JSON.stringify({ success: true, data: server[key] ?? null }));
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("pullExamSetup", () => {
  it("takes the server copy and keeps a differing local copy once", async () => {
    server.ems_exam_routines = { V: [{ subject: "Math" }] };
    store.sms_ems_exam_routines = JSON.stringify({ V: [] });

    const setup = await pullExamSetup();

    expect(setup.routines).toEqual({ V: [{ subject: "Math" }] });
    expect(JSON.parse(store.sms_ems_exam_routines)).toEqual({ V: [{ subject: "Math" }] });
    expect(JSON.parse(store.sms_ems_exam_routines__before_sync)).toEqual({ V: [] });
  });

  it("uploads this browser's copy when the server has none", async () => {
    store.sms_ems_exam_start_time = "10:30 AM";

    const setup = await pullExamSetup();
    await new Promise((r) => setTimeout(r, 0));

    expect(setup.startTime).toBeUndefined();
    expect(posts).toEqual([{ key: "ems_exam_start_time", value: "10:30 AM" }]);
  });
});
