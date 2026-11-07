"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { libraryWrite, useRefreshLibrary } from "./use-catalog";
import { changedKeys, validateSettings, type LibrarySettings, type SettingsErrors } from "./settings";
import type { BorrowerType } from "./types";

type Terms = LibrarySettings["student"];

/**
 * State of the Settings page: the saved rules, an editable draft, the
 * problems found in it (same checks as the server) and save. Only Admin can save.
 */
export function useLibrarySettings() {
  const refresh = useRefreshLibrary();
  const queryClient = useQueryClient();
  const saved = useQuery<LibrarySettings>({
    queryKey: ["library", "settings"],
    queryFn: () => apiFetch<LibrarySettings>("/api/library/settings"),
  });
  const role = useQuery<{ role: string }>({
    queryKey: ["auth", "role"],
    queryFn: () => apiFetch<{ role: string }>("/api/auth/role"),
    staleTime: 5 * 60_000,
  });
  const [draft, setDraft] = useState<LibrarySettings | null>(null);
  const [saving, setSaving] = useState(false);

  const value = draft ?? saved.data ?? null;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved.data);
  const canEdit = role.data?.role === "Admin";

  const errors = useMemo<SettingsErrors>(() => {
    if (!value) return {};
    const check = validateSettings(value);
    return check.ok ? {} : check.errors;
  }, [value]);

  const edit = (change: (s: LibrarySettings) => LibrarySettings) => {
    const current = draft ?? saved.data;
    if (current) setDraft(change(current));
  };

  const update = (patch: Partial<LibrarySettings>) => edit((s) => ({ ...s, ...patch }));
  const updateTerms = (type: BorrowerType, patch: Partial<Terms>) => edit((s) => ({ ...s, [type]: { ...s[type], ...patch } }));
  const updateSticker = (patch: Partial<LibrarySettings["sticker"]>) => edit((s) => ({ ...s, sticker: { ...s.sticker, ...patch } }));
  const addHoliday = () => edit((s) => ({ ...s, holidays: [...s.holidays, { from: "", to: "", label: "" }] }));
  const updateHoliday = (i: number, patch: Partial<LibrarySettings["holidays"][number]>) =>
    edit((s) => ({ ...s, holidays: s.holidays.map((h, j) => (j === i ? { ...h, ...patch } : h)) }));
  const removeHoliday = (i: number) => edit((s) => ({ ...s, holidays: s.holidays.filter((_, j) => j !== i) }));

  const reset = () => setDraft(null);

  const save = async () => {
    if (!value || !dirty) return;
    if (Object.keys(errors).length) return toast.error("Fix the highlighted fields before saving");
    setSaving(true);
    try {
      const r = await libraryWrite<LibrarySettings>("/api/library/settings", "PUT", { changes: changedKeys(saved.data!, value) });
      // Show what was saved at once; an edit made before the refetch must not start from old values.
      queryClient.setQueryData(["library", "settings"], r.data);
      setDraft(null);
      toastWithUndo("Settings saved", r.undoId, refresh);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return {
    loading: saved.isLoading || !value,
    value,
    dirty,
    canEdit,
    errors,
    saving,
    update,
    updateTerms,
    updateSticker,
    addHoliday,
    updateHoliday,
    removeHoliday,
    reset,
    save,
  };
}

export type LibrarySettingsState = ReturnType<typeof useLibrarySettings>;
