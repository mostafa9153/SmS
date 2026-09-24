"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, UserCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step1ModeProps {
  onSelectMode: (mode: "online" | "offline") => void;
  selectedMode?: "online" | "offline" | null;
}

export function Step1ModeSelect({ onSelectMode, selectedMode }: Step1ModeProps) {
  return (
    <div className="max-w-3xl mx-auto py-3 sm:py-10 px-2 sm:px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        {/* Offline Re-Admission */}
        <Card
          onClick={() => onSelectMode("offline")}
          className={cn(
            "group cursor-pointer border-2 transition-all duration-200 hover:border-primary hover:shadow-md active:scale-[0.98]",
            selectedMode === "offline"
              ? "border-primary bg-primary/5 shadow-xs"
              : "border-border/60 hover:bg-muted/30"
          )}
        >
          <CardContent className="p-5 sm:p-8 flex flex-col items-center text-center gap-3 sm:gap-4">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200",
                selectedMode === "offline"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-primary/10 text-primary"
              )}
            >
              <UserCheck className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground">Offline Re-Admission</h3>
            </div>

            <div className="w-full pt-1 sm:pt-2 flex items-center justify-center text-xs font-semibold text-primary gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Select Student</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </CardContent>
        </Card>

        {/* Online Re-Admission */}
        <Card
          onClick={() => onSelectMode("online")}
          className={cn(
            "group cursor-pointer border-2 transition-all duration-200 hover:border-blue-500 hover:shadow-md active:scale-[0.98]",
            selectedMode === "online"
              ? "border-blue-500 bg-blue-500/5 shadow-xs"
              : "border-border/60 hover:bg-muted/30"
          )}
        >
          <CardContent className="p-5 sm:p-8 flex flex-col items-center text-center gap-3 sm:gap-4">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200",
                selectedMode === "online"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}
            >
              <Globe className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground">Online Re-Admission</h3>
            </div>

            <div className="w-full pt-1 sm:pt-2 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Review Submissions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
