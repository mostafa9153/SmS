import { describe, expect, it } from "vitest";
import { COMMANDS, searchCommands } from "@/lib/navigation/command-registry";

describe("command registry search", () => {
  it("finds short names through keywords", () => {
    expect(searchCommands("tc", true)[0].href).toBe("/generate/transfer-certificate");
    expect(searchCommands("ems", true).some((c) => c.href === "/ems")).toBe(true);
  });

  it("ranks a label prefix first", () => {
    expect(searchCommands("new adm", true)[0].label).toBe("New Admission");
  });

  it("deep-links settings sections", () => {
    expect(searchCommands("classes", true)[0].href).toBe("/settings/presets?section=classes");
  });

  it("hides admin-only items from non-admins", () => {
    expect(searchCommands("danger", false).some((c) => c.adminOnly)).toBe(false);
    expect(searchCommands("danger", true).some((c) => c.id === "s-danger")).toBe(true);
  });

  it("returns nothing for gibberish", () => {
    expect(searchCommands("zzqqxx", true)).toEqual([]);
  });

  it("has unique ids", () => {
    expect(new Set(COMMANDS.map((c) => c.id)).size).toBe(COMMANDS.length);
  });
});
