"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  User,
  ShieldCheck,
  Home,
  CreditCard,
  Sparkles,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Step3ReviewProps {
  onBack: () => void;
  onNext: (updatedData: any) => void;
  mode: "online" | "offline";
  initialData: any;
}

export function Step3Review({ onBack, onNext, mode, initialData }: Step3ReviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    return {
      // General
      studentName: initialData?.name || initialData?.studentName || "",
      pen: initialData?.pen || "",
      schoolId: initialData?.schoolId || initialData?.school_id || "",
      aadhaar: initialData?.aadhaarNo || initialData?.aadhaar_no || initialData?.aadhaar || "",
      dob: initialData?.dob || initialData?.dateOfBirth || initialData?.date_of_birth || "",
      gender: initialData?.gender || "Male",
      bloodGroup: initialData?.bloodGroup || initialData?.blood_group || "",
      religion: initialData?.religion || "Islam",
      caste: initialData?.caste || initialData?.socialCategory || initialData?.social_category || "General",

      // Guardian
      fatherName: initialData?.fatherName || initialData?.father_name || "",
      motherName: initialData?.motherName || initialData?.mother_name || "",
      guardianName: initialData?.guardianName || initialData?.guardian_name || "",
      relationship: initialData?.relationship || "Father",
      contactNumber: initialData?.studentContact || initialData?.student_contact || initialData?.contactNumber || "",
      altMobile: initialData?.altMobile || initialData?.alt_mobile || "",
      email: initialData?.email || "",

      // Address
      villTown: initialData?.villTown || initialData?.vill_town || initialData?.village || "",
      postOffice: initialData?.postOffice || initialData?.post_office || "",
      policeStation: initialData?.policeStation || initialData?.police_station || "",
      district: initialData?.dist || initialData?.district || "Murshidabad",
      state: initialData?.state || "West Bengal",
      pinCode: initialData?.pinCode || initialData?.pin_code || initialData?.pincode || "",
      address: initialData?.address || "",

      // Bank & Govt Schemes
      bankAccountNo: initialData?.bankAccountNo || initialData?.bank_account_no || "",
      bankIfsc: initialData?.bankIfsc || initialData?.bank_ifsc || "",
      bankName: initialData?.bankName || initialData?.bank_name || "",
      bplStatus: initialData?.bplStatus || initialData?.bpl_status || "No",
      kanyashreeId: initialData?.kanyashreeId || initialData?.kanyashree_id || "",
      shikshashreeId: initialData?.shikshashreeId || initialData?.shikshashree_id || "",
      oasisId: initialData?.oasisId || initialData?.oasis_id || "",
      aikyashreeId: initialData?.aikyashreeId || initialData?.aikyashree_id || "",
      tarunerSwapnaId: initialData?.tarunerSwapnaId || initialData?.taruner_swapna_id || "",
      svmcsId: initialData?.svmcsId || initialData?.svmcs_id || "",

      // Target / Current Info
      presentClass: initialData?.presentClass || initialData?.present_class || initialData?.targetClass || "V",
      presentSection: initialData?.presentSection || initialData?.present_section || initialData?.targetSection || "A",
      presentRoll: initialData?.presentRoll || initialData?.present_roll || 1,
      photoUrl: initialData?.photoUrl || initialData?.photo_url || null,
      id: initialData?.id,
      applicationId: mode === "online" ? initialData?.id : undefined,
    };
  });

  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setModifiedFields((prev) => new Set(prev).add(field));
  };

  const handleProceed = () => {
    onNext(formData);
  };

  // Online mode submission change detection
  const isOnline = mode === "online";
  const onlineProvidedKeys = isOnline
    ? Object.keys(formData).filter((k) => !!formData[k] && !["id", "applicationId", "presentRoll"].includes(k))
    : [];

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto py-2 px-2 sm:px-4 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {isOnline ? "Online Submission Verification" : "Profile Verification"}
            </span>
            <Badge variant="outline" className="text-[10px] font-semibold">
              Class {formData.presentClass} ({formData.presentSection})
            </Badge>
          </div>
        </div>

        <Button
          onClick={handleProceed}
          size="sm"
          className="h-8 px-4 text-xs font-semibold gap-1.5"
        >
          <span>Verify & Proceed</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Online Changes Summary Bar */}
      {isOnline && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Online Application #{initialData?.applicationNo || initialData?.id?.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="h-5 text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30">
              {onlineProvidedKeys.length} Fields Populated
            </Badge>
            {modifiedFields.size > 0 && (
              <Badge variant="outline" className="h-5 text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                {modifiedFields.size} Edited
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section 1: General Details */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">General Information</h3>
              </div>
              {isOnline && formData.studentName && (
                <Badge variant="outline" className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Online
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground">Student Name</label>
                  {modifiedFields.has("studentName") && (
                    <span className="text-[9px] font-semibold text-amber-600">Edited</span>
                  )}
                </div>
                <Input
                  value={formData.studentName}
                  onChange={(e) => handleChange("studentName", e.target.value)}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground">Banglar Shiksha PEN</label>
                  {isOnline && formData.pen && (
                    <span className="text-[9px] font-semibold text-blue-600">Submitted</span>
                  )}
                </div>
                <Input
                  value={formData.pen}
                  onChange={(e) => handleChange("pen", e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground">Aadhaar Number</label>
                  {isOnline && formData.aadhaar && (
                    <span className="text-[9px] font-semibold text-blue-600">Submitted</span>
                  )}
                </div>
                <Input
                  value={formData.aadhaar}
                  onChange={(e) => handleChange("aadhaar", e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="12-digit Aadhaar"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Date of Birth</label>
                <Input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Gender</label>
                <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male" className="text-xs">Male</SelectItem>
                    <SelectItem value="Female" className="text-xs">Female</SelectItem>
                    <SelectItem value="Other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Blood Group</label>
                <Select value={formData.bloodGroup || "unknown"} onValueChange={(v) => handleChange("bloodGroup", v === "unknown" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown" className="text-xs">Not Set</SelectItem>
                    <SelectItem value="A+" className="text-xs">A+</SelectItem>
                    <SelectItem value="A-" className="text-xs">A-</SelectItem>
                    <SelectItem value="B+" className="text-xs">B+</SelectItem>
                    <SelectItem value="B-" className="text-xs">B-</SelectItem>
                    <SelectItem value="AB+" className="text-xs">AB+</SelectItem>
                    <SelectItem value="AB-" className="text-xs">AB-</SelectItem>
                    <SelectItem value="O+" className="text-xs">O+</SelectItem>
                    <SelectItem value="O-" className="text-xs">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Religion</label>
                <Select value={formData.religion} onValueChange={(v) => handleChange("religion", v)}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Islam" className="text-xs">Islam</SelectItem>
                    <SelectItem value="Hinduism" className="text-xs">Hinduism</SelectItem>
                    <SelectItem value="Christianity" className="text-xs">Christianity</SelectItem>
                    <SelectItem value="Other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Social Category / Caste</label>
                <Select value={formData.caste} onValueChange={(v) => handleChange("caste", v)}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General" className="text-xs">General</SelectItem>
                    <SelectItem value="OBC-A" className="text-xs">OBC-A</SelectItem>
                    <SelectItem value="OBC-B" className="text-xs">OBC-B</SelectItem>
                    <SelectItem value="SC" className="text-xs">SC</SelectItem>
                    <SelectItem value="ST" className="text-xs">ST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Guardian Details */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-foreground">Guardian Details</h3>
              </div>
              {isOnline && formData.guardianName && (
                <Badge variant="outline" className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Online
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Father Name</label>
                <Input
                  value={formData.fatherName}
                  onChange={(e) => handleChange("fatherName", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Mother Name</label>
                <Input
                  value={formData.motherName}
                  onChange={(e) => handleChange("motherName", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Guardian Name</label>
                <Input
                  value={formData.guardianName}
                  onChange={(e) => handleChange("guardianName", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Relationship</label>
                <Select value={formData.relationship} onValueChange={(v) => handleChange("relationship", v)}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Father" className="text-xs">Father</SelectItem>
                    <SelectItem value="Mother" className="text-xs">Mother</SelectItem>
                    <SelectItem value="Brother" className="text-xs">Brother</SelectItem>
                    <SelectItem value="Uncle" className="text-xs">Uncle</SelectItem>
                    <SelectItem value="Other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground">Primary Contact</label>
                  {isOnline && formData.contactNumber && (
                    <span className="text-[9px] font-semibold text-blue-600">Submitted</span>
                  )}
                </div>
                <Input
                  value={formData.contactNumber}
                  onChange={(e) => handleChange("contactNumber", e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="Mobile number"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Alt Contact</label>
                <Input
                  value={formData.altMobile}
                  onChange={(e) => handleChange("altMobile", e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="Optional"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Optional"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Address Details */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-foreground">Address Details</h3>
              </div>
              {isOnline && formData.villTown && (
                <Badge variant="outline" className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Online
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Village / Town</label>
                <Input
                  value={formData.villTown}
                  onChange={(e) => handleChange("villTown", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Post Office</label>
                <Input
                  value={formData.postOffice}
                  onChange={(e) => handleChange("postOffice", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">District</label>
                <Input
                  value={formData.district}
                  onChange={(e) => handleChange("district", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Pin Code</label>
                <Input
                  value={formData.pinCode}
                  onChange={(e) => handleChange("pinCode", e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Full Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Village, PO, PS, Dist"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Bank & Government Schemes */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-foreground">Bank & Facilities</h3>
              </div>
              {isOnline && formData.bankAccountNo && (
                <Badge variant="outline" className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Online
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground">Bank Account No</label>
                  {isOnline && formData.bankAccountNo && (
                    <span className="text-[9px] font-semibold text-blue-600">Submitted</span>
                  )}
                </div>
                <Input
                  value={formData.bankAccountNo}
                  onChange={(e) => handleChange("bankAccountNo", e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Bank IFSC Code</label>
                <Input
                  value={formData.bankIfsc}
                  onChange={(e) => handleChange("bankIfsc", e.target.value.toUpperCase())}
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Bank Name</label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">BPL Status</label>
                <Select value={formData.bplStatus} onValueChange={(v) => handleChange("bplStatus", v)}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No" className="text-xs">No</SelectItem>
                    <SelectItem value="Yes" className="text-xs">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Kanyashree ID</label>
                <Input
                  value={formData.kanyashreeId}
                  onChange={(e) => handleChange("kanyashreeId", e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Oasis / Aikyashree ID</label>
                <Input
                  value={formData.oasisId || formData.aikyashreeId}
                  onChange={(e) => handleChange("oasisId", e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="Optional"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
