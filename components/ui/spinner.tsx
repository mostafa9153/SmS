import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE = { xs: "h-3 w-3", sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-6 w-6", xl: "h-8 w-8" } as const;

/**
 * Inline loading indicator (buttons, cells). Without `label` it renders the bare
 * icon, so `className` (size, margin, color) applies to it exactly like a lucide icon.
 * For whole pages use `loading.tsx` skeletons.
 */
export function Spinner({ size = "md", label, className }: { size?: keyof typeof SIZE; label?: string; className?: string }) {
  if (!label) {
    // Decorative: the surrounding button/text says what is loading. Pass `label` for a standalone status.
    return <Loader2 aria-hidden className={cn("animate-spin shrink-0", SIZE[size], className)} />;
  }
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 aria-hidden className={cn("animate-spin shrink-0", SIZE[size])} />
      <span>{label}</span>
    </span>
  );
}
