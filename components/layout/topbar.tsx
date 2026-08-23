"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, LogOut, Settings, User, PanelLeftOpen, PanelLeftClose } from "lucide-react";
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
    <header className="flex h-16 items-center gap-2 sm:gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-3 sm:px-6 sticky top-0 z-30 transition-all">
      {/* Mobile menu trigger */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger render={<button aria-label="Open mobile menu" className="rounded-xl p-2 hover:bg-accent/80 md:hidden transition-colors text-muted-foreground hover:text-foreground shrink-0" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 border-r border-sidebar-border" showCloseButton={false}>
          <Sidebar mobile onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        title={isOpen ? "Collapse Sidebar (মেনু বন্ধ করুন)" : "Expand Sidebar (মেনু খুলুন)"}
        className="hidden md:flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
      >
        {isOpen ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeftOpen className="h-5 w-5 text-primary" />
        )}
      </button>

      {/* Global search with Shortcut Tag */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xs sm:max-w-md min-w-0">
        <div className="relative group">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search students, ID, PEN…"
            className="w-full rounded-xl border border-border/60 bg-muted/40 pl-8 sm:pl-9 pr-3 sm:pr-10 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background transition-all shadow-2xs placeholder:text-muted-foreground/70"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center">
            <kbd className="rounded border bg-background/80 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground shadow-2xs">
              /
            </kbd>
          </div>
        </div>
      </form>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-2">
        {/* Notification Bell */}
        <button
          title="System notifications"
          className="relative rounded-xl p-2 text-muted-foreground hover:bg-accent/80 hover:text-foreground transition-all duration-150 hover:scale-105"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
        </button>

        <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-accent/80 outline-none text-left transition-all duration-150 border border-transparent hover:border-border/60" />
          }>
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xs font-bold text-xs ring-2 ring-primary/20">
              {fullName.charAt(0).toUpperCase()}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-xs font-bold tracking-tight text-foreground">{fullName}</p>
              {role && (
                <span className="inline-block text-[10px] font-semibold text-primary/80">
                  {role}
                </span>
              )}
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
                <span>System Administration</span>
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
