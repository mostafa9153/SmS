"use client";

import { use, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AdmissionApplicationForm } from "@/components/admission/admission-application-form";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import type { AdmissionFormData } from "@/lib/validations/admission-form-schema";

type LinkState = { status: "loading" } | { status: "closed"; message: string } | { status: "open"; siteKey: string | null };

export default function PublicAdmissionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const endpoint = `/api/public/admission/${encodeURIComponent(token)}`;

  const [link, setLink] = useState<LinkState>({ status: "loading" });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ applicationNo: string | null; studentName?: string; targetClass?: string } | null>(null);

  useEffect(() => {
    fetch(endpoint)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        setLink(res.ok && json.success ? { status: "open", siteKey: json.data?.siteKey ?? null } : { status: "closed", message: json.error || "This admission link is not available." });
      })
      .catch(() => setLink({ status: "closed", message: "This admission link is not available." }));
  }, [endpoint]);

  const onToken = useCallback((t: string | null) => setCaptchaToken(t), []);

  const handleSubmit = async (form: AdmissionFormData) => {
    if (link.status === "open" && link.siteKey && !captchaToken) {
      toast.error("Please complete the verification check.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, captchaToken, website: honeypot }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || "Submission failed. Please try again.");
      try {
        localStorage.removeItem("sms_admission_apply_draft");
        localStorage.removeItem("sms_admission_saved_sections");
      } catch {}
      setResult(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setCaptchaReset((n) => n + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (link.status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (link.status === "closed") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">{link.message}</p>
        </div>
      </main>
    );
  }

  if (result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h1 className="text-lg font-bold">আবেদন জমা হয়েছে</h1>
          {result.applicationNo && (
            <p className="text-sm">
              Application No: <span className="font-mono font-bold">{result.applicationNo}</span>
            </p>
          )}
          {result.studentName && (
            <p className="text-sm text-muted-foreground">
              {result.studentName} · Class {result.targetClass}
            </p>
          )}
          <button type="button" onClick={() => window.print()} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Print
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">Admission Application</h1>

        {/* Honeypot: hidden from people, filled by naive bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </label>
        </div>

        <AdmissionApplicationForm
          onSubmit={handleSubmit}
          submitButtonText="অনলাইন আবেদন জমা দিন (Submit Application)"
          isSubmitting={isSubmitting}
          mode="public"
          checklist={link.siteKey ? <TurnstileWidget siteKey={link.siteKey} onToken={onToken} resetKey={captchaReset} /> : undefined}
        />
      </div>
    </main>
  );
}
