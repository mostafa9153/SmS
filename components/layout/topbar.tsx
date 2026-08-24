"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, LogOut, Settings, User, PanelLeftOpen, PanelLeftClose, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const router = useRouter();
  const supabase = createClient();
  const { isOpen, toggleSidebar } = useSidebar();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [fullName, setFullName] = useState("Guest");
  const [role, setRole] = useState("");

  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch full name and role from user_roles
        const { data: profile } = await supabase
          .from("user_roles")
          .select("full_name, role")
          .eq("user_id", user.id)
          .single();
        
        if (profile) {
          setFullName(profile.full_name || "User");
          setRole(profile.role || "");
        } else {
          setFullName(user.email?.split("@")[0] || "User");
        }
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex h-12 items-center gap-2 sm:gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-3 sm:px-4 sticky top-0 z-30 transition-all">
      {/* Mobile menu trigger */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger render={<button aria-label="Open mobile menu" className="rounded-lg p-1.5 hover:bg-accent/80 md:hidden transition-colors text-muted-foreground hover:text-foreground shrink-0" />}>
          <Menu className="h-4.5 w-4.5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 border-r border-sidebar-border" showCloseButton={false}>
          <Sidebar mobile onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        title={isOpen ? "Collapse Sidebar (মেনু বন্ধ করুন)" : "Expand Sidebar (মেনু খুলুন)"}
        className="hidden md:flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
      >
        {isOpen ? (
          <PanelLeftClose className="h-4.5 w-4.5" />
        ) : (
          <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
        )}
      </button>

      {/* Global search with Shortcut Tag */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xs sm:max-w-md min-w-0">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary group-focus-within:scale-110 transition-transform" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search name, student ID, PEN, Aadhaar..."
            className="w-full rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/8 pl-8 pr-3 sm:pr-9 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background transition-all shadow-xs placeholder:text-muted-foreground/75"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center">
            <kbd className="rounded border border-primary/20 bg-background/80 px-1 py-0.2 text-[9px] font-mono text-muted-foreground shadow-2xs">
              /
            </kbd>
          </div>
        </div>
      </form>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Notification Bell */}
        <button
          title="System notifications"
          className="relative rounded-lg p-1.5 text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-all duration-150 hover:scale-105"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </button>

        <div className="h-3.5 w-px bg-border/60 mx-0.5 hidden sm:block" />

        {/* User profile dropdown - ONLY round avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button
              title={`${fullName} (${role || "User"})`}
              className="flex items-center justify-center rounded-full p-0.5 hover:ring-2 hover:ring-primary/30 outline-none transition-all duration-150 active:scale-95"
            />
          }>
            <div className="relative flex h-7.5 w-7.5 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xs font-bold text-xs ring-1.5 ring-primary/25">
              {fullName.charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-popover/95 backdrop-blur-md text-popover-foreground rounded-xl shadow-lg border border-border/80 p-1.5">
            <DropdownMenuLabel className="p-2">
              <div className="flex flex-col">
                <span className="font-bold text-xs text-foreground">{fullName}</span>
                {role && <span className="text-[10px] text-muted-foreground font-medium">{role} Access Level</span>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            
            {role === "Admin" && (
              <DropdownMenuItem onClick={() => router.push("/settings")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium cursor-pointer hover:bg-accent transition-colors">
                <Settings className="h-3.5 w-3.5 text-rose-500" />
                <span>Settings & Access</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={handleLogout} variant="destructive" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
