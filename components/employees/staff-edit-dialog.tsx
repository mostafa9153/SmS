"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showToast } from "@/components/ui/toast-banner";
import { Loader2, Save, Briefcase, User, MapPin, GraduationCap, BookOpen, Layers } from "lucide-react";
import { ClassMultiSelectDropdown, DEFAULT_SCHOOL_CLASSES } from "@/components/employees/class-multi-select-dropdown";

export const STANDARD_SCHOOL_SUBJECTS = [
  "Bengali (1st Language)",
  "English (2nd Language)",
  "Mathematics",
  "Physical Science",
  "Life Science",
  "History",
  "Geography",
  "Sanskrit",
  "Arabic",
  "Work Education",
  "Physical Education",
  "Computer Application / IT",
  "Pure Science",
  "Bio Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Political Science",
  "Philosophy",
  "Economics",
  "Education",
  "Sociology",
  "Nutrition",
  "Music",
  "Visual Arts",
];

interface StaffEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: any;
  onStaffUpdated: (updatedStaff: any) => void;
}

export function StaffEditDialog({
  open,
  onOpenChange,
  staff,
  onStaffUpdated,
}: StaffEditDialogProps) {
  const [formData, setFormData] = useState({
    // Primary Details
    full_name: staff.full_name || "",
    unique_id: staff.unique_id || "",
    employee_type: staff.employee_type || "TEACHING",
    designation: staff.designation || "",
    status: staff.status || "ACTIVE",
    caste: staff.caste || "General",
    basic_pay: staff.basic_pay || "",
    joining_date: staff.joining_date || "",
    appointed_subject: staff.primary_meta?.appointed_subject || "",
    academic_section: staff.primary_meta?.academic_section || "Secondary",

    // Bank Details
    bank_name: staff.bank_details?.bank_name || "State Bank of India",
    bank_branch: staff.bank_details?.bank_branch || "",
    account_no: staff.bank_details?.account_no || "",
    ifsc_code: staff.bank_details?.ifsc_code || "",
    micr_no: staff.bank_details?.micr_no || "",

    // Personal Details
    father_name: staff.father_name || "",
    mother_name: staff.mother_name || "",
    gender: staff.gender || "Male",
    marital_status: staff.marital_status || "Married",
    blood_group: staff.blood_group || "O+",
    aadhaar_no: staff.aadhaar_no || "",
    pan_no: staff.pan_no || "",
    differently_abled: staff.differently_abled || false,
    health_scheme_opted: staff.personal_meta?.health_scheme_opted || "Swasthya Sathi / WBHS",

    // Contact Details
    mobile: staff.mobile || "",
    email: staff.email || "",
    landline: staff.landline || "",
    present_village: staff.present_address?.village || staff.present_address?.town_village || "",
    present_district: staff.present_address?.district || "South 24 Parganas",
    present_pincode: staff.present_address?.pin_code || "700001",

    // Professional Details
    service_type: staff.service_type || "Permanent",
    appointment_memo: staff.appointment_memo || "",
    professional_qualification: staff.professional_meta?.professional_qualification || "B.Ed / D.El.Ed",
    post_status: staff.professional_meta?.post_status || "Sanctioned Post",
    subject_1: staff.professional_meta?.subject_1 || staff.primary_meta?.appointed_subject || "",
    additional_subjects: staff.professional_meta?.additional_subjects || "",
    assigned_classes: Array.isArray(staff.professional_meta?.assigned_classes)
      ? staff.professional_meta.assigned_classes
      : Array.isArray(staff.primary_meta?.assigned_classes)
      ? staff.primary_meta.assigned_classes
      : [],
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever staff changes
  useEffect(() => {
    setFormData({
      full_name: staff.full_name || "",
      unique_id: staff.unique_id || "",
      employee_type: staff.employee_type || "TEACHING",
      designation: staff.designation || "",
      status: staff.status || "ACTIVE",
      caste: staff.caste || "General",
      basic_pay: staff.basic_pay || "",
      joining_date: staff.joining_date || "",
      appointed_subject: staff.primary_meta?.appointed_subject || "",
      academic_section: staff.primary_meta?.academic_section || "Secondary",

      bank_name: staff.bank_details?.bank_name || "State Bank of India",
      bank_branch: staff.bank_details?.bank_branch || "",
      account_no: staff.bank_details?.account_no || "",
      ifsc_code: staff.bank_details?.ifsc_code || "",
      micr_no: staff.bank_details?.micr_no || "",

      father_name: staff.father_name || "",
      mother_name: staff.mother_name || "",
      gender: staff.gender || "Male",
      marital_status: staff.marital_status || "Married",
      blood_group: staff.blood_group || "O+",
      aadhaar_no: staff.aadhaar_no || "",
      pan_no: staff.pan_no || "",
      differently_abled: staff.differently_abled || false,
      health_scheme_opted: staff.personal_meta?.health_scheme_opted || "Swasthya Sathi / WBHS",

      mobile: staff.mobile || "",
      email: staff.email || "",
      landline: staff.landline || "",
      present_village: staff.present_address?.village || staff.present_address?.town_village || "",
      present_district: staff.present_address?.district || "South 24 Parganas",
      present_pincode: staff.present_address?.pin_code || "700001",

      service_type: staff.service_type || "Permanent",
      appointment_memo: staff.appointment_memo || "",
      professional_qualification: staff.professional_meta?.professional_qualification || "B.Ed / D.El.Ed",
      post_status: staff.professional_meta?.post_status || "Sanctioned Post",
      subject_1: staff.professional_meta?.subject_1 || staff.primary_meta?.appointed_subject || "",
      additional_subjects: staff.professional_meta?.additional_subjects || "",
      assigned_classes: Array.isArray(staff.professional_meta?.assigned_classes)
        ? staff.professional_meta.assigned_classes
        : Array.isArray(staff.primary_meta?.assigned_classes)
        ? staff.primary_meta.assigned_classes
        : [],
    });
  }, [staff]);

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
        full_name: formData.full_name,
        unique_id: formData.unique_id,
        employee_type: formData.employee_type,
        designation: formData.designation,
        status: formData.status,
        caste: formData.caste,
        basic_pay: formData.basic_pay ? Number(formData.basic_pay) : null,
        joining_date: formData.joining_date || null,
        
        primary_meta: {
          ...(staff.primary_meta || {}),
          appointed_subject: formData.subject_1 || formData.appointed_subject,
          academic_section: formData.academic_section,
          assigned_classes: formData.assigned_classes,
        },

        bank_details: {
          ...(staff.bank_details || {}),
          bank_name: formData.bank_name,
          bank_branch: formData.bank_branch,
          account_no: formData.account_no,
          ifsc_code: formData.ifsc_code,
          micr_no: formData.micr_no,
        },

        father_name: formData.father_name,
        mother_name: formData.mother_name,
        gender: formData.gender,
        marital_status: formData.marital_status,
        blood_group: formData.blood_group,
        aadhaar_no: formData.aadhaar_no,
        pan_no: formData.pan_no,
        differently_abled: formData.differently_abled,

        personal_meta: {
          ...(staff.personal_meta || {}),
          health_scheme_opted: formData.health_scheme_opted,
        },

        mobile: formData.mobile,
        email: formData.email,
        landline: formData.landline,

        present_address: {
          ...(staff.present_address || {}),
          village: formData.present_village,
          district: formData.present_district,
          pin_code: formData.present_pincode,
        },

        service_type: formData.service_type,
        appointment_memo: formData.appointment_memo,

        professional_meta: {
          ...(staff.professional_meta || {}),
          professional_qualification: formData.professional_qualification,
          post_status: formData.post_status,
          subject_1: formData.subject_1,
          additional_subjects: formData.additional_subjects,
          assigned_classes: formData.assigned_classes,
        },
      };

      const res = await fetch(`/api/employees/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile");
      }

      showToast({
        type: "success",
        title: "All Details Saved",
        description: `All information for ${formData.full_name} has been stored into the database.`,
      });

      onStaffUpdated(data.staff);
      onOpenChange(false);
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Save Failed",
        description: err.message || "Failed to save profile changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Edit Employee Profile
          </DialogTitle>
          <DialogDescription className="text-xs">
            Edit all institutional records, personal info, bank details, and service records.
          </DialogDescription>
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
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Full Name *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Employee ID (Unique ID)</Label>
                  <Input
                    value={formData.unique_id}
                    onChange={(e) => setFormData({ ...formData, unique_id: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Role / Employee Type</Label>
                  <select
                    value={formData.employee_type}
                    onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
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
                    placeholder="TIC, AT, Group D..."
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
                  <Label className="text-xs font-medium">Appointed Subject</Label>
                  <Input
                    value={formData.appointed_subject}
                    onChange={(e) => setFormData({ ...formData, appointed_subject: e.target.value })}
                    placeholder="e.g. Mathematics, English"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Academic Section</Label>
                  <Input
                    value={formData.academic_section}
                    onChange={(e) => setFormData({ ...formData, academic_section: e.target.value })}
                    placeholder="e.g. Secondary, Higher Secondary"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 pt-2 border-t">
                Bank Details
              </h4>
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
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Account Number</Label>
                  <Input
                    value={formData.account_no}
                    onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">IFSC Code</Label>
                  <Input
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono uppercase"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Personal Details */}
            <TabsContent value="personal" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Father's Name</Label>
                  <Input
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Mother's Name</Label>
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
                <div className="space-y-1">
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
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Landline</Label>
                  <Input
                    value={formData.landline}
                    onChange={(e) => setFormData({ ...formData, landline: e.target.value })}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
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
                <div className="space-y-1">
                  <Label className="text-xs font-medium">PIN Code</Label>
                  <Input
                    value={formData.present_pincode}
                    onChange={(e) => setFormData({ ...formData, present_pincode: e.target.value })}
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
                    placeholder="Permanent / Contractual..."
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Appointment Memo No.</Label>
                  <Input
                    value={formData.appointment_memo}
                    onChange={(e) => setFormData({ ...formData, appointment_memo: e.target.value })}
                    placeholder="Memo Number"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Professional Qualification</Label>
                  <Input
                    value={formData.professional_qualification}
                    onChange={(e) => setFormData({ ...formData, professional_qualification: e.target.value })}
                    placeholder="e.g. B.Ed / D.El.Ed / M.Ed"
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

              {/* Teaching Assignment Section: Subject 1 & Assigned Classes */}
              <div className="pt-3.5 border-t border-border/70 space-y-3.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Teaching Assignment & Classes (পাঠদান ও শ্রেণী দায়িত্ব)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Subject 1 (Primary Subject) */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center justify-between">
                      <span>Subject 1 (Primary Subject) *</span>
                      <span className="text-[10px] text-muted-foreground font-normal">মূল পাঠদান বিষয়</span>
                    </Label>
                    <div className="space-y-1.5">
                      <select
                        value={
                          STANDARD_SCHOOL_SUBJECTS.includes(formData.subject_1)
                            ? formData.subject_1
                            : formData.subject_1
                            ? "CUSTOM"
                            : ""
                        }
                        onChange={(e) => {
                          if (e.target.value === "CUSTOM") {
                            setFormData({ ...formData, subject_1: "" });
                          } else {
                            setFormData({ ...formData, subject_1: e.target.value });
                          }
                        }}
                        className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select Subject 1 (Primary)...</option>
                        {STANDARD_SCHOOL_SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                        <option value="CUSTOM">+ Other Subject (Type below)</option>
                      </select>

                      {(!STANDARD_SCHOOL_SUBJECTS.includes(formData.subject_1) || formData.subject_1 === "") && (
                        <Input
                          value={formData.subject_1}
                          onChange={(e) => setFormData({ ...formData, subject_1: e.target.value })}
                          placeholder="Enter Subject 1 name (e.g. Mathematics, Bengali)"
                          className="h-9 text-xs rounded-xl font-medium"
                        />
                      )}
                    </div>
                  </div>

                  {/* Additional Subjects */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center justify-between">
                      <span>Additional Subjects</span>
                      <span className="text-[10px] text-muted-foreground font-normal">অতিরিক্ত বিষয়</span>
                    </Label>
                    <Input
                      value={formData.additional_subjects}
                      onChange={(e) => setFormData({ ...formData, additional_subjects: e.target.value })}
                      placeholder="e.g. Work Education, Physical Education"
                      className="h-9 text-xs rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground">Optional other subjects taken by the teacher.</p>
                  </div>
                </div>

                {/* Assigned Classes Multi-Select Dropdown */}
                <div className="pt-1">
                  <ClassMultiSelectDropdown
                    selectedClasses={formData.assigned_classes}
                    onChange={(classes) => setFormData({ ...formData, assigned_classes: classes })}
                    label="Assigned Classes (কোন কোন ক্লাসের ক্লাস নেন)"
                    placeholder="Click to choose classes (Class V to XII)..."
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
                  Saving to Database...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save All Details
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
