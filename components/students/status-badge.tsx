import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "@/lib/utils";
import type { StudentStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: StudentStatus | string;
  size?: "sm" | "md";
  className?: string;
  showRawStatus?: boolean;
}

export function StatusBadge({
  status,
  size = "md",
  className,
  showRawStatus = false,
}: StatusBadgeProps) {
  const styles = (STATUS_STYLES as Record<string, { badge: string; dot: string; chart: string; label: string }>)[status] || {
    badge: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    chart: "#64748b",
    label: status,
  };
  const label = showRawStatus ? status : (styles.label || status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium shrink-0",
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
      {label}
    </span>
  );
}
