"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Camera, Upload, CheckCircle, Calculator, Info, User, FileText, Receipt, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getNextAvailableRoll, admitNewStudentApplication } from "@/lib/data/admission";
import { getSavedFeeStructure, getFeeCategoryForClass, calculateFeeTotal } from "@/lib/utils/fee-config";
import { PhotoCaptureDialog } from "@/components/admission/photo-capture-dialog";

interface Step4FinalizeProps {
  onBack: () => void;
  onAdmit: (result: any) => void;
  appData?: any;
}

export function Step4Finalize({ onBack, onAdmit, appData = {} }: Step4FinalizeProps) {
  const [targetClass, setTargetClass] = useState(appData.targetClass || "V");
  const [section, setSection] = useState("A");
  const [rollNo, setRollNo] = useState("01");
  const [stream, setStream] = useState("");
  const [isCaptureDialogOpen, setIsCaptureDialogOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(appData.photoUrl || null);
  const [feePaid, setFeePaid] = useState(true);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate roll whenever class or section changes
  useEffect(() => {
    let active = true;
    const fetchRoll = async () => {
      try {
        const roll = await getNextAvailableRoll(targetClass, section, "2026");
        if (active) {
          setRollNo(String(roll).padStart(2, '0'));
        }
      } catch (e) {
        console.error("Failed to get next roll", e);
      }
    };
    fetchRoll();
    return () => { active = false; };
  }, [targetClass, section]);

  const schoolId = `MHS-2026-${targetClass}-${rollNo.padStart(3, '0')}`;
  
  const feeCategory = getFeeCategoryForClass(targetClass);
  const feeItems = getSavedFeeStructure(feeCategory);
  const totalFee = calculateFeeTotal(feeItems);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Compress image before setting to prevent huge payload on submit
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setPhotoUrl(compressedBase64);
        toast.success("Photo attached and compressed successfully!");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let appId = appData?.id;

      // If offline manual entry or scan (no existing application ID yet), create it in DB first
      if (!appId) {
        const createRes = await fetch("/api/admission/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: appData?.studentName || "New Student",
            targetClass,
            targetSection: section,
            targetRoll: parseInt(rollNo, 10) || 1,
            gender: appData?.gender || "Male",
            dob: appData?.dob || null,
            fatherName: appData?.fatherName || null,
            motherName: appData?.motherName || null,
            guardianName: appData?.guardianName || appData?.fatherName || null,
            studentContact: appData?.primaryMobile || appData?.contactNumber || null,
            altMobile: appData?.altMobile || null,
            email: appData?.email || null,
            address: appData?.address || null,
            village: appData?.villageTown || null,
            postOffice: appData?.postOffice || null,
            policeStation: appData?.policeStation || null,
            district: appData?.district || null,
            pincode: appData?.pincode || null,
            religion: appData?.religion || "General",
            socialCategory: appData?.socialCategory || "General",
            casteCertificateNo: appData?.casteCertNo || null,
            aadhaar: appData?.aadhaar || null,
            bloodGroup: appData?.bloodGroup || null,
            previousSchool: appData?.prevSchool || null,
            previousClass: appData?.prevClass || null,
            previousRoll: appData?.prevRoll || null,
            previousMarks: appData?.prevMarks || null,
            bankAccountNo: appData?.bankAccount || null,
            bankIfsc: appData?.ifscCode || null,
            bankName: appData?.bankName || null,
            kanyashreeId: appData?.kanyashreeId || null,
            admissionType: "new",
            formMethod: appData?.formMethod || "offline",
            academicYear: String(new Date().getFullYear()),
            photoUrl: photoUrl || null,
          }),
        });

        if (!createRes.ok) {
          const createErr = await createRes.json().catch(() => ({}));
          throw new Error(createErr.error || "Failed to create admission application record");
        }

        const createJson = await createRes.json();
        appId = createJson.application?.id || createJson.id;
      }

      const receiptNo = `REC-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const result = await admitNewStudentApplication(appId, {
        class: targetClass,
        section,
        roll: parseInt(rollNo, 10) || 1,
        feePaid,
        feeAmount: totalFee,
        paymentMode,
        paymentReceiptNo: receiptNo,
        stream: stream || undefined,
        photoUrl: photoUrl || undefined,
      });
      
      onAdmit({
        ...result,
        studentName: appData?.studentName || "New Student",
        schoolId: (result as any)?.schoolId || result?.message?.match(/ID: ([\w-]+)/)?.[1] || schoolId,
        formNo: appData?.formNo || appData?.applicationNo || (appData?.targetClass ? `AP/${appData.academicYear || "2026"}/${appData.targetClass}/${appId?.slice(0, 4).toUpperCase()}` : `FRM-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`),
        targetClass,
        section,
        rollNo,
        receiptNo: result?.invoiceNumber || receiptNo,
        totalFee: feePaid ? totalFee : 0
      });
      toast.success("Student successfully admitted & enrolled in database!");
    } catch (e: any) {
      toast.error(e.message || "Admission process failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Finalize Admission</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Academic Placement */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">Academic Placement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Select value={targetClass} onValueChange={(v) => v && setTargetClass(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["V", "VI", "VII", "VIII", "IX", "XI"].map(c => (
                        <SelectItem key={c} value={c}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Section</label>
                  <Select value={section} onValueChange={(v) => v && setSection(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D"].map(s => (
                        <SelectItem key={s} value={s}>Section {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(targetClass === "XI" || targetClass === "XII") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stream</label>
                  <Select value={stream} onValueChange={(v) => v && setStream(v)}>
                    <SelectTrigger><SelectValue placeholder="Select Stream" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t mt-4">
                <label className="text-sm font-medium flex items-center justify-between">
                  Roll Number
                  <Badge variant="outline" className="font-normal text-xs bg-blue-50 text-blue-700 border-blue-200">Auto-calculated</Badge>
                </label>
                <div className="flex gap-2">
                  <Input value={rollNo} onChange={e => setRollNo(e.target.value)} className="w-24 text-center font-mono font-bold text-lg" />
                  <div className="flex-1 bg-muted/50 rounded-md flex items-center px-3 text-xs text-muted-foreground gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    Next available roll in {targetClass}-{section}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">Fee Collection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background border rounded-md shadow-sm">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Standard Admission Fee</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₹{totalFee}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox id="feePaid" checked={feePaid} onCheckedChange={(c: boolean) => setFeePaid(c)} />
                <label htmlFor="feePaid" className="text-sm font-medium cursor-pointer">Fee Paid in Full</label>
              </div>

              {feePaid && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Mode</label>
                  <Select value={paymentMode} onValueChange={(v) => v && setPaymentMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI / Online</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Photo Capture */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Student Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div 
                  className="w-32 h-40 border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30 overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-all shadow-2xs"
                  onClick={() => setIsCaptureDialogOpen(true)}
                  title="Click to take or change student photo"
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground opacity-20" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="text-white text-xs font-semibold flex items-center gap-1">
                      <Camera className="w-4 h-4" /> Change
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 w-full max-w-[250px]">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 text-xs gap-1.5 cursor-pointer shadow-2xs"
                    onClick={() => setIsCaptureDialogOpen(true)}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                  </Button>
                  <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted text-xs font-medium cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>

              {/* Real Photo Capture Dialog from Student Profile */}
              <PhotoCaptureDialog
                open={isCaptureDialogOpen}
                onOpenChange={setIsCaptureDialogOpen}
                currentPhotoUrl={photoUrl || undefined}
                onPhotoSaved={(url) => {
                  setPhotoUrl(url);
                  setIsCaptureDialogOpen(false);
                  toast.success("Student photo updated successfully!");
                }}
                studentName={appData.studentName || "Student"}
              />
            </CardContent>
          </Card>

          {/* Admission Invoice Preview */}
          <Card className="overflow-hidden border-2 border-emerald-500/20 shadow-md">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-3 text-white flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Admission Invoice Preview
              </span>
              <span className="text-xs font-semibold opacity-90">2026–2027</span>
            </div>
            <CardContent className="p-4 space-y-3 bg-gradient-to-b from-card to-muted/20 text-xs">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground font-medium">Student</span>
                <span className="font-bold text-sm text-foreground truncate max-w-[180px]">
                  {appData?.studentName || "Student Name"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Class & Section</span>
                  <span className="font-semibold text-foreground">Class {targetClass} - {section}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Assigned Roll</span>
                  <span className="font-semibold text-foreground">#{rollNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Fee Amount</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{totalFee}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Payment Mode</span>
                  <span className="font-medium text-foreground">{feePaid ? `${paymentMode} (Paid)` : "Due"}</span>
                </div>
              </div>
              <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Queue Destination</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">/admission/invoices</span>
              </div>
            </CardContent>
          </Card>

          {/* Submit Action */}
          <Button 
            className="w-full h-14 text-lg font-bold gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Finalizing..." : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirm & Admit Student
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
