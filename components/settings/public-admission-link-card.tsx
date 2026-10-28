"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Loader2, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/ui/copy-button";
import { Spinner } from "@/components/ui/spinner";

interface LinkSettings {
  enabled: boolean;
  token: string | null;
  expiresAt: string | null;
  captchaConfigured: boolean;
  stats24h: Record<string, number>;
  attemptsLastHour: number;
}

const KEY = ["admission-public-link"];
const OUTCOMES: [string, string][] = [
  ["accepted", "Accepted"],
  ["duplicate", "Duplicate"],
  ["invalid", "Invalid"],
  ["captcha_failed", "Captcha failed"],
  ["rate_limited", "Rate limited"],
  ["honeypot", "Bot trap"],
];

export function PublicAdmissionLinkCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => apiFetch<LinkSettings>("/api/admission/public-link") });

  const update = useMutation({
    mutationFn: (body: { enabled?: boolean; rotate?: boolean; expiresAt?: string | null }) =>
      apiFetch<LinkSettings>("/api/admission/public-link", { method: "PATCH", json: body }),
    onSuccess: (next) => queryClient.setQueryData(KEY, next),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border bg-card p-6 flex justify-center">
        <Spinner className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  // Rendered only after the client-side query resolves, so window is available.
  const url = data.token ? `${window.location.origin}/apply/${data.token}` : "";
  const expiresLocal = data.expiresAt ? format(new Date(data.expiresAt), "yyyy-MM-dd'T'HH:mm") : "";

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Public Admission Link</span>
        </div>
        <Switch
          checked={data.enabled}
          disabled={update.isPending}
          onCheckedChange={(enabled: boolean) => update.mutate({ enabled })}
          aria-label="Enable public admission link"
        />
      </div>

      <div className="flex items-center gap-2 text-xs">
        {data.captchaConfigured ? (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" /> CAPTCHA active</span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><ShieldAlert className="h-3.5 w-3.5" /> CAPTCHA keys missing (TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY)</span>
        )}
      </div>

      {data.enabled && url && (
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs">{url}</code>
          <CopyButton text={url} />
          <Button variant="outline" size="sm" disabled={update.isPending} onClick={() => update.mutate({ rotate: true })} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> New link
          </Button>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-xs font-semibold max-w-xs">
        Expires
        <input
          type="datetime-local"
          value={expiresLocal}
          onChange={(e) => update.mutate({ expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
          className="h-9 rounded-lg border bg-background px-2.5 text-xs font-medium"
        />
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {OUTCOMES.map(([key, label]) => (
          <div key={key} className="rounded-xl border bg-muted/20 p-2 text-center">
            <div className="text-base font-bold">{data.stats24h[key] ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">{label} · 24h</div>
          </div>
        ))}
      </div>
    </div>
  );
}
