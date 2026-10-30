import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TARGET_FIELDS } from "@/lib/utils/excel/fields";

describe("TARGET_FIELDS", () => {
  it("keeps every column definition in order", () => {
    const digest = createHash("sha1").update(JSON.stringify(TARGET_FIELDS)).digest("hex");
    expect({ count: TARGET_FIELDS.length, digest }).toEqual({ count: 91, digest: "905c96cde93bd41853e6918c225cb7dbad98fe8d" });
  });

  it("has unique keys", () => {
    const keys = TARGET_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
