import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "@/lib/utils";
import type { StudentStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: StudentStatus;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  size = "md",
  className,
}: StatusBadgeProps) {
  const styles = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm"
          ? "px-2 py-0.5 text-xs"
          : "px-2.5 py-1 text-xs",
        styles.badge,
        className
      )}
    >
      <span
        className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", styles.dot)}
      />
      {status}
    </span>
  );
}
