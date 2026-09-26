import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingStudentsClient } from "@/components/students/pending-students-client";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { dbSearchStudents, maskAadhaar } from "@/lib/supabase/db-students";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import type { Student } from "@/lib/types";

export const dynamic = "force-dynamic";

function applyAadhaarMasking(students: Student[], role: string): Student[] {
  if (role === "Admin") return students;
  return students.map((s) => ({
    ...s,
    aadhaar: s.aadhaar ? maskAadhaar(s.aadhaar) : undefined,
  }));
}

export default async function PendingStudentsPage() {
  const queryClient = new QueryClient();
  const auth = await getAuthenticatedUserRole();

  if (auth.role !== "Guest") {
    await queryClient.prefetchQuery({
      queryKey: [
        "pending-students",
        {
          studentType: "pending",
          class: undefined,
          section: undefined,
          semester: undefined,
          status: undefined,
          query: undefined,
        },
        1,
      ],
      queryFn: async () => {
        const result = await dbSearchStudents(
          { studentType: "pending" },
          1,
          50,
          auth.role,
          "summary"
        );
        result.data = applyAadhaarMasking(result.data, auth.role);
        return result;
      },
    });
  }

  return (
    <Suspense fallback={<PendingStudentsSkeleton />}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PendingStudentsClient />
      </HydrationBoundary>
    </Suspense>
  );
}

function PendingStudentsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-7 w-56" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
