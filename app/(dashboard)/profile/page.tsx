"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  MapPin,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  UserCheck,
  IndianRupee,
  Lock,
  Eye,
  EyeOff,
  Pencil,
  LogOut,
  CreditCard,
  Briefcase,
  User,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/ui/copy-button";
import { buttonVariants } from "@/components/ui/button";
import { StudentPhotoAvatar } from "@/components/students/student-photo-avatar";
import { createClient } from "@/lib/supabase/client";
import { calculateDetailedAge, cn } from "@/lib/utils";

export default function UniversalProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (data.success) {
        setProfileData(data);
        setFullNameInput(data.user?.fullName || data.staff?.full_name || "");
      } else {
        router.replace("/login");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const payload: any = {};
    if (fullNameInput.trim()) payload.fullName = fullNameInput.trim();

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg("Password must be at least 6 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
      payload.password = newPassword;
    }

    if (!payload.password && (!fullNameInput.trim() || fullNameInput.trim() === (user?.fullName || ""))) {
      setErrorMsg("Please provide a new password or updated name.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Profile and credentials updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
        loadProfile();
      } else {
        setErrorMsg(data.error || "Failed to update profile.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while updating profile.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Loading Profile...</p>
        </div>
      </div>
    );
  }

  const user = profileData?.user;
  const rawStaff = profileData?.staff;
  const staff = rawStaff || (user ? {
    id: user.id,
    full_name: user.fullName || user.email?.split("@")[0] || "School Administrator",
    unique_id: "ADM001",
    employee_type: "TEACHING",
    designation: user.role === "Admin" ? "Headmaster / Administrator" : "Faculty / Staff",
    status: "ACTIVE",
    email: user.email,
    caste: "General",
    service_type: "Permanent",
    mobile: "",
    joining_date: user.createdAt ? new Date(user.createdAt).toISOString().split("T")[0] : "",
    primary_meta: {
      academic_section: "Secondary / HS",
      appointed_subject: "Administration",
      approval_qualification: "Post Graduate",
      employee_group: "Group A",
    },
    professional_meta: {
      professional_qualification: "Post Graduate / M.Ed",
      post_status: "Sanctioned Post",
      subject_1: "Administration",
    },
    present_address: {
      village: "",
      district: "South 24 Parganas",
      pin_code: "700001",
    },
    bank_details: {
      bank_name: "State Bank of India",
      bank_branch: "",
      account_no: "",
      ifsc_code: "",
    },
  } : null);

  const assignments = profileData?.assignments || [];
  const stats = profileData?.stats;

  const isStaffAccount = !!staff;
  const isAdmin = user?.role === "Admin";

  const primaryMeta = staff?.primary_meta || {};
  const personalMeta = staff?.personal_meta || {};
  const presentAddr = staff?.present_address || {};
  const permanentAddr = staff?.permanent_address || {};
  const profMeta = staff?.professional_meta || {};
  const bank = staff?.bank_details || {};

  const dAge = staff?.dob ? calculateDetailedAge(staff.dob) : null;

  const assignedClasses: string[] = Array.isArray(profMeta.assigned_classes)
    ? profMeta.assigned_classes
    : Array.isArray(primaryMeta.assigned_classes)
    ? primaryMeta.assigned_classes
    : [];

  const teachingSubjects: string[] = Array.isArray(profMeta.teaching_subjects) && profMeta.teaching_subjects.length > 0
    ? profMeta.teaching_subjects
    : Array.isArray(primaryMeta.teaching_subjects) && primaryMeta.teaching_subjects.length > 0
    ? primaryMeta.teaching_subjects
    : [
        profMeta.subject_1 || primaryMeta.appointed_subject || "",
        ...(profMeta.additional_subjects ? String(profMeta.additional_subjects).split(",").map((s: string) => s.trim()) : [])
      ].filter(Boolean);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto animate-fade-in-up">
      {/* Top Header / Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-primary" />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-border/60" />
          <h1 className="text-base font-bold text-foreground tracking-tight">
            Faculty / Staff Profile
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/profile/edit"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors cursor-pointer gap-1.5 shadow-xs flex items-center"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Details</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-8.5 rounded-xl border-border/80 bg-card hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer gap-1.5 shadow-2xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Profile Identity Card */}
      <section className="p-6 rounded-3xl bg-card border border-border/80 relative overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar / Passport Photo Frame */}
          <div className="shrink-0 flex flex-col items-center">
            <StudentPhotoAvatar
              studentId={staff?.id || user?.id || "profile"}
              studentName={staff?.full_name || user?.fullName || "User"}
              photoUrl={staff?.profile_picture_url}
              uploadEndpoint={`/api/employees/${staff?.id || user?.id}/photo`}
              onPhotoUpdated={(newUrl) =>
                setProfileData((prev: any) => ({
                  ...prev,
                  staff: { ...(prev?.staff || {}), profile_picture_url: newUrl },
                }))
              }
            />
          </div>

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate uppercase">
                {staff?.full_name || user?.fullName || "User"}
              </h2>
              <Badge
                variant="outline"
                className="bg-primary/10 border-primary/30 text-primary text-xs font-bold"
              >
                {staff?.designation || (user?.role === "Admin" ? "Headmaster / Administrator" : "Staff")}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  (staff?.status || "ACTIVE") === "ACTIVE"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1.5",
                    (staff?.status || "ACTIVE") === "ACTIVE" ? "bg-emerald-500" : "bg-muted-foreground"
                  )}
                />
                {staff?.status || "ACTIVE"}
              </Badge>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground font-mono">
              <span>Employee ID: <strong className="text-foreground">{staff?.unique_id || "ADM001"}</strong></span>
              <CopyButton text={staff?.unique_id || "ADM001"} label="ID" iconClassName="h-3 w-3" />
              <span>•</span>
              <span>{staff?.employee_type === "NON_TEACHING" ? "Staff Member" : "Teaching Faculty"}</span>
            </div>

            {/* Quick Contact Chips */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-foreground pt-1.5">
              {user?.email && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 shadow-2xs font-medium">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span>{user.email}</span>
                </div>
              )}
              {staff?.mobile && (
                <a
                  href={`tel:${staff.mobile}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted font-medium transition-colors shadow-2xs"
                >
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>{staff.mobile}</span>
                </a>
              )}
              {staff?.joining_date && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground font-medium shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Joined: {new Date(staff.joining_date).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}</span>
                </div>
              )}
              {staff?.dob && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground font-medium shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>DOB: {staff.dob} {dAge && <strong className="text-foreground">({dAge.years} yrs)</strong>}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Staff Detailed 5 Tabs (if staff record exists) */}
      {isStaffAccount && (
        <Tabs defaultValue="primary" className="space-y-4">
          <TabsList className="bg-muted/80 p-1 rounded-2xl border border-border/80 flex flex-wrap h-auto gap-1">
            <TabsTrigger
              value="primary"
              className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              📋 Primary & Service
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
              📍 Contact & Address
            </TabsTrigger>
            <TabsTrigger
              value="bank"
              className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              🏦 Bank Details
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="rounded-xl px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              🎓 Class Responsibilities
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Primary & Service Details */}
          <TabsContent value="primary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Employment & Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Designation</span>
                    <span className="font-bold text-foreground text-right">{staff?.designation || "Faculty / Teacher"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Employee Type</span>
                    <span className="font-semibold text-foreground text-right">{staff?.employee_type || "TEACHING"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Service Type</span>
                    <span className="font-semibold text-foreground text-right">{staff?.service_type || "Permanent"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Post Status</span>
                    <span className="font-semibold text-foreground text-right">{profMeta.post_status || "Sanctioned Post"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Appointment Memo No.</span>
                    <span className="font-mono text-foreground text-right">{staff?.appointment_memo || "—"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground font-medium">Basic Pay</span>
                    <span className="font-bold text-foreground text-right">
                      {staff?.basic_pay ? `₹${Number(staff.basic_pay).toLocaleString()}` : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Academic & Qualification Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Appointed Subject</span>
                    <span className="font-bold text-foreground text-right">{primaryMeta.appointed_subject || profMeta.subject_1 || "General"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Academic Section</span>
                    <span className="font-semibold text-foreground text-right">{primaryMeta.academic_section || "Secondary"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Approved Qualification</span>
                    <span className="font-semibold text-foreground text-right">{primaryMeta.approval_qualification || "Graduate"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Professional Qualification</span>
                    <span className="font-semibold text-foreground text-right">{profMeta.professional_qualification || "B.Ed / D.El.Ed"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground font-medium">Employee Group</span>
                    <span className="font-semibold text-foreground text-right">{primaryMeta.employee_group || "Group B"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: Personal Details */}
          <TabsContent value="personal" className="space-y-4">
            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Father's Name</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{staff?.father_name || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Mother's Name</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{staff?.mother_name || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Gender</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{staff?.gender || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Marital Status</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{staff?.marital_status || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Blood Group</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block font-mono">{staff?.blood_group || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Caste Category</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{staff?.caste || "General"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Aadhaar Card No.</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block font-mono">{staff?.aadhaar_no || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">PAN Number</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block font-mono uppercase">{staff?.pan_no || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Health Scheme Opted</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{personalMeta.health_scheme_opted || "Swasthya Sathi / WBHS"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 sm:col-span-2 lg:col-span-3">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Differently Abled (PwD)</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{staff?.differently_abled ? "Yes" : "No"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Contact Details */}
          <TabsContent value="contact" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Present Residential Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Village / Town / Street</span>
                    <span className="font-bold text-foreground text-right">{presentAddr.village || presentAddr.town_village || "—"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">District</span>
                    <span className="font-semibold text-foreground text-right">{presentAddr.district || "South 24 Parganas"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground font-medium">PIN Code</span>
                    <span className="font-mono text-foreground text-right">{presentAddr.pin_code || "—"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Permanent Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Village / Town / Street</span>
                    <span className="font-bold text-foreground text-right">{permanentAddr.village || permanentAddr.town_village || presentAddr.village || "—"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">District</span>
                    <span className="font-semibold text-foreground text-right">{permanentAddr.district || presentAddr.district || "South 24 Parganas"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground font-medium">PIN Code</span>
                    <span className="font-mono text-foreground text-right">{permanentAddr.pin_code || presentAddr.pin_code || "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: Bank Details */}
          <TabsContent value="bank" className="space-y-4">
            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Salary & Bank Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Bank Name</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{bank.bank_name || "State Bank of India"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Branch Name</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">{bank.bank_branch || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Account Number</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block font-mono">{bank.account_no || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">IFSC Code</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block font-mono">{bank.ifsc_code || "—"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">MICR Code</span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block font-mono">{bank.micr_no || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Class Responsibilities */}
          <TabsContent value="classes" className="space-y-4">
            <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Assigned Classes & Teaching Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Mapped Class Duties:</h4>
                  {assignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No formal class duty mappings for this session.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {assignments.map((a: any) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-xl bg-muted/50 border border-border/70 text-xs space-y-1 shadow-2xs"
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold",
                              a.role_type === "CLASS_TEACHER"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20"
                            )}
                          >
                            {a.role_type === "CLASS_TEACHER" ? "Class Teacher" : "Subject Teacher"}
                          </Badge>
                          <p className="font-bold text-foreground">Class {a.class_name} ({a.section})</p>
                          {a.subject && (
                            <p className="text-[11px] text-muted-foreground font-normal">Subject: {a.subject}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {teachingSubjects.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Teaching Subjects:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {teachingSubjects.map((sub, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold border border-border/60"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Account Security / Change Password Section */}
      <section className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Account Security & Password
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">Encrypted Authentication</span>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          {!staff && (
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Display Full Name</Label>
              <Input
                type="text"
                placeholder="Full Name"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                className="bg-background border-border text-xs h-9 rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-background border-border text-xs h-9 rounded-xl pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Confirm New Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-background border-border text-xs h-9 rounded-xl"
            />
          </div>

          <div className="sm:col-span-2 pt-1">
            <Button
              type="submit"
              disabled={updatingPassword}
              className="h-9 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer gap-1.5 shadow-xs"
            >
              {updatingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              <span>Save & Update Password</span>
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
