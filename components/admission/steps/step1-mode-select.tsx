"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Laptop, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step1Props {
  onNext: (mode: "online" | "offline") => void;
}

export function Step1ModeSelect({ onNext }: Step1Props) {
  return (
    <div className="py-6 sm:py-10">
      <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
        {/* Online Admission */}
        <Card 
          className={cn(
            "p-6 cursor-pointer border-2 hover:border-primary/60 hover:shadow-md transition-all duration-200",
            "flex items-center gap-4 group rounded-xl bg-card hover:bg-primary/[0.02]"
          )}
          onClick={() => onNext("online")}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900 group-hover:scale-105 transition-transform">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
              Online Admission
            </h3>
          </div>
        </Card>

        {/* Offline Admission */}
        <Card 
          className={cn(
            "p-6 cursor-pointer border-2 hover:border-primary/60 hover:shadow-md transition-all duration-200",
            "flex items-center gap-4 group rounded-xl bg-card hover:bg-primary/[0.02]"
          )}
          onClick={() => onNext("offline")}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900 group-hover:scale-105 transition-transform">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
              Offline Admission
            </h3>
          </div>
        </Card>
      </div>
    </div>
  );
}
