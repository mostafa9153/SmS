import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page title row: icon chip + h1 on the left, actions on the right (stacks on mobile). */
export function PageHeader({
  title,
  icon: Icon,
  actions,
  actionsClassName,
  className,
}: {
  title: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  /** Layout of the actions row (default: wrapping flex). */
  actionsClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">{title}</h1>
      </div>
      {actions && <div className={cn("flex flex-wrap items-center gap-2", actionsClassName)}>{actions}</div>}
    </div>
  );
}
