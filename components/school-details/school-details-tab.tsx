"use client";

import { useState, useEffect, useRef } from "react";
import {
  Building,
  GraduationCap,
  Save,
  Sparkles,
  MapPin,
  Phone,
  Award,
  ShieldCheck,
  School,
  RotateCcw,
  Check,
  Upload,
  UserCheck,
  PenTool,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast-banner";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import {
  type SchoolProfileData,
  DEFAULT_SCHOOL_PROFILE,
  HEAD_DESIGNATION_OPTIONS,
  STANDARD_HS_STREAMS,
  saveSchoolProfileToDb,
  formatFullSchoolAddress,
} from "@/lib/utils/school-profile";

/**
 * Helper to identify Higher Secondary classes (Classes XI and XII / 11 and 12).
 * Stream is ONLY applicable to Classes XI and XII.
 */
export function isHigherSecondaryClass(code?: string, name?: string): boolean {
  const normCode = (code || "").trim().toUpperCase();
  const normName = (name || "").trim().toUpperCase();
  return (
    normCode === "XI" ||
    normCode === "XII" ||
    normCode === "11" ||
    normCode === "12" ||
    normName.includes("XI") ||
    normName.includes("XII") ||
    normName.includes("11") ||
    normName.includes("12")
  );
}

/**
 * Returns the next available section letter (A -> B -> C -> D ...)
 */
export function getNextAvailableLetter(existing: string[]): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const set = new Set(existing.map((x) => x.trim().toUpperCase()));
  for (const char of alphabet) {
    if (!set.has(char)) return char;
  }
  return "+";
}

