"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { AccessProfile } from "@/lib/navigation/route-access";

const KEY = "sms_access_profile";

function cached(): AccessProfile | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AccessProfile) : undefined;
  } catch {
    return undefined;
  }
}

export function clearAccessCache() {
  try { localStorage.removeItem(KEY); } catch {}
}

/** Role + effective permissions of the signed-in user. `role` is null until known. */
export function useAccess(): AccessProfile & { ready: boolean } {
  const { data, isSuccess } = useQuery<AccessProfile>({
    queryKey: ["access-profile"],
    queryFn: async () => {
      const json = await apiFetch<{ user?: { role?: string; permissions?: AccessProfile["permissions"] } }>("/api/auth/profile");
      const next: AccessProfile = {
        role: json?.user?.role ?? "Staff",
        permissions: json?.user?.permissions ?? null,
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    },
    staleTime: 60_000,
  });
  const profile = data ?? (typeof window !== "undefined" ? cached() : undefined);
  return { role: profile?.role ?? null, permissions: profile?.permissions ?? null, ready: isSuccess || !!profile };
}
