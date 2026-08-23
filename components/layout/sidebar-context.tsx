"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Read saved preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sms-sidebar-open");
      if (saved !== null) {
        setIsOpen(saved === "true");
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

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        setIsOpen: handleSetIsOpen,
        toggleSidebar,
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
