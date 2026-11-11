"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ClipboardList, DoorOpen, Package } from "lucide-react";
import { useAllRooms, useAssetCatalog, useRoomStock, CONDITION_LABEL, ROOM_KIND_LABEL } from "@/lib/assets/use-assets";
import type { AssetItem, AssetUnit, Condition } from "@/lib/assets/types";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHIP: Record<Condition, string> = {
  working: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  repair: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  damaged: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

interface Row {
  item: AssetItem;
  byCondition: Partial<Record<Condition, number>>;
  units: AssetUnit[];
  total: number;
}

export function RoomStockView({ roomId }: { roomId: string }) {
  const rooms = useAllRooms();
  const catalog = useAssetCatalog();
  const stock = useRoomStock(roomId);
  const room = rooms.data?.find((r) => r.id === roomId);

  const rows = useMemo<Row[]>(() => {
    if (!catalog.data || !stock.data) return [];
    const map = new Map<string, Row>();
    const row = (itemId: string) => {
      const item = catalog.data.items.find((i) => i.id === itemId);
      if (!item) return null;
      const r = map.get(itemId) ?? { item, byCondition: {}, units: [], total: 0 };
      map.set(itemId, r);
      return r;
    };
    for (const s of stock.data.stock) {
      const r = row(s.item_id);
      if (!r) continue;
      r.byCondition[s.condition] = (r.byCondition[s.condition] ?? 0) + s.qty;
      r.total += s.qty;
    }
    for (const u of stock.data.units) {
      const r = row(u.item_id);
      if (!r) continue;
      r.units.push(u);
      r.byCondition[u.condition] = (r.byCondition[u.condition] ?? 0) + 1;
      r.total += 1;
    }
    return [...map.values()].sort((a, b) => a.item.sort_order - b.item.sort_order || a.item.name.localeCompare(b.item.name));
  }, [catalog.data, stock.data]);

  if (rooms.isLoading || catalog.isLoading || stock.isLoading) return <Spinner label="Loading room" className="py-16" />;
  if (!room) {
    return (
      <EmptyState
        title="Room not found"
        icon={DoorOpen}
        action={
          <Link href="/assets" className={buttonVariants({ variant: "outline" })}>
            All rooms
          </Link>
        }
      />
    );
  }

  const countHref = `/assets/rooms/${encodeURIComponent(roomId)}/count`;
  const total = rows.reduce((n, r) => n + r.total, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={room.name}
        back="/assets"
        badge={
          <span className="text-xs text-muted-foreground">
            {room.is_exam_room ? "Exam room" : ROOM_KIND_LABEL[room.kind]}
            {room.floor ? ` · ${room.floor}` : ""}
            {total ? ` · ${total} items` : ""}
          </span>
        }
        actions={
          <Link href={countHref} className={cn(buttonVariants(), "h-10 w-full sm:w-auto")}>
            <ClipboardList className="h-4 w-4" /> Count
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing recorded in this room yet"
          icon={Package}
          action={
            <Link href={countHref} className={buttonVariants()}>
              <ClipboardList className="h-4 w-4" /> Count this room
            </Link>
          }
        />
      ) : (
        <ul className="rounded-2xl border border-border/80 bg-card divide-y divide-border/70 overflow-hidden">
          {rows.map((r) => (
            <li key={r.item.id} className="p-3.5">
              <div className="flex items-center gap-3">
                <span className="font-semibold flex-1 min-w-0 truncate">{r.item.name}</span>
                <span className="text-lg font-bold tabular-nums">{r.total}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                {(Object.keys(CHIP) as Condition[]).map((c) =>
                  r.byCondition[c] ? (
                    <span key={c} className={cn("rounded-full px-2 py-0.5 tabular-nums", CHIP[c])}>
                      {r.byCondition[c]} {CONDITION_LABEL[c].toLowerCase()}
                    </span>
                  ) : null,
                )}
              </div>
              {r.units.length > 0 && (
                <ul className="mt-2 grid gap-1 text-xs">
                  {r.units.map((u) => (
                    <li key={u.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                      <span className="font-mono font-medium">{u.code}</span>
                      {u.serial_no && <span className="text-muted-foreground truncate">{u.serial_no}</span>}
                      <span className={cn("ml-auto rounded-full px-2 py-0.5", CHIP[u.condition])}>{CONDITION_LABEL[u.condition]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
