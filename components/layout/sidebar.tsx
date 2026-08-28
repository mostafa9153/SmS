"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Upload,
  ArrowUpDown,
  Settings,
  ChevronDown,
  School,
  X,
  Award,
  CalendarClock,
  LogOut,
  ArrowLeft,
  ShieldAlert,
  Activity,
  Sliders,
  Cloud,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  iconBg: string;
  adminOnly?: boolean;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-4 w-4" />,
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110",
  },
  {
    label: "Students",
    icon: <Users className="h-4 w-4" />,
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110",
    children: [
      { label: "All Students Directory", href: "/students" },
      { label: "Bulk Upload & Archive", href: "/students/bulk-upload" },
    ],
  },
  {
    label: "Results & Marks",
    href: "/results",
    icon: <Award className="h-4 w-4" />,
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-110",
  },
  {
    label: "Promotion & Transfer",
    href: "/students/promotion",
    icon: <ArrowUpDown className="h-4 w-4" />,
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20 group-hover:scale-110",
  },
];

const settingsNavItems = [
  {
    tab: "users",
    label: "User Management",
    icon: <Users className="h-4 w-4" />,
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    activeColor: "from-blue-500/15 via-blue-500/8 text-blue-700 dark:text-blue-300 border-blue-600",
  },
  {
    tab: "session",
    label: "Academic Session",
    icon: <CalendarClock className="h-4 w-4" />,
    iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    activeColor: "from-cyan-500/15 via-cyan-500/8 text-cyan-700 dark:text-cyan-300 border-cyan-600",
  },
  {
    tab: "audit",
    label: "Audit Logs",
    icon: <Activity className="h-4 w-4" />,
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    activeColor: "from-violet-500/15 via-violet-500/8 text-violet-700 dark:text-violet-300 border-violet-600",
  },
  {
    tab: "config",
    label: "School Config",
    icon: <Sliders className="h-4 w-4" />,
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    activeColor: "from-amber-500/15 via-amber-500/8 text-amber-700 dark:text-amber-300 border-amber-600",
  },
  {
    tab: "backup",
    label: "Backup & Cloud",
    icon: <Cloud className="h-4 w-4" />,
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    activeColor: "from-emerald-500/15 via-emerald-500/8 text-emerald-700 dark:text-emerald-300 border-emerald-600",
  },
  {
    tab: "danger",
    label: "Danger Zone",
    icon: <ShieldAlert className="h-4 w-4" />,
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    activeColor: "from-rose-500/15 via-rose-500/8 text-rose-700 dark:text-rose-300 border-rose-600",
  },
];

