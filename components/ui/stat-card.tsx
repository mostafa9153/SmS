import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Big number + label tile for page summaries. `iconClassName` / `valueClassName` set the colors
 * (e.g. "text-emerald-500"). With `onClick` the tile is a toggle button (filter tiles); `active`
 * marks the selected one — pass a ring color in `className` to tint it. `hint` is a data line under
 * the label (a breakdown or comparison), never descriptive filler.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName = "text-primary",
  valueClassName,
  hint,
  onClick,
  active,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  iconClassName?: string;
  valueClassName?: string;
  hint?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const body = (
    <>
      {Icon && (
        <span className="p-2 rounded-xl bg-muted/60 shrink-0">
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconClassName)} />
        </span>
      )}
      <span className="min-w-0 flex flex-col">
        <span className={cn("text-lg sm:text-2xl font-bold leading-tight tabular-nums text-foreground [overflow-wrap:anywhere]", valueClassName)}>{value}</span>
        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{label}</span>
        {hint && <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{hint}</span>}
      </span>
    </>
  );
  const base = "rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs flex items-center gap-3";

  if (!onClick) return <div className={cn(base, className)}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        base,
        "w-full text-left cursor-pointer transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "ring-2 ring-primary border-primary",
        className
      )}
    >
      {body}
    </button>
  );
}
