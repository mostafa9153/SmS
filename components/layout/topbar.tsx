"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, PanelLeftOpen, ArrowLeft } from "lucide-react";
import { CommandSearch } from "@/components/layout/command-search";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";
import { runBackHandler } from "@/lib/hooks/use-back-handler";

export function Topbar() {
  const router = useRouter();
  const supabase = createClient();
  const { isOpen, toggleSidebar, isMobileOpen, setIsMobileOpen } = useSidebar();

  const [fullName, setFullName] = useState("User");
  const [role, setRole] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [designation, setDesignation] = useState("");

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        const data = await res.json();
        if (data.success && data.user) {
          setFullName(data.user.fullName || data.staff?.full_name || "User");
          setRole(data.user.role || "");
          setPhotoUrl(data.staff?.profile_picture_url || null);
          setDesignation(data.staff?.designation || data.user.role || "User");
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
          }
        }
      } catch (err) {
        console.error("Error loading topbar profile:", err);
      }
    }
    loadUserProfile();
  }, [supabase]);

  return (
    <header className="flex h-[calc(3.25rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] sm:h-12 sm:pt-0 items-center gap-1.5 sm:gap-3 border-b border-border/60 bg-background/85 backdrop-blur-md px-2.5 sm:px-4 sticky top-0 z-30 transition-all">
      {/* Mobile menu trigger */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger render={
          <button 
            aria-label="Open mobile menu" 
            className="flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg p-2 hover:bg-accent/80 md:hidden transition-colors text-muted-foreground hover:text-foreground shrink-0 cursor-pointer active:scale-95" 
          />
        }>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[290px] sm:w-72 border-r border-border/60 dark:border-white/10 bg-background" showCloseButton={false}>
          <Suspense fallback={<div className="w-[290px] sm:w-72 h-full bg-background" />}>
            <Sidebar mobile onClose={() => setIsMobileOpen(false)} />
          </Suspense>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar Expand Button (visible when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          title="Expand Sidebar (মেনু খুলুন)"
          aria-label="Expand Sidebar"
          className="hidden md:flex items-center justify-center h-8 w-8 rounded-xl text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
        >
          <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
        </button>
      )}

      {/* Navigation / Back Button (on the left side of search bar) */}
      <button
        type="button"
        onClick={() => { if (!runBackHandler()) router.back(); }}
        title="Go Back (পেছনে যান)"
        aria-label="Go Back"
        className="group relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:bg-[#FACC15]/15 dark:hover:bg-[#FACC15]/25 dark:text-[#FACC15] border border-primary/20 dark:border-[#FACC15]/30 shadow-2xs hover:shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      </button>

      {/* Search pages, settings and actions */}
      <CommandSearch isAdmin={role === "Admin"} />

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        {/* Sound Feedback Toggle */}
        <SoundToggle />

        {/* Theme Toggle (Dark / Light Mode) */}
        <ThemeToggle />

        {/* Notification Panel */}
        <NotificationPanel />

        <div className="h-3.5 w-px bg-border/60 mx-0.5 hidden sm:block" />

        {/* User profile direct button - Opens /profile directly */}
        <Link
          href="/profile"
          title={`${fullName} (${designation || role || "User"}) - Profile`}
          aria-label="View Profile"
          className="group flex items-center justify-center min-h-[38px] min-w-[38px] rounded-full p-1 hover:ring-2 hover:ring-primary/40 outline-none transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xs font-bold text-xs ring-1.5 ring-primary/25 overflow-hidden group-hover:scale-105 transition-transform">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={fullName}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            ) : (
              fullName.charAt(0).toUpperCase()
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background z-10" />
          </div>
        </Link>
      </div>
    </header>
  );
}
