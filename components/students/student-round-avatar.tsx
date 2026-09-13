"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface StudentRoundAvatarProps {
  name: string;
  photoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function StudentRoundAvatar({
  name,
  photoUrl,
  className,
  size = "xl",
}: StudentRoundAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "S";

  const sizeStyles = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-14 h-14 sm:w-16 sm:h-16 text-base", // Maximum big inside table rows (56px - 64px)
    "2xl": "w-20 h-20 text-xl",
  }[size];

  if (photoUrl && !hasError) {
    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden border-2 border-border/80 bg-muted/60 shrink-0 select-none shadow-sm",
          sizeStyles,
          className
        )}
      >
        <img
          src={photoUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary font-bold flex items-center justify-center shrink-0 select-none shadow-sm",
        sizeStyles,
        className
      )}
    >
      <span>{initials}</span>
    </div>
  );
}
