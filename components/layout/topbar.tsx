"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, Search, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";

export function Topbar() {
  const router = useRouter();
  const supabase = createClient();
  const { isOpen, toggleSidebar, isMobileOpen, setIsMobileOpen } = useSidebar();

  const [searchValue, setSearchValue] = useState("");
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/students?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue("");
    }
  }

  return (
    <header className="flex h-13 sm:h-12 items-center gap-1.5 sm:gap-3 border-b border-border/60 bg-background/85 backdrop-blur-md px-2.5 sm:px-4 sticky top-0 z-30 transition-all">
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
        <SheetContent side="left" className="p-0 w-[290px] sm:w-72 border-r border-sidebar-border" showCloseButton={false}>
          <Suspense fallback={<div className="w-[290px] sm:w-72 h-full bg-sidebar/95" />}>
            <Sidebar mobile onClose={() => setIsMobileOpen(false)} />
          </Suspense>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        title={isOpen ? "Collapse Sidebar (মেনু বন্ধ করুন)" : "Expand Sidebar (মেনু খুলুন)"}
        className="hidden md:flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
      >
        {isOpen ? (
          <PanelLeftClose className="h-4.5 w-4.5" />
        ) : (
          <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
        )}
      </button>

      {/* Global search with iOS-zoom-safe font and responsive placeholder */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xs sm:max-w-md min-w-0">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary group-focus-within:scale-110 transition-transform pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search students, ID, PEN..."
            className="w-full rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/8 pl-8 pr-3 sm:pr-9 py-1.5 text-base sm:text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background transition-all shadow-xs placeholder:text-muted-foreground/75"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center">
            <kbd className="rounded border border-primary/20 bg-background/80 px-1 py-0.2 text-[9px] font-mono text-muted-foreground shadow-2xs">
              /
            </kbd>
          </div>
        </div>
      </form>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
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
