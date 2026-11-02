import { describe, it, expect } from "vitest";
import { formatClassSectionLabel, parseClassSectionLabel, sectionTeacherKeys } from "@/lib/routine/routine-sync";
import { presetSectionItems } from "@/lib/routine/routine-helpers";

describe("class teacher per HS stream section", () => {
  it("lists every stream section of XI from the preset", () => {
    const items = presetSectionItems([
      { name: "Class X", code: "X", sections: ["A", "B"] },
      { name: "Class XI", code: "XI", sections: ["A"], stream: "Science,Commerce,Arts", streamSections: { Science: ["A"], Commerce: ["A"], Arts: ["A", "B"] } },
    ]);
    const labels = items.map((i) => formatClassSectionLabel(i.className, i.stream === "General" ? i.section : `${i.section} (${i.stream})`));
    expect(labels).toEqual([
      "Class X - Section A",
      "Class X - Section B",
      "Class XI - Section A (Science)",
      "Class XI - Section A (Commerce)",
      "Class XI - Section A (Arts)",
      "Class XI - Section B (Arts)",
    ]);
  });

  it("a stream label round-trips to its own preset keys only", () => {
    const parsed = parseClassSectionLabel("Class XI - Section A (Science)");
    expect(parsed).toEqual({ className: "Class XI", section: "A (Science)" });
    const keys = sectionTeacherKeys(parsed!.section);
    expect(keys).toContain("A (Science)");
    expect(keys).toContain("Science - A");
    expect(keys).not.toContain("A");
    expect(sectionTeacherKeys("A")).toEqual(["A", "Section A"]);
  });
});
