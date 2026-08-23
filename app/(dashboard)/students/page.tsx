import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import StudentsClient from "./students-client";

export default function StudentsPage() {
  return (
    <Suspense fallback={<StudentsPageSkeleton />}>
      <StudentsClient />
    </Suspense>
  );
}

function StudentsPageSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-7 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