export function SchoolDetailsTab() {
  const [profile, setProfile] = useState<SchoolProfileData>(DEFAULT_SCHOOL_PROFILE);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // References for file uploads
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load saved state from localStorage then fetch latest from Database
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("sms_school_profile");
      if (savedProfile) {
        setProfile({ ...DEFAULT_SCHOOL_PROFILE, ...JSON.parse(savedProfile) });
      }
    } catch (e) {
      console.error("Failed to load local school details", e);
    }

    import("@/lib/utils/school-config-client").then(({ fetchSchoolConfigClient }) => {
      fetchSchoolConfigClient()
        .then((data) => {
          if (data?.school_profile) {
            setProfile({ ...DEFAULT_SCHOOL_PROFILE, ...data.school_profile });
            localStorage.setItem("sms_school_profile", JSON.stringify(data.school_profile));
            setIsCloudSynced(true);
          }
        })
        .catch((err) => console.warn("Failed to sync school config from cloud DB:", err));
    });
  }, []);

  // Handle school logo/crest image upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({
        type: "error",
        title: "Invalid File Type",
        description: "Please upload an image file (PNG, JPG, SVG, or WEBP).",
      });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast({
        type: "error",
        title: "File Too Large",
        description: "School crest image size should be under 3MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setProfile((prev) => ({
          ...prev,
          schoolLogoUrl: dataUrl,
        }));
        showToast({
          type: "success",
          title: "Logo Uploaded",
          description: "School emblem preview updated. Click 'Save Profile' to store permanently.",
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleResetLogo = () => {
    setProfile((prev) => ({
      ...prev,
      schoolLogoUrl: "/logo.png",
    }));
    showToast({
      type: "info",
      title: "Logo Reset",
      description: "School crest restored to original institutional emblem.",
    });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({
        type: "error",
        title: "Invalid File Type",
        description: "Please upload an image file (PNG, JPG, or WEBP).",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast({
        type: "error",
        title: "File Too Large",
        description: "Signature image size should be under 2MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setProfile((prev) => ({
          ...prev,
          headSignatureUrl: dataUrl,
        }));
        showToast({
          type: "success",
          title: "Signature Uploaded",
          description: "Signature preview updated. Click 'Save Profile' to store permanently.",
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveSignature = () => {
    setProfile((prev) => ({
      ...prev,
      headSignatureUrl: "",
    }));
    showToast({
      type: "info",
      title: "Signature Removed",
      description: "Digital signature removed. Certificates will leave clear space for manual pen signing.",
    });
  };

  const handleGeographicalAddressChange = (field: keyof SchoolProfileData, value: string) => {
    setProfile((prev) => {
      const updated = { ...prev, [field]: value };
      updated.schoolAddress = formatFullSchoolAddress(updated);
      return updated;
    });
  };

  const handleToggleProfileStream = (streamName: string) => {
    const current = profile.hsStreams && profile.hsStreams.length > 0
      ? [...profile.hsStreams]
      : ["Arts", "Science", "Commerce"];

    let next: string[];
    if (current.includes(streamName)) {
      if (current.length <= 1) {
        showToast({
          type: "error",
          title: "At least one stream required",
          description: "School must offer at least one Higher Secondary stream.",
        });
        return;
      }
      next = current.filter((s) => s !== streamName);
    } else {
      next = [...current, streamName];
    }

    setProfile((prev) => ({ ...prev, hsStreams: next }));
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const finalAddress = profile.schoolAddress?.trim() || formatFullSchoolAddress(profile);
      const activeStreams = profile.hsStreams && profile.hsStreams.length > 0
        ? profile.hsStreams
        : ["Arts", "Science", "Commerce"];

      const profileToSave: SchoolProfileData = {
        ...profile,
        schoolAddress: finalAddress,
        hsStreams: activeStreams,
      };
      setProfile(profileToSave);

      // Also ensure Class XI & XII classes reflect the active streams in localStorage & DB
      try {
        const savedClassesRaw = localStorage.getItem("sms_class_management");
        if (savedClassesRaw) {
          const classesList = JSON.parse(savedClassesRaw) as Array<{ code?: string; name?: string; stream?: string }>;
          const updatedClasses = classesList.map((c) => {
            if (isHigherSecondaryClass(c.code, c.name)) {
              return {
                ...c,
                stream: activeStreams.join(" / "),
              };
            }
            return c;
          });
          localStorage.setItem("sms_class_management", JSON.stringify(updatedClasses));
          window.dispatchEvent(new Event("sms_class_management_updated"));
          fetch("/api/school-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "class_management", value: updatedClasses }),
          }).catch((err) => console.warn("Background DB sync for classes failed:", err));
        }
      } catch (e) {
        console.warn("Class stream sync skipped:", e);
      }

      localStorage.setItem("sms_school_profile", JSON.stringify(profileToSave));
      const success = await saveSchoolProfileToDb(profileToSave);
      setIsSavingProfile(false);
      setIsCloudSynced(success);
      showToast({
        type: success ? "success" : "info",
        title: success ? "Saved to Cloud Database" : "Saved Locally",
        description: success
          ? "Institutional metadata & HS stream settings synchronized across all devices."
          : "Saved in browser storage.",
      });
    } catch (e) {
      setIsSavingProfile(false);
      showToast({
        type: "error",
        title: "Save Failed",
        description: "Could not save profile details.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-amber-500/10 via-background to-background p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-xs shrink-0">
              <School className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {profile.schoolName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                <span>UDISE+: <strong className="font-mono text-foreground">{profile.udiseCode}</strong></span>
                {profile.hsCode && (
                  <>
                    <span>•</span>
                    <span>H.S. Code: <strong className="font-mono text-foreground">{profile.hsCode}</strong></span>
                  </>
                )}
                <span>•</span>
                <span>Affiliation: <strong className="text-foreground">{profile.boardAffiliation}</strong></span>
                <span>•</span>
                <span>Est: <strong className="font-mono text-foreground">{profile.establishedYear}</strong></span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCloudSynced ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 text-xs py-1 px-2.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Cloud Synced
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 text-xs py-1 px-2.5">
                Local Storage
              </Badge>
            )}
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-xs py-1 px-2.5 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Institution
            </Badge>
            <Button
              size="sm"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="bg-primary text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs h-9 justify-center cursor-pointer ml-1"
            >
              <Save className="h-4 w-4" />
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Detailed Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* 1. Basic Metadata */}
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                Institutional Identity & Accreditation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="schoolName" className="text-xs">Official School Name *</Label>
                <Input
                  id="schoolName"
                  value={profile.schoolName}
                  onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                  className="text-xs font-medium"
                  placeholder="e.g. Marigachi High School (H.S.)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="udiseCode" className="text-xs">UDISE+ Code *</Label>
                <Input
                  id="udiseCode"
                  value={profile.udiseCode}
                  onChange={(e) => setProfile({ ...profile, udiseCode: e.target.value })}
                  className="text-xs font-mono"
                  placeholder="11-digit UDISE Code"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hsCode" className="text-xs">H.S. Code</Label>
                <Input
                  id="hsCode"
                  value={profile.hsCode || ""}
                  onChange={(e) => setProfile({ ...profile, hsCode: e.target.value })}
                  className="text-xs font-mono"
                  placeholder="e.g. 102298"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="indexNo" className="text-xs">WBBSE Index No</Label>
                <Input
                  id="indexNo"
                  value={profile.indexNo || ""}
                  onChange={(e) => setProfile({ ...profile, indexNo: e.target.value })}
                  className="text-xs font-mono"
                  placeholder="e.g. B2-026"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="boardAffiliation" className="text-xs">Board / Council Affiliation</Label>
                <Input
                  id="boardAffiliation"
                  value={profile.boardAffiliation}
                  onChange={(e) => setProfile({ ...profile, boardAffiliation: e.target.value })}
                  className="text-xs"
                  placeholder="e.g. WBBSE / WBCHSE"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="establishedYear" className="text-xs">Year of Establishment</Label>
                <Input
                  id="establishedYear"
                  value={profile.establishedYear}
                  onChange={(e) => setProfile({ ...profile, establishedYear: e.target.value })}
                  className="text-xs font-mono"
                  placeholder="e.g. 1965"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="schoolCategory" className="text-xs">School Level / Category</Label>
                <Input
                  id="schoolCategory"
                  value={profile.schoolCategory}
                  onChange={(e) => setProfile({ ...profile, schoolCategory: e.target.value })}
                  className="text-xs"
                  placeholder="Higher Secondary (V - XII)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mediumOfInstruction" className="text-xs">Medium of Instruction</Label>
                <Input
                  id="mediumOfInstruction"
                  value={profile.mediumOfInstruction}
                  onChange={(e) => setProfile({ ...profile, mediumOfInstruction: e.target.value })}
                  className="text-xs"
                  placeholder="Bengali / English"
                />
              </div>
            </CardContent>
          </Card>

          {/* Higher Secondary Streams Configuration (Class XI & XII) */}
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Higher Secondary Streams (Class XI &amp; XII)
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  {(profile.hsStreams || ["Arts", "Science", "Commerce"]).length} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {STANDARD_HS_STREAMS.map((s) => {
                  const isSelected = (profile.hsStreams || ["Arts", "Science", "Commerce"]).includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleToggleProfileStream(s)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-primary/50 bg-primary/10 text-primary font-bold shadow-2xs"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-semibold">{s}</span>
                      <div
                        className={cn(
                          "h-4 w-4 rounded flex items-center justify-center border transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <span>Active Streams:</span>
                <span className="font-semibold text-foreground">
                  {(profile.hsStreams || ["Arts", "Science", "Commerce"]).join(" • ") || "None"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Administration & Contact */}
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Administration & Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="headmasterName" className="text-xs">Headmaster / Principal / TIC Name</Label>
                <Input
                  id="headmasterName"
                  value={profile.headmasterName}
                  onChange={(e) => setProfile({ ...profile, headmasterName: e.target.value })}
                  className="text-xs font-medium"
                  placeholder="e.g. Dr. A. K. Mondal"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="schoolEmail" className="text-xs">Official Contact Email *</Label>
                <Input
                  id="schoolEmail"
                  type="email"
                  value={profile.schoolEmail}
                  onChange={(e) => setProfile({ ...profile, schoolEmail: e.target.value })}
                  className="text-xs"
                  placeholder="e.g. contact@marigachihighschool.in"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="schoolPhone" className="text-xs">Primary Telephone / Mobile</Label>
                <Input
                  id="schoolPhone"
                  value={profile.schoolPhone}
                  onChange={(e) => setProfile({ ...profile, schoolPhone: e.target.value })}
                  className="text-xs"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="altPhone" className="text-xs">Alternate Helpline / Landline</Label>
                <Input
                  id="altPhone"
                  value={profile.altPhone}
                  onChange={(e) => setProfile({ ...profile, altPhone: e.target.value })}
                  className="text-xs"
                  placeholder="03218-245678"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="schoolWebsite" className="text-xs">Institutional Website URL</Label>
                <Input
                  id="schoolWebsite"
                  value={profile.schoolWebsite}
                  onChange={(e) => setProfile({ ...profile, schoolWebsite: e.target.value })}
                  className="text-xs"
                  placeholder="https://marigachihighschool.in"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Address & Location */}
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rose-500" />
                Geographical Address & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="schoolAddress" className="text-xs font-semibold">Full Address Line *</Label>
                  <span className="text-[10px] text-muted-foreground italic">Auto-constructed as location details below are updated</span>
                </div>
                <Input
                  id="schoolAddress"
                  value={profile.schoolAddress}
                  onChange={(e) => setProfile({ ...profile, schoolAddress: e.target.value })}
                  className="text-xs font-medium bg-muted/20"
                  placeholder="Full constructed address line..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="village" className="text-xs">Village / Area / Ward</Label>
                <Input
                  id="village"
                  value={profile.village}
                  onChange={(e) => handleGeographicalAddressChange("village", e.target.value)}
                  className="text-xs"
                  placeholder="e.g. Marigachi"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="postOffice" className="text-xs">Post Office (P.O.)</Label>
                <Input
                  id="postOffice"
                  value={profile.postOffice || ""}
                  onChange={(e) => handleGeographicalAddressChange("postOffice", e.target.value)}
                  className="text-xs"
                  placeholder="e.g. Marigachi"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="policeStation" className="text-xs">Police Station / Block (P.S.)</Label>
                <Input
                  id="policeStation"
                  value={profile.policeStation}
                  onChange={(e) => handleGeographicalAddressChange("policeStation", e.target.value)}
                  className="text-xs"
                  placeholder="e.g. Mathurapur"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="district" className="text-xs">District</Label>
                <Input
                  id="district"
                  value={profile.district}
                  onChange={(e) => handleGeographicalAddressChange("district", e.target.value)}
                  className="text-xs"
                  placeholder="e.g. South 24 Parganas"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs">State</Label>
                <Input
                  id="state"
                  value={profile.state || "West Bengal"}
                  onChange={(e) => handleGeographicalAddressChange("state", e.target.value)}
                  className="text-xs"
                  placeholder="e.g. West Bengal"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode" className="text-xs">Postal PIN Code</Label>
                <Input
                  id="pincode"
                  value={profile.pincode}
                  onChange={(e) => handleGeographicalAddressChange("pincode", e.target.value)}
                  className="text-xs font-mono"
                  placeholder="e.g. 743349"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Brand Assets & HOI */}
        <div className="space-y-5">
          {/* School Crest & Motto */}
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  School Crest & Motto
                </CardTitle>
                {profile.schoolLogoUrl && profile.schoolLogoUrl !== "/logo.png" ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Custom Logo Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                    Default Crest
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-center">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {/* Logo Display Box with Hover Action Overlay */}
              <div className="space-y-2">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="mx-auto h-32 w-32 rounded-2xl border-2 border-dashed border-primary/40 p-2.5 flex items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer relative group overflow-hidden"
                  title="Click to change school crest"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.schoolLogoUrl || "/logo.png"}
                    alt="School Crest"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-background/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 text-center">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-semibold text-foreground">Click to Change</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    className="h-7 text-xs px-2.5 cursor-pointer"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Change Logo
                  </Button>
                  {profile.schoolLogoUrl && profile.schoolLogoUrl !== "/logo.png" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleResetLogo}
                      className="h-7 text-xs text-muted-foreground hover:text-destructive px-2 cursor-pointer"
                      title="Restore default school logo"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-left pt-1 border-t">
                <Label htmlFor="schoolMotto" className="text-xs font-medium">School Motto / Tagline</Label>
                <Input
                  id="schoolMotto"
                  value={profile.schoolMotto}
                  onChange={(e) => setProfile({ ...profile, schoolMotto: e.target.value })}
                  className="text-xs italic"
                  placeholder="e.g. Knowledge, Character, Excellence"
                />
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="w-full bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {isSavingProfile ? "Saving..." : "Save Profile Details"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Head of Institution (HOI) & Signature Card */}
          <Card className="border bg-card shadow-2xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Head of Institution & Signature
                </CardTitle>
                {profile.headSignatureUrl ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Signature Loaded
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                    Manual Sign Mode
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Head Designation / Role Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Head Designation / Role</Label>
                <CustomSelect
                  value={profile.headDesignation || "Teacher-in-Charge"}
                  onChange={(val) => setProfile({ ...profile, headDesignation: String(val) })}
                  options={HEAD_DESIGNATION_OPTIONS}
                  placeholder="Select Designation"
                  searchable={false}
                />
              </div>

              {profile.headDesignation === "Custom" && (
                <div className="space-y-1.5">
                  <Label htmlFor="customHeadDesignation" className="text-xs">Custom Designation Title</Label>
                  <Input
                    id="customHeadDesignation"
                    value={profile.customHeadDesignation || ""}
                    onChange={(e) => setProfile({ ...profile, customHeadDesignation: e.target.value })}
                    className="text-xs"
                    placeholder="e.g. Acting Headmaster / Vice Principal"
                  />
                </div>
              )}

              {/* Headmaster / TIC Name */}
              <div className="space-y-1.5">
                <Label htmlFor="headmasterNameRight" className="text-xs font-medium">Head of Institution Name</Label>
                <Input
                  id="headmasterNameRight"
                  value={profile.headmasterName}
                  onChange={(e) => setProfile({ ...profile, headmasterName: e.target.value })}
                  className="text-xs font-medium"
                  placeholder="e.g. Sheikh Sirajuddin / Dr. A. K. Mondal"
                />
              </div>

              {/* Signature Upload & Preview Section */}
              <div className="space-y-2 pt-1 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <PenTool className="h-3.5 w-3.5 text-primary" />
                    Official Digital Signature
                  </Label>
                  {profile.headSignatureUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="text-[11px] text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>

                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />

                {profile.headSignatureUrl ? (
                  <div className="space-y-2">
                    <div className="h-20 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 flex flex-col items-center justify-center relative overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profile.headSignatureUrl}
                        alt="Head Signature"
                        className="max-h-14 max-w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => signatureInputRef.current?.click()}
                          className="h-7 text-xs cursor-pointer"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Replace
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={handleRemoveSignature}
                          className="h-7 text-xs cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => signatureInputRef.current?.click()}
                    className="h-20 w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center cursor-pointer p-2 text-center"
                  >
                    <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                    <span className="text-[11px] font-medium text-foreground">Click to Upload Signature</span>
                    <span className="text-[9.5px] text-muted-foreground">PNG, JPG or WEBP max 2MB</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => signatureInputRef.current?.click()}
                    className="flex-1 text-xs h-8 cursor-pointer"
                  >
                    <Upload className="h-3 w-3 mr-1.5" />
                    {profile.headSignatureUrl ? "Update Signature" : "Upload Signature"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="flex-1 bg-primary text-primary-foreground text-xs h-8 font-semibold cursor-pointer"
                  >
                    <Save className="h-3 w-3 mr-1.5" />
                    {isSavingProfile ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info Box */}
          <Card className="border border-blue-500/20 bg-blue-500/5 shadow-2xs">
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Institution Profile Summary
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Referenced dynamically by report card generators, marksheet printing, and administrative compliance exports.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
