"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isOpen, width, setWidth, resetWidth } = useSidebar();
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      setWidth(e.clientX);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setWidth]);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30 print:h-auto print:overflow-visible print:bg-white">
      {/* Desktop resizable sidebar container */}
      <div
        style={{ width: isOpen ? `${width}px` : "0px" }}
        className={cn(
          "hidden md:flex flex-shrink-0 relative overflow-hidden bg-background print:hidden",
          isResizing ? "transition-none select-none" : "transition-[width,opacity] duration-300 ease-in-out",
          isOpen ? "opacity-100 border-r" : "border-r-0 opacity-0"
        )}
      >
        <div className="w-full h-full">
          <Suspense fallback={<div className="w-full h-full bg-sidebar/95" />}>
            <Sidebar />
          </Suspense>
        </div>

        {/* Vertical Drag / Resize Handle on right edge */}
        {isOpen && (
          <div
            onMouseDown={startResizing}
            onDoubleClick={resetWidth}
            title="Drag to resize menu • Double-click to reset"
            className={cn(
              "absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-40 group flex items-center justify-center",
              isResizing && "bg-primary/40 w-2"
            )}
          >
            {/* Visual affordance grab indicator */}
            <div className="w-0.5 h-8 rounded-full bg-muted-foreground/20 group-hover:bg-primary group-hover:h-12 transition-all" />
          </div>
        )}
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
