"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api/client";
import type { RoomRow } from "@/lib/rooms/types";
import type { AssetFund, AssetItem, AssetUnit, RoomSummary, StockLine } from "./types";

export const ASSET_KEYS = {
  all: ["assets"] as const,
  catalog: ["assets", "catalog"] as const,
  summaries: ["assets", "rooms"] as const,
  room: (id: string) => ["assets", "room", id] as const,
};
export const ALL_ROOMS_KEY = ["rooms", "all"] as const;

/** Every active room (exam and non-exam), in display order. */
export function useAllRooms() {
  return useQuery({ queryKey: ALL_ROOMS_KEY, queryFn: () => apiFetch<RoomRow[]>("/api/rooms"), staleTime: 30_000 });
}

export function useAssetCatalog() {
  return useQuery({
    queryKey: ASSET_KEYS.catalog,
    queryFn: () => apiFetch<{ items: AssetItem[]; funds: AssetFund[] }>("/api/assets/catalog"),
    staleTime: 60_000,
  });
}

export function useRoomSummaries() {
  return useQuery({ queryKey: ASSET_KEYS.summaries, queryFn: () => apiFetch<RoomSummary[]>("/api/assets/rooms"), staleTime: 15_000 });
}

export function useRoomStock(roomId: string) {
  return useQuery({
    queryKey: ASSET_KEYS.room(roomId),
    queryFn: () => apiFetch<{ stock: StockLine[]; units: AssetUnit[] }>(`/api/assets/rooms/${encodeURIComponent(roomId)}`),
    enabled: !!roomId,
  });
}

/** Refetch everything asset-related (after a write or an undo). */
export function useRefreshAssets() {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: ASSET_KEYS.all });
    void qc.invalidateQueries({ queryKey: ["rooms"] });
  }, [qc]);
}

export const CONDITION_LABEL = { working: "Working", repair: "Needs repair", damaged: "Damaged" } as const;
export const ROOM_KIND_LABEL: Record<string, string> = {
  classroom: "Classroom",
  hall: "Hall",
  lab: "Lab",
  office: "Office",
  store: "Store",
  staff: "Staff room",
  other: "Other",
};
