import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmployeeEditForm } from "@/app/(dashboard)/employees/[id]/edit/employee-edit-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Edit My Profile | SMS",
  description: "Comprehensive institutional form for editing your faculty / staff profile.",
};

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const adminClient = createAdminClient();

  // 1. Fetch user role to find staff_id
  const { data: roleRow } = await adminClient
    .from("user_roles")
    .select("role, staff_id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  let staff = null;

  // Primary: match by assigned staff_id in user_roles
  if (roleRow?.staff_id) {
    const { data: staffData } = await adminClient
      .from("staff_profiles")
      .select("*")
      .eq("id", roleRow.staff_id)
      .maybeSingle();
    staff = staffData;
  }

  // Fallback: match by email or user_id
  if (!staff && user.email) {
    const { data: staffByEmail } = await adminClient
      .from("staff_profiles")
      .select("*")
      .or(`email.ilike.${user.email},user_id.eq.${user.id}`)
      .maybeSingle();
    staff = staffByEmail;
  }

  // If still no staff record exists (e.g. brand new Admin), create one seamlessly
  if (!staff) {
    const cleanIdSuffix = user.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "1001";
    const adminUniqueId = `ADM${cleanIdSuffix}`;
    const adminName = roleRow?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Administrator";
    const isAdmin = roleRow?.role === "Admin";

    const { data: newStaff } = await adminClient
      .from("staff_profiles")
      .insert({
        user_id: user.id,
        unique_id: adminUniqueId,
        full_name: adminName,
        designation: isAdmin ? "Headmaster / Administrator" : "Staff Member",
        employee_type: "TEACHING",
        status: "ACTIVE",
        email: user.email,
        caste: "General",
        service_type: "Permanent",
        primary_meta: {
          academic_section: "Higher Secondary",
          appointed_subject: "Administration",
          approval_qualification: "Post Graduate",
          employee_group: "Group A",
        },
        professional_meta: {
          professional_qualification: "Post Graduate / B.Ed",
          post_status: "Sanctioned Post",
          subject_1: "Administration",
        },
        bank_details: {
          bank_name: "State Bank of India",
        },
      })
      .select()
      .maybeSingle();

    if (newStaff) {
      staff = newStaff;
      if (roleRow) {
        await adminClient
          .from("user_roles")
          .update({ staff_id: newStaff.id })
          .eq("user_id", user.id);
      }
    }
  }

  if (!staff) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-3 border-b border-border/80 pb-4">
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "rounded-xl h-9 w-9 bg-card hover:bg-muted shadow-2xs border-border flex items-center justify-center"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Profile Not Linked
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              No faculty / staff institutional record found for this account.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col items-center text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            No Staff Record Associated
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            This account is not currently linked to an active faculty/staff profile. If you are an administrator, you can manage staff profiles from the Employees directory.
          </p>
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ size: "sm" }),
              "rounded-xl h-9 px-4 text-xs font-semibold bg-primary text-primary-foreground"
            )}
          >
            Return to My Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EmployeeEditForm
      staff={staff}
      returnUrl="/profile"
      title="Edit My Profile"
      subtitle={`Updating institutional profile for: ${staff.full_name} (${staff.unique_id})`}
    />
  );
}
