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
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 sticky top-0 z-30">
      {/* Mobile menu trigger */}
      <Sheet>
        <SheetTrigger render={<button className="rounded-md p-1.5 hover:bg-accent md:hidden" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        title={isOpen ? "Collapse Sidebar (মেনু বন্ধ করুন)" : "Expand Sidebar (মেনু খুলুন)"}
        className="hidden md:flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
      >
        {isOpen ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeftOpen className="h-5 w-5 text-primary" />
        )}
      </button>

      {/* Global search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search students…"
            className="w-full rounded-md border bg-muted/40 pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <button className="rounded-md p-1.5 hover:bg-accent text-muted-foreground">
          <Bell className="h-4 w-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className="flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-accent outline-none text-left" />
          }>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold leading-none">{fullName}</p>
              {role && <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{role}</p>}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover text-popover-foreground">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold">{fullName}</span>
                {role && <span className="text-[10px] text-muted-foreground font-normal">{role} Profile</span>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {role === "Admin" && (
              <DropdownMenuItem onClick={() => router.push("/settings")} className="flex w-full items-center gap-2 cursor-pointer">
                <Settings className="h-3.5 w-3.5" />
                <span>System Settings</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={handleLogout} variant="destructive" className="flex w-full items-center gap-2 cursor-pointer">
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
