import { Suspense } from "react";
import { SettingsClient } from "./settings-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      }
    >
      <SettingsClient />
    </Suspense>
  );
}
