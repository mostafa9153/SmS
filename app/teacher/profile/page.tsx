"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  MapPin,
  Shield,
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
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeacherProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      } else {
        router.replace("/teacher/login");
      }
    } catch (err) {
      console.error("Error loading teacher profile:", err);
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

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Failed to update password.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs font-semibold text-slate-400">Loading Teacher Profile...</p>
        </div>
      </div>
    );
  }

  const user = profileData?.user;
  const staff = profileData?.staff;
  const assignments = profileData?.assignments || [];
  const stats = profileData?.stats || {
    readmissionsCount: 0,
    totalCollected: 0,
    tasksCompleted: 0,
    marksheetsCount: 0,
  };

  const primaryMeta = staff?.primary_meta || {};
  const presentAddr = staff?.present_address || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Workspace</span>
          </Link>
          <div className="h-4 w-[1px] bg-slate-800" />
          <h1 className="text-sm font-bold text-white tracking-tight">Faculty Profile</h1>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Active Faculty Member</span>
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Profile Identity Card */}
        <section className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 border border-slate-800 relative overflow-hidden shadow-xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-left">
            <div className="relative">
              {staff?.profile_picture_url ? (
                <div className="h-24 w-24 rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-lg">
                  <Image
                    src={staff.profile_picture_url}
                    alt={user?.fullName || "Teacher"}
                    width={96}
                    height={96}
                    className="object-cover h-full w-full"
                  />
                </div>
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-emerald-500/20 border-2 border-emerald-400/30">
                  {user?.fullName?.charAt(0).toUpperCase() || "T"}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-slate-950 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-950" />
              </span>
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                  {user?.fullName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  {staff?.designation || "Faculty / Assistant Teacher"}
                </span>
              </div>

              <p className="text-xs text-slate-400">
                School ID: <span className="text-slate-200 font-bold">{staff?.unique_id || "N/A"}</span> · Teaching Staff
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 pt-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-emerald-400" />
                  {user?.email}
                </span>
                {staff?.mobile && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    {staff.mobile}
                  </span>
                )}
                {staff?.joining_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    Joined: {new Date(staff.joining_date).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Live Performance & Collection Summary */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Re-Admissions</span>
              <UserCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">{stats.readmissionsCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Students admitted</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Fee Collection</span>
              <IndianRupee className="h-4 w-4 text-teal-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">₹{Number(stats.totalCollected).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Total collected</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Tasks Finished</span>
              <CheckCircle2 className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">{stats.tasksCompleted}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Reports approved</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Marksheets</span>
              <Award className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">{stats.marksheetsCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Generated in session</p>
          </div>
        </section>

        {/* Assigned Classes & Subjects */}
        <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              My Assigned Teaching Responsibilities
            </h3>
          </div>

          {assignments.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No class or subject assignments mapped yet. Contact Administrator.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {assignments.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1"
                >
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      a.role_type === "CLASS_TEACHER"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {a.role_type === "CLASS_TEACHER" ? "Class Teacher" : "Subject Teacher"}
                  </span>
                  <p className="font-bold text-white">Class {a.class_name} ({a.section})</p>
                  {a.subject && (
                    <p className="text-[11px] text-slate-400">Subject: {a.subject}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Professional & Personal Details */}
        <div className="grid md:grid-cols-2 gap-4">
          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-400" />
              Academic & Professional Details
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Appointed Subject</span>
                <span className="font-semibold text-white">{primaryMeta.appointed_subject || "General"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Academic Section</span>
                <span className="font-semibold text-white">{primaryMeta.academic_section || "Secondary"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Approved Qualification</span>
                <span className="font-semibold text-white">{primaryMeta.approval_qualification || "Graduate"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Employee Group</span>
                <span className="font-semibold text-white">{primaryMeta.employee_group || "Group B"}</span>
              </div>
            </div>
          </section>

          {/* Account Security / Change Password */}
          <section className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              Portal Security & Password
            </h3>

            {successMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-300">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-9 rounded-xl pr-9 text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-300">Confirm Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-9 rounded-xl text-white"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={updatingPassword}
                className="w-full h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer gap-1.5"
              >
                {updatingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                <span>Update Password</span>
              </Button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
