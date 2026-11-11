"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { useAllRooms, useAssetCatalog, useRefreshAssets, useRoomStock } from "@/lib/assets/use-assets";
import type { AssetItem, Condition } from "@/lib/assets/types";

export const COUNT_CONDITIONS: Condition[] = ["working", "repair", "damaged"];
const key = (itemId: string, c: Condition) => `${itemId}:${c}`;

// Draft per room, so a refresh or a dropped connection keeps the numbers (CLAUDE.md: scoped draft keys).
const DRAFT_PREFIX = "sms_asset_count_draft:";
const DRAFT_MAX_AGE_MS = 24 * 3600_000;
type Draft = { counts: Record<string, number>; savedAt: number };

function readDraft(roomId: string): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + roomId);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d?.counts || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) return null;
    return d.counts;
  } catch {
    return null;
  }
}
function writeDraft(roomId: string, counts: Record<string, number>) {
  try {
    if (Object.keys(counts).length) localStorage.setItem(DRAFT_PREFIX + roomId, JSON.stringify({ counts, savedAt: Date.now() }));
    else localStorage.removeItem(DRAFT_PREFIX + roomId);
  } catch {
    // Storage full or blocked: the count still works, only without a draft.
  }
}

export interface CountRow {
  item: AssetItem;
  expected: Record<Condition, number>;
  inRoom: boolean;
}

/** State and actions for counting one room's counted (non-serial) items. */
export function useRoomCount(roomId: string) {
  const router = useRouter();
  const refresh = useRefreshAssets();
  const rooms = useAllRooms();
  const catalog = useAssetCatalog();
  const stock = useRoomStock(roomId);
  const refetchStock = stock.refetch;
  const room = rooms.data?.find((r) => r.id === roomId);
  const roomName = room?.name ?? "room";

  /** Only the numbers the user touched; everything else shows the saved qty. */
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState<"no" | "fresh" | "draft">("no");

  const rows = useMemo<CountRow[]>(() => {
    if (!catalog.data || !stock.data) return [];
    return catalog.data.items
      .filter((i) => i.tracking === "count")
      .map((item) => {
        const expected = { working: 0, repair: 0, damaged: 0 } as Record<Condition, number>;
        for (const s of stock.data.stock) if (s.item_id === item.id) expected[s.condition] += s.qty;
        return { item, expected, inRoom: expected.working + expected.repair + expected.damaged > 0 };
      })
      .sort((a, b) => Number(b.inRoom) - Number(a.inRoom) || a.item.sort_order - b.item.sort_order);
  }, [catalog.data, stock.data]);

  // Once the rows arrive: restore a draft and open the repair/damaged rows that hold stock
  // (state adjusted during render, not in an effect).
  if (restored === "no" && rows.length) {
    const draft = readDraft(roomId);
    const open = new Set(rows.filter((r) => r.expected.repair + r.expected.damaged > 0).map((r) => r.item.id));
    if (draft) Object.keys(draft).forEach((k) => !k.endsWith(":working") && open.add(k.split(":")[0]));
    setRestored(draft ? "draft" : "fresh");
    setCounts(draft ?? {});
    setExpanded(open);
  }
  useEffect(() => {
    if (restored === "draft") toast.info("Restored your unsaved count");
  }, [restored]);
  useEffect(() => {
    if (restored !== "no") writeDraft(roomId, counts);
  }, [roomId, counts, restored]);

  const valueOf = useCallback(
    (row: CountRow, c: Condition) => counts[key(row.item.id, c)] ?? row.expected[c],
    [counts],
  );
  const setValue = useCallback((row: CountRow, c: Condition, n: number) => {
    setCounts((prev) => {
      const next = { ...prev };
      if (n === row.expected[c]) delete next[key(row.item.id, c)];
      else next[key(row.item.id, c)] = n;
      return next;
    });
  }, []);
  const toggleExpanded = useCallback((itemId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const lines = useMemo(
    () =>
      rows.flatMap((r) =>
        COUNT_CONDITIONS.flatMap((c) => {
          const counted = counts[key(r.item.id, c)];
          return counted === undefined || counted === r.expected[c] ? [] : [{ itemId: r.item.id, condition: c, counted, expected: r.expected[c] }];
        }),
      ),
    [rows, counts],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.item.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const reset = useCallback(() => setCounts({}), []);

  const save = useCallback(async () => {
    if (!lines.length || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ undoId?: string }>("/api/assets/count", {
        method: "POST",
        json: { requestId: crypto.randomUUID(), roomId, lines },
        raw: true,
      });
      writeDraft(roomId, {});
      setCounts({});
      toastWithUndo(`Saved count for ${roomName}`, res.undoId, refresh);
      refresh();
      router.push(`/assets/rooms/${encodeURIComponent(roomId)}`);
    } catch (err) {
      // Someone saved this room meanwhile: reload the saved numbers, keep what the user typed.
      if (err instanceof ApiError && err.status === 409) void refetchStock();
      toast.error(err instanceof Error ? err.message : "Could not save the count");
    } finally {
      setSaving(false);
    }
  }, [lines, saving, roomId, roomName, refresh, router, refetchStock]);

  return {
    room,
    loading: rooms.isLoading || catalog.isLoading || stock.isLoading,
    rows: visible,
    totalRows: rows.length,
    expanded,
    toggleExpanded,
    valueOf,
    setValue,
    changes: lines.length,
    search,
    setSearch,
    saving,
    save,
    reset,
  };
}
