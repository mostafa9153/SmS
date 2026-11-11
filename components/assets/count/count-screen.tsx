"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, DoorOpen, Plus, RotateCcw } from "lucide-react";
import { CONDITION_LABEL } from "@/lib/assets/use-assets";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddItemDialog } from "@/components/assets/add-item-dialog";
import { COUNT_CONDITIONS, useRoomCount, type CountRow } from "./use-room-count";

export function CountScreen({ roomId }: { roomId: string }) {
  const c = useRoomCount(roomId);
  const [adding, setAdding] = useState(false);
  const roomHref = `/assets/rooms/${encodeURIComponent(roomId)}`;

  if (c.loading) return <Spinner label="Loading" className="py-16" />;
  if (!c.room) {
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

  const firstOther = c.rows.findIndex((r) => !r.inRoom);

  return (
    <div className="space-y-3 pb-28 md:pb-4">
      <PageHeader title={`Count · ${c.room.name}`} back={roomHref} />
      {c.totalRows > 8 && <SearchInput value={c.search} onChange={c.setSearch} placeholder="Find item" size="sm" />}

      <ul className="rounded-2xl border border-border/80 bg-card divide-y divide-border/70 overflow-hidden">
        {c.rows.length === 0 && c.search.trim() && (
          <li className="p-3.5 text-sm text-muted-foreground">No item named &ldquo;{c.search.trim()}&rdquo;</li>
        )}
        {c.rows.map((row, i) => (
          <li key={row.item.id}>
            {i === firstOther && firstOther > 0 && (
              <div className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40">Other items</div>
            )}
            <CountRowView row={row} c={c} />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full min-h-14 px-3.5 flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {c.search.trim() && c.rows.length === 0 ? `Add "${c.search.trim()}"` : "New item"}
          </button>
        </li>
      </ul>

      <AddItemDialog
        open={adding}
        onOpenChange={setAdding}
        initialName={c.rows.length === 0 ? c.search.trim() : ""}
        onAdded={(item) => {
          c.setSearch("");
          if (item.tracking === "serial") toast.info(`${item.name} has its own code per piece, so it is not counted here`);
        }}
      />

      <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 px-3 md:sticky md:bottom-4 md:px-0">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-card/95 backdrop-blur shadow-lg p-2.5 flex items-center gap-2">
          <span className="text-sm font-medium px-1.5 tabular-nums flex-1">
            {c.changes ? `${c.changes} change${c.changes === 1 ? "" : "s"}` : "No changes"}
          </span>
          {c.changes > 0 && (
            <Button variant="ghost" size="sm" onClick={c.reset} className="h-11" aria-label="Reset changes">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={() => void c.save()} disabled={!c.changes || c.saving} className="h-11 px-6 text-base">
            {c.saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CountRowView({ row, c }: { row: CountRow; c: ReturnType<typeof useRoomCount> }) {
  const open = c.expanded.has(row.item.id);
  const conditions = open ? COUNT_CONDITIONS : COUNT_CONDITIONS.slice(0, 1);
  return (
    <div className="p-3.5 space-y-2">
      {conditions.map((cond, idx) => (
        <div key={cond} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {idx === 0 ? (
              <>
                <div className="font-semibold truncate">{row.item.name}</div>
                <button
                  type="button"
                  onClick={() => c.toggleExpanded(row.item.id)}
                  aria-expanded={open}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer py-1"
                >
                  {open ? "Working" : "Repair / damaged"}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                </button>
              </>
            ) : (
              <div className={cn("text-sm pl-3", cond === "repair" ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400")}>
                {CONDITION_LABEL[cond]}
              </div>
            )}
          </div>
          <NumberStepper
            label={`${row.item.name} ${CONDITION_LABEL[cond]}`}
            value={c.valueOf(row, cond)}
            onChange={(n) => c.setValue(row, cond, n)}
            changed={c.valueOf(row, cond) !== row.expected[cond]}
          />
        </div>
      ))}
    </div>
  );
}
