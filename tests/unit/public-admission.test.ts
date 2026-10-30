// Abuse tests for the unauthenticated public admission endpoint.
import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWx12345678";

const state = {
  settings: { public_link_enabled: true, public_link_token: TOKEN, public_link_expires_at: null as string | null, new_admission_active: true },
  attemptsCount: 0,
  /** Per-call counts for the attempts table, consumed in order before attemptsCount. */
  countQueue: [] as number[],
  duplicateCount: 0,
  inserted: [] as Record<string, unknown>[],
  attempts: [] as Record<string, unknown>[],
  notified: [] as Record<string, unknown>[],
};

// Minimal chainable stand-in for the Supabase query builder.
function builder(table: string) {
  let isCount = false;
  let pendingInsert: Record<string, unknown> | null = null;
  const result = () => {
    if (table === "admission_settings") return { data: state.settings, error: null };
    if (table === "public_admission_attempts") return { count: state.countQueue.length ? state.countQueue.shift() : state.attemptsCount, data: [], error: null };
    if (table === "admission_applications") {
      if (isCount) return { count: state.duplicateCount, error: null };
      return { data: { id: "app-1", ...pendingInsert }, error: null };
    }
    return { data: null, error: null };
  };
  const chain: Record<string, unknown> = {
    select: (_c?: string, opts?: { count?: string }) => { if (opts?.count) isCount = true; return chain; },
    eq: () => chain, gte: () => chain, ilike: () => chain, limit: () => chain, in: () => chain, or: () => chain,
    maybeSingle: async () => result(),
    single: async () => result(),
    insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (table === "admission_applications") { state.inserted.push(row); pendingInsert = row; }
      if (table === "public_admission_attempts") state.attempts.push(row);
      return chain;
    },
    then: (resolve: (v: unknown) => void) => resolve(result()),
  };
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (t: string) => builder(t), rpc: async () => ({ data: 7, error: null }) }),
}));
vi.mock("@/lib/notifications/notify", () => ({ notify: async (n: Record<string, unknown>) => { state.notified.push(n); } }));

const { GET, POST } = await import("@/app/api/public/admission/[token]/route");

const validForm = {
  studentName: "Rahim Ali", dob: "2014-05-10", gender: "Male", motherTongue: "Bengali", religion: "Islam",
  bloodGroup: "B+", socialCategory: "General", minorityGroup: "Muslim",
  fatherName: "Karim Ali", fatherOccupation: "Farmer", motherName: "Amina Bibi", motherOccupation: "Homemaker",
  guardianName: "Karim Ali", relationshipWithGuardian: "Father", guardianOccupation: "Farmer", guardianQualification: "Class X",
  studentContact: "9876543210", presentVillage: "Marigachi", presentPanchayat: "GP", presentBlock: "Block",
  presentPostOffice: "PO", presentPoliceStation: "PS", presentDistrict: "Murshidabad", presentPincode: "742101",
  presentClass: "V", admissionType: "new", mediumOfInstruction: "Bengali",
};

const params = (token = TOKEN) => ({ params: Promise.resolve({ token }) });
const post = (body: unknown, token = TOKEN) =>
  POST(new Request(`http://x/api/public/admission/${token}`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "x-forwarded-for": "1.2.3.4" } }), params(token));

beforeEach(() => {
  state.settings = { public_link_enabled: true, public_link_token: TOKEN, public_link_expires_at: null, new_admission_active: true };
  state.attemptsCount = 0;
  state.countQueue = [];
  state.duplicateCount = 0;
  state.inserted = [];
  state.attempts = [];
  state.notified = [];
});

describe("public admission link", () => {
  it("hides closed, expired, wrong or malformed links behind 404", async () => {
    expect((await GET(new Request("http://x"), params("short"))).status).toBe(404);
    expect((await GET(new Request("http://x"), params(TOKEN.replace("A", "B")))).status).toBe(404);
    state.settings.public_link_enabled = false;
    expect((await GET(new Request("http://x"), params())).status).toBe(404);
    state.settings.public_link_enabled = true;
    state.settings.public_link_expires_at = new Date(Date.now() - 1000).toISOString();
    expect((await GET(new Request("http://x"), params())).status).toBe(404);
    state.settings.public_link_expires_at = null;
    state.settings.new_admission_active = false;
    expect((await GET(new Request("http://x"), params())).status).toBe(404);
  });

  it("rejects oversized bodies before touching the database", async () => {
    const res = await post("x".repeat(70 * 1024));
    expect(res.status).toBe(413);
    expect(state.attempts).toHaveLength(0);
  });

  it("silently swallows honeypot submissions", async () => {
    const res = await post({ form: validForm, website: "http://spam" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { applicationNo: null } });
    expect(state.inserted).toHaveLength(0);
    expect(state.attempts[0]).toMatchObject({ outcome: "honeypot" });
  });

  it("throttles floods and alerts admins once per offender", async () => {
    state.countQueue = [5, 0]; // IP over the hourly limit, not throttled before
    const first = await post({ form: validForm });
    expect(first.status).toBe(429);
    expect(state.notified).toHaveLength(1);
    expect(state.notified[0]).toMatchObject({ roles: ["Admin"], severity: "warning" });

    state.countQueue = [6, 1]; // same IP again: still blocked, no second alert
    expect((await post({ form: validForm })).status).toBe(429);
    expect(state.notified).toHaveLength(1);
    expect(state.inserted).toHaveLength(0);
  });

  it("refuses school-controlled or unknown fields", async () => {
    for (const extra of [{ status: "admitted" }, { feePaid: true }, { applicationNo: "AP/1" }, { aiExtractedData: { x: 1 } }, { remarks: "x" }]) {
      const res = await post({ form: { ...validForm, ...extra } });
      expect(res.status).toBe(400);
    }
    expect(state.inserted).toHaveLength(0);
  });

  it("rejects oversized fields, bad classes and invalid data", async () => {
    expect((await post({ form: { ...validForm, studentName: "a".repeat(1500) } })).status).toBe(400);
    expect((await post({ form: { ...validForm, presentClass: "Admin" } })).status).toBe(400);
    expect((await post({ form: { ...validForm, studentContact: "123" } })).status).toBe(400);
    expect((await post("{not json")).status).toBe(400);
    expect(state.inserted).toHaveLength(0);
  });

  it("blocks duplicates without revealing the existing record", async () => {
    state.duplicateCount = 1;
    const res = await post({ form: validForm });
    expect(res.status).toBe(409);
    expect(JSON.stringify(await res.json())).not.toContain("app-");
  });

  it("accepts a valid form with server-forced values and returns only receipt fields", async () => {
    const res = await post({ form: { ...validForm, studentName: "<script>alert(1)</script>Rahim" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Object.keys(json.data).sort()).toEqual(["applicationNo", "studentName", "targetClass"]);
    expect(state.inserted[0]).toMatchObject({
      status: "pending",
      form_method: "online",
      fee_paid: false,
      fee_amount: 0,
      target_roll: null,
      remarks: "Submitted via public admission link",
      academic_year: String(new Date().getFullYear()),
      target_class: "V",
    });
    expect(state.attempts.at(-1)).toMatchObject({ outcome: "accepted" });
    expect(JSON.stringify(state.attempts)).not.toContain("1.2.3.4");
    expect(JSON.stringify(state.attempts)).not.toContain("9876543210");
  });
});
