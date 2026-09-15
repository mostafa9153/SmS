import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import StudentsClient from "../students/students-client";
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { dbSearchStudents, maskAadhaar } from "@/lib/supabase/db-students";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import type { Student } from "@/lib/types";

function applyAadhaarMasking(students: Student[], role: string): Student[] {
  if (role === "Admin") return students;
  return students.map((s) => ({
    ...s,
    aadhaar: s.aadhaar ? maskAadhaar(s.aadhaar) : undefined,
  }));
}

export default async function ActiveStudentsPage() {
  const queryClient = new QueryClient();
  const auth = await getAuthenticatedUserRole();

  if (auth.role !== "Guest") {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ["students-infinite", { query: undefined, studentType: "active" }],
      queryFn: async () => {
        const result = await dbSearchStudents(
          { studentType: "active" },
          1,
          20,
          auth.role,
          "summary"
        );
        result.data = applyAadhaarMasking(result.data, auth.role);
        return result;
      },
      initialPageParam: 1,
    });
  }

  return (
    <Suspense fallback={<ActiveStudentsSkeleton />}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <StudentsClient mode="active" />
      </HydrationBoundary>
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
