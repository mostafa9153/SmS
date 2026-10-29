import { beforeEach, describe, expect, it, vi } from "vitest";

// The suite runs in plain Node, so give the helper a minimal browser.
const store = new Map<string, string>();
const listeners = new Map<string, ((e: { detail?: unknown }) => void)[]>();
class FakeCustomEvent {
  constructor(readonly type: string, init?: { detail?: unknown }) {
    this.detail = init?.detail;
  }
  detail?: unknown;
}
vi.stubGlobal("CustomEvent", FakeCustomEvent);
vi.stubGlobal("Event", FakeCustomEvent);
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  clear: () => store.clear(),
});
vi.stubGlobal("window", {
  addEventListener: (t: string, fn: (e: { detail?: unknown }) => void) => listeners.set(t, [...(listeners.get(t) ?? []), fn]),
  dispatchEvent: (e: FakeCustomEvent) => (listeners.get(e.type) ?? []).forEach((fn) => fn(e)),
});

const apiFetch = vi.fn();
const toastWithUndo = vi.fn();
const toastError = vi.fn();

vi.mock("@/lib/api/client", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock("@/lib/undo/client", () => ({ toastWithUndo: (...a: unknown[]) => toastWithUndo(...a) }));
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

import { saveSchoolConfig } from "@/lib/utils/school-config-client";

const mirror = { storageKey: "sms_test", event: "sms_test_updated", detail: true };

beforeEach(() => {
  apiFetch.mockReset();
  toastWithUndo.mockReset();
  toastError.mockReset();
  localStorage.clear();
});

describe("saveSchoolConfig", () => {
  it("posts first, then mirrors to localStorage, fires the event and offers undo", async () => {
    apiFetch.mockResolvedValue({ undoId: "u1" });
    const seen: unknown[] = [];
    window.addEventListener("sms_test_updated", ((e: { detail?: unknown }) => seen.push(e.detail)) as EventListener);

    const ok = await saveSchoolConfig("k", { a: 1 }, { label: "Saved", mirror });

    expect(ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith("/api/school-config", { method: "POST", json: { key: "k", value: { a: 1 } } });
    expect(JSON.parse(localStorage.getItem("sms_test")!)).toEqual({ a: 1 });
    expect(seen).toEqual([{ a: 1 }]);
    expect(toastWithUndo).toHaveBeenCalledWith("Saved", "u1", expect.any(Function));
  });

  it("writes nothing and shows an error when the server rejects", async () => {
    apiFetch.mockRejectedValue(new Error("Forbidden"));

    const ok = await saveSchoolConfig("k", { a: 1 }, { label: "Saved", mirror });

    expect(ok).toBe(false);
    expect(localStorage.getItem("sms_test")).toBeNull();
    expect(toastWithUndo).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Forbidden");
  });

  it("leaves the browser copy alone when the caller already wrote it", async () => {
    apiFetch.mockResolvedValue({ undoId: null });
    localStorage.setItem("sms_test", "caller-wrote");

    await saveSchoolConfig("k", { a: 1 }, { label: "Saved", mirror, localFirst: true });

    expect(localStorage.getItem("sms_test")).toBe("caller-wrote");
  });
});
