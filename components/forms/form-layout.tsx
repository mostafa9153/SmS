import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Shared form layout for long data-entry forms (student, employee, ...).
// Direct <input>/<select>/<textarea> children are styled here; text-base on
// mobile keeps iOS from zooming into the field, sm:text-sm on larger screens.

export function FormSection({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-2xs", className)}>
      <h3 className="flex items-center gap-2 border-b border-border/70 pb-2.5 text-sm font-bold text-foreground tracking-tight">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">{children}</div>;
}

const CONTROL =
  "[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-input [&>input]:bg-background [&>input]:px-3.5 [&>input]:py-2 [&>input]:text-base sm:[&>input]:text-sm [&>input]:h-11 sm:[&>input]:h-9 [&>input]:outline-none [&>input]:focus:ring-2 [&>input]:focus:ring-ring [&>input]:transition-shadow " +
  "[&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-input [&>select]:bg-background [&>select]:px-3.5 [&>select]:py-2 [&>select]:text-base sm:[&>select]:text-sm [&>select]:h-11 sm:[&>select]:h-9 [&>select]:outline-none [&>select]:focus:ring-2 [&>select]:focus:ring-ring " +
  "[&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-input [&>textarea]:bg-background [&>textarea]:px-3.5 [&>textarea]:py-2 [&>textarea]:text-base sm:[&>textarea]:text-sm [&>textarea]:outline-none [&>textarea]:focus:ring-2 [&>textarea]:focus:ring-ring [&>textarea]:resize-none";

const CONTROL_ERROR = "[&>input]:border-destructive [&>select]:border-destructive [&>textarea]:border-destructive";

export function FormField({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  /** Span the whole grid row. */
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2 md:col-span-3" : undefined}>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{label}</label>
      <div className={cn(CONTROL, error && CONTROL_ERROR)}>{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
