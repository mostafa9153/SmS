"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export const DEFAULT_SIDEBAR_WIDTH = 228; // Slightly narrower than default 256px
export const MIN_SIDEBAR_WIDTH = 190;
export const MAX_SIDEBAR_WIDTH = 360;

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  width: number;
  setWidth: (width: number) => void;
  resetWidth: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [width, setWidthState] = useState<number>(DEFAULT_SIDEBAR_WIDTH);

  // Read saved preferences from localStorage
  useEffect(() => {
    try {
      const savedOpen = localStorage.getItem("sms-sidebar-open");
      if (savedOpen !== null) {
        setIsOpen(savedOpen === "true");
      }
      const savedWidth = localStorage.getItem("sms-sidebar-width");
      if (savedWidth !== null) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          setWidthState(parsed);
        }
      }
    } catch {
      // ignore SSR or storage errors
    }
  }, []);

  const toggleSidebar = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sms-sidebar-open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSetIsOpen = (open: boolean) => {
    setIsOpen(open);
    try {
      localStorage.setItem("sms-sidebar-open", String(open));
    } catch {
      // ignore
    }
  };

  const handleSetWidth = (newWidth: number) => {
    const clamped = Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
    setWidthState(clamped);
    try {
      localStorage.setItem("sms-sidebar-width", String(clamped));
    } catch {
      // ignore
    }
  };

  const handleResetWidth = () => {
    setWidthState(DEFAULT_SIDEBAR_WIDTH);
    try {
      localStorage.setItem("sms-sidebar-width", String(DEFAULT_SIDEBAR_WIDTH));
    } catch {
      // ignore
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        setIsOpen: handleSetIsOpen,
        toggleSidebar,
        width,
        setWidth: handleSetWidth,
        resetWidth: handleResetWidth,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
