"use client";

import React, { useState, useRef } from "react";
import { PenTool, RefreshCw, Trash2, Upload, FileSignature } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setCurrentUrl(signatureUrl || undefined);
  }, [signatureUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast({
        type: "error",
        title: "File Too Large",
        description: "Signature file size must be under 2MB.",
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("signature", file);

      const res = await fetch(`/api/employees/${staffId}/signature`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload signature");
      }

      setCurrentUrl(data.signatureUrl);
      if (onSignatureUpdated) onSignatureUpdated(data.signatureUrl);

      showToast({
        type: "success",
        title: "Signature Updated",
        description: `Official digital signature saved for ${staffName}.`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Upload Failed",
        description: err.message || "Failed to upload signature.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveSignature = async () => {
    if (!window.confirm(`Are you sure you want to remove the signature for ${staffName}?`)) {
      return;
    }

    try {
      setIsUploading(true);
      const res = await fetch(`/api/employees/${staffId}/signature`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove signature");
      }

      setCurrentUrl(undefined);
      if (onSignatureUpdated) onSignatureUpdated("");

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
      setIsUploading(false);
    }
  };

  return (
    <Card className={cn("rounded-2xl border border-border/80 shadow-xs bg-card/90", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Official Digital Signature
          </CardTitle>
          {currentUrl && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Configured
            </span>
          )}
        </div>
        <CardDescription className="text-xs">
          Used for official marksheets, character certificates, and verified document sign-offs.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Signature Preview Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full h-24 sm:h-28 rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all duration-200 group",
            "hover:border-primary/60 hover:bg-muted/50 active:scale-[0.99]"
          )}
          title="Click to upload or update signature"
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
                Click to Upload Digital Signature
              </span>
              <span className="text-[10px] text-muted-foreground/80">
                PNG with transparent background recommended (Max 2MB)
              </span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center text-primary gap-2 text-xs font-semibold">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-xl h-8 text-xs font-semibold flex-1 shadow-2xs"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {currentUrl ? "Change Signature" : "Upload Signature"}
          </Button>

          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveSignature}
              disabled={isUploading}
              className="rounded-xl h-8 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
