"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

export default function TeacherProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-foreground">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-xs font-semibold text-muted-foreground">Redirecting to Profile...</p>
      </div>
    </div>
  );
}

