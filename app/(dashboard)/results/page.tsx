import { Suspense } from "react";
import ResultsClient from "./results-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import { teacherPermissions } from "@/lib/api/guard";

// Per-user: a Teacher sees only their allowed classes.
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const auth = await getAuthenticatedUserRole();
  const allowedClasses = auth.role === "Teacher" ? teacherPermissions(auth).allowed_classes ?? [] : [];
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <ResultsClient allowedClasses={allowedClasses} />
    </Suspense>
  );
}

function ResultsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
