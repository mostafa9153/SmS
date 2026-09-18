import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeEditForm } from "./employee-edit-form";

export const metadata: Metadata = {
  title: "Edit Employee Profile | SMS",
  description: "Comprehensive institutional form for editing staff profiles.",
};

export default async function EmployeeEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnUrl?: string }>;
}) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const { data: staff, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !staff) {
    console.error("Error fetching staff for edit:", error);
    notFound();
  }

  return <EmployeeEditForm staff={staff} returnUrl={sParams.returnUrl} />;
}
