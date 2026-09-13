"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Briefcase,
  User,
  MapPin,
  GraduationCap,
  Building2,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";
import {
  ClassMultiSelectDropdown,
  STANDARD_SCHOOL_SUBJECTS,
} from "@/components/employees/class-multi-select-dropdown";
import { SubjectMultiSelect } from "@/components/employees/subject-multi-select";

interface EmployeeEditFormProps {
  staff: any;
}

export function EmployeeEditForm({ staff }: EmployeeEditFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    // Primary / Employment
    full_name: staff.full_name || "",
    unique_id: staff.unique_id || "",
    employee_type: staff.employee_type || "TEACHING",
    designation: staff.designation || "",
    status: staff.status || "ACTIVE",
    caste: staff.caste || "General",
    basic_pay: staff.basic_pay !== null && staff.basic_pay !== undefined ? String(staff.basic_pay) : "",
    joining_date: staff.joining_date || "",
    dob: staff.dob || "",
    academic_section: staff.primary_meta?.academic_section || "Secondary",

    // Teaching Assignments & Professional
    teaching_subjects: (() => {
      if (
        Array.isArray(staff.professional_meta?.teaching_subjects) &&
        staff.professional_meta.teaching_subjects.length > 0
      ) {
        return staff.professional_meta.teaching_subjects;
      }
      const list: string[] = [];
      const primarySub =
        staff.professional_meta?.subject_1 || staff.primary_meta?.appointed_subject;
      if (primarySub) list.push(primarySub);
      if (staff.professional_meta?.additional_subjects) {
        const adds = String(staff.professional_meta.additional_subjects)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
        adds.forEach((a: string) => {
          if (!list.includes(a)) list.push(a);
        });
      }
      return list;
    })(),
    assigned_classes: Array.isArray(staff.professional_meta?.assigned_classes)
      ? staff.professional_meta.assigned_classes
      : Array.isArray(staff.primary_meta?.assigned_classes)
      ? staff.primary_meta.assigned_classes
      : [],
    service_type: staff.service_type || "Permanent",
    appointment_memo: staff.appointment_memo || "",
    professional_qualification: staff.professional_meta?.professional_qualification || "B.Ed / D.El.Ed",
    post_status: staff.professional_meta?.post_status || "Sanctioned Post",

    // Personal & Family
    father_name: staff.father_name || "",
    mother_name: staff.mother_name || "",
    gender: staff.gender || "Male",
    marital_status: staff.marital_status || "Married",
    blood_group: staff.blood_group || "O+",
    aadhaar_no: staff.aadhaar_no || "",
    pan_no: staff.pan_no || "",
    differently_abled: staff.differently_abled || false,
    health_scheme_opted: staff.personal_meta?.health_scheme_opted || "Swasthya Sathi / WBHS",

    // Contact & Address
    mobile: staff.mobile || "",
    email: staff.email || "",
    landline: staff.landline || "",
    present_village: staff.present_address?.village || staff.present_address?.town_village || "",
    present_district: staff.present_address?.district || "South 24 Parganas",
    present_pincode: staff.present_address?.pin_code || "700001",

    // Bank Details
    bank_name: staff.bank_details?.bank_name || "State Bank of India",
    bank_branch: staff.bank_details?.bank_branch || "",
    account_no: staff.bank_details?.account_no || "",
    ifsc_code: staff.bank_details?.ifsc_code || "",
    micr_no: staff.bank_details?.micr_no || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      showToast({
        type: "error",
        title: "Validation Error",
        description: "Employee full name is required.",
      });
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        full_name: formData.full_name.trim(),
        unique_id: formData.unique_id.trim(),
        employee_type: formData.employee_type,
        designation: formData.designation.trim(),
        status: formData.status,
        caste: formData.caste,
        basic_pay: formData.basic_pay ? Number(formData.basic_pay) : null,
        joining_date: formData.joining_date || null,
        dob: formData.dob || null,

        // Primary meta
        primary_meta: {
          ...(staff.primary_meta || {}),
          appointed_subject: formData.teaching_subjects[0] || "",
          academic_section: formData.academic_section,
          assigned_classes: formData.assigned_classes,
          teaching_subjects: formData.teaching_subjects,
        },

        // Professional meta & appointment
        service_type: formData.service_type,
        appointment_memo: formData.appointment_memo.trim(),
        professional_meta: {
          ...(staff.professional_meta || {}),
          professional_qualification: formData.professional_qualification.trim(),
          post_status: formData.post_status.trim(),
          subject_1: formData.teaching_subjects[0] || "",
          additional_subjects: formData.teaching_subjects.slice(1).join(", "),
          teaching_subjects: formData.teaching_subjects,
          assigned_classes: formData.assigned_classes,
        },

        // Personal details
        father_name: formData.father_name.trim(),
        mother_name: formData.mother_name.trim(),
        gender: formData.gender,
        marital_status: formData.marital_status,
        blood_group: formData.blood_group,
        aadhaar_no: formData.aadhaar_no.trim(),
        pan_no: formData.pan_no.trim(),
        differently_abled: Boolean(formData.differently_abled),
        personal_meta: {
          ...(staff.personal_meta || {}),
          health_scheme_opted: formData.health_scheme_opted,
        },

        // Contact & Address
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        landline: formData.landline.trim(),
        present_address: {
          ...(staff.present_address || {}),
          village: formData.present_village.trim(),
          district: formData.present_district.trim(),
          pin_code: formData.present_pincode.trim(),
        },

        // Bank details
        bank_details: {
          ...(staff.bank_details || {}),
          bank_name: formData.bank_name.trim(),
          bank_branch: formData.bank_branch.trim(),
          account_no: formData.account_no.trim(),
          ifsc_code: formData.ifsc_code.trim(),
          micr_no: formData.micr_no.trim(),
        },
      };

      const res = await fetch(`/api/employees/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update employee profile");
      }

      showToast({
        type: "success",
        title: "Profile Updated",
        description: "Employee details have been saved to the database.",
      });

      router.push(`/employees/${staff.id}`);
      router.refresh();
    } catch (err: any) {
      console.error("Employee update error:", err);
      showToast({
        type: "error",
        title: "Update Failed",
        description: err.message || "Failed to save profile changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/employees/${staff.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "rounded-xl h-9 w-9 bg-card hover:bg-muted shadow-2xs border-border flex items-center justify-center"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Edit Employee Profile
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Updating institutional records for:{" "}
              <span className="font-bold text-foreground">{staff.full_name}</span>{" "}
              <span className="font-mono text-xs opacity-75">({staff.unique_id})</span>
            </p>
          </div>
        </div>

        {/* Quick Action in Header */}
        <div className="flex items-center gap-2">
          <Link
            href={`/employees/${staff.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "rounded-xl h-9 text-xs font-semibold flex items-center justify-center"
            )}
          >
            Cancel
          </Link>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-xl h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION A: Institutional & Primary Details */}
        <FormSection
          title="A. Institutional & Primary Details"
          icon={<Briefcase className="h-4 w-4 text-primary" />}
        >
          <FormGrid>
            <FormField label="Full Name *">
              <input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="Employee Full Name"
              />
            </FormField>

            <FormField label="Employee ID (Unique ID) *">
              <input
                value={formData.unique_id}
                onChange={(e) => setFormData({ ...formData, unique_id: e.target.value })}
                required
                placeholder="e.g. JZCL2654 / 557253"
                className="font-mono font-semibold"
              />
            </FormField>

            <FormField label="Role / Employee Type">
              <select
                value={formData.employee_type}
                onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
              >
                <option value="TEACHING">Teaching Staff</option>
                <option value="NON_TEACHING">Non-Teaching Staff</option>
              </select>
            </FormField>

            <FormField label="Designation">
              <input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="TIC, AT, Para Teacher, Group D..."
              />
            </FormField>

            <FormField label="Employment Status">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RETIRED">Retired</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </FormField>

            <FormField label="Caste Category">
              <select
                value={formData.caste}
                onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
              >
                <option value="General">General</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="OBC-A">OBC-A</option>
                <option value="OBC-B">OBC-B</option>
              </select>
            </FormField>

            <FormField label="Basic Pay (₹)">
              <input
                type="number"
                value={formData.basic_pay}
                onChange={(e) => setFormData({ ...formData, basic_pay: e.target.value })}
                placeholder="e.g. 45000"
                className="font-mono"
              />
            </FormField>

            <FormField label="Joining Date">
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              />
            </FormField>

            <FormField label="Date of Birth (DOB)">
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              />
            </FormField>

            <FormField label="Academic Section">
              <input
                value={formData.academic_section}
                onChange={(e) => setFormData({ ...formData, academic_section: e.target.value })}
                placeholder="Secondary / Higher Secondary..."
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* SECTION B: Service Records & Teaching Assignments */}
        <FormSection
          title="B. Service Records & Teaching Assignments"
          icon={<Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
        >
          {/* Top Grid: Service & Appointment Info */}
          <FormGrid>
            <FormField label="Service Type">
              <input
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                placeholder="Permanent / Contractual / Probation"
              />
            </FormField>

            <FormField label="Appointment Memo No.">
              <input
                value={formData.appointment_memo}
                onChange={(e) => setFormData({ ...formData, appointment_memo: e.target.value })}
                placeholder="Memo Number"
                className="font-mono"
              />
            </FormField>

            <FormField label="Professional Qualification">
              <input
                value={formData.professional_qualification}
                onChange={(e) =>
                  setFormData({ ...formData, professional_qualification: e.target.value })
                }
                placeholder="B.Ed / D.El.Ed / M.Ed"
              />
            </FormField>

            <FormField label="Post Status">
              <input
                value={formData.post_status}
                onChange={(e) => setFormData({ ...formData, post_status: e.target.value })}
                placeholder="Sanctioned Post / Temporary"
              />
            </FormField>
          </FormGrid>

          {/* Bottom Sub-sections: Teaching Subjects & Classes */}
          <div className="pt-4 border-t border-border/70 space-y-5">
            {/* 1. Teaching Subjects with Add Button */}
            <SubjectMultiSelect
              subjects={formData.teaching_subjects}
              onChange={(newSubs) => setFormData({ ...formData, teaching_subjects: newSubs })}
              label="Teaching Subjects"
            />

            {/* 2. Assigned Classes Multi-Select Dropdown */}
            <div className="pt-3 border-t border-border/50">
              <ClassMultiSelectDropdown
                selectedClasses={formData.assigned_classes}
                onChange={(classes) => setFormData({ ...formData, assigned_classes: classes })}
                label="Assigned Classes"
                placeholder="Select classes taught (Class V to XII)..."
              />
            </div>
          </div>
        </FormSection>

        {/* SECTION C: Personal & Family Information */}
        <FormSection
          title="C. Personal & Identification Details"
          icon={<User className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
        >
          <FormGrid>
            <FormField label="Father's Name">
              <input
                value={formData.father_name}
                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                placeholder="Father's Name"
              />
            </FormField>

            <FormField label="Mother's Name">
              <input
                value={formData.mother_name}
                onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                placeholder="Mother's Name"
              />
            </FormField>

            <FormField label="Gender">
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>

            <FormField label="Marital Status">
              <select
                value={formData.marital_status}
                onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
              >
                <option value="Married">Married</option>
                <option value="Unmarried">Unmarried</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </FormField>

            <FormField label="Blood Group">
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </FormField>

            <FormField label="Aadhaar Number (12 digits)">
              <input
                value={formData.aadhaar_no}
                onChange={(e) => setFormData({ ...formData, aadhaar_no: e.target.value })}
                placeholder="•••• •••• ••••"
                maxLength={14}
                className="font-mono"
              />
            </FormField>

            <FormField label="PAN Number">
              <input
                value={formData.pan_no}
                onChange={(e) => setFormData({ ...formData, pan_no: e.target.value })}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="font-mono uppercase"
              />
            </FormField>

            <FormField label="Differently Abled">
              <select
                value={formData.differently_abled ? "YES" : "NO"}
                onChange={(e) =>
                  setFormData({ ...formData, differently_abled: e.target.value === "YES" })
                }
              >
                <option value="NO">No</option>
                <option value="YES">Yes</option>
              </select>
            </FormField>

            <FormField label="Health Scheme Opted">
              <input
                value={formData.health_scheme_opted}
                onChange={(e) => setFormData({ ...formData, health_scheme_opted: e.target.value })}
                placeholder="Swasthya Sathi / WBHS / None"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* SECTION D: Contact & Address Information */}
        <FormSection
          title="D. Contact & Residential Address"
          icon={<MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
        >
          <FormGrid>
            <FormField label="Primary Mobile Contact *">
              <input
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="10-digit mobile number"
                className="font-mono font-semibold"
              />
            </FormField>

            <FormField label="Email Address">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="employee@school.edu"
              />
            </FormField>

            <FormField label="Landline Number">
              <input
                value={formData.landline}
                onChange={(e) => setFormData({ ...formData, landline: e.target.value })}
                placeholder="Landline / Alt Contact"
                className="font-mono"
              />
            </FormField>

            <FormField label="Village / Town / Street">
              <input
                value={formData.present_village}
                onChange={(e) => setFormData({ ...formData, present_village: e.target.value })}
                placeholder="Village / Area name"
              />
            </FormField>

            <FormField label="District">
              <input
                value={formData.present_district}
                onChange={(e) => setFormData({ ...formData, present_district: e.target.value })}
                placeholder="South 24 Parganas / Kolkata"
              />
            </FormField>

            <FormField label="PIN Code (6 digits)">
              <input
                value={formData.present_pincode}
                onChange={(e) => setFormData({ ...formData, present_pincode: e.target.value })}
                placeholder="e.g. 743372"
                maxLength={6}
                className="font-mono"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* SECTION E: Bank Account Information */}
        <FormSection
          title="E. Bank Account Details"
          icon={<Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        >
          <FormGrid>
            <FormField label="Bank Name">
              <input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="State Bank of India / PNB..."
              />
            </FormField>

            <FormField label="Branch Name">
              <input
                value={formData.bank_branch}
                onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                placeholder="Branch name"
              />
            </FormField>

            <FormField label="Account Number">
              <input
                value={formData.account_no}
                onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                placeholder="Account Number"
                className="font-mono font-semibold"
              />
            </FormField>

            <FormField label="IFSC Code">
              <input
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                placeholder="SBIN0001234"
                className="font-mono uppercase font-semibold"
              />
            </FormField>

            <FormField label="MICR Number">
              <input
                value={formData.micr_no}
                onChange={(e) => setFormData({ ...formData, micr_no: e.target.value })}
                placeholder="MICR Number"
                className="font-mono"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* 3. Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80 sticky bottom-4 bg-background/95 backdrop-blur-md p-4 rounded-2xl border shadow-lg">
          <Link
            href={`/employees/${staff.id}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-xl h-10 px-5 text-sm font-semibold flex items-center justify-center"
            )}
          >
            Cancel
          </Link>

          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl h-10 px-6 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Employee Details
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Shared Clean Form Layout Helpers (Identical UX to Student Edit) ──────────

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        {icon}
        <p className="text-sm sm:text-base font-bold text-foreground tracking-tight">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

function FormField({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2 md:col-span-3" : ""}>
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
      </label>
      <div
        className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-input [&>input]:bg-background [&>input]:px-3.5 [&>input]:py-2 [&>input]:text-xs sm:[&>input]:text-sm [&>input]:h-10 [&>input]:outline-none [&>input]:focus:ring-2 [&>input]:focus:ring-primary/20 [&>input]:transition-all
          [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-input [&>select]:bg-background [&>select]:px-3.5 [&>select]:py-2 [&>select]:text-xs sm:[&>select]:text-sm [&>select]:h-10 [&>select]:outline-none [&>select]:focus:ring-2 [&>select]:focus:ring-primary/20 [&>select]:transition-all
          [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-input [&>textarea]:bg-background [&>textarea]:px-3.5 [&>textarea]:py-2 [&>textarea]:text-xs sm:[&>textarea]:text-sm [&>textarea]:outline-none [&>textarea]:focus:ring-2 [&>textarea]:focus:ring-primary/20 [&>textarea]:resize-none"
      >
        {children}
      </div>
    </div>
  );
}
