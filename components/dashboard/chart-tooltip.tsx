/* eslint-disable @typescript-eslint/no-explicit-any -- recharts tooltip payloads are untyped */

/**
 * Recharts tooltip used by the dashboard charts:
 *   <Tooltip content={<ChartTooltip title={(p) => p.payload.class} />} />
 * With `total` it also shows the share in percent; `swatch` shows the series color.
 */
export function ChartTooltip({
  active,
  payload,
  title = (p: any) => p.name,
  unit = "Students",
  total,
  swatch = false,
}: {
  active?: boolean;
  payload?: any[];
  title?: (point: any) => string;
  unit?: string;
  total?: number;
  swatch?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const percent = total && total > 0 ? ((point.value / total) * 100).toFixed(1) : null;

  return (
    <div className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-md p-3 shadow-md text-xs">
      <p className="font-bold text-foreground flex items-center gap-1.5">
        {swatch && <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: point.payload?.fill }} />}
        {title(point)}
      </p>
      <p className="text-muted-foreground mt-0.5">
        {unit}: <span className="font-bold text-primary font-mono">{point.value}</span>
        {percent !== null && <span className="text-primary font-semibold"> ({percent}%)</span>}
      </p>
    </div>
  );
}
