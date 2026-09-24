"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Laptop, FileEdit, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step1Props {
  onNext: (mode: "online" | "offline") => void;
}

export function Step1ModeSelect({ onNext }: Step1Props) {
  return (
    <div className="py-2 sm:py-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 max-w-2xl mx-auto">
        {/* Online Admission */}
        <Card 
          className={cn(
            "p-4 sm:p-6 cursor-pointer border-2 hover:border-primary/60 hover:shadow-md active:scale-[0.98] transition-all duration-150",
            "flex items-center gap-3.5 sm:gap-4 group rounded-2xl bg-card hover:bg-primary/[0.02] shadow-2xs"
          )}
          onClick={() => onNext("online")}
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900 group-hover:scale-105 transition-transform">
            <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
              Online Admission
            </h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </Card>

        {/* Offline Admission */}
        <Card 
          className={cn(
            "p-4 sm:p-6 cursor-pointer border-2 hover:border-primary/60 hover:shadow-md active:scale-[0.98] transition-all duration-150",
            "flex items-center gap-3.5 sm:gap-4 group rounded-2xl bg-card hover:bg-primary/[0.02] shadow-2xs"
          )}
          onClick={() => onNext("offline")}
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900 group-hover:scale-105 transition-transform">
            <FileEdit className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
              Offline Admission
            </h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </Card>
      </div>
    </div>
  );
}
