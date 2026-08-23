"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { School, Eye, EyeOff, RefreshCw, AlertCircle, Mail, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
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
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Invalid credentials.");
      } else if (data.session) {
        // Successful login, redirect to dashboard
        router.replace("/");
        router.refresh();
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
            <div className="absolute h-12 w-12 rounded-full border-4 border-primary/25 animate-pulse" />
            <RefreshCw className="h-6 w-6 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-xs font-medium text-slate-400">Authenticating session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Premium ambient glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl grid md:grid-cols-2 min-h-[540px] z-10">
        
        {/* Left Side: Branding / Showcase Panel */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border-r border-slate-850/50 relative overflow-hidden">
          {/* Subtle background grids */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
          
          {/* Logo & School Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-300">Official Portal</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-lg shadow-primary/20">
                <School className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Marigachi High School</h1>
                <p className="text-xs text-slate-400">Student Management System</p>
              </div>
            </div>
          </div>

          {/* Core Info list */}
          <div className="space-y-6 relative z-10 my-8">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Secure Access Control</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Protected admin workspace utilizing enterprise-grade encryption and secure sessions.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Interactive Dashboard</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Instantly manage student databases, record results, and oversee academic promotions.</p>
              </div>
            </div>
          </div>

          {/* Footer inside Left Panel */}
          <div className="text-[11px] text-slate-500 relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-4">
            <span>© {new Date().getFullYear()} MHS Admin</span>
            <span>v2.1.0</span>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-slate-900/20">
          {/* Logo only for Mobile */}
          <div className="flex md:hidden flex-col items-center mb-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white mb-3 shadow-lg shadow-primary/20">
              <School className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-bold text-white">Marigachi High School</h1>
            <p className="text-xs text-slate-400">Student Management System</p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-white">Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your administration details below to access your account.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold">Authentication failed</span>
                  <p className="text-red-400/85 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-355">
                Email Address
              </Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors duration-200">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@marigachihighschool.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-9 bg-slate-950/65 border-slate-800/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-primary focus-visible:ring-offset-slate-900 focus-visible:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-355">
                Password
              </Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors duration-200">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-9 pr-9 bg-slate-950/65 border-slate-800/80 text-slate-100 placeholder:text-slate-600 focus-visible:ring-primary focus-visible:ring-offset-slate-900 focus-visible:border-slate-700 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1.5">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-550 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-primary/10 hover:shadow-primary/20 py-2.5"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Checking credentials...
                  </span>
                ) : (
                  "Sign In to Admin Panel"
                )}
              </Button>
            </div>
          </form>

          {/* Help notice at bottom */}
          <p className="text-[11px] text-center text-slate-500 mt-6 leading-relaxed">
            Need help signing in or lost access? <br className="hidden sm:inline" />
            Please contact the System Administrator.
          </p>
        </div>

      </div>
    </div>
  );
}
