"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeacherLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/");
      } else {
        setIsCheckingSession(false);
      }
    }
    checkSession();
  }, [router, supabase.auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Invalid email or password.");
      } else if (data.session) {
        // Full navigation to establish cookies with middleware -> lands on main dashboard (/)
        window.location.href = "/";
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-12 w-12 rounded-full border-4 border-emerald-500/25 animate-pulse" />
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-500 relative z-10" />
          </div>
          <p className="text-xs font-medium text-slate-400">Authenticating Teacher Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      {/* Background ambient accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl grid md:grid-cols-2 min-h-[500px] z-10">
        
        {/* Left Branding Showcase */}
        <div className="hidden md:flex flex-col justify-between p-8 lg:p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-r border-slate-800/80 relative">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>Teacher Workspace</span>
            </div>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/20">
                <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
                  <Image src="/logo.png" alt="School Logo" width={36} height={36} className="object-contain" priority />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Marigachi High School</h1>
                <p className="text-xs text-emerald-400/90 font-medium">Faculty & Staff Gateway</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mt-3">
              Access your assigned classes, execute student re-admissions, generate marksheets, and submit completion reports in real time.
            </p>
          </div>

          <div className="relative z-10 space-y-3 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              <span>Class & Subject Task Management</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <span>Instant Re-Admission & Fee Collection</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex flex-col justify-center p-6 sm:p-10 bg-slate-900/40">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Teacher Login
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered school teacher email & password.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="teacher@marigachihs.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 h-10 text-xs rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 h-10 text-xs rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In to Portal
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500">
                Are you an Administrator?{" "}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2">
                  Admin Login
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
