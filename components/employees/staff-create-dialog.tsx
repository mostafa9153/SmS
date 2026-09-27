"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showToast } from "@/components/ui/toast-banner";
import { Loader2, UserPlus, Briefcase, User, MapPin, GraduationCap, Sparkles, BookOpen } from "lucide-react";
import { ClassMultiSelectDropdown } from "@/components/employees/class-multi-select-dropdown";
import { SubjectMultiSelect } from "@/components/employees/subject-multi-select";

interface StaffCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: string;
  onStaffCreated: (newStaff: any) => void;
}

export function StaffCreateDialog({
  open,
  onOpenChange,
  defaultType,
  onStaffCreated,
}: StaffCreateDialogProps) {
  const getInitialType = () => {
    if (defaultType === "non-teaching") return "NON_TEACHING";
    return "TEACHING";
  };

  const [formData, setFormData] = useState({
    // Primary
    full_name: "",
    unique_id: "",
    employee_type: getInitialType(),
    designation: getInitialType() === "NON_TEACHING" ? "Clerk" : "Assistant Teacher",
    status: "ACTIVE",
    caste: "General",
    basic_pay: "",
    joining_date: new Date().toISOString().split("T")[0],
    appointed_subject: "",
    academic_section: "Secondary",

    // Bank
    bank_name: "State Bank of India",
    bank_branch: "",
    account_no: "",
    ifsc_code: "",
    micr_no: "",

    // Personal
    father_name: "",
    mother_name: "",
    gender: "Male",
    marital_status: "Married",
    blood_group: "O+",
    aadhaar_no: "",
    pan_no: "",
    differently_abled: false,
    health_scheme_opted: "Swasthya Sathi / WBHS",

    // Contact
    mobile: "",
    email: "",
    landline: "",
    dob: "",
    present_village: "",
    present_district: "South 24 Parganas",
    present_pincode: "700001",
    permanent_village: "",
    permanent_district: "South 24 Parganas",
    permanent_pincode: "700001",

    // Professional
    service_type: "Permanent",
    appointment_memo: "",
    professional_qualification: "B.Ed / D.El.Ed",
    post_status: "Sanctioned Post",
    teaching_subjects: [] as string[],
    assigned_classes: [] as string[],
  });

  const [isSaving, setIsSaving] = useState(false);

  // Generate ID helper
  const handleGenerateId = () => {
    const prefix = formData.employee_type === "NON_TEACHING" ? "NT" : "TCH";
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, unique_id: `${prefix}-${rand}` }));
  };

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
        unique_id: formData.unique_id.trim() || undefined,
        employee_type: formData.employee_type,
        designation: formData.designation.trim(),
        status: formData.status,
        caste: formData.caste,
        basic_pay: formData.basic_pay ? Number(formData.basic_pay) : null,
        joining_date: formData.joining_date || null,
        dob: formData.dob || null,

        primary_meta: {
          appointed_subject: formData.teaching_subjects[0] || formData.appointed_subject || "",
          academic_section: formData.academic_section,
          assigned_classes: formData.assigned_classes,
          teaching_subjects: formData.teaching_subjects,
        },

        bank_details: {
          bank_name: formData.bank_name.trim(),
          bank_branch: formData.bank_branch.trim(),
          account_no: formData.account_no.trim(),
          ifsc_code: formData.ifsc_code.trim(),
          micr_no: formData.micr_no.trim(),
        },

        father_name: formData.father_name.trim(),
        mother_name: formData.mother_name.trim(),
        gender: formData.gender,
        marital_status: formData.marital_status,
        blood_group: formData.blood_group,
        aadhaar_no: formData.aadhaar_no.trim(),
        pan_no: formData.pan_no.trim(),
        differently_abled: formData.differently_abled,

        personal_meta: {
          health_scheme_opted: formData.health_scheme_opted,
        },

        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        landline: formData.landline.trim(),

        present_address: {
          village: formData.present_village.trim(),
          district: formData.present_district.trim(),
          pin_code: formData.present_pincode.trim(),
        },

        permanent_address: {
          village: formData.permanent_village.trim(),
          district: formData.permanent_district.trim(),
          pin_code: formData.permanent_pincode.trim(),
        },

        service_type: formData.service_type,
        appointment_memo: formData.appointment_memo.trim(),

        professional_meta: {
          professional_qualification: formData.professional_qualification.trim(),
          post_status: formData.post_status.trim(),
          subject_1: formData.teaching_subjects[0] || "",
          additional_subjects: formData.teaching_subjects.slice(1).join(", "),
          teaching_subjects: formData.teaching_subjects,
          assigned_classes: formData.assigned_classes,
        },
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register employee");
      }

      showToast({
        type: "success",
        title: "Employee Registered",
        description: `${formData.full_name} has been added successfully.`,
      });

      onStaffCreated(data.staff);
      onOpenChange(false);
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Registration Failed",
        description: err.message || "Failed to register new employee.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Employee
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <Tabs defaultValue="primary" className="space-y-4">
            <TabsList className="bg-muted/80 p-1 rounded-xl border flex flex-wrap h-auto gap-1">
              <TabsTrigger value="primary" className="text-xs font-semibold rounded-lg">
                <Briefcase className="h-3.5 w-3.5 mr-1 text-primary" /> Primary
              </TabsTrigger>
              <TabsTrigger value="personal" className="text-xs font-semibold rounded-lg">
                <User className="h-3.5 w-3.5 mr-1 text-blue-600" /> Personal
              </TabsTrigger>
              <TabsTrigger value="contact" className="text-xs font-semibold rounded-lg">
                <MapPin className="h-3.5 w-3.5 mr-1 text-rose-600" /> Contact
              </TabsTrigger>
              <TabsTrigger value="professional" className="text-xs font-semibold rounded-lg">
                <GraduationCap className="h-3.5 w-3.5 mr-1 text-amber-600" /> Professional
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Primary Details */}
            <TabsContent value="primary" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">Full Name *</Label>
                  <Input
                    placeholder="Enter full name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Employee ID (Unique ID)</Label>
                    <button
                      type="button"
                      onClick={handleGenerateId}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" /> Auto
                    </button>
                  </div>
                  <Input
                    placeholder="e.g. TCH-1024 (optional)"
                    value={formData.unique_id}
                    onChange={(e) => setFormData({ ...formData, unique_id: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Role / Employee Type</Label>
                  <select
                    value={formData.employee_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employee_type: e.target.value,
                        designation:
                          e.target.value === "NON_TEACHING" ? "Clerk" : "Assistant Teacher",
                      })
                    }
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                  >
                    <option value="TEACHING">Teaching Staff</option>
                    <option value="NON_TEACHING">Non-Teaching Staff</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Designation</Label>
                  <Input
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="Assistant Teacher, Headmaster, Clerk..."
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Status</Label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="RETIRED">Retired</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Caste Category</Label>
                  <select
                    value={formData.caste}
                    onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                  >
                    <option value="General">General</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="OBC-A">OBC-A</option>
                    <option value="OBC-B">OBC-B</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Basic Pay (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Basic pay amount"
                    value={formData.basic_pay}
                    onChange={(e) => setFormData({ ...formData, basic_pay: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Joining Date</Label>
                  <Input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Academic Section</Label>
                  <Input
                    value={formData.academic_section}
                    onChange={(e) => setFormData({ ...formData, academic_section: e.target.value })}
                    placeholder="e.g. Primary, Secondary, Higher Secondary"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Bank Details
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Bank Name</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Branch</Label>
                  <Input
                    value={formData.bank_branch}
                    onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                    placeholder="Branch name"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Account Number</Label>
                  <Input
                    value={formData.account_no}
                    onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                    placeholder="Account number"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">IFSC Code</Label>
                  <Input
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                    placeholder="IFSC code"
                    className="h-9 text-xs rounded-xl font-mono uppercase"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Personal Details */}
            <TabsContent value="personal" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Father&apos;s Name</Label>
                  <Input
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Mother&apos;s Name</Label>
                  <Input
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Gender</Label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Marital Status</Label>
                  <select
                    value={formData.marital_status}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                  >
                    <option value="Married">Married</option>
                    <option value="Unmarried">Unmarried</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Blood Group</Label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-mono"
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
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Date of Birth (DOB)</Label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Aadhaar Number</Label>
                  <Input
                    value={formData.aadhaar_no}
                    onChange={(e) => setFormData({ ...formData, aadhaar_no: e.target.value })}
                    placeholder="12-digit Aadhaar"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">PAN Number</Label>
                  <Input
                    value={formData.pan_no}
                    onChange={(e) => setFormData({ ...formData, pan_no: e.target.value })}
                    placeholder="10-digit PAN"
                    className="h-9 text-xs rounded-xl font-mono uppercase"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">Health Scheme</Label>
                  <Input
                    value={formData.health_scheme_opted}
                    onChange={(e) => setFormData({ ...formData, health_scheme_opted: e.target.value })}
                    placeholder="Swasthya Sathi / WBHS"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Contact Details */}
            <TabsContent value="contact" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Mobile Contact</Label>
                  <Input
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="10-digit mobile"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@school.edu"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">Landline</Label>
                  <Input
                    value={formData.landline}
                    onChange={(e) => setFormData({ ...formData, landline: e.target.value })}
                    placeholder="Optional landline"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                {/* Present Address */}
                <div className="sm:col-span-2 pt-2 border-t border-border/60">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Present Address
                  </span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Village / Town / Street</Label>
                  <Input
                    value={formData.present_village}
                    onChange={(e) => setFormData({ ...formData, present_village: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">District</Label>
                  <Input
                    value={formData.present_district}
                    onChange={(e) => setFormData({ ...formData, present_district: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">PIN Code</Label>
                  <Input
                    value={formData.present_pincode}
                    onChange={(e) => setFormData({ ...formData, present_pincode: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>

                {/* Permanent Address */}
                <div className="sm:col-span-2 pt-2 border-t border-border/60">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500" /> Permanent Address
                  </span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Village / Town / Street</Label>
                  <Input
                    value={formData.permanent_village}
                    onChange={(e) => setFormData({ ...formData, permanent_village: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">District</Label>
                  <Input
                    value={formData.permanent_district}
                    onChange={(e) => setFormData({ ...formData, permanent_district: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">PIN Code</Label>
                  <Input
                    value={formData.permanent_pincode}
                    onChange={(e) => setFormData({ ...formData, permanent_pincode: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Professional Details */}
            <TabsContent value="professional" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Service Type</Label>
                  <Input
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    placeholder="Permanent / Contractual"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Appointment Memo No.</Label>
                  <Input
                    value={formData.appointment_memo}
                    onChange={(e) => setFormData({ ...formData, appointment_memo: e.target.value })}
                    placeholder="Memo number"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Professional Qualification</Label>
                  <Input
                    value={formData.professional_qualification}
                    onChange={(e) => setFormData({ ...formData, professional_qualification: e.target.value })}
                    placeholder="B.Ed / D.El.Ed / M.Ed"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Post Status</Label>
                  <Input
                    value={formData.post_status}
                    onChange={(e) => setFormData({ ...formData, post_status: e.target.value })}
                    placeholder="Sanctioned Post / Temporary"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Teaching Assignments */}
              <div className="pt-3.5 border-t border-border/70 space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Teaching Assignments & Classes
                  </span>
                </div>

                <SubjectMultiSelect
                  subjects={formData.teaching_subjects}
                  onChange={(newSubs) => setFormData({ ...formData, teaching_subjects: newSubs })}
                  label="Teaching Subjects"
                />

                <div className="pt-2 border-t border-border/50">
                  <ClassMultiSelectDropdown
                    selectedClasses={formData.assigned_classes}
                    onChange={(classes) => setFormData({ ...formData, assigned_classes: classes })}
                    label="Assigned Classes"
                    placeholder="Click to choose classes..."
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Register Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
