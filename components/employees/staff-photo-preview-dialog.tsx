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
  ExternalLink,
  Phone,
  Calendar,
  Briefcase,
  ShieldCheck,
  Award,
} from "lucide-react";
import type { StaffProfile } from "@/components/employees/staff-table";
import { CopyButton } from "@/components/ui/copy-button";
import { calculateDetailedAge } from "@/lib/utils";

interface StaffPhotoPreviewDialogProps {
  staff: StaffProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StaffPhotoPreviewDialog({
  staff,
  isOpen,
  onClose,
}: StaffPhotoPreviewDialogProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [photoVersion, setPhotoVersion] = useState<number | null>(null);

  useEffect(() => {
    if (staff) {
      setImgError(false);
    }
  }, [staff]);

  if (!staff) return null;

  const initials = staff.full_name
    ? staff.full_name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "T";

  const effectivePhotoSrc = staff.profile_picture_url
    ? (photoVersion ? `${staff.profile_picture_url}?v=${photoVersion}` : staff.profile_picture_url)
    : null;

  const dAge = staff.dob ? calculateDetailedAge(staff.dob) : null;

  const handleNavigateProfile = () => {
    onClose();
    router.push(`/employees/${staff.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-border/80 rounded-2xl shadow-2xl bg-card">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-muted/40 px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-1.5">
                {staff.full_name}
                <CopyButton text={staff.full_name} label="Staff Name" iconClassName="h-3 w-3" />
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-mono font-medium text-foreground">
                  ID: {staff.unique_id}
                </span>
                <span>•</span>
                <span className="font-medium text-foreground">
                  {staff.designation}
                </span>
                <span>•</span>
                <Badge
                  variant={staff.status === "ACTIVE" ? "default" : "secondary"}
                  className="text-[9px] px-1.5 py-0 h-4 uppercase font-semibold"
                >
                  {staff.status}
                </Badge>
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
                alt={staff.full_name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl mb-3 shadow-md">
                  {initials}
                </div>
                <p className="text-sm font-semibold text-muted-foreground">
                  No profile photo uploaded
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[220px]">
                  Photo can be uploaded from the staff profile page.
                </p>
              </div>
            )}

            {/* Quick overlay badge */}
            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white font-medium shadow-xs">
              Staff Photo
            </div>
          </div>

          {/* Quick Metadata Chips */}
          <div className="w-full grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                Designation & Role
              </span>
              <span className="font-semibold text-foreground truncate block">
                {staff.designation} ({staff.employee_type === "TEACHING" ? "Teaching" : "Non-Teaching"})
              </span>
            </div>

            <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                Contact Phone
              </span>
              <span className="font-semibold text-foreground truncate block font-mono">
                {staff.mobile || "—"}
              </span>
            </div>

            {staff.dob && (
              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-0.5 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                    Date of Birth & Age
                  </span>
                  <span className="font-semibold text-foreground font-mono text-xs">
                    {staff.dob} {dAge ? `(${dAge.years} yrs)` : ""}
                  </span>
                </div>
                {staff.caste && (
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                      Social Category
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {staff.caste}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dialog Action Footer */}
        <div className="bg-muted/30 px-5 py-3 border-t border-border flex items-center justify-end gap-2">
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
      </DialogContent>
    </Dialog>
  );
}
