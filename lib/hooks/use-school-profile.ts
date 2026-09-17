"use client";

import { useState, useEffect } from "react";
import {
  type SchoolProfileData,
  DEFAULT_SCHOOL_PROFILE,
  getSavedSchoolProfile,
  fetchSchoolProfileFromDb,
} from "@/lib/utils/school-profile";

/**
 * Custom React hook for live school profile subscription and auto-fetch from DB.
 * Automatically updates when school profile is edited anywhere in the app.
 */
export function useSchoolProfile() {
  const [profile, setProfile] = useState<SchoolProfileData>(getSavedSchoolProfile);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch latest from database asynchronously
    fetchSchoolProfileFromDb().then((p) => {
      if (isMounted) {
        setProfile(p);
        setIsLoading(false);
      }
    });

    // 2. React to instantaneous cross-component and cross-tab update events
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SchoolProfileData>;
      if (customEvent && customEvent.detail) {
        setProfile({ ...DEFAULT_SCHOOL_PROFILE, ...customEvent.detail });
      } else {
        setProfile(getSavedSchoolProfile());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sms_school_profile") {
        setProfile(getSavedSchoolProfile());
      }
    };

    window.addEventListener("sms_school_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("sms_school_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    const p = await fetchSchoolProfileFromDb();
    setProfile(p);
    setIsLoading(false);
    return p;
  };

  return { profile, isLoading, refetch };
}
