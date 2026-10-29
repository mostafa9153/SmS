"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Upload, User, Receipt, CheckCircle2, Sparkles, Layers, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { getNextAvailableRoll, updateReAdmissionStatus } from "@/lib/data/admission";
import { getSavedFeeStructure, getFeeCategoryForClass, calculateFeeTotal, generateInvoiceNumber } from "@/lib/utils/fee-config";
import { PhotoCaptureDialog } from "@/components/admission/photo-capture-dialog";
import { normalizeClass } from "@/lib/academic/class-ladder";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api/client";

interface Step4FinalizeProps {
  onBack: () => void;
  onAdmit: (result: any) => void;
  studentData: any;
}

export function Step4Finalize({ onBack, onAdmit, studentData }: Step4FinalizeProps) {
  const currentClass = studentData.presentClass || studentData.present_class || studentData.targetClass || "VI";
  const previousClass = studentData.previous_class || studentData.previousClass || studentData.present_class || studentData.presentClass;
  const studentName = studentData.studentName || studentData.name || "Student";

  // Promotion already placed the student in the target class; re-admission only confirms it.
  const targetClass = normalizeClass(currentClass) || currentClass;
  const initialSection: string = studentData.presentSection || studentData.present_section || "A";
  const existingRoll = Number(studentData.presentRoll || studentData.present_roll) || 0;
  const isOnlineApplicant = Boolean(studentData.applicationId);

  const [section, setSection] = useState<string>(initialSection);
  const [rollNo, setRollNo] = useState<string>(existingRoll > 0 ? String(existingRoll) : "");
  const [isAutoCalculatingRoll, setIsAutoCalculatingRoll] = useState(false);

  // Photo state
  const [photoUrl, setPhotoUrl] = useState<string | null>(studentData.photoUrl || studentData.photo_url || null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  // Fee state
  const [feePaid, setFeePaid] = useState(true);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  // Active session year from admission settings
  useEffect(() => {
    let active = true;
    apiFetch<{ settings?: { currentAcademicYear?: number | string } }>("/api/admission/settings")
      .then((d) => {
        const y = Number(d?.settings?.currentAcademicYear);
        if (active && y > 0) setCurrentYear(y);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Keep the roll from promotion; only compute a new one for applicants, a changed section or a missing roll
  useEffect(() => {
    let active = true;
    const fetchRoll = async () => {
      if (!targetClass) return;
      if (existingRoll > 0 && !isOnlineApplicant && section === initialSection) {
        setRollNo(String(existingRoll));
        return;
      }
      setIsAutoCalculatingRoll(true);
      try {
        const nextRoll = await getNextAvailableRoll(targetClass, section, String(currentYear));
        if (active) {
          setRollNo(String(nextRoll));
        }
      } catch (e) {
        console.error("Failed to calculate next roll", e);
      } finally {
        if (active) setIsAutoCalculatingRoll(false);
      }
    };
    fetchRoll();
    return () => {
      active = false;
    };
  }, [targetClass, section, currentYear, existingRoll, isOnlineApplicant, initialSection]);

  // Fetch next invoice number
  useEffect(() => {
    let active = true;
    const fetchInvoiceSeq = async () => {
      setIsFetchingInvoice(true);
      try {
        const data = await apiFetch<{ nextSequence?: number }>(`/api/invoices/next-sequence?year=${currentYear}`);
        if (active && typeof data.nextSequence === "number") {
          setInvoiceNo(generateInvoiceNumber(data.nextSequence, currentYear));
        } else if (active) {
          setInvoiceNo(generateInvoiceNumber(1, currentYear));
        }
      } catch (e) {
        if (active) setInvoiceNo(generateInvoiceNumber(1, currentYear));
      } finally {
        if (active) setIsFetchingInvoice(false);
      }
    };
    fetchInvoiceSeq();
    return () => {
      active = false;
    };
  }, [currentYear]);

  // Fee presets
  const feeCategory = getFeeCategoryForClass(targetClass);
  const feeItems = getSavedFeeStructure(feeCategory);
  const totalFee = calculateFeeTotal(feeItems);

  const handleConfirmAdmission = async () => {
    if (!studentData.id) {
      toast.error("Student ID missing");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateReAdmissionStatus(studentData.id, {
        action: "admit",
        newClass: targetClass,
        newSection: section,
        newRoll: parseInt(rollNo) || 1,
        feePaid,
        feeAmount: totalFee,
        paymentReceiptNo: invoiceNo.trim() || undefined,
        photoUrl: photoUrl || undefined,
        updatedProfile: studentData,
        applicationId: studentData.applicationId,
      });

      toast.success(`${studentName} re-admitted successfully!`);
      onAdmit({
        ...result,
        studentName,
        targetClass,
        targetSection: section,
        targetRoll: rollNo,
        schoolId: result.schoolId || studentData.schoolId || studentData.school_id,
        invoiceNo: invoiceNo.trim() || null,
        feeAmount: totalFee,
      });
    } catch (err: any) {
      console.error("Re-admission error:", err);
      toast.error(err.message || "Failed to process re-admission");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto py-2 px-2 sm:px-4 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Promotion & Finalize</span>
            <Badge variant="outline" className="text-[10px] font-semibold text-primary">
              {studentName}
            </Badge>
          </div>
        </div>

        <Button
          onClick={handleConfirmAdmission}
          disabled={isSubmitting}
          size="sm"
          className="h-8 px-4 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Spinner className="w-3.5 h-3.5" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm Re-Admission</span>
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Col 1 & 2: Promotion & Fee Info */}
        <div className="md:col-span-2 space-y-4">
          {/* Class Promotion Card */}
          <Card className="border shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground">Class Promotion & Placement</h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {previousClass ? `From Class ${previousClass} → Class ${targetClass}` : `Enrolling to Class ${targetClass}`}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Promoted Class</label>
                  <Input value={`Class ${targetClass}`} readOnly className="h-8 text-xs font-semibold bg-muted/40" />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Target Section</label>
                  <Select value={section} onValueChange={(v) => v && setSection(v)}>
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D"].map((sec) => (
                        <SelectItem key={sec} value={sec} className="text-xs">
                          Section {sec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted-foreground">New Roll No</label>
                    {isAutoCalculatingRoll && <Spinner className="w-2.5 h-2.5 text-primary" />}
                  </div>
                  <Input
                    type="number"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    className="h-8 text-xs font-bold text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee & Invoice Card */}
          <Card className="border shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-foreground">Re-Admission Fee Collection</h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                  ₹{totalFee}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Receipt Number</label>
                  <Input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="h-8 text-xs font-mono font-semibold"
                    placeholder="Auto generated"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Payment Mode</label>
                  <Select value={paymentMode} onValueChange={(v) => v && setPaymentMode(v)}>
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash" className="text-xs">Cash</SelectItem>
                      <SelectItem value="UPI" className="text-xs">UPI</SelectItem>
                      <SelectItem value="Bank Transfer" className="text-xs">Bank Transfer</SelectItem>
                      <SelectItem value="Exempted" className="text-xs">Exempted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 flex items-center space-x-2">
                  <Checkbox
                    id="feePaid"
                    checked={feePaid}
                    onCheckedChange={(checked) => setFeePaid(!!checked)}
                  />
                  <label
                    htmlFor="feePaid"
                    className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Fee Collected
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Col 3: Student Photo Card */}
        <div className="space-y-4">
          <Card className="border shadow-xs">
            <CardContent className="p-4 flex flex-col items-center text-center gap-3">
              <div className="flex items-center gap-2 pb-2 border-b w-full">
                <Camera className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">Student Photo</h3>
              </div>

              <div className="relative w-32 h-36 rounded-xl border-2 border-dashed border-border/80 bg-muted/30 overflow-hidden flex items-center justify-center group">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Student"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <User className="w-10 h-10 stroke-1" />
                    <span className="text-[10px]">No Photo</span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPhotoDialogOpen(true)}
                className="w-full h-8 text-xs font-semibold gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{photoUrl ? "Update Photo" : "Capture Photo"}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Photo Capture Modal */}
      <PhotoCaptureDialog
        open={isPhotoDialogOpen}
        onOpenChange={setIsPhotoDialogOpen}
        currentPhotoUrl={photoUrl || undefined}
        onPhotoSaved={(url) => {
          setPhotoUrl(url);
          setIsPhotoDialogOpen(false);
          toast.success("Photo captured and optimized");
        }}
        onPhotoRemoved={() => {
          setPhotoUrl(null);
          setIsPhotoDialogOpen(false);
        }}
        studentName={studentData.studentName}
      />
    </div>
  );
}
