"use client";

import React from "react";
import { renderBilingualText } from "@/components/admission/application-form/bilingual-text";

export function InputWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13.5px] sm:text-[14px] font-bold text-foreground/90 leading-snug">
        {renderBilingualText(label)}
      </label>
      <div
        className={`[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-border/80 [&>input]:bg-background/90 [&>input]:px-3.5 [&>input]:py-2 [&>input]:text-sm sm:[&>input]:text-[15px] [&>input]:font-medium [&>input]:h-10 sm:[&>input]:h-10 [&>input]:outline-none [&>input]:shadow-2xs [&>input]:transition-all [&>input]:placeholder:text-muted-foreground/50 [&>input]:hover:border-primary/50 [&>input]:focus:border-primary [&>input]:focus:ring-2 [&>input]:focus:ring-primary/20
          ${error ? "[&>input]:border-destructive/90 [&>input]:focus:ring-destructive/20" : ""}`}
      >
        {children}
      </div>
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
    </div>
  );
}
