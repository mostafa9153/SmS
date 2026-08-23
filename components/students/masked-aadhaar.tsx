"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { maskAadhaar, formatAadhaar } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MaskedAadhaarProps {
  aadhaar?: string;
  className?: string;
}

export function MaskedAadhaar({ aadhaar, className }: MaskedAadhaarProps) {
  const [revealed, setRevealed] = useState(false);

  if (!aadhaar) {
    return <span className="text-muted-foreground text-sm">Not provided</span>;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-mono text-sm tracking-wider">
        {revealed ? formatAadhaar(aadhaar) : maskAadhaar(aadhaar)}
      </span>
      <button
        onClick={() => setRevealed((r) => !r)}
        title={revealed ? "Hide Aadhaar" : "Reveal Aadhaar"}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {revealed ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
