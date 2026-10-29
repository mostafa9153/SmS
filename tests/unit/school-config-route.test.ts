import { beforeEach, describe, expect, it, vi } from "vitest";

const recordUndo = vi.fn(async () => "undo-1");
const snapshotRows = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/api/guard", () => ({
  requireRole: async () => ({ ok: true, auth: { role: "Admin", user: { id: "u1" } } }),
  teacherPermissions: () => ({}),
}));
vi.mock("@/lib/supabase/auth-helper", () => ({ getAuthenticatedUserRole: async () => ({ role: "Admin", user: { id: "u1" } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({ upsert }) }) }));
vi.mock("@/lib/undo/journal", () => ({
  recordUndo: (...a: unknown[]) => (recordUndo as (...x: unknown[]) => unknown)(...a),
  snapshotRows: (...a: unknown[]) => snapshotRows(...a),
}));

import { POST } from "@/app/api/school-config/route";

const post = (body: unknown) =>
  POST(new Request("http://x/api/school-config", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  recordUndo.mockClear();
  snapshotRows.mockReset();
  upsert.mockReset();
  upsert.mockResolvedValue({ error: null });
});

describe("POST /api/school-config undo", () => {
  it("restores the previous row when the key already existed", async () => {
    const old = { key: "bank_presets", value: [1], updated_at: "t" };
    snapshotRows.mockResolvedValue([old]);

    const json = await (await post({ key: "bank_presets", value: [2] })).json();

    expect(json.undoId).toBe("undo-1");
    expect(recordUndo).toHaveBeenCalledWith(
      expect.objectContaining({ steps: [{ table: "system_config", op: "upsert", rows: [old] }] }),
    );
  });

  it("deletes the key on undo when it did not exist before", async () => {
    snapshotRows.mockResolvedValue([]);

    await post({ key: "bank_presets", value: [2] });

    expect(recordUndo).toHaveBeenCalledWith(
      expect.objectContaining({ steps: [{ table: "system_config", op: "delete", column: "key", values: ["bank_presets"] }] }),
    );
  });

  it("records no undo when the write fails", async () => {
    snapshotRows.mockResolvedValue([]);
    upsert.mockResolvedValue({ error: { message: "x" } });
    const res = await post({ key: "bank_presets", value: [2] });
    // primary failed, the audit_log fallback also fails in this stub
    expect(res.status).toBe(500);
    expect(recordUndo).not.toHaveBeenCalled();
  });
});
