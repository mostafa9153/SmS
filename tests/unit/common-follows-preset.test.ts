import { describe, it, expect } from "vitest";
import { resolveIsCommon } from "@/lib/routine/routine-helpers";
import { noteWantedStreams, staleStreamRows, type WantedStreams } from "@/lib/routine/routine-sync";
import { deriveCombinedCommonGroups } from "@/lib/routine/routine-groups";
import type { RoutineClass, RoutineSubject, RoutineTeacher } from "@/lib/routine/types";

describe("Common follows the stream", () => {
  it("a stream row is never Common, a Common row always is", () => {
    expect(resolveIsCommon("Arts", true)).toBe(false);
    expect(resolveIsCommon("science", true)).toBe(false);
    expect(resolveIsCommon("Common", false)).toBe(true);
  });

  it("a row with no stream keeps its stored flag", () => {
    expect(resolveIsCommon(null, true)).toBe(true);
    expect(resolveIsCommon("General", false)).toBe(false);
    expect(resolveIsCommon(undefined, undefined)).toBe(false);
  });
});

describe("preset sync drops rows of streams the preset no longer lists", () => {
  const rows = [
    { id: "ben-common", name: "Bengali (1st Language)", class_name: "Class XI", stream: "Common" },
    { id: "ben-arts", name: "Bengali (1st Language)", class_name: "Class XI", stream: "Arts" },
    { id: "phy", name: "Physics", class_name: "Class XI", stream: "Science" },
    { id: "old", name: "Bengali (1st Language)", class_name: "Class XI", stream: null },
  ];

  it("Bengali moved from Common to Arts: the Common row goes, the Arts row stays", () => {
    const wanted: WantedStreams = new Map();
    noteWantedStreams(wanted, "XI", "Bengali (1st Language)", { "Bengali (1st Language)": ["Arts"] });
    noteWantedStreams(wanted, "XI", "Physics", { Physics: ["Science"] });
    expect(staleStreamRows(rows, wanted)).toEqual(["ben-common"]);
  });

  it("a subject with no saved streams is never pruned", () => {
    const wanted: WantedStreams = new Map();
    noteWantedStreams(wanted, "XI", "Bengali (1st Language)", undefined);
    expect(staleStreamRows(rows, wanted)).toEqual([]);
  });

  it("two schemes of one class: streams add up, and one without saved streams keeps every row", () => {
    const both: WantedStreams = new Map();
    noteWantedStreams(both, "XI", "Bengali (1st Language)", { "Bengali (1st Language)": ["Arts"] });
    noteWantedStreams(both, "XI", "Bengali (1st Language)", { "Bengali (1st Language)": ["Common"] });
    expect(staleStreamRows(rows, both)).toEqual([]);

    const heuristic: WantedStreams = new Map();
    noteWantedStreams(heuristic, "XI", "Bengali (1st Language)", { "Bengali (1st Language)": ["Arts"] });
    noteWantedStreams(heuristic, "XI", "Bengali (1st Language)", {});
    expect(staleStreamRows(rows, heuristic)).toEqual([]);
  });

  it("a row being saved in the same run is kept", () => {
    const wanted: WantedStreams = new Map();
    noteWantedStreams(wanted, "XI", "Bengali (1st Language)", { "Bengali (1st Language)": ["Arts"] });
    expect(staleStreamRows(rows, wanted, [{ id: "ben-common" }])).toEqual([]);
  });
});

describe("combined block names", () => {
  const classes: RoutineClass[] = ["XI", "XII"].flatMap((cls) =>
    ["Science", "Arts"].map((st) => ({ id: `${cls}-${st}`, className: `Class ${cls}`, section: `A (${st})` }))
  );
  const subj = (id: string, cls: string): RoutineSubject => ({
    id, name: "Bengali (1st Language)", className: `Class ${cls}`, stream: "Common", isHard: false, isLab: false,
    timePref: "any", allowMultiplePerDay: false, periodsPerWeek: 6,
  });
  const t = {
    id: "dk", name: "DK",
    sectionSubjects: Object.fromEntries(
      classes.map((c) => [`${c.className}::${c.section}`, ["Bengali (1st Language)"]])
    ),
  } as RoutineTeacher;

  it("say which class-section they cover, so XI and XII do not read as duplicates", () => {
    const names = deriveCombinedCommonGroups(classes, [subj("b11", "XI"), subj("b12", "XII")], [t]).map((g) => g.name);
    expect(names).toEqual(["Bengali (1st Language) (XI-A Combined)", "Bengali (1st Language) (XII-A Combined)"]);
  });
});

describe("the preset is trusted for deletes only when server and device agree", () => {
  it("same schemes in a different key order (JSONB) match", async () => {
    const { presetMatchesLocal } = await import("@/lib/routine/routine-sync");
    const local = JSON.stringify([{ classCode: "XI", subjects: ["Bengali"], subjectStreams: { Bengali: ["Arts"] } }]);
    expect(presetMatchesLocal([{ subjectStreams: { Bengali: ["Arts"] }, subjects: ["Bengali"], classCode: "XI" }], local)).toBe(true);
  });

  it("an edit still saving, an empty device or a non-array never match", async () => {
    const { presetMatchesLocal } = await import("@/lib/routine/routine-sync");
    const local = JSON.stringify([{ classCode: "XI", subjectStreams: { Bengali: ["Arts"] } }]);
    expect(presetMatchesLocal([{ classCode: "XI", subjectStreams: { Bengali: ["Common"] } }], local)).toBe(false);
    expect(presetMatchesLocal([], null)).toBe(false);
    expect(presetMatchesLocal(undefined, local)).toBe(false);
  });
});

describe("Common and streams exclude each other in the preset", () => {
  it("Arts first, then Common: Common replaces Arts", async () => {
    const { withSubjectStream } = await import("@/lib/routine/routine-helpers");
    expect(withSubjectStream(["Arts"], "Common")).toEqual(["Common"]);
    expect(withSubjectStream(["Arts", "Science"], "Common")).toEqual(["Common"]);
  });

  it("Common first, then a stream: the stream replaces Common", async () => {
    const { withSubjectStream } = await import("@/lib/routine/routine-helpers");
    expect(withSubjectStream(["Common"], "Arts")).toEqual(["Arts"]);
  });

  it("streams add up, and adding one already there changes nothing", async () => {
    const { withSubjectStream } = await import("@/lib/routine/routine-helpers");
    expect(withSubjectStream(["Arts"], "Science")).toEqual(["Arts", "Science"]);
    expect(withSubjectStream(["Arts", "Science"], "Arts")).toEqual(["Arts", "Science"]);
    expect(withSubjectStream(["General"], "Arts")).toEqual(["Arts"]);
  });
});
