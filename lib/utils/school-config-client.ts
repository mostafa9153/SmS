"use client";

import { useQuery } from "@tanstack/react-query";

interface ConfigCache {
  data: Record<string, any>;
  fetchedAt: number;
}

let clientConfigCache: ConfigCache | null = null;
let pendingFetch: Promise<Record<string, any> | null> | null = null;
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all school configuration with in-flight request deduplication and client-side caching.
 * Multiple simultaneous calls on the same page will share the exact same HTTP request.
 */
export async function fetchSchoolConfigClient(forceRefresh = false): Promise<Record<string, any> | null> {
  // 1. Return from in-memory cache if valid and not force-refreshing
  if (!forceRefresh && clientConfigCache && Date.now() - clientConfigCache.fetchedAt < CLIENT_CACHE_TTL) {
    return clientConfigCache.data;
  }

  // 2. Return the existing in-flight Promise if a fetch is already in progress
  if (pendingFetch) {
    return pendingFetch;
  }

  // 3. Initiate single network request
  pendingFetch = (async () => {
    try {
      const res = await fetch("/api/school-config");
      if (!res.ok) return clientConfigCache?.data || null;
      const json = await res.json();
      const data = json?.data || {};

      clientConfigCache = {
        data,
        fetchedAt: Date.now(),
      };

      // Also keep localStorage in sync for offline resilience
      if (typeof window !== "undefined") {
        if (data.school_profile) {
          localStorage.setItem("sms_school_profile", JSON.stringify(data.school_profile));
        }
        if (data.class_management && Array.isArray(data.class_management)) {
          localStorage.setItem("sms_class_management", JSON.stringify(data.class_management));
        }
        if (data.marks_schemes && Array.isArray(data.marks_schemes)) {
          localStorage.setItem("sms_marks_distribution_schemes", JSON.stringify(data.marks_schemes));
        }
        if (data.ems_rooms && Array.isArray(data.ems_rooms)) {
          localStorage.setItem("sms_ems_saved_rooms_v1", JSON.stringify(data.ems_rooms));
        }
        if (data.ems_allocations && Array.isArray(data.ems_allocations)) {
          localStorage.setItem("sms_ems_saved_allocations_v1", JSON.stringify(data.ems_allocations));
        }
      }

      return data;
    } catch (err) {
      console.error("Failed to fetch school config from API:", err);
      return clientConfigCache?.data || null;
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

/**
 * Plucks a specific configuration key (e.g. "school_profile", "class_management")
 * from the shared config cache without initiating a separate network request.
 */
export async function getSchoolConfigKey<T = any>(key: string, forceRefresh = false): Promise<T | null> {
  const allConfigs = await fetchSchoolConfigClient(forceRefresh);
  if (!allConfigs) return null;
  return (allConfigs[key] as T) ?? null;
}

/**
 * Invalidates the client memory cache (call this after updating settings)
 */
export function invalidateSchoolConfigClientCache(): void {
  clientConfigCache = null;
}

/**
 * Shared React Query hook for all components needing school configuration.
 * Uses unified queryKey ["school-config"] with 5-minute staleTime.
 */
export function useSchoolConfigQuery() {
  return useQuery({
    queryKey: ["school-config"],
    queryFn: () => fetchSchoolConfigClient(),
    staleTime: CLIENT_CACHE_TTL,
  });
}
