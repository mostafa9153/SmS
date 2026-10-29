"use client";

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
  } catch (err) {}
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
        const res = await fetch("/api/school-config?key=sports_config");
        if (res.ok) {
          const json = await res.json();
          if (json?.data && isMounted) {
            const merged: SportsConfig = {
              maxEventsPerStudent:
                typeof json.data.maxEventsPerStudent === "number"
                  ? json.data.maxEventsPerStudent
                  : DEFAULT_SPORTS_CONFIG.maxEventsPerStudent,
              enforcementMode:
                json.data.enforcementMode === "strict" ? "strict" : "warning",
            };
            setConfig(merged);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          }
        }
      } catch (err) {
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchConfig();

    const handleUpdate = (e: CustomEvent<SportsConfig>) => {
      if (e.detail) setConfig(e.detail);
    };

    window.addEventListener("sms_sports_config_updated" as any, handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("sms_sports_config_updated" as any, handleUpdate);
    };
  }, []);

  const saveConfig = useCallback(async (newConfig: SportsConfig): Promise<boolean> => {
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
      window.dispatchEvent(
        new CustomEvent("sms_sports_config_updated", { detail: newConfig })
      );
    }

    try {
      await fetch("/api/school-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "sports_config",
          value: newConfig,
        }),
      });
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  return { config, saveConfig, isLoading };
}
