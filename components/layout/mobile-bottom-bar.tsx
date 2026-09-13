"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserPlus, Award, Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

export function MobileBottomBar() {
  const pathname = usePathname();
  const { toggleMobileSidebar, isMobileOpen } = useSidebar();

  const isHomeActive = pathname === "/";
  const isStudentsActive =
    pathname === "/students" ||
    (pathname.startsWith("/students/") &&
      !["/students/add", "/students/bulk-upload", "/students/promotion"].some((r) =>
        pathname.startsWith(r)
      ));
  const isAddStudentActive = pathname === "/students/add";
  const isResultsActive = pathname.startsWith("/results");

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/70 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] print:hidden"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1 pb-[env(safe-area-inset-bottom,0px)]">
        {/* Home */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center h-full gap-0.5 transition-colors touch-manipulation active:scale-95",
            isHomeActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-4.5 w-4.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* Students */}
        <Link
          href="/students"
          className={cn(
            "flex flex-col items-center justify-center h-full gap-0.5 transition-colors touch-manipulation active:scale-95",
            isStudentsActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-4.5 w-4.5" />
          <span className="text-[10px] tracking-tight">Students</span>
        </Link>

        {/* Add Student Quick Action */}
        <Link
          href="/students/add"
          className="flex flex-col items-center justify-center h-full gap-0.5 touch-manipulation active:scale-95 group"
          title="Add Student"
        >
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full shadow-xs transition-all duration-150",
              isAddStudentActive
                ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <UserPlus className="h-4.5 w-4.5" />
          </div>
          <span className="text-[9px] font-semibold text-primary tracking-tight -mt-0.5">Add</span>
        </Link>

        {/* Results */}
        <Link
          href="/results"
          className={cn(
            "flex flex-col items-center justify-center h-full gap-0.5 transition-colors touch-manipulation active:scale-95",
            isResultsActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Award className="h-4.5 w-4.5" />
          <span className="text-[10px] tracking-tight">Results</span>
        </Link>

        {/* Menu (Drawer Trigger) */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className={cn(
            "flex flex-col items-center justify-center h-full gap-0.5 transition-colors touch-manipulation active:scale-95 cursor-pointer",
            isMobileOpen ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Toggle all pages menu"
        >
          <Menu className="h-4.5 w-4.5" />
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
}

