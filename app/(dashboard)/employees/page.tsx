import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeesClient from "./employees-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaffProfile } from "@/components/employees/staff-table";

export const metadata: Metadata = {
  title: "Employee Registered | SMS",
  description: "Manage teaching and non-teaching faculty and staff profiles.",
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const awaitedParams = await searchParams;
  const typeFilter = awaitedParams.type;
  const supabase = await createClient();

  // Fetch staff records from Supabase
  const { data: staff, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching staff profiles:", error);
  }

  return (
    <Suspense fallback={<EmployeesPageSkeleton />}>
      <EmployeesClient
        initialStaff={(staff as StaffProfile[]) || []}
        initialType={typeFilter}
      />
    </Suspense>
  );
}

function EmployeesPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-8 w-60 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
