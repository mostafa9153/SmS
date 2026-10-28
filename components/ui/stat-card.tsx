import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Big number + label tile for page summaries. `iconClassName` sets the icon color (e.g. "text-emerald-500"). */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName = "text-primary",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs flex items-center gap-3", className)}>
      {Icon && (
        <div className="p-2 rounded-xl bg-muted/60 shrink-0">
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconClassName)} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-lg sm:text-2xl font-bold leading-tight tabular-nums text-foreground">{value}</p>
        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
      </div>
    </div>
  );
}
