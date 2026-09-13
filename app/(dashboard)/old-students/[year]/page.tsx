import { Suspense } from "react";
import OldStudentsClient from "@/components/students/old-students-client";
import { Skeleton } from "@/components/ui/skeleton";

interface OldStudentsYearPageProps {
  params: Promise<{
    year: string;
  }>;
}

export default async function OldStudentsYearPage({ params }: OldStudentsYearPageProps) {
  const resolvedParams = await params;
  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(resolvedParams.year, 10) || currentYear - 1;

  return (
    <Suspense fallback={<OldStudentsSkeleton />}>
      <OldStudentsClient selectedYear={yearNum} />
    </Suspense>
  );
}

function OldStudentsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-7 w-60" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
