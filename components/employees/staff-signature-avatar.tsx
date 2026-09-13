"use client";

import React, { useState } from "react";
import { PenTool, Trash2, FileSignature, CheckCircle2 } from "lucide-react";
import { StaffSignatureModal } from "./staff-signature-modal";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";

interface StaffSignatureAvatarProps {
  staffId: string;
  staffName: string;
  signatureUrl?: string | null;
  onSignatureUpdated?: (newUrl: string) => void;
  className?: string;
}

export function StaffSignatureAvatar({
  staffId,
  staffName,
  signatureUrl,
  onSignatureUpdated,
  className,
}: StaffSignatureAvatarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(signatureUrl || undefined);
  const [imageError, setImageError] = useState(false);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  React.useEffect(() => {
    setCurrentUrl(signatureUrl || undefined);
    setImageError(false);
  }, [signatureUrl]);

  const handleSaved = (newUrl: string) => {
    setCurrentUrl(newUrl);
    setImageError(false);
    setTimestamp(Date.now());
    if (onSignatureUpdated) onSignatureUpdated(newUrl);
  };

  const handleRemoved = () => {
    setCurrentUrl(undefined);
    setImageError(false);
    if (onSignatureUpdated) onSignatureUpdated("");
  };

  const handleQuickDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove the signature for ${staffName}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/employees/${staffId}/signature`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove signature");
      }
      showToast({
        type: "success",
        title: "Signature Removed",
        description: `Official signature removed for ${staffName}.`,
      });
      handleRemoved();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Remove Failed",
        description: err.message || "Failed to remove signature.",
      });
    }
  };

  const effectiveUrl = currentUrl ? `${currentUrl}${currentUrl.includes("data:") ? "" : `?t=${timestamp}`}` : null;

  return (
    <>
      <div className={cn("relative group select-none shrink-0", className)}>
        {/* Quick remove button on top-right corner when signature exists */}
        {effectiveUrl && !imageError && (
          <button
            type="button"
            onClick={handleQuickDelete}
            title="Remove signature"
            className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-90"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}

        {/* Specimen Signature Box */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "relative overflow-hidden rounded-xl border-2 border-border/70 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xs",
            "w-32 sm:w-36 h-14 sm:h-16 flex flex-col items-center justify-center p-1.5 text-center transition-all duration-200 cursor-pointer shadow-2xs",
            "hover:border-primary/60 hover:shadow-sm active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
          )}
          title={`Click to view, upload or draw official signature for ${staffName}`}
        >
          {effectiveUrl && !imageError ? (
            <div className="w-full h-full flex items-center justify-center relative">
              <img
                src={effectiveUrl}
                alt={`Signature of ${staffName}`}
                onError={() => setImageError(true)}
                className="max-h-11 sm:max-h-12 max-w-[90%] object-contain filter contrast-125 dark:invert transition-transform group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground w-full h-full">
              <PenTool className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                Add Signature
              </span>
              <span className="text-[8px] text-muted-foreground/70 scale-90">
                Click to Upload / Draw
              </span>
            </div>
          )}

          {/* Hover interactive overlay */}
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-1 text-white text-center">
            <PenTool className="w-3.5 h-3.5 text-white mb-0.5" />
            <span className="text-[9px] font-semibold leading-tight">
              {effectiveUrl && !imageError ? "Change Sign" : "Upload / Draw"}
            </span>
          </div>

          {/* Status Dot */}
          {effectiveUrl && !imageError && (
            <div className="absolute bottom-1 right-1 flex items-center gap-0.5 opacity-80 group-hover:opacity-0 transition-opacity">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          )}
        </button>
      </div>

      <StaffSignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffId={staffId}
        staffName={staffName}
        currentSignatureUrl={effectiveUrl || undefined}
        onSignatureSaved={handleSaved}
        onSignatureRemoved={handleRemoved}
      />
    </>
  );
}
