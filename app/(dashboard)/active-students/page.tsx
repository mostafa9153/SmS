import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import StudentsClient from "../students/students-client";

export default function ActiveStudentsPage() {
  return (
    <Suspense fallback={<ActiveStudentsSkeleton />}>
      <StudentsClient mode="active" />
    </Suspense>
  );
}

function ActiveStudentsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-7 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
