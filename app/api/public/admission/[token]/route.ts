import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { admissionFormSchema } from "@/lib/validations/admission-form-schema";
import { CLASS_LADDER } from "@/lib/academic/class-ladder";
import { createAdmissionApplication } from "@/lib/admission/application-row";
import { toOnlineApplicationPayload } from "@/lib/admission/application-payload";
import {
  PUBLIC_LIMITS,
  checkRateLimit,
  clientIp,
  getPublicLinkConfig,
  isLinkOpen,
  logAttempt,
  privacyHash,
} from "@/lib/admission/public-link";
import { turnstileConfigured, verifyTurnstile } from "@/lib/security/turnstile";
import { notify } from "@/lib/notifications/notify";

// Unauthenticated endpoint. It can only *create* a pending application; it never
// reads, updates or deletes, and every value the school controls is forced server-side.

type Params = { params: Promise<{ token: string }> };

const NOT_FOUND = () => NextResponse.json({ success: false, error: "This admission link is not available." }, { status: 404 });
const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

const formSchema = admissionFormSchema.strict();

function longestString(value: unknown, depth = 0): number {
  if (depth > 4) return Infinity;
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.length > 50 ? Infinity : Math.max(0, ...value.map((v) => longestString(v, depth + 1)));
  if (value && typeof value === "object") return Math.max(0, ...Object.values(value).map((v) => longestString(v, depth + 1)));
  return 0;
}

async function openLink(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const supabase = createAdminClient();
  const config = await getPublicLinkConfig(supabase);
  return isLinkOpen(config, token) ? supabase : null;
}

// GET — is this link open? Returns only what the form needs to render.
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const supabase = await openLink(token);
  if (!supabase) return NOT_FOUND();
  if (process.env.NODE_ENV === "production" && !turnstileConfigured()) {
    return fail(503, "Online admission is temporarily unavailable.");
  }
  return NextResponse.json({ success: true, data: { siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null } });
}

// POST — submit one application.
export async function POST(req: Request, { params }: Params) {
  const { token } = await params;

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > PUBLIC_LIMITS.bodyBytes) return fail(413, "Submission is too large.");
  const raw = await req.text();
  if (raw.length > PUBLIC_LIMITS.bodyBytes) return fail(413, "Submission is too large.");

  const supabase = await openLink(token);
  if (!supabase) return NOT_FOUND();
  if (process.env.NODE_ENV === "production" && !turnstileConfigured()) {
    return fail(503, "Online admission is temporarily unavailable.");
  }

  let envelope: { form?: unknown; captchaToken?: string; website?: string };
  try {
    envelope = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid submission.");
  }

  const ip = clientIp(req);
  const ipHash = privacyHash(`ip:${ip}`);

  // Honeypot: real users never see or fill this field. Pretend success so bots learn nothing.
  if (envelope.website) {
    await logAttempt(supabase, { ipHash, outcome: "honeypot" });
    return NextResponse.json({ success: true, data: { applicationNo: null } });
  }

  const form = envelope.form as Record<string, unknown> | undefined;
  const contactDigits = typeof form?.studentContact === "string" ? form.studentContact.replace(/\D/g, "").slice(-10) : "";
  const contactHash = contactDigits ? privacyHash(`tel:${contactDigits}`) : null;

  const limited = await checkRateLimit(supabase, ipHash, contactHash);
  if (limited) {
    const { count } = await supabase
      .from("public_admission_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("outcome", "rate_limited")
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    await logAttempt(supabase, { ipHash, contactHash, outcome: "rate_limited" });
    if (!count || limited === "global") {
      await notify({
        roles: ["Admin"],
        category: "system",
        severity: "warning",
        title: "Public admission link throttled",
        message: limited === "global" ? "Unusually many submissions in the last hour — possible flood." : `Too many submissions from one ${limited === "ip" ? "network" : "mobile number"}.`,
        link: "/admission/applications",
        source: "admission.public.ratelimit",
      });
    }
    return fail(429, "Too many submissions. Please try again later.");
  }

  if (!(await verifyTurnstile(envelope.captchaToken, ip))) {
    await logAttempt(supabase, { ipHash, contactHash, outcome: "captcha_failed" });
    return fail(400, "Verification failed. Please complete the check and try again.");
  }

  const parsed = formSchema.safeParse(form);
  if (!parsed.success || longestString(form) > PUBLIC_LIMITS.fieldChars) {
    await logAttempt(supabase, { ipHash, contactHash, outcome: "invalid" });
    const issue = parsed.success ? null : parsed.error.issues[0];
    return fail(400, issue ? `${issue.path.join(".") || "form"}: ${issue.message}` : "A field is too long.");
  }
  const data = parsed.data;
  if (!(CLASS_LADDER as readonly string[]).includes(data.presentClass)) {
    await logAttempt(supabase, { ipHash, contactHash, outcome: "invalid" });
    return fail(400, "presentClass: Invalid class.");
  }

  const academicYear = String(new Date().getFullYear());
  const { count: existing } = await supabase
    .from("admission_applications")
    .select("id", { count: "exact", head: true })
    .eq("academic_year", academicYear)
    .eq("student_contact", data.studentContact)
    .ilike("student_name", data.studentName.trim().replace(/[%_\\]/g, "\\$&"));
  if (existing) {
    await logAttempt(supabase, { ipHash, contactHash, outcome: "duplicate" });
    return fail(409, "An application with these details already exists. Please contact the school office.");
  }

  const { insertedData, insertError } = await createAdmissionApplication(
    supabase,
    toOnlineApplicationPayload(data, academicYear),
    academicYear,
    data.presentClass,
    {
      force: {
        status: "pending",
        form_method: "online",
        target_roll: null,
        photo_url: null,
        scanned_image_url: null,
        fee_paid: false,
        fee_amount: 0,
        payment_receipt_no: null,
        remarks: "Submitted via public admission link",
      },
    },
  );

  if (insertError || !insertedData) {
    console.error("[public admission] insert failed:", insertError);
    await logAttempt(supabase, { ipHash, contactHash, outcome: "error" });
    return fail(500, "Could not save the application. Please try again later.");
  }

  await logAttempt(supabase, { ipHash, contactHash, outcome: "accepted", applicationId: insertedData.id });
  await notify({
    roles: ["Admin", "Staff"],
    title: "New admission application (public link)",
    message: `${insertedData.student_name} · Class ${insertedData.target_class} · ${insertedData.application_no}`,
    link: "/admission/applications",
    source: "admission.public",
  });

  return NextResponse.json({
    success: true,
    data: {
      applicationNo: insertedData.application_no,
      studentName: insertedData.student_name,
      targetClass: insertedData.target_class,
    },
  });
}
