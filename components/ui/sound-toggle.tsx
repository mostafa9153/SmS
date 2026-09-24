"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, toggleSound } from "@/lib/utils/audio-feedback";
import { cn } from "@/lib/utils";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className }: SoundToggleProps) {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnabled(isSoundEnabled());
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-lg bg-muted/40 animate-pulse",
          className
        )}
      />
    );
  }

  const handleToggle = () => {
    const newState = toggleSound();
    setEnabled(newState);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={enabled ? "Sound: Enabled (Click to mute)" : "Sound: Muted (Click to enable)"}
      aria-label="Toggle sound feedback"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer focus:outline-none",
        enabled ? "text-primary" : "text-muted-foreground/60 opacity-80",
        className
      )}
    >
      {enabled ? (
        <Volume2 className="h-4.5 w-4.5 text-primary transition-transform duration-200 hover:scale-105" />
      ) : (
        <VolumeX className="h-4.5 w-4.5 text-muted-foreground/60 transition-transform duration-200 hover:scale-105" />
      )}
    </button>
  );
}
