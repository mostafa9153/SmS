"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { perSheet, type PrinterOffset, type StickerGrid } from "@/lib/library/sticker-layout";

/** Start cell, this computer's printer offset, test print and the unprinted filter. */
export function StickerControls({
  grid,
  startCell,
  onStartCell,
  offset,
  onOffset,
  test,
  onTest,
  onlyUnprinted,
  onOnlyUnprinted,
  showUnprintedFilter,
}: {
  grid: StickerGrid;
  startCell: number;
  onStartCell: (cell: number) => void;
  offset: PrinterOffset;
  onOffset: (o: PrinterOffset) => void;
  test: boolean;
  onTest: (v: boolean) => void;
  onlyUnprinted: boolean;
  onOnlyUnprinted: (v: boolean) => void;
  showUnprintedFilter: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">কোন ঘর থেকে শুরু</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: perSheet(grid) }, (_, cell) => (
              <button
                key={cell}
                type="button"
                onClick={() => onStartCell(cell)}
                aria-pressed={cell === startCell}
                className={cn(
                  "h-6 rounded border text-[10px] tabular-nums",
                  cell < startCell ? "bg-muted text-muted-foreground/50 line-through" : "bg-background",
                  cell === startCell && "border-primary bg-primary/10 text-primary font-bold",
                )}
              >
                {cell + 1}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Printer offset (mm, এই কম্পিউটারে)</p>
          <div className="grid grid-cols-2 gap-2">
            {(["x", "y"] as const).map((axis) => (
              <label key={axis} className="flex items-center gap-2 text-sm">
                <span className="w-16 text-muted-foreground">{axis === "x" ? "ডানে →" : "নিচে ↓"}</span>
                <Input
                  type="number"
                  step="0.5"
                  min={-10}
                  max={10}
                  value={offset[axis]}
                  onChange={(e) => onOffset({ ...offset, [axis]: Number(e.target.value) })}
                  className="h-8"
                />
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-2 text-sm">
          <span>সাধারণ কাগজে test print</span>
          <Switch checked={test} onCheckedChange={onTest} />
        </label>
        {showUnprintedFilter && (
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>শুধু বাকিগুলো</span>
            <Switch checked={onlyUnprinted} onCheckedChange={onOnlyUnprinted} />
          </label>
        )}
      </CardContent>
    </Card>
  );
}
