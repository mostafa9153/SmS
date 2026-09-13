"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Camera,
  ExternalLink,
  Phone,
  Calendar,
  GraduationCap,
  Sparkles,
  IdCard,
} from "lucide-react";
import type { Student } from "@/lib/types";
import { PhotoStudioModal } from "./photo-studio-modal";
import { CopyButton } from "@/components/ui/copy-button";
import { calculateDetailedAge } from "@/lib/utils";

interface StudentPhotoPreviewDialogProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onPhotoUpdated?: (studentId: string, newUrl: string) => void;
}

export function StudentPhotoPreviewDialog({
  student,
  isOpen,
  onClose,
  onPhotoUpdated,
}: StudentPhotoPreviewDialogProps) {
  const router = useRouter();
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(Date.now());
  const [currentPhoto, setCurrentPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (student) {
      setCurrentPhoto(student.photoUrl);
      setImgError(false);
      setPhotoVersion(Date.now());
    }
  }, [student]);

  if (!student) return null;

  const initials = student.name
    ? student.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "S";

  const effectivePhotoSrc = currentPhoto
    ? `${currentPhoto}?v=${photoVersion}`
    : null;

  const dAge = student.dob ? calculateDetailedAge(student.dob) : null;

  const handlePhotoSaved = (newUrl: string) => {
    setCurrentPhoto(newUrl);
    setImgError(false);
    setPhotoVersion(Date.now());
    if (onPhotoUpdated) {
      onPhotoUpdated(student.id, newUrl);
    }
  };

  const handlePhotoRemoved = () => {
    setCurrentPhoto(undefined);
    setImgError(false);
    if (onPhotoUpdated) {
      onPhotoUpdated(student.id, "");
    }
  };

  const handleNavigateProfile = () => {
    onClose();
    router.push(`/students/${student.id}`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-border/80 rounded-2xl shadow-2xl bg-card">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-muted/40 px-5 pt-5 pb-4 border-b border-border/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-1.5">
                  {student.name}
                  <CopyButton text={student.name} label="Student Name" iconClassName="h-3 w-3" />
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-medium text-foreground">
                    {student.schoolId}
                  </span>
                  <span>•</span>
                  <span>
                    Class {student.presentClass} · Sec {student.presentSection} · Roll {student.presentRoll}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Photo & Quick Details Section */}
          <div className="p-5 sm:p-6 flex flex-col items-center gap-4">
            {/* 3:4 Passport Picture Container - Big & Sharp */}
            <div className="relative group w-56 h-76 sm:w-64 sm:h-84 rounded-2xl overflow-hidden border-2 border-border/80 bg-muted/30 shadow-xl flex items-center justify-center">
              {effectivePhotoSrc && !imgError ? (
                <img
                  src={effectivePhotoSrc}
                  alt={student.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-3xl mb-3 shadow-inner">
                    {initials}
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    No passport photo uploaded
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-[220px]">
                    Click "Upload Photo" below to snap with webcam or upload picture.
                  </p>
                </div>
              )}

              {/* Quick overlay badge */}
              <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white font-medium shadow-xs">
                3:4 Passport
              </div>
            </div>

            {/* Quick Metadata Chips */}
            <div className="w-full grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                  Father's Name
                </span>
                <span className="font-semibold text-foreground truncate block">
                  {student.fatherName || "—"}
                </span>
              </div>
              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                  Phone / Guardian
                </span>
                <span className="font-semibold text-foreground truncate block font-mono">
                  {student.altMobile || student.studentContact || "—"}
                </span>
              </div>
              {student.dob && (
                <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-0.5 col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                      Date of Birth & Age
                    </span>
                    <span className="font-semibold text-foreground font-mono text-xs">
                      {student.dob} {dAge ? `(${dAge.formattedShort})` : ""}
                    </span>
                  </div>
                  {student.pen && (
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                        PEN Number
                      </span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {student.pen}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dialog Action Footer */}
          <div className="bg-muted/30 px-5 py-3 border-t border-border flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStudioOpen(true)}
              className="text-xs h-8 gap-1.5"
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span>{effectivePhotoSrc && !imgError ? "Change Photo" : "Upload Photo"}</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs h-8"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleNavigateProfile}
                className="text-xs h-8 gap-1.5 shadow-xs"
              >
                <span>Full Profile</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Studio Modal for Instant Snapping / Uploading */}
      {isStudioOpen && (
        <PhotoStudioModal
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          studentId={student.id}
          studentName={student.name}
          currentPhotoUrl={effectivePhotoSrc || undefined}
          onPhotoSaved={handlePhotoSaved}
          onPhotoRemoved={handlePhotoRemoved}
        />
      )}
    </>
  );
}
