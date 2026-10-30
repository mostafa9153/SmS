import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAdmissionDraft, loadAdmissionDraft, saveAdmissionDraft } from "@/lib/admission/form-draft";

const store = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

beforeEach(() => store.clear());

describe("admission form drafts", () => {
  it("keeps drafts separate per student so data never crosses forms", () => {
    saveAdmissionDraft("readmission:a", { studentName: "Asha" }, { A: true });
    saveAdmissionDraft("readmission:b", { studentName: "Bimal" }, {});
    expect(loadAdmissionDraft("readmission:a")?.values).toEqual({ studentName: "Asha" });
    expect(loadAdmissionDraft("readmission:b")?.values).toEqual({ studentName: "Bimal" });
    expect(loadAdmissionDraft("online-apply")).toBeNull();
  });

  it("removes the old shared keys that mixed students", () => {
    store.set("sms_admission_apply_draft", JSON.stringify({ studentName: "Old" }));
    store.set("sms_admission_saved_sections", "{}");
    loadAdmissionDraft("online-apply");
    expect(store.has("sms_admission_apply_draft")).toBe(false);
    expect(store.has("sms_admission_saved_sections")).toBe(false);
  });

  it("expires after a day and clears on demand", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T08:00:00Z"));
    saveAdmissionDraft("k", { x: 1 }, {});
    vi.setSystemTime(new Date("2026-10-29T09:00:00Z"));
    expect(loadAdmissionDraft("k")).toBeNull();
    vi.useRealTimers();

    saveAdmissionDraft("k", { x: 1 }, {});
    clearAdmissionDraft("k");
    expect(loadAdmissionDraft("k")).toBeNull();
  });
});
