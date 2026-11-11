"use client";

import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useAccess } from "@/lib/hooks/use-access";
import { canAccessPath } from "@/lib/navigation/route-access";

/** Blocks pages a Teacher has no permission for (the API already refuses the data). */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const access = useAccess();

  // The proxy sends a Teacher here with ?denied=1 when a page is outside their permissions
  useEffect(() => {
    if (pathname !== "/teacher" || !new URLSearchParams(window.location.search).has("denied")) return;
    toast.error("No permission for that page");
    window.history.replaceState(null, "", "/teacher");
  }, [pathname]);

  if (access.role === "Teacher" && !canAccessPath(pathname, access)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-bold">No permission for this page</p>
        <Link href="/teacher" className="text-sm font-semibold text-primary hover:underline">
          Back to Workspace
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
