"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, DoorOpen, Package, Plus, Wrench } from "lucide-react";
import { useAllRooms, useRoomSummaries, ROOM_KIND_LABEL } from "@/lib/assets/use-assets";
import type { RoomSummary } from "@/lib/assets/types";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddRoomDialog } from "./add-room-dialog";

type Filter = "all" | "uncounted" | "attention";

export function RoomsOverview() {
  const rooms = useAllRooms();
  const summaries = useRoomSummaries();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);

  const byRoom = useMemo(() => new Map((summaries.data ?? []).map((s) => [s.room_id, s])), [summaries.data]);
  const totals = useMemo(() => {
    const list = summaries.data ?? [];
    const sum = (k: keyof Omit<RoomSummary, "room_id">) => list.reduce((n, s) => n + s[k], 0);
    const roomCount = rooms.data?.length ?? 0;
    const counted = (rooms.data ?? []).filter((r) => (byRoom.get(r.id)?.total ?? 0) > 0).length;
    return { items: sum("total"), repair: sum("needs_repair"), damaged: sum("damaged"), counted, roomCount };
  }, [summaries.data, rooms.data, byRoom]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rooms.data ?? []).filter((r) => {
      const s = byRoom.get(r.id);
      if (filter === "uncounted" && (s?.total ?? 0) > 0) return false;
      if (filter === "attention" && !(s && s.needs_repair + s.damaged > 0)) return false;
      return !q || r.name.toLowerCase().includes(q) || (r.floor ?? "").toLowerCase().includes(q);
    });
  }, [rooms.data, byRoom, search, filter]);

  const toggle = (f: Filter) => setFilter((cur) => (cur === f ? "all" : f));
  const loading = rooms.isLoading || summaries.isLoading;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Assets"
        icon={Package}
        actions={
          <Button variant="outline" onClick={() => setAdding(true)} className="h-10">
            <Plus className="h-4 w-4" /> Add room
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <StatCard label="Items" value={totals.items} icon={Package} />
        <StatCard
          label="Rooms counted"
          value={`${totals.counted}/${totals.roomCount}`}
          icon={DoorOpen}
          iconClassName="text-sky-500"
          onClick={() => toggle("uncounted")}
          active={filter === "uncounted"}
          hint={filter === "uncounted" ? "Showing not counted" : undefined}
        />
        <StatCard
          label="Needs repair"
          value={totals.repair}
          icon={Wrench}
          iconClassName="text-amber-500"
          onClick={() => toggle("attention")}
          active={filter === "attention"}
        />
        <StatCard
          label="Damaged"
          value={totals.damaged}
          icon={AlertTriangle}
          iconClassName="text-rose-500"
          onClick={() => toggle("attention")}
          active={filter === "attention"}
        />
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search rooms" />

      {loading ? (
        <Spinner label="Loading rooms" className="py-16" />
      ) : visible.length === 0 ? (
        <EmptyState
          title={rooms.data?.length ? "No rooms match" : "No rooms yet"}
          icon={DoorOpen}
          action={
            !rooms.data?.length && (
              <Button onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add room
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
          {visible.map((r) => {
            const s = byRoom.get(r.id);
            const total = s?.total ?? 0;
            return (
              <Link
                key={r.id}
                href={`/assets/rooms/${encodeURIComponent(r.id)}`}
                className="group rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs flex items-center gap-3 min-h-16 hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold truncate">{r.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {r.is_exam_room ? "Exam room" : ROOM_KIND_LABEL[r.kind]}
                      {r.floor ? ` · ${r.floor}` : ""}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    {total === 0 ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Not counted</span>
                    ) : (
                      <span className="text-muted-foreground tabular-nums">{total} items</span>
                    )}
                    {!!s?.needs_repair && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400 tabular-nums">
                        {s.needs_repair} repair
                      </span>
                    )}
                    {!!s?.damaged && (
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-700 dark:text-rose-400 tabular-nums">
                        {s.damaged} damaged
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5")} />
              </Link>
            );
          })}
        </div>
      )}

      <AddRoomDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}
