import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsBackButton } from "./settings-back-button";

interface SettingsPageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  children?: React.ReactNode;
}

export function SettingsPageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-primary bg-primary/10",
  children,
}: SettingsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SettingsBackButton />
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0 shadow-2xs", iconColor)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}
