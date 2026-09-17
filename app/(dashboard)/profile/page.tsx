"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  User,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Settings,
  Users,
  GraduationCap,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (data.success) {
        setProfileData(data);
        setFullName(data.user?.fullName || "");
      } else {
        router.replace("/login");
      }
    } catch (err) {
      console.error("Error loading admin profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const payload: any = {};
    if (fullName.trim()) payload.fullName = fullName.trim();

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

    setUpdating(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Profile and security credentials updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccessMsg(""), 4000);
        loadProfile();
      } else {
        setErrorMsg(data.error || "Failed to update profile.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating profile.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Loading Administrator Profile...</p>
        </div>
      </div>
    );
  }

  const user = profileData?.user;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Administrator Profile & Security
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your root administrative identity, system privileges, and authentication credentials.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Root System Admin</span>
        </span>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Identity Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card/90 to-primary/5 border border-border/80 shadow-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-indigo-500/20">
            {user?.fullName?.charAt(0).toUpperCase() || "A"}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-foreground">{user?.fullName}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {user?.role}
              </span>
            </div>

            <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 pt-1">
              <Mail className="h-3.5 w-3.5 text-primary" />
              {user?.email}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px] text-muted-foreground pt-2">
              {user?.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Account created: {new Date(user.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {user?.lastSignIn && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last sign-in: {new Date(user.lastSignIn).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Privileges & Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Security & Password Form */}
        <section className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Account Credentials & Security
            </h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Display Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs rounded-xl pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {newPassword && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Confirm New Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={updating}
              className="w-full h-9 rounded-xl font-bold text-xs cursor-pointer gap-1.5"
            >
              {updating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              <span>Save Profile Updates</span>
            </Button>
          </form>
        </section>

        {/* Administrative Quick Shortcuts */}
        <section className="p-5 rounded-2xl bg-card border border-border/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Settings className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Administrative Control Centers
            </h3>
          </div>

          <div className="space-y-2">
            <Link
              href="/settings/teachers"
              className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Teacher Management Hub</p>
                  <p className="text-[10px] text-muted-foreground">Class mapping, task delegation, collection tracker</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
            </Link>

            <Link
              href="/settings/users"
              className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Authorized System Users</p>
                  <p className="text-[10px] text-muted-foreground">Manage admin and staff accounts</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
            </Link>

            <Link
              href="/settings/audit"
              className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">System Audit Trail</p>
                  <p className="text-[10px] text-muted-foreground">Inspect operations, timestamp logs, and database mutations</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
