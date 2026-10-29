"use client";

import { CopyButton } from "@/components/ui/copy-button";


export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-foreground border-b pb-2 mb-3">{children}</p>
  );
}

export function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 my-3">{children}</div>;
}

export function InfoField({
  label,
  value,
  full,
  copyable,
}: {
  label: string;
  value?: React.ReactNode | string | number | null;
  full?: boolean;
  copyable?: boolean;
}) {
  const isReactNode = typeof value === "object" && value !== null && !Array.isArray(value);
  const displayVal = value !== undefined && value !== null && String(value).trim() !== "" ? value : "—";
  return (
    <div className={full ? "sm:col-span-2 md:col-span-3" : ""}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {isReactNode ? (
          <div className="text-sm font-medium">{value}</div>
        ) : (
          <p className="text-sm font-medium break-all">{displayVal as React.ReactNode}</p>
        )}
        {copyable && typeof displayVal === "string" && displayVal !== "—" && (
          <CopyButton text={displayVal} label={label} iconClassName="h-3 w-3" />
        )}
      </div>
    </div>
  );
}
