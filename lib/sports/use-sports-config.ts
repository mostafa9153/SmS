"use client";

import { apiFetch } from "@/lib/api/client";
import { useState, useEffect, useCallback } from "react";
import { SportsConfig, DEFAULT_SPORTS_CONFIG } from "./types";

const LOCAL_STORAGE_KEY = "sms_sports_config_v1";

export function getSavedSportsConfig(): SportsConfig {
  if (typeof window === "undefined") return DEFAULT_SPORTS_CONFIG;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        maxEventsPerStudent:
          typeof parsed.maxEventsPerStudent === "number"
            ? parsed.maxEventsPerStudent
            : DEFAULT_SPORTS_CONFIG.maxEventsPerStudent,
        enforcementMode:
          parsed.enforcementMode === "strict" ? "strict" : "warning",
      };
    }
  } catch {
    // Unreadable cache: fall back to the defaults.
  }
  return DEFAULT_SPORTS_CONFIG;
}

export function useSportsConfig() {
  const [config, setConfig] = useState<SportsConfig>(getSavedSportsConfig);
  const [isLoading, setIsLoading] = useState(true);

  // Sync from DB
  useEffect(() => {
    let isMounted = true;
    async function fetchConfig() {
      try {
        // apiFetch unwraps `data`; a key that was never saved comes back as the bare envelope.
        const res = await apiFetch<Partial<SportsConfig> & { success?: boolean; data?: null }>("/api/school-config?key=sports_config");
        const saved = res?.success === true && res.data === null ? null : res;
        if (saved && isMounted) {
          const merged: SportsConfig = {
            maxEventsPerStudent:
              typeof saved.maxEventsPerStudent === "number" ? saved.maxEventsPerStudent : DEFAULT_SPORTS_CONFIG.maxEventsPerStudent,
            enforcementMode: saved.enforcementMode === "strict" ? "strict" : "warning",
          };
          setConfig(merged);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        }
      } catch {
        // Keep the cached copy; apiFetch already reported the failure.
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchConfig();

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<SportsConfig>).detail;
      if (detail) setConfig(detail);
    };

    window.addEventListener("sms_sports_config_updated", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("sms_sports_config_updated", handleUpdate);
    };
  }, []);

  // Server first: the rules are enforced there, so a local-only change would mislead.
  const saveConfig = useCallback(async (newConfig: SportsConfig): Promise<boolean> => {
    try {
      await apiFetch("/api/school-config", { method: "POST", json: { key: "sports_config", value: newConfig } });
    } catch {
      return false;
    }
    setConfig(newConfig);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent("sms_sports_config_updated", { detail: newConfig }));
    return true;
  }, []);

  return { config, saveConfig, isLoading };
}
