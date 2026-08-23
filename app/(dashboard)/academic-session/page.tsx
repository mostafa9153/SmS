import { Suspense } from "react";
import AcademicSessionClient from "./academic-session-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AcademicSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <AcademicSessionClient />
    </Suspense>
  );
}
