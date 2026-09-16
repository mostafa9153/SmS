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

  if (!mounted) return null;

  const handleToggle = () => {
    const newState = toggleSound();
    setEnabled(newState);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={enabled ? "Tactile Sound: Enabled (Click to mute)" : "Tactile Sound: Muted (Click to enable)"}
      aria-label="Toggle sound feedback"
      className={cn(
        "relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150 active:scale-95 focus:outline-none",
        enabled ? "text-indigo-600 bg-indigo-50/50" : "text-slate-400 opacity-70",
        className
      )}
    >
      {enabled ? (
        <Volume2 className="w-4 h-4 text-indigo-600 animate-in fade-in" />
      ) : (
        <VolumeX className="w-4 h-4 text-slate-400 animate-in fade-in" />
      )}
    </button>
  );
}
