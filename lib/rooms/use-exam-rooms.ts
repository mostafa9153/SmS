"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import type { EmsRoom } from "@/lib/ems/types";
import { emsToRoomInput, roomToEms, type RoomRow } from "./types";

export const EXAM_ROOMS_KEY = ["rooms", "exam"] as const;

type Saved = { data: RoomRow; undoId?: string | null };
type Done = { undoId?: string | null };
type Snapshot = { previous: RoomRow[] | undefined };

const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

/**
 * EMS exam rooms from the rooms table, plus save / remove / reorder with undo.
 * Remove and reorder update the query cache first and roll it back on failure,
 * so the screen never shows an order or a room list the server does not have.
 */
export function useExamRooms() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: EXAM_ROOMS_KEY,
    queryFn: () => apiFetch<RoomRow[]>("/api/rooms?exam=1"),
    staleTime: 30_000,
  });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["rooms"] }), [qc]);

  const optimistic = useCallback(
    async (change: (rows: RoomRow[]) => RoomRow[]): Promise<Snapshot> => {
      await qc.cancelQueries({ queryKey: EXAM_ROOMS_KEY });
      const previous = qc.getQueryData<RoomRow[]>(EXAM_ROOMS_KEY);
      if (previous) qc.setQueryData<RoomRow[]>(EXAM_ROOMS_KEY, change(previous));
      return { previous };
    },
    [qc],
  );
  const rollback = useCallback(
    (err: unknown, _vars: unknown, ctx: Snapshot | undefined) => {
      if (ctx?.previous) qc.setQueryData(EXAM_ROOMS_KEY, ctx.previous);
      toast.error(errorText(err));
    },
    [qc],
  );

  const save = useMutation({
    mutationFn: (room: EmsRoom) => {
      const isNew = !query.data?.some((r) => r.id === room.id);
      return isNew
        ? apiFetch<Saved>("/api/rooms", { method: "POST", json: emsToRoomInput(room), raw: true })
        : apiFetch<Saved>(`/api/rooms/${encodeURIComponent(room.id)}`, { method: "PATCH", json: emsToRoomInput(room), raw: true });
    },
    onSuccess: (res) => toastWithUndo(`Saved ${res.data.name}`, res.undoId, refresh),
    onError: (err) => toast.error(errorText(err)),
    onSettled: refresh,
  });

  const remove = useMutation<Done, unknown, EmsRoom, Snapshot>({
    mutationFn: (room) => apiFetch<Done>(`/api/rooms/${encodeURIComponent(room.id)}`, { method: "DELETE", raw: true }),
    onMutate: (room) => optimistic((rows) => rows.filter((r) => r.id !== room.id)),
    onSuccess: (res, room) => toastWithUndo(`Removed ${room.roomNumber}`, res.undoId, refresh),
    onError: rollback,
    onSettled: refresh,
  });

  const reorder = useMutation<Done, unknown, string[], Snapshot>({
    // One reorder at a time, so overlapping drags cannot interleave on the server.
    scope: { id: "rooms-reorder" },
    mutationFn: (ids) => apiFetch<Done>("/api/rooms/reorder", { method: "POST", json: { ids }, raw: true }),
    onMutate: (ids) =>
      optimistic((rows) => {
        const pos = new Map(ids.map((id, i) => [id, i]));
        return [...rows].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity));
      }),
    onSuccess: (res) => toastWithUndo("Room order saved", res.undoId, refresh),
    onError: rollback,
    onSettled: refresh,
  });

  const rooms = useMemo(() => query.data?.map(roomToEms), [query.data]);

  return {
    rooms,
    loading: query.isLoading,
    /** Resolves when saved; rejects (after an error toast) so the editor can stay open. */
    saveRoom: save.mutateAsync,
    removeRoom: remove.mutate,
    reorderRooms: reorder.mutate,
  };
}
