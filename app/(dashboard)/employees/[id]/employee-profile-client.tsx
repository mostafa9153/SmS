"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Building2,
  CreditCard,
  GraduationCap,
  Calendar,
  ShieldCheck,
  Printer,
  Pencil,
  Trash2,
  FileSignature,
  BookOpen,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/ui/copy-button";
import { StudentPhotoAvatar } from "@/components/students/student-photo-avatar";
import { StaffSignatureCard } from "@/components/employees/staff-signature-card";
import { StaffEditDialog } from "@/components/employees/staff-edit-dialog";
import { StaffDeleteDialog } from "@/components/employees/staff-delete-dialog";
import { cn, calculateDetailedAge } from "@/lib/utils";

interface EmployeeProfileClientProps {
  staff: any;
}

export function EmployeeProfileClient({ staff: initialStaff }: EmployeeProfileClientProps) {
  const [currentStaff, setCurrentStaff] = useState(initialStaff);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const dAge = currentStaff.dob ? calculateDetailedAge(currentStaff.dob) : null;
  const bank = currentStaff.bank_details || {};
  const primaryMeta = currentStaff.primary_meta || {};
  const personalMeta = currentStaff.personal_meta || {};
  const presentAddr = currentStaff.present_address || {};
  const permanentAddr = currentStaff.permanent_address || {};
  const profMeta = currentStaff.professional_meta || {};

  const assignedClasses: string[] = Array.isArray(profMeta.assigned_classes)
    ? profMeta.assigned_classes
    : Array.isArray(primaryMeta.assigned_classes)
    ? primaryMeta.assigned_classes
    : [];
  const subject1 = profMeta.subject_1 || primaryMeta.appointed_subject || "";
  const additionalSubjects = profMeta.additional_subjects || "";

  return (
    <div className="p-3.5 sm:p-6 space-y-5 max-w-7xl mx-auto w-full animate-fade-in-up">
      {/* 1. Header Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="rounded-xl h-9 w-9 bg-card hover:bg-muted shadow-2xs border-border"
          >
            <Link href="/employees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {currentStaff.full_name}
              </h1>
              <Badge
                variant={currentStaff.status === "ACTIVE" ? "default" : "secondary"}
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  currentStaff.status === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1.5",
                    currentStaff.status === "ACTIVE" ? "bg-emerald-500" : "bg-muted-foreground"
                  )}
                />
                {currentStaff.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Employee ID: {currentStaff.unique_id}
            </p>
          </div>
        </div>

        {/* Top Action Buttons (Print, Edit, Delete) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 text-xs font-semibold shadow-2xs cursor-pointer"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            Print Profile
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="rounded-xl h-9 text-xs font-semibold shadow-2xs cursor-pointer border-border hover:bg-muted"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Edit Profile
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="rounded-xl h-9 text-xs font-semibold shadow-2xs cursor-pointer border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* 2. Top Profile Hero Card with 3:4 Passport Photo Frame */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 p-4 sm:p-6 shadow-xs backdrop-blur-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          {/* Left / Middle: Staff Metadata */}
          <div className="space-y-2.5 flex-1 min-w-0">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {currentStaff.full_name}
                </h2>
                <Badge variant="outline" className="font-mono text-xs">
                  {currentStaff.unique_id}
                </Badge>
                <CopyButton
                  text={currentStaff.unique_id}
                  label="Employee ID"
                  iconClassName="h-3 w-3"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
                <span className="font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                  {currentStaff.designation}
                </span>
                <span>•</span>
                <span className="font-medium">
                  {currentStaff.employee_type === "TEACHING"
                    ? "Teaching Staff"
                    : "Non-Teaching Staff"}
                </span>
                {currentStaff.caste && (
                  <>
                    <span>•</span>
                    <span className="font-medium">Caste: {currentStaff.caste}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Contact Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {currentStaff.mobile && (
                <a
                  href={`tel:${currentStaff.mobile}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
                >
                  <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{currentStaff.mobile}</span>
                  <CopyButton
                    text={currentStaff.mobile}
                    label="Phone"
                    iconClassName="h-2.5 w-2.5"
                  />
                </a>
              )}

              {currentStaff.email && (
                <a
                  href={`mailto:${currentStaff.email}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
                >
                  <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{currentStaff.email}</span>
                </a>
              )}

              {currentStaff.dob && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card text-xs font-semibold text-muted-foreground shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>DOB: {currentStaff.dob}</span>
                  {dAge && <span className="text-foreground">({dAge.years} yrs)</span>}
                </div>
              )}
            </div>
          </div>

          {/* Extreme Right: 3:4 Passport Photo Frame (Studio Modal) */}
          <div className="shrink-0 self-center sm:self-auto">
            <StudentPhotoAvatar
              studentId={currentStaff.id}
              studentName={currentStaff.full_name}
              photoUrl={currentStaff.profile_picture_url}
              uploadEndpoint={`/api/employees/${currentStaff.id}/photo`}
              onPhotoUpdated={(newUrl) =>
                setCurrentStaff((prev: any) => ({ ...prev, profile_picture_url: newUrl }))
              }
            />
          </div>
        </div>
      </div>

      {/* 3. 4-Tab Structured Details View */}
      <Tabs defaultValue="primary" className="space-y-4">
        <TabsList className="bg-muted/80 p-1 rounded-2xl border border-border/80 flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="primary"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            📋 Primary Details
          </TabsTrigger>
          <TabsTrigger
            value="personal"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            👤 Personal Details
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            📍 Contact Details
          </TabsTrigger>
          <TabsTrigger
            value="professional"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            🎓 Professional & Signature
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Primary Details */}
        <TabsContent value="primary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Employment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Designation</span>
                  <span className="font-bold text-foreground text-right">{currentStaff.designation}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Employee Type</span>
                  <span className="font-bold text-foreground text-right">
                    {currentStaff.employee_type === "TEACHING" ? "Teaching Staff" : "Non-Teaching Staff"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Joining Date</span>
                  <span className="font-mono text-foreground text-right">{currentStaff.joining_date || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Basic Pay</span>
                  <span className="font-mono font-bold text-foreground text-right">
                    {currentStaff.basic_pay ? `₹${currentStaff.basic_pay}` : "N/A"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Appointed Subject</span>
                  <span className="font-bold text-foreground text-right">{subject1 || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Academic Section</span>
                  <span className="font-medium text-foreground text-right">{primaryMeta.academic_section || "Secondary"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="text-muted-foreground font-medium">Classes Taught</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {assignedClasses.length > 0 ? (
                      assignedClasses.map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200/50 dark:border-indigo-800/50"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic text-right">Not assigned</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Bank Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Bank Name</span>
                  <span className="font-bold text-foreground text-right">{bank.bank_name || "State Bank of India"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Branch</span>
                  <span className="font-medium text-foreground text-right">{bank.bank_branch || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Account Number</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono font-bold text-foreground">{bank.account_no || "••••••••••••"}</span>
                    {bank.account_no && (
                      <CopyButton text={bank.account_no} label="Account Number" iconClassName="h-2.5 w-2.5" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">IFSC Code</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono font-semibold text-foreground">{bank.ifsc_code || "SBIN0000000"}</span>
                    {bank.ifsc_code && (
                      <CopyButton text={bank.ifsc_code} label="IFSC Code" iconClassName="h-2.5 w-2.5" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground font-medium">MICR No.</span>
                  <span className="font-mono text-foreground text-right">{bank.micr_no || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Personal Details */}
        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Family & Identification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Father's Name</span>
                  <span className="font-bold text-foreground text-right">{currentStaff.father_name || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Mother's Name</span>
                  <span className="font-medium text-foreground text-right">{currentStaff.mother_name || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Marital Status</span>
                  <span className="font-medium text-foreground text-right">{currentStaff.marital_status || "Married"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Blood Group</span>
                  <Badge variant="outline" className="w-fit ml-auto font-mono text-[11px]">
                    {currentStaff.blood_group || "N/A"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground font-medium">Caste Category</span>
                  <Badge variant="secondary" className="w-fit ml-auto text-[11px]">
                    {currentStaff.caste || "General"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Statutory Identification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Aadhaar Number</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono font-bold text-foreground">
                      {currentStaff.aadhaar_no ? `•••• •••• ${currentStaff.aadhaar_no.slice(-4)}` : "Not provided"}
                    </span>
                    {currentStaff.aadhaar_no && (
                      <CopyButton text={currentStaff.aadhaar_no} label="Aadhaar" iconClassName="h-2.5 w-2.5" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">PAN Number</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono font-bold text-foreground">{currentStaff.pan_no || "N/A"}</span>
                    {currentStaff.pan_no && (
                      <CopyButton text={currentStaff.pan_no} label="PAN" iconClassName="h-2.5 w-2.5" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Differently Abled</span>
                  <span className="font-medium text-foreground text-right">
                    {currentStaff.differently_abled ? "Yes" : "No"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground font-medium">Health Scheme</span>
                  <span className="font-medium text-foreground text-right">
                    {personalMeta.health_scheme_opted || "Swasthya Sathi / WBHS"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Contact Details */}
        <TabsContent value="contact" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  Present Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-foreground leading-relaxed">
                  {presentAddr.village || presentAddr.town_village || "West Bengal, India"}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-muted-foreground">
                  <span>District: <strong className="text-foreground">{presentAddr.district || "South 24 Parganas"}</strong></span>
                  <span>PIN: <strong className="text-foreground font-mono">{presentAddr.pin_code || "700001"}</strong></span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Communication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Primary Mobile</span>
                  <span className="font-mono font-bold text-foreground text-right">{currentStaff.mobile || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground font-medium">Email Address</span>
                  <span className="font-mono text-foreground text-right">{currentStaff.email || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground font-medium">Landline</span>
                  <span className="font-mono text-foreground text-right">{currentStaff.landline || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: Professional Details & Digital Signature */}
        <TabsContent value="professional" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Service & Qualifications (2 cols) */}
            <Card className="lg:col-span-2 rounded-2xl border border-border/80 shadow-xs bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Service & Appointment Records
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 space-y-1">
                  <span className="text-muted-foreground font-medium">Service Type</span>
                  <p className="font-bold text-foreground text-sm">{currentStaff.service_type || "Permanent"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 space-y-1">
                  <span className="text-muted-foreground font-medium">Appointment Memo</span>
                  <p className="font-mono font-semibold text-foreground text-sm">{currentStaff.appointment_memo || "N/A"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 space-y-1">
                  <span className="text-muted-foreground font-medium">Professional Qualification</span>
                  <p className="font-semibold text-foreground text-sm">{profMeta.professional_qualification || "B.Ed / D.El.Ed"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 space-y-1">
                  <span className="text-muted-foreground font-medium">Post Status</span>
                  <p className="font-semibold text-foreground text-sm">{profMeta.post_status || "Sanctioned Post"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Official Digital Signature Upload (1 col) */}
            <div className="lg:col-span-1">
              <StaffSignatureCard
                staffId={currentStaff.id}
                staffName={currentStaff.full_name}
                signatureUrl={profMeta.signature_url}
                onSignatureUpdated={(newUrl) =>
                  setCurrentStaff((prev: any) => ({
                    ...prev,
                    professional_meta: {
                      ...(prev.professional_meta || {}),
                      signature_url: newUrl,
                    },
                  }))
                }
              />
            </div>

            {/* Academic & Teaching Assignments (Classes & Subject 1) */}
            <Card className="lg:col-span-3 rounded-2xl border border-border/80 shadow-xs bg-card/90">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Academic & Teaching Assignments (পাঠদান ও শ্রেণী দায়িত্ব)
                </CardTitle>
                {assignedClasses.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    {assignedClasses.length} Classes Assigned
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Subject 1 */}
                  <div className="p-3.5 rounded-xl bg-muted/50 border border-border/50 space-y-1">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <span>Subject 1 (Primary Subject)</span>
                      <span className="text-[10px] text-muted-foreground">• মূল বিষয়</span>
                    </span>
                    <p className="font-extrabold text-foreground text-base">
                      {subject1 || <span className="text-muted-foreground font-normal italic">Not assigned yet</span>}
                    </p>
                  </div>

                  {/* Additional Subjects */}
                  <div className="p-3.5 rounded-xl bg-muted/50 border border-border/50 space-y-1">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <span>Additional Subjects</span>
                      <span className="text-[10px] text-muted-foreground">• অতিরিক্ত বিষয়</span>
                    </span>
                    <p className="font-semibold text-foreground text-sm">
                      {additionalSubjects || <span className="text-muted-foreground font-normal italic">None</span>}
                    </p>
                  </div>
                </div>

                {/* Assigned Classes */}
                <div className="p-3.5 rounded-xl bg-muted/50 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Assigned Classes (কোন কোন ক্লাসের ক্লাস নেন)</span>
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {assignedClasses.length > 0
                        ? `${assignedClasses.length} classes active`
                        : "No classes assigned"}
                    </span>
                  </div>

                  {assignedClasses.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {assignedClasses.map((cls) => (
                        <Badge
                          key={cls}
                          className="px-3 py-1 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                        >
                          {cls}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-xs py-1">
                      No classes have been assigned yet. Click "Edit Profile" to select the classes from the dropdown.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog Modal */}
      <StaffEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        staff={currentStaff}
        onStaffUpdated={(updated) => setCurrentStaff(updated)}
      />

      {/* Delete Confirmation Modal */}
      <StaffDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        staffId={currentStaff.id}
        staffName={currentStaff.full_name}
        uniqueId={currentStaff.unique_id}
      />
    </div>
  );
}
