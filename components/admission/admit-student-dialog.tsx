"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { showToast } from "@/components/ui/toast-banner";
import {
  UserCheck,
  Camera,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  CreditCard,
  Building,
  User,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { AdmissionApplication } from "@/lib/types";
import {
  admitNewStudentApplication,
  getNextAvailableRoll,
  checkDuplicateApplicant,
} from "@/lib/data/admission";
import {
  getSavedFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
  getFeeCategoryForClass,
} from "@/lib/utils/fee-config";
import { PhotoCaptureDialog } from "@/components/admission/photo-capture-dialog";

interface AdmitStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: AdmissionApplication | null;
  onAdmitSuccess: (result: {
    studentName: string;
    className: string;
    section: string;
    roll: number;
    receiptNo: string;
    feeAmount: number;
    stream?: string;
    guardianName?: string;
    contactNumber?: string;
  }) => void;
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

const STREAM_OPTIONS = [
  { value: "Arts", label: "Arts (Humanities)" },
  { value: "Science", label: "Science" },
  { value: "Commerce", label: "Commerce" },
];

const DOCUMENT_CHECKLIST = [
  { id: "aadhaar", label: "Aadhaar Card (Student & Guardian)" },
  { id: "birth_cert", label: "Birth Certificate (Original & Copy)" },
  { id: "tc_marksheet", label: "Transfer Certificate / Previous Marksheet" },
  { id: "caste_cert", label: "Caste Certificate (If applicable: SC/ST/OBC)" },
  { id: "passport_photos", label: "Passport-size Photographs (2 copies)" },
  { id: "bank_passbook", label: "Bank Passbook Copy (Front Page)" },
];

export function AdmitStudentDialog({
  open,
  onOpenChange,
  application,
  onAdmitSuccess,
}: AdmitStudentDialogProps) {
  if (!application) return null;

  const currentYear = new Date().getFullYear();

  // Assignment states
  const [targetClass, setTargetClass] = useState("V");
  const [section, setSection] = useState("A");
  const [roll, setRoll] = useState("1");
  const [stream, setStream] = useState("Arts");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  // Fee states
  const [feePaid, setFeePaid] = useState(true);
  const [feeAmount, setFeeAmount] = useState("350");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [receiptNo, setReceiptNo] = useState("");

  // Verification & Demographics
  const [verifiedDocs, setVerifiedDocs] = useState<string[]>([
    "aadhaar",
    "birth_cert",
    "passport_photos",
  ]);
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [kanyashreeId, setKanyashreeId] = useState("");

  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRoll, setIsLoadingRoll] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);

  // Fetch next sequential invoice number from DB
  const fetchNextInvoiceNumber = async () => {
    try {
      const res = await fetch(`/api/invoices/next-sequence?year=${currentYear}`);
      const data = await res.json();
      if (res.ok && typeof data.nextSequence === "number") {
        return generateInvoiceNumber(data.nextSequence, currentYear);
      }
    } catch (e) {
      console.warn("Could not fetch next sequence:", e);
    }
    return generateInvoiceNumber(1, currentYear);
  };

  // Sync with application whenever opened
  useEffect(() => {
    if (application && open) {
      const initialClass = application.admittedClass || application.targetClass || "V";
      const initialSection = application.admittedSection || application.targetSection || "A";
      setTargetClass(initialClass);
      setSection(initialSection);
      setStream(application.stream || "Arts");
      setPhotoUrl(application.photoUrl);
      setBankName(application.bankName || "");
      setBankAccountNo(application.bankAccountNo || "");
      setBankIfsc(application.bankIfsc || "");
      setKanyashreeId(application.kanyashreeId || "");

      // Fee amount preset
      const category = getFeeCategoryForClass(initialClass);
      const feeItems = getSavedFeeStructure(category);
      const total = calculateFeeTotal(feeItems);
      setFeeAmount(String(application.feeAmount || (total > 0 ? total : 350)));

      // Auto-sequence receipt number
      if (application.paymentReceiptNo) {
        setReceiptNo(application.paymentReceiptNo);
      } else {
        setReceiptNo("Syncing...");
        fetchNextInvoiceNumber().then((no) => setReceiptNo(no));
      }

      // Roll calculation
      if (application.admittedRoll) {
        setRoll(String(application.admittedRoll));
      } else {
        setIsLoadingRoll(true);
        getNextAvailableRoll(initialClass, initialSection, String(currentYear))
          .then((next) => setRoll(String(next)))
          .finally(() => setIsLoadingRoll(false));
      }

      // Check duplicates
      checkDuplicateApplicant({
        aadhaar: application.aadhaar,
        contact: application.studentContact,
        excludeId: application.id,
      }).then((res) => {
        if (res.isDuplicate) {
          setDuplicateWarnings(
            res.duplicates.map(
              (d) => `Match found: ${d.name} (${d.class}) in ${d.source} via ${d.matchType}`
            )
          );
        } else {
          setDuplicateWarnings([]);
        }
      });
    }
  }, [application, open]);

  // Recalculate next roll when class or section changes
  const handleClassOrSectionChange = async (newClass: string, newSec: string) => {
    setIsLoadingRoll(true);
    try {
      const category = getFeeCategoryForClass(newClass);
      const feeItems = getSavedFeeStructure(category);
      const total = calculateFeeTotal(feeItems);
      setFeeAmount(String(total > 0 ? total : 350));

      const next = await getNextAvailableRoll(newClass, newSec, String(currentYear));
      setRoll(String(next));
    } catch (e) {
      console.warn("Roll calculation error:", e);
    } finally {
      setIsLoadingRoll(false);
    }
  };

  const toggleDocVerification = (docId: string) => {
    setVerifiedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleConfirmAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoll = parseInt(roll);
    if (!finalRoll || finalRoll <= 0) {
      showToast("Please enter a valid Roll Number.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      await admitNewStudentApplication(application.id, {
        class: targetClass,
        section: section,
        roll: finalRoll,
        feePaid: feePaid,
        feeAmount: parseFloat(feeAmount) || 0,
        paymentReceiptNo: receiptNo,
        paymentMode: paymentMode,
        stream: targetClass === "XI" || targetClass === "XII" ? stream : undefined,
        photoUrl: photoUrl,
        bankAccountNo: bankAccountNo.trim() || undefined,
        bankIfsc: bankIfsc.trim() || undefined,
        bankName: bankName.trim() || undefined,
        kanyashreeId: kanyashreeId.trim() || undefined,
        verifiedDocuments: verifiedDocs,
        forceReAdmit: true,
      });

      showToast("Student successfully admitted to staging queue!", "success");
      onOpenChange(false);
      onAdmitSuccess({
        studentName: application.studentName,
        className: targetClass,
        section: section,
        roll: finalRoll,
        receiptNo: receiptNo,
        feeAmount: parseFloat(feeAmount) || 0,
        stream: targetClass === "XI" || targetClass === "XII" ? stream : undefined,
        guardianName: application.guardianName || application.fatherName,
        contactNumber: application.studentContact || application.altMobile,
      });
    } catch (err: any) {
      showToast(err.message || "Failed to confirm admission", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClassXI = targetClass === "XI" || targetClass === "XII";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-[96vw] max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <UserCheck className="h-5 w-5 text-purple-600" />
              <span>Verify &amp; Admit Student</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              App No: <strong className="font-mono">{application.applicationNo}</strong> &bull; Candidate: <strong className="text-foreground">{application.studentName}</strong>
            </p>
          </DialogHeader>

          {/* Duplicate warning if found */}
          {duplicateWarnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Notice: Existing matching records found</span>
              </div>
              {duplicateWarnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-700 dark:text-amber-300 pl-5">
                  &bull; {w}
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleConfirmAdmission} className="space-y-5 pt-2">
            {/* Top Identity & Photo Row */}
            <div className="bg-muted/40 p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-purple-400 bg-background flex items-center justify-center">
                  {photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={photoUrl} alt="Passport" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPhotoDialogOpen(true)}
                  className="mt-1.5 h-6 text-[10px] rounded-lg font-bold bg-purple-600 hover:bg-purple-700 text-white w-full"
                >
                  <Camera className="h-3 w-3 mr-1" />
                  <span>{photoUrl ? "Change" : "Add Photo"}</span>
                </Button>
              </div>

              <div className="flex-1 space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-black text-foreground uppercase">
                  {application.studentName}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Guardian: <strong className="text-foreground">{application.guardianName || application.fatherName || "N/A"}</strong>
                  {application.studentContact && ` • Mobile: ${application.studentContact}`}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 justify-center sm:justify-start text-[10px]">
                  <span className="bg-background px-2 py-0.5 rounded-md border font-semibold">
                    DOB: {application.dob || "N/A"}
                  </span>
                  <span className="bg-background px-2 py-0.5 rounded-md border font-semibold">
                    Gender: {application.gender}
                  </span>
                  {application.aadhaar && (
                    <span className="bg-background px-2 py-0.5 rounded-md border font-mono font-semibold">
                      Aadhaar: {application.aadhaar}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Class, Section, Sequential Roll Allocation */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" />
                <span>1. Academic Allocation &amp; Roll Number</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Admitted Class *
                  </label>
                  <CustomSelect
                    value={targetClass}
                    onChange={(val) => {
                      setTargetClass(val);
                      handleClassOrSectionChange(val, section);
                    }}
                    options={CLASS_OPTIONS}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Section *
                  </label>
                  <CustomSelect
                    value={section}
                    onChange={(val) => {
                      setSection(val);
                      handleClassOrSectionChange(targetClass, val);
                    }}
                    options={SECTION_OPTIONS}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center justify-between mb-1">
                    <span>Sequential Roll No *</span>
                    {isLoadingRoll && (
                      <span className="text-[9px] text-purple-600 flex items-center gap-0.5">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Auto-calculating
                      </span>
                    )}
                  </label>
                  <Input
                    type="number"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    min={1}
                    className="h-9 rounded-xl font-bold font-mono text-purple-700 dark:text-purple-300"
                    required
                  />
                </div>

                {isClassXI && (
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block mb-1">
                      Stream Allocation (Class XI) *
                    </label>
                    <CustomSelect
                      value={stream}
                      onChange={setStream}
                      options={STREAM_OPTIONS}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Fee Collection & Receipt */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                <span>2. Fee Collection &amp; Invoice</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Admission Fee (₹)
                  </label>
                  <Input
                    type="number"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    min={0}
                    placeholder="0 for fee waiver"
                    className="h-9 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Payment Mode
                  </label>
                  <CustomSelect
                    value={paymentMode}
                    onChange={setPaymentMode}
                    options={[
                      { value: "Cash", label: "Cash" },
                      { value: "Online / UPI", label: "Online / UPI" },
                      { value: "Bank Transfer", label: "Bank Transfer" },
                      { value: "Free / Concession", label: "Free / Concession" },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Auto-Generated Receipt No
                  </label>
                  <Input
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="h-9 rounded-xl font-mono text-xs font-bold uppercase bg-muted/30"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Document Verification Checklist */}
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5" />
                <span>3. Physical Document Verification Checklist</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DOCUMENT_CHECKLIST.map((item) => {
                  const isChecked = verifiedDocs.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                          : "bg-background border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDocVerification(item.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Optional Bank & Kanyashree details */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>4. Bank Details &amp; Kanyashree ID (Optional)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Bank Account No
                  </label>
                  <Input
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    placeholder="Account Number"
                    className="h-9 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Bank IFSC
                  </label>
                  <Input
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="IFSC Code"
                    className="h-9 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Kanyashree ID
                  </label>
                  <Input
                    value={kanyashreeId}
                    onChange={(e) => setKanyashreeId(e.target.value)}
                    placeholder="e.g. 1918..."
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Admitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm Admission &amp; Invoice</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Passport Photo Capture Modal */}
      <PhotoCaptureDialog
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
        currentPhotoUrl={photoUrl}
        onPhotoSaved={(url) => setPhotoUrl(url)}
        studentName={application.studentName}
      />
    </>
  );
}
