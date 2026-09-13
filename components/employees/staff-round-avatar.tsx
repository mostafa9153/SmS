"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface StaffRoundAvatarProps {
  name: string;
  photoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function StaffRoundAvatar({
  name,
  photoUrl,
  className,
  size = "lg",
}: StaffRoundAvatarProps) {
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
    : "T";

  const sizeStyles = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-14 h-14 sm:w-16 sm:h-16 text-base",
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
        "relative rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 select-none shadow-sm border border-white/20",
        sizeStyles,
        className
      )}
    >
      <span>{initials}</span>
    </div>
  );
}
