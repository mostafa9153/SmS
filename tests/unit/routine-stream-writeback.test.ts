import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClassMarksScheme } from "@/lib/utils/marks-config";

const store: { schemes: Partial<ClassMarksScheme>[] } = { schemes: [] };
const saved: Partial<ClassMarksScheme>[][] = [];

vi.mock("@/lib/utils/marks-config", async (orig) => ({
  ...(await orig<typeof import("@/lib/utils/marks-config")>()),
  getSavedMarksSchemes: () => store.schemes,
  saveMarksSchemes: (s: Partial<ClassMarksScheme>[]) => saved.push(s),
}));

const { syncRoutineStreamToPreset, collectSids } = await import("@/lib/routine/routine-sync");

const xi = (streams: Record<string, string[]>) =>
  ({ classCode: "XI", className: "Class XI", subjects: Object.keys(streams), subjectStreams: streams }) as Partial<ClassMarksScheme>;

describe("a stream picked in the Routine tab goes back to the preset", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    saved.length = 0;
  });

  it("moving Bengali from Arts to Science replaces the stream", () => {
    store.schemes = [xi({ "Bengali (1st Language)": ["Arts"] })];
    syncRoutineStreamToPreset("Class XI", "Bengali (1st Language)", "Arts", "Science");
    expect(saved[0][0].subjectStreams).toEqual({ "Bengali (1st Language)": ["Science"] });
  });

  it("a new row under another stream adds it", () => {
    store.schemes = [xi({ "Bengali (1st Language)": ["Arts"] })];
    syncRoutineStreamToPreset("Class XI", "bengali (1st language)", null, "Commerce");
    expect(saved[0][0].subjectStreams).toEqual({ "Bengali (1st Language)": ["Arts", "Commerce"] });
  });

  it("deleting a row drops its stream but never the subject's last one", () => {
    store.schemes = [xi({ "Bengali (1st Language)": ["Arts", "Common"] })];
    syncRoutineStreamToPreset("Class XI", "Bengali (1st Language)", "Common", null);
    expect(saved[0][0].subjectStreams).toEqual({ "Bengali (1st Language)": ["Arts"] });

    saved.length = 0;
    store.schemes = [xi({ "Bengali (1st Language)": ["Arts"] })];
    syncRoutineStreamToPreset("Class XI", "Bengali (1st Language)", "Arts", null);
    expect(saved).toHaveLength(0);
  });

  it("a subject whose streams came from its name gets them saved, moved", () => {
    store.schemes = [{ classCode: "XI", className: "Class XI", subjects: ["Bengali (1st Language)"] }];
    syncRoutineStreamToPreset("Class XI", "Bengali (1st Language)", "Common", "Arts");
    expect(saved[0][0].subjectStreams).toEqual({ "Bengali (1st Language)": ["Arts"] });
  });

  it("leaves non-HS classes and subjects the preset does not list alone", () => {
    store.schemes = [xi({ Physics: ["Science"] })];
    syncRoutineStreamToPreset("Class XI", "Bengali (1st Language)", null, "Arts");
    syncRoutineStreamToPreset("Class X", "Physics", null, "Arts");
    expect(saved).toHaveLength(0);
  });
});

describe("subject ids in a saved routine grid", () => {
  it("finds cell and option sids at any depth", () => {
    const ids = new Set<string>();
    collectSids({ Mon: [{ c1: { sid: "a", opts: [{ sid: "b" }, { sid: "c" }] } }, null], Tue: { x: { sid: "a" } } }, ids);
    expect([...ids].sort()).toEqual(["a", "b", "c"]);
  });
});
