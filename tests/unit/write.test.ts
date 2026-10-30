import { describe, expect, it, vi } from "vitest";
import { mustWrite, softWrite } from "@/lib/supabase/write";

const ok = Promise.resolve({ data: null, error: null });
const failed = () => Promise.resolve({ data: null, error: { message: "permission denied" } });

describe("write helpers", () => {
  it("mustWrite throws with the table and Supabase message", async () => {
    await expect(mustWrite(ok, "students update")).resolves.toMatchObject({ error: null });
    await expect(mustWrite(failed(), "students update")).rejects.toThrow("students update: permission denied");
  });

  it("softWrite logs and never throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(softWrite(failed(), "audit_log insert")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
