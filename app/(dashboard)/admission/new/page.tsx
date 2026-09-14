"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAdmissionApplication } from "@/lib/data/admission";
import type { AdmissionApplication, Gender } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { showToast } from "@/components/ui/toast-banner";
import {
  getSavedStudentEntryPresets,
  fetchStudentEntryPresetsFromDb,
} from "@/lib/utils/student-entry-presets";
import {
  UserPlus,
  Camera,
  FileText,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Printer,
  Calendar,
  Phone,
  MapPin,
  School,
  IdCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CLASSES = ["V", "VI", "VII", "VIII", "IX", "XI"];
const RELIGIONS = ["Islam", "Hinduism", "Christianity", "Buddhism", "Sikhism", "Other"];
const SOCIAL_CATEGORIES = ["General", "SC", "ST", "OBC-A", "OBC-B"];

export default function NewAdmissionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form State
  const [targetClass, setTargetClass] = useState<string>("V");
  const [studentName, setStudentName] = useState<string>("");
  const [gender, setGender] = useState<Gender>("Male");
  const [dob, setDob] = useState<string>("");
  const [fatherName, setFatherName] = useState<string>("");
  const [motherName, setMotherName] = useState<string>("");
  const [guardianName, setGuardianName] = useState<string>("");
  const [studentContact, setStudentContact] = useState<string>("");
  const [altMobile, setAltMobile] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Address
  const [address, setAddress] = useState<string>("");
  const [village, setVillage] = useState<string>("");
  const [postOffice, setPostOffice] = useState<string>("");
  const [policeStation, setPoliceStation] = useState<string>("");
  const [district, setDistrict] = useState<string>("North 24 Parganas");
  const [pincode, setPincode] = useState<string>("");

  // Demographics
  const [religion, setReligion] = useState<string>(() => {
    const p = getSavedStudentEntryPresets();
    return p.defaultReligion && p.defaultReligion !== "None" ? p.defaultReligion : "Islam";
  });
  const [socialCategory, setSocialCategory] = useState<string>("General");
  const [casteCertificateNo, setCasteCertificateNo] = useState<string>("");
  const [aadhaar, setAadhaar] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState<string>("");

  React.useEffect(() => {
    fetchStudentEntryPresetsFromDb().then((p) => {
      if (p.defaultReligion && p.defaultReligion !== "None") {
        setReligion(p.defaultReligion);
      }
    });
  }, []);

  // Previous Academic Records
  const [previousSchool, setPreviousSchool] = useState<string>("");
  const [previousClass, setPreviousClass] = useState<string>("");
  const [previousRoll, setPreviousRoll] = useState<string>("");
  const [previousMarks, setPreviousMarks] = useState<string>("");

  // Mutation
  const mutation = useMutation({
    mutationFn: createAdmissionApplication,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      showToast("Application submitted successfully! Opening receipt...", "success");
      router.push(`/admission/receipt/${data.id}`);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to submit application", "error");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim()) {
      showToast("Student Name is required", "error");
      return;
    }

    mutation.mutate({
      studentName: studentName.trim(),
      targetClass,
      gender,
      dob,
      fatherName,
      motherName,
      guardianName: guardianName || fatherName,
      studentContact,
      altMobile,
      email,
      address,
      village,
      postOffice,
      policeStation,
      district,
      pincode,
      religion,
      socialCategory,
      casteCertificateNo,
      aadhaar,
      bloodGroup,
      previousSchool,
      previousClass,
      previousRoll,
      previousMarks,
      admissionType: "new",
      formMethod: "offline",
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admission"
            className="p-2 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <UserPlus className="h-3.5 w-3.5" />
              <span>New Admission • Online Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span>Online Admission Form</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Submit new applicant details to queue for verification and generate an instant application receipt.
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link
            href="/admission/new/offline"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border hover:bg-muted text-xs font-bold transition-all text-foreground cursor-pointer"
          >
            <FileText className="h-4 w-4 text-purple-600" />
            <span>Offline Form &amp; Scan</span>
          </Link>
          <Link
            href="/admission/applications"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-bold transition-all cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Application Desk</span>
          </Link>
        </div>
      </div>

      {/* Primary Class Focus Banner */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
            V
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-300">
              Class V Admission Gateway (Primary)
            </h3>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
              Also enrolling students into Classes VI, VII, VIII, IX &amp; XI. Submitting generates an instant printable receipt.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-muted-foreground">Target Class:</span>
          <div className="flex gap-1">
            {CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setTargetClass(cls)}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  targetClass === cls
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-card border hover:bg-muted text-muted-foreground"
                )}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Admission Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Student Profile */}
        <div className="bg-card border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3 text-foreground font-bold text-sm">
            <IdCard className="h-4 w-4 text-primary" />
            <span>1. Student Identity &amp; Personal Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Student Full Name *
              </label>
              <Input
                required
                placeholder="e.g. Rahul Mondal"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Gender *
              </label>
              <CustomSelect
                value={gender}
                onChange={(val) => setGender(val as Gender)}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Date of Birth
              </label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Father&apos;s Name
              </label>
              <Input
                placeholder="Father's Name"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Mother&apos;s Name
              </label>
              <Input
                placeholder="Mother's Name"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Guardian Name
              </label>
              <Input
                placeholder="Defaults to Father's Name"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Contact Number (Mobile)
              </label>
              <Input
                placeholder="10-digit mobile"
                value={studentContact}
                onChange={(e) => setStudentContact(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Aadhaar Number
              </label>
              <Input
                placeholder="12-digit Aadhaar"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Blood Group
              </label>
              <CustomSelect
                value={bloodGroup}
                onChange={setBloodGroup}
                options={[
                  { value: "", label: "Select Blood Group" },
                  { value: "A+", label: "A+" },
                  { value: "A-", label: "A-" },
                  { value: "B+", label: "B+" },
                  { value: "B-", label: "B-" },
                  { value: "O+", label: "O+" },
                  { value: "O-", label: "O-" },
                  { value: "AB+", label: "AB+" },
                  { value: "AB-", label: "AB-" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Residential Address & Demographics */}
        <div className="bg-card border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3 text-foreground font-bold text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span>2. Residential Address &amp; Category</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Full Address / Village
              </label>
              <Input
                placeholder="Village / Street / Para"
                value={village}
                onChange={(e) => {
                  setVillage(e.target.value);
                  setAddress(e.target.value);
                }}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Post Office (P.O.)
              </label>
              <Input
                placeholder="Post Office"
                value={postOffice}
                onChange={(e) => setPostOffice(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Police Station (P.S.)
              </label>
              <Input
                placeholder="Police Station"
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                District
              </label>
              <Input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                PIN Code
              </label>
              <Input
                placeholder="6-digit PIN"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Religion
              </label>
              <CustomSelect
                value={religion}
                onChange={setReligion}
                options={RELIGIONS.map((r) => ({ value: r, label: r }))}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Social Category
              </label>
              <CustomSelect
                value={socialCategory}
                onChange={setSocialCategory}
                options={SOCIAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Caste Certificate No (If any)
              </label>
              <Input
                placeholder="Certificate No"
                value={casteCertificateNo}
                onChange={(e) => setCasteCertificateNo(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Previous Academic History */}
        <div className="bg-card border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-3 text-foreground font-bold text-sm">
            <School className="h-4 w-4 text-primary" />
            <span>3. Previous Academic Records</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Previous School Name
              </label>
              <Input
                placeholder="Name of last school attended"
                value={previousSchool}
                onChange={(e) => setPreviousSchool(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Last Class Attended
              </label>
              <Input
                placeholder="e.g. IV or V"
                value={previousClass}
                onChange={(e) => setPreviousClass(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                Previous Roll / Marks %
              </label>
              <Input
                placeholder="e.g. Roll 12 / 85%"
                value={previousMarks}
                onChange={(e) => setPreviousMarks(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admission"
            className="px-5 py-2.5 rounded-xl border hover:bg-muted text-xs font-bold transition-all"
          >
            Cancel
          </Link>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {mutation.isPending ? "Submitting..." : "Submit & Generate Receipt Slip"}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
