import { beforeEach, describe, expect, it, vi } from "vitest";

const inserted: unknown[] = [];
const pushes: unknown[] = [];
let insertError: { message: string } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async (rows: unknown[]) => {
        inserted.push(...rows);
        return { error: insertError };
      },
    }),
  }),
}));
vi.mock("@/lib/push-notifications", () => ({
  sendWebPushNotification: async (opts: unknown) => {
    pushes.push(opts);
    return { success: true, sent: 1, failed: 0 };
  },
}));

const { notify, notifyAdminsOfError } = await import("@/lib/notifications/notify");
const { apiFetch, ApiError } = await import("@/lib/api/client");

beforeEach(() => {
  inserted.length = 0;
  pushes.length = 0;
  insertError = null;
});

describe("notify", () => {
  it("writes one row per user/role recipient and infers category", async () => {
    await notify({ userId: "u1", roles: ["Admin", "Staff"], severity: "warning", title: "T", message: "M" });
    expect(inserted).toHaveLength(3);
    expect(inserted).toMatchObject([
      { recipient_user_id: "u1", recipient_role: null, category: "system", severity: "warning" },
      { recipient_user_id: null, recipient_role: "Admin" },
      { recipient_user_id: null, recipient_role: "Staff" },
    ]);
  });

  it("does nothing without recipients and never throws on DB errors", async () => {
    await notify({ title: "nobody" });
    expect(inserted).toHaveLength(0);
    insertError = { message: "relation does not exist" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(notify({ roles: ["Admin"], title: "x" })).resolves.toBeUndefined();
  });

  it("truncates long text and pushes when asked", async () => {
    await notifyAdminsOfError("test", "Boom", new Error("x".repeat(5000)));
    expect((inserted[0] as { message: string }).message).toHaveLength(2000);
    expect(inserted[0]).toMatchObject({ category: "system", severity: "error", source: "test" });
    expect(pushes).toEqual([expect.objectContaining({ role: "Admin", title: "Boom" })]);
  });
});

describe("apiFetch", () => {
  it("returns data and throws ApiError on envelope or HTTP failure", async () => {
    const respond = (status: number, body: unknown) =>
      vi.fn(async () => new Response(JSON.stringify(body), { status }));

    vi.stubGlobal("fetch", respond(200, { success: true, data: [1, 2] }));
    await expect(apiFetch("/x")).resolves.toEqual([1, 2]);

    vi.stubGlobal("fetch", respond(200, { success: false, error: "nope" }));
    await expect(apiFetch("/x")).rejects.toMatchObject({ message: "nope", status: 200 });

    vi.stubGlobal("fetch", respond(403, { success: false, error: "Forbidden" }));
    await expect(apiFetch("/x")).rejects.toBeInstanceOf(ApiError);
    vi.unstubAllGlobals();
  });
});
