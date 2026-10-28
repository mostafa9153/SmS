import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/** "Nothing here" block for lists, tables and panels. `compact` for inline/table use. */
export function EmptyState({
  title,
  icon: Icon = Inbox,
  action,
  compact = false,
  className,
}: {
  title: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center text-muted-foreground",
        compact ? "gap-1.5 p-6" : "gap-3 p-10",
        className
      )}
    >
      <Icon className={cn("opacity-40", compact ? "h-6 w-6" : "h-10 w-10")} />
      <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{title}</p>
      {action}
    </div>
  );
}
