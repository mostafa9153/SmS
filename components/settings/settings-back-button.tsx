"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function SettingsBackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      title="Back"
      type="button"
      className="rounded-lg p-2 sm:p-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer shrink-0"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

