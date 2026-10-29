import { describe, expect, it } from "vitest";
import { EMPTY_ROW, computeBest, ordinal, rankAll, type ScoreRow } from "@/lib/sports/score-sheet";

const row = (patch: Partial<ScoreRow>): ScoreRow => ({ ...EMPTY_ROW, ...patch });

describe("computeBest", () => {
  it("takes the best of three field trials, ignoring blanks", () => {
    expect(computeBest(row({ trial1: "4.2", trial2: "", trial3: "4.9" }), "field", false)).toBe("4.9");
    expect(computeBest(row({ trial1: "x" }), "field", false)).toBe("");
  });

  it("uses the single time for track and the typed score otherwise", () => {
    expect(computeBest(row({ trial1: "12.40" }), "track", true)).toBe("12.4");
    expect(computeBest(row({ bestScore: "Gold" }), "other", false)).toBe("Gold");
  });
});

describe("rankAll", () => {
  it("shares a rank on ties and skips the next place (1, 1, 3)", () => {
    const scores = { a: row({ bestScore: "11.0" }), b: row({ bestScore: "11.0" }), c: row({ bestScore: "12.5" }), d: row({}) };
    const ranked = rankAll(["a", "b", "c", "d"], scores, true);
    expect([ranked.a.rankPosition, ranked.b.rankPosition, ranked.c.rankPosition, ranked.d.rankPosition]).toEqual([1, 1, 3, null]);
  });

  it("ranks higher-is-better units from the top", () => {
    const ranked = rankAll(["a", "b"], { a: row({ bestScore: "3.1" }), b: row({ bestScore: "4.0" }) }, false);
    expect(ranked.b.rankPosition).toBe(1);
  });
});

it("ordinal", () => {
  expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
});
