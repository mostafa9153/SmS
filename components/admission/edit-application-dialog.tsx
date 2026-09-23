"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { showToast } from "@/components/ui/toast-banner";
import {
  Edit3,
  Check,
  X,
  AlertTriangle,
  Camera,
  User,
  Phone,
  MapPin,
  BookOpen,
  CreditCard,
  Sparkles,
} from "lucide-react";
import type { AdmissionApplication, Gender } from "@/lib/types";
import { editAdmissionApplication, checkDuplicateApplicant } from "@/lib/data/admission";
import { PhotoCaptureDialog } from "@/components/admission/photo-capture-dialog";
import { formatAadhaarNumber } from "@/components/admission/admission-application-form";

interface EditApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: AdmissionApplication | null;
  onSaved: () => void;
}

const CLASS_OPTIONS = [
  { value: "V", label: "Class V" },
  { value: "VI", label: "Class VI" },
  { value: "VII", label: "Class VII" },
  { value: "VIII", label: "Class VIII" },
  { value: "IX", label: "Class IX" },
  { value: "X", label: "Class X" },
  { value: "XI", label: "Class XI" },
  { value: "XII", label: "Class XII" },
];

const SECTION_OPTIONS = [
  { value: "A", label: "Section A" },
  { value: "B", label: "Section B" },
  { value: "C", label: "Section C" },
  { value: "D", label: "Section D" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const STREAM_OPTIONS = [
  { value: "Arts", label: "Arts (Humanities)" },
  { value: "Science", label: "Science" },
  { value: "Commerce", label: "Commerce" },
];

const CATEGORY_OPTIONS = [
  { value: "General", label: "General" },
  { value: "SC", label: "SC" },
  { value: "ST", label: "ST" },
  { value: "OBC-A", label: "OBC-A" },
  { value: "OBC-B", label: "OBC-B" },
];

const RELIGION_OPTIONS = [
  { value: "Islam", label: "Islam" },
  { value: "Hinduism", label: "Hinduism" },
  { value: "Christianity", label: "Christianity" },
  { value: "Other", label: "Other" },
];

function EditApplicationDialogInner({
  open,
  onOpenChange,
  application,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: AdmissionApplication;
  onSaved: () => void;
}) {
  // Form states
  const [studentName, setStudentName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState<Gender>("Male");
  const [dob, setDob] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [socialCategory, setSocialCategory] = useState("General");
  const [religion, setReligion] = useState("Islam");
  const [bloodGroup, setBloodGroup] = useState("");

  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [studentContact, setStudentContact] = useState("");
  const [altMobile, setAltMobile] = useState("");
  const [email, setEmail] = useState("");

  const [address, setAddress] = useState("");
  const [village, setVillage] = useState("");
  const [postOffice, setPostOffice] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [district, setDistrict] = useState("SOUTH 24 PARGANAS");
  const [pincode, setPincode] = useState("743349");

  const [targetClass, setTargetClass] = useState("V");
  const [targetSection, setTargetSection] = useState("A");
  const [targetRoll, setTargetRoll] = useState("1");
  const [stream, setStream] = useState("Arts");
  const [previousSchool, setPreviousSchool] = useState("");
  const [previousClass, setPreviousClass] = useState("");
  const [previousMarks, setPreviousMarks] = useState("");

  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [kanyashreeId, setKanyashreeId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);

  // Sync state on app changes
  useEffect(() => {
    if (application) {
      setStudentName(application.studentName || "");
      setPhotoUrl(application.photoUrl);
      setGender(application.gender || "Male");
      setDob(application.dob || "");
      setAadhaar(application.aadhaar || "");
      setSocialCategory(application.socialCategory || "General");
      setReligion(application.religion || "Islam");
      setBloodGroup(application.bloodGroup || "");

      setFatherName(application.fatherName || "");
      setMotherName(application.motherName || "");
      setGuardianName(application.guardianName || application.fatherName || "");
      setStudentContact(application.studentContact || "");
      setAltMobile(application.altMobile || "");
      setEmail(application.email || "");

      setAddress(application.address || "");
      setVillage(application.village || "");
      setPostOffice(application.postOffice || "");
      setPoliceStation(application.policeStation || "");
      setDistrict(application.district || "SOUTH 24 PARGANAS");
      setPincode(application.pincode || "743349");

      setTargetClass(application.admittedClass || application.targetClass || "V");
      setTargetSection(application.admittedSection || application.targetSection || "A");
      setTargetRoll(String(application.admittedRoll || application.targetRoll || 1));
      setStream(application.stream || "Arts");
      setPreviousSchool(application.previousSchool || "");
      setPreviousClass(application.previousClass || "");
      setPreviousMarks(application.previousMarks || "");

      setBankAccountNo(application.bankAccountNo || "");
      setBankIfsc(application.bankIfsc || "");
      setBankName(application.bankName || "");
      setKanyashreeId(application.kanyashreeId || "");
    }
  }, [application]);

  // Real-time duplicate check for Aadhaar or Mobile
  useEffect(() => {
    let active = true;
    const checkDup = async () => {
      if ((aadhaar && aadhaar.length >= 10) || (studentContact && studentContact.length >= 10)) {
        const res = await checkDuplicateApplicant({
          aadhaar,
          contact: studentContact,
          excludeId: application?.id,
        });
        if (active && res.isDuplicate) {
          const msgs = res.duplicates.map(
            (d) => `Duplicate ${d.matchType} matches ${d.name} (${d.class}) in ${d.source}`
          );
          setDuplicateWarnings(msgs);
        } else if (active) {
          setDuplicateWarnings([]);
        }
      } else {
        setDuplicateWarnings([]);
      }
    };
    const timer = setTimeout(checkDup, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [aadhaar, studentContact, application?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      showToast("Student name is required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await editAdmissionApplication(application.id, {
        studentName: studentName.trim(),
        photoUrl,
        gender,
        dob,
        aadhaar: aadhaar.trim(),
        socialCategory,
        religion,
        bloodGroup,
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        guardianName: guardianName.trim() || fatherName.trim(),
        studentContact: studentContact.trim(),
        altMobile: altMobile.trim(),
        email: email.trim(),
        address: address.trim(),
        village: village.trim(),
        postOffice: postOffice.trim(),
        policeStation: policeStation.trim(),
        district: district.trim(),
        pincode: pincode.trim(),
        targetClass,
        targetSection,
        targetRoll: parseInt(targetRoll) || 1,
        stream: targetClass === "XI" || targetClass === "XII" ? stream : undefined,
        previousSchool: previousSchool.trim(),
        previousClass: previousClass.trim(),
        previousMarks: previousMarks.trim(),
        bankAccountNo: bankAccountNo.trim(),
        bankIfsc: bankIfsc.trim(),
        bankName: bankName.trim(),
        kanyashreeId: kanyashreeId.trim(),
      });
      showToast("Application details updated successfully!", "success");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      showToast(err.message || "Failed to update application", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClassXI = targetClass === "XI" || targetClass === "XII";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-[96vw] max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <Edit3 className="h-5 w-5 text-purple-600" />
              <span>Edit Application ({application.applicationNo})</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Modify applicant details prior to confirmation and directory transfer.
            </p>
          </DialogHeader>

          {duplicateWarnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Duplicate Records Detected:</span>
              </div>
              {duplicateWarnings.map((w, idx) => (
                <p key={idx} className="text-[11px] text-amber-700 dark:text-amber-300 pl-6">
                  &bull; {w}
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Section 1: Basic & Photo */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>1. Personal & Identity Details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Photo preview + trigger */}
                <div className="sm:col-span-3 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-purple-400 bg-muted/30 flex items-center justify-center relative group">
                    {photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={photoUrl} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-muted-foreground/50" />
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotoDialogOpen(true)}
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer"
                    >
                      <Camera className="h-4 w-4 mb-1" />
                      <span>{photoUrl ? "Change" : "Add Photo"}</span>
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPhotoDialogOpen(true)}
                    className="mt-2 text-[10px] h-7 rounded-xl font-bold border-purple-300 text-purple-700 dark:text-purple-300"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    <span>{photoUrl ? "Update Photo" : "Take Photo"}</span>
                  </Button>
                </div>

                {/* Name, DOB, Gender, Aadhaar */}
                <div className="sm:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Student Full Name *
                    </label>
                    <Input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. RAHUL MONDAL"
                      className="h-9 rounded-xl font-bold uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="h-9 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Gender
                    </label>
                    <CustomSelect
                      value={gender}
                      onChange={(v) => setGender(v as Gender)}
                      options={GENDER_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Aadhaar Number (12 digits)
                    </label>
                    <Input
                      value={formatAadhaarNumber(aadhaar)}
                      onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      className="h-9 rounded-xl font-mono tracking-widest text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Social Category
                    </label>
                    <CustomSelect
                      value={socialCategory}
                      onChange={setSocialCategory}
                      options={CATEGORY_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      Religion
                    </label>
                    <CustomSelect
                      value={religion}
                      onChange={setReligion}
                      options={RELIGION_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Guardian & Contact */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>2. Guardian & Contact Info</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Father&apos;s Name
                  </label>
                  <Input
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Father Name"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Mother&apos;s Name
                  </label>
                  <Input
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Mother Name"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Guardian&apos;s Name
                  </label>
                  <Input
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Guardian Name"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Primary Mobile
                  </label>
                  <Input
                    value={studentContact}
                    onChange={(e) => setStudentContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10 digit mobile"
                    maxLength={10}
                    className="h-9 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Alternative Mobile
                  </label>
                  <Input
                    value={altMobile}
                    onChange={(e) => setAltMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Alt mobile"
                    maxLength={10}
                    className="h-9 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="h-9 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Address */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>3. Residential Address</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Village / Street
                  </label>
                  <Input
                    value={village || address}
                    onChange={(e) => {
                      setVillage(e.target.value);
                      setAddress(e.target.value);
                    }}
                    placeholder="Village Name"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Post Office
                  </label>
                  <Input
                    value={postOffice}
                    onChange={(e) => setPostOffice(e.target.value)}
                    placeholder="Post Office"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Police Station
                  </label>
                  <Input
                    value={policeStation}
                    onChange={(e) => setPoliceStation(e.target.value)}
                    placeholder="Police Station"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    District
                  </label>
                  <Input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    PIN Code
                  </label>
                  <Input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6 digit PIN"
                    maxLength={6}
                    className="h-9 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Class & Academic Assignment */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>4. Class & Academic Allocation</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Target Class
                  </label>
                  <CustomSelect
                    value={targetClass}
                    onChange={setTargetClass}
                    options={CLASS_OPTIONS}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Section
                  </label>
                  <CustomSelect
                    value={targetSection}
                    onChange={setTargetSection}
                    options={SECTION_OPTIONS}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Target Roll No
                  </label>
                  <Input
                    type="number"
                    value={targetRoll}
                    onChange={(e) => setTargetRoll(e.target.value)}
                    min={1}
                    className="h-9 rounded-xl font-bold font-mono"
                  />
                </div>

                {isClassXI && (
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block mb-1">
                      Class XI Stream Selection *
                    </label>
                    <CustomSelect
                      value={stream}
                      onChange={setStream}
                      options={STREAM_OPTIONS}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Previous School
                  </label>
                  <Input
                    value={previousSchool}
                    onChange={(e) => setPreviousSchool(e.target.value)}
                    placeholder="Name of previous institution"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Previous Marks / %
                  </label>
                  <Input
                    value={previousMarks}
                    onChange={(e) => setPreviousMarks(e.target.value)}
                    placeholder="e.g. 78.5%"
                    className="h-9 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Bank & Schemes */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                <span>5. Bank Account & Welfare Schemes (Optional)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Bank Name
                  </label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India"
                    className="h-9 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Account Number
                  </label>
                  <Input
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    placeholder="Account number"
                    className="h-9 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Bank IFSC Code
                  </label>
                  <Input
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    className="h-9 rounded-xl font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Kanyashree ID (For eligible girls)
                  </label>
                  <Input
                    value={kanyashreeId}
                    onChange={(e) => setKanyashreeId(e.target.value)}
                    placeholder="e.g. 19181234567890"
                    className="h-9 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                size="sm"
                className="rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-md cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Photo Capture Modal */}
      <PhotoCaptureDialog
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
        currentPhotoUrl={photoUrl}
        onPhotoSaved={(url) => setPhotoUrl(url)}
        studentName={studentName}
      />
    </>
  );
}

export function EditApplicationDialog(props: EditApplicationDialogProps) {
  if (!props.application) return null;
  return <EditApplicationDialogInner {...props} application={props.application} />;
}