function NavGroup({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((c) => pathname.startsWith(c.href));
    }
    return false;
  });

  if (item.children) {
    const isGroupActive = item.children.some((c) =>
      pathname.startsWith(c.href)
    );
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
            isGroupActive
              ? "bg-primary/10 text-primary font-semibold shadow-2xs"
              : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
          )}
        >
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200", item.iconBg)}>
            {item.icon}
          </div>
          <span className="flex-1 text-left text-xs font-semibold tracking-tight">{item.label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200",
              open && "rotate-180 text-foreground"
            )}
          />
        </button>

        {open && (
          <div className="ml-5 pl-4 border-l-2 border-primary/20 flex flex-col gap-1 py-1 transition-all duration-300">
            {item.children.map((child) => {
              const isChildActive = (() => {
                if (child.href === "/students") {
                  return pathname === "/students" || (pathname.startsWith("/students/") && !["/students/add", "/students/bulk-upload", "/students/promotion"].some(route => pathname.startsWith(route)));
                }
                return pathname === child.href || pathname.startsWith(child.href + "/");
              })();
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 relative",
                    isChildActive
                      ? "bg-primary/15 text-primary font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                >
                  {isChildActive && (
                    <span className="absolute -left-[18px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20" />
                  )}
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href!}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 relative",
        isActive
          ? "bg-gradient-to-r from-primary/15 via-primary/8 to-transparent text-primary font-semibold shadow-2xs border-l-3 border-primary"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      )}
    >
      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200", item.iconBg)}>
        {item.icon}
      </div>
      <span className="text-xs font-semibold tracking-tight">{item.label}</span>
      {isActive && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </Link>
  );
}

export function Sidebar({
  mobile = false,
  onClose,
}: {
  mobile?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSettingTab = searchParams.get("tab") || "users";
  const isSettingsMode = pathname.startsWith("/settings");
  const supabase = createClient();
  const { toggleSidebar } = useSidebar();

  const [fullName, setFullName] = useState("Administrator");
  const [role, setRole] = useState("Admin");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_roles")
          .select("full_name, role")
          .eq("user_id", user.id)
          .single();
        
        if (profile) {
          setFullName(profile.full_name || "User");
          setRole(profile.role || "Staff");
        } else {
          setFullName(user.email?.split("@")[0] || "User");
        }
      }
    }
    loadUserProfile();
  }, [supabase]);

  async function handleLogout() {
    setIsLoggingOut(true);
    if (onClose) onClose();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar/95 backdrop-blur-md border-sidebar-border transition-all duration-300",
        mobile ? "w-72" : "w-full"
      )}
    >
      {/* Brand Logo Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border/60 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-sm border border-amber-500/30 bg-black transition-transform duration-300 hover:scale-105">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <p className="text-sm font-bold tracking-tight text-foreground leading-tight">
            MHS School
          </p>
        </div>

        {mobile && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {isSettingsMode ? (
          <div className="space-y-2">
            {/* Return to Dashboard Action */}
            <div className="mb-2">
              <Link
                href="/"
                onClick={onClose}
                className="group flex items-center gap-2.5 rounded-xl border border-border/70 bg-accent/40 px-3 py-2 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:border-border hover:shadow-2xs"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-1 group-hover:text-primary" />
                <span className="text-xs font-bold tracking-tight">Return to Dashboard</span>
              </Link>
            </div>

            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
              <Settings className="h-3 w-3 text-primary" />
              <span>System Settings</span>
            </div>

            <div className="space-y-1">
              {settingsNavItems.map((item) => {
                const isActive = activeSettingTab === item.tab;
                return (
                  <Link
                    key={item.tab}
                    href={`/settings?tab=${item.tab}`}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 relative border border-transparent",
                      isActive
                        ? cn("bg-gradient-to-r shadow-2xs font-semibold border-l-3", item.activeColor)
                        : "text-muted-foreground hover:bg-accent/70 hover:text-foreground hover:border-border/40"
                    )}
                  >
                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 shrink-0", item.iconBg)}>
                      {item.icon}
                    </div>
                    <span className="text-xs font-semibold tracking-tight flex-1 truncate">{item.label}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          navItems
            .filter((item) => !item.adminOnly || role === "Admin")
            .map((item) => (
              <NavGroup key={item.label} item={item} onNavigate={onClose} />
            ))
        )}
      </nav>

      {/* Footer Profile Dropdown */}
      <div className="border-t border-sidebar-border/60 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button 
              className="w-full rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent hover:from-primary/10 hover:via-primary/15 hover:to-primary/5 border border-primary/10 hover:border-primary/25 p-2.5 flex items-center justify-between transition-all duration-200 group text-left outline-none cursor-pointer shadow-2xs" 
              aria-label="User menu"
            />
          }>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-xs font-bold text-foreground truncate max-w-[125px]">
                  {fullName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {role} · Session 2026
                </p>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56 bg-popover/95 backdrop-blur-md text-popover-foreground rounded-xl shadow-xl border border-border/80 p-1.5">
            <DropdownMenuLabel className="p-2">
              <div className="flex flex-col">
                <span className="font-bold text-xs text-foreground truncate">{fullName}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{role || "User"} · Session 2026</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            
            {role === "Admin" && (
              <DropdownMenuItem 
                onClick={() => {
                  if (onClose) onClose();
                  router.push("/settings");
                }} 
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer hover:bg-accent transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-rose-500" />
                <span>Settings & Access</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              variant="destructive" 
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isLoggingOut ? "Signing out..." : "Sign Out / Log Out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

