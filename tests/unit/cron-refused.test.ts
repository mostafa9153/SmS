import { beforeEach, describe, expect, it, vi } from "vitest";

const notify = vi.fn();
let recentCount = 0;

vi.mock("@/lib/notifications/notify", () => ({ notify: (...a: unknown[]) => notify(...a) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ gte: async () => ({ count: recentCount, error: null }) }) }) }),
  }),
}));

const { notifyCronRefused } = await import("@/lib/api/cron");
const req = (ua?: string) => new Request("http://x/api/cron", { headers: ua ? { "user-agent": ua } : {} });

describe("notifyCronRefused", () => {
  beforeEach(() => {
    notify.mockReset();
    recentCount = 0;
  });

  it("tells admins when Vercel cron is refused", async () => {
    await notifyCronRefused(req("vercel-cron/1.0"), "cron.refused.test", "Test job");
    expect(notify).toHaveBeenCalledOnce();
    expect(notify.mock.calls[0][0]).toMatchObject({ roles: ["Admin"], severity: "error", source: "cron.refused.test" });
  });

  it("ignores other callers and repeats within the quiet window", async () => {
    await notifyCronRefused(req("curl/8"), "cron.refused.test", "Test job");
    recentCount = 1;
    await notifyCronRefused(req("vercel-cron/1.0"), "cron.refused.test", "Test job");
    expect(notify).not.toHaveBeenCalled();
  });
});
