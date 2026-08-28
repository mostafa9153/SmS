"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30 print:h-auto print:overflow-visible print:bg-white">
      {/* Desktop sidebar with smooth collapse/expand animation */}
      <div
        className={cn(
          "hidden md:flex flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden border-r bg-background print:hidden",
          isOpen ? "w-64 opacity-100" : "w-0 border-r-0 opacity-0"
        )}
      >
        <div className="w-64 h-full">
          <Suspense fallback={<div className="w-64 h-full bg-sidebar/95" />}>
            <Sidebar />
          </Suspense>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 print:overflow-visible print:h-auto">
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto min-w-0 custom-scrollbar animate-fade-in-up print:overflow-visible print:h-auto print:p-0 print:m-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
