"use client";

import React, { useState } from "react";
import { PenTool, Trash2, Upload, FileSignature } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffSignatureModal } from "./staff-signature-modal";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";

interface StaffSignatureCardProps {
  staffId: string;
  staffName: string;
  signatureUrl?: string | null;
  onSignatureUpdated?: (newUrl: string) => void;
  className?: string;
}

export function StaffSignatureCard({
  staffId,
  staffName,
  signatureUrl,
  onSignatureUpdated,
  className,
}: StaffSignatureCardProps) {
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(signatureUrl || undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    setCurrentUrl(signatureUrl || undefined);
  }, [signatureUrl]);

  const handleSaved = (newUrl: string) => {
    setCurrentUrl(newUrl);
    if (onSignatureUpdated) onSignatureUpdated(newUrl);
  };

  const handleRemoved = () => {
    setCurrentUrl(undefined);
    if (onSignatureUpdated) onSignatureUpdated("");
  };

  const handleRemoveSignature = async () => {
    if (!window.confirm(`Are you sure you want to remove the signature for ${staffName}?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/employees/${staffId}/signature`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove signature");
      }

      handleRemoved();
      showToast({
        type: "success",
        title: "Signature Removed",
        description: `Signature removed for ${staffName}.`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Remove Failed",
        description: err.message || "Failed to remove signature.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className={cn("rounded-2xl border border-border/80 shadow-xs bg-card/90", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Official Digital Signature
            </CardTitle>
            {currentUrl ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Configured
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Not Uploaded
              </span>
            )}
          </div>
          <CardDescription className="text-xs">
            Used for official marksheets, character certificates, and verified document sign-offs.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Signature Preview Box */}
          <div
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "w-full h-24 sm:h-28 rounded-xl border-2 border-dashed border-border bg-white dark:bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all duration-200 group shadow-inner",
              "hover:border-primary/60 hover:bg-muted/20 active:scale-[0.99]"
            )}
            title="Click to upload, draw or update signature"
          >
            {currentUrl ? (
              <img
                src={currentUrl}
                alt="Digital Signature"
                className="max-h-20 max-w-[85%] object-contain filter contrast-125 dark:invert"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-2 text-center">
                <PenTool className="h-5 w-5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                <span className="text-xs font-semibold group-hover:text-foreground transition-colors">
                  Click to Upload or Draw Signature
                </span>
                <span className="text-[10px] text-muted-foreground/80">
                  PNG file upload or live drawing pad
                </span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl h-8 text-xs font-semibold flex-1 shadow-2xs cursor-pointer"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {currentUrl ? "Change Signature" : "Upload / Draw Signature"}
            </Button>

            {currentUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveSignature}
                disabled={isDeleting}
                className="rounded-xl h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <StaffSignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffId={staffId}
        staffName={staffName}
        currentSignatureUrl={currentUrl}
        onSignatureSaved={handleSaved}
        onSignatureRemoved={handleRemoved}
      />
    </>
  );
}
