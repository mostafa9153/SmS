"use client";

import React, { useState } from "react";
import { Camera, User, RefreshCw, Sparkles, ImagePlus, Trash2 } from "lucide-react";
import { PhotoStudioModal } from "./photo-studio-modal";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";

interface StudentPhotoAvatarProps {
  studentId: string;
  studentName: string;
  photoUrl?: string | null;
  gender?: string | null;
  onPhotoUpdated?: (newUrl: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StudentPhotoAvatar({
  studentId,
  studentName,
  photoUrl,
  gender,
  onPhotoUpdated,
  className,
  size = "md",
}: StudentPhotoAvatarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(photoUrl || undefined);
  const [imageError, setImageError] = useState(false);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  // Update internal url when prop changes
  React.useEffect(() => {
    setCurrentUrl(photoUrl || undefined);
    setImageError(false);
  }, [photoUrl]);

  const handlePhotoSaved = (newUrl: string) => {
    setCurrentUrl(newUrl);
    setImageError(false);
    setTimestamp(Date.now());
    if (onPhotoUpdated) {
      onPhotoUpdated(newUrl);
    }
  };

  const handlePhotoRemoved = () => {
    setCurrentUrl(undefined);
    setImageError(false);
    if (onPhotoUpdated) {
      onPhotoUpdated("");
    }
  };

  const handleQuickDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove the photo for ${studentName}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/students/${studentId}/photo`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove photo");
      }
      showToast({
        type: "success",
        title: "Photo Removed",
        description: `Passport photo removed for ${studentName}.`,
      });
      handlePhotoRemoved();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Remove Failed",
        description: err.message || "Failed to remove photo.",
      });
    }
  };

  // Dimensions based on 3:4 aspect ratio
  const sizeClasses = {
    sm: "w-18 h-24 text-xs",
    md: "w-24 h-32 sm:w-28 sm:h-[149px] text-xs",
    lg: "w-30 h-40 sm:w-36 sm:h-48 text-sm",
  }[size];

  // Helper for initials
  const initials = studentName
    ? studentName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "S";

  const effectivePhotoSrc = currentUrl ? `${currentUrl}?t=${timestamp}` : null;

  return (
    <>
      <div className={cn("relative group select-none shrink-0", className)}>
        {/* Quick remove button on top-right corner when photo exists */}
        {effectivePhotoSrc && !imageError && (
          <button
            type="button"
            onClick={handleQuickDelete}
            title="Remove photo"
            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-90"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Main 3:4 container */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "relative overflow-hidden rounded-xl border-2 border-border/70 bg-gradient-to-b from-muted/40 to-muted/80",
            "shadow-xs hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer text-left block",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            sizeClasses
          )}
          title={`Click to capture or upload passport photo for ${studentName} (Auto-compressed to < 40KB)`}
          aria-label={`Passport photo of ${studentName}`}
        >
          {effectivePhotoSrc && !imageError ? (
            <img
              src={effectivePhotoSrc}
              alt={studentName}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-muted-foreground bg-muted/30">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm sm:text-base mb-1">
                {initials}
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground/80 tracking-tight leading-tight flex items-center gap-1">
                <Camera className="w-3 h-3 text-primary/70" />
                Add Photo
              </span>
              <span className="text-[9px] text-muted-foreground/50 scale-90">3:4 Passport</span>
            </div>
          )}

          {/* Hover interactive overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 text-white text-center">
            <div className="p-2 rounded-full bg-white/20 mb-1 backdrop-blur-xs scale-90 group-hover:scale-100 transition-transform">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-medium leading-tight">
              {effectivePhotoSrc && !imageError ? "Change Photo" : "Upload / Snap"}
            </span>
            <span className="text-[8px] opacity-75 font-mono mt-0.5">&lt; 40 KB</span>
          </div>

          {/* Badge indicator on bottom corner */}
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-sm bg-background/80 backdrop-blur-xs border border-border/50 text-[9px] font-mono text-muted-foreground group-hover:opacity-0 transition-opacity">
            3:4
          </div>
        </button>
      </div>

      {/* Interactive Photo Studio Modal */}
      <PhotoStudioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentId={studentId}
        studentName={studentName}
        currentPhotoUrl={effectivePhotoSrc || undefined}
        onPhotoSaved={handlePhotoSaved}
        onPhotoRemoved={handlePhotoRemoved}
      />
    </>
  );
}
