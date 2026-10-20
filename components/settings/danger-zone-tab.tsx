"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Trash2,
  UserCheck,
  Building,
  RefreshCw,
  AlertTriangle,
  Receipt,
  Award,
  CalendarDays,
  RotateCcw,
  Sliders,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";

const AVAILABLE_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function DangerZoneTab() {
  const queryClient = useQueryClient();

  const [isWipeoutModalOpen, setIsWipeoutModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Authorize Wipeout");
  const [wipeoutScope, setWipeoutScope] = useState<string>("ALL_DATA");
  const [targetClass, setTargetClass] = useState<string>("V");
  const [invoiceSubScope, setInvoiceSubScope] = useState<string>("ALL");
  const [certificateSubScope, setCertificateSubScope] = useState<string>("ALL");
  const [presetTarget, setPresetTarget] = useState<string>("ALL_PRESETS");

  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [confirmationPhraseInput, setConfirmationPhraseInput] = useState("");
  const [wipeoutError, setWipeoutError] = useState("");

  const openWipeModal = (params: {
    scope: string;
    title: string;
    cls?: string;
    subScope?: string;
    preset?: string;
  }) => {
    setWipeoutScope(params.scope);
    setModalTitle(params.title);
    if (params.cls) setTargetClass(params.cls);
    if (params.subScope) {
      if (params.scope === "INVOICES_REGISTRY") setInvoiceSubScope(params.subScope);
      if (params.scope === "CERTIFICATES_REGISTRY") setCertificateSubScope(params.subScope);
    }
    if (params.preset) setPresetTarget(params.preset);

    setAdminPasswordInput("");
    setConfirmationPhraseInput("");
    setWipeoutError("");
    setIsWipeoutModalOpen(true);
  };

  const wipeoutMutation = useMutation({
    mutationFn: async (payload: {
      adminPassword: string;
      confirmationPhrase: string;
      wipeoutScope: string;
      targetClass?: string;
      subScope?: string;
      presetTarget?: string;
    }) => {
      const res = await fetch("/api/admin/data-wipeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Data wipeout operation failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["student-results"] });
      queryClient.invalidateQueries({ queryKey: ["class-results"] });
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admission-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["certificates-registry"] });
      queryClient.invalidateQueries({ queryKey: ["school-config"] });

      showToast({
        type: "success",
        title: "Operation Completed",
        description: data.message || "Operation executed successfully.",
      });

      setIsWipeoutModalOpen(false);
      setAdminPasswordInput("");
      setConfirmationPhraseInput("");
      setWipeoutError("");
    },
    onError: (err: any) => {
      setWipeoutError(err.message || "Failed to execute wipeout");
      showToast({
        type: "error",
        title: "Wipeout Authorization Failed",
        description: err.message || "Operation could not be completed.",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* CARD 1: Student Roster & Academic Records Purge */}
      <Card className="border-rose-200 dark:border-rose-900/50 bg-card shadow-xs">
        <CardHeader className="border-b border-rose-100 dark:border-rose-950/50 bg-rose-50/50 dark:bg-rose-950/20 py-3 px-4">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4" />
            <CardTitle className="text-sm font-semibold">Student Roster & Academic Records Purge</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="divide-y divide-border/60 p-0">
          {/* Option 1: Master Reset */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Wipe Out All Student Records (Master Reset)
            </h3>
            <Button
              variant="destructive"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "ALL_DATA",
                  title: "Wipe All Student Records (Master Reset)",
                })
              }
            >
              Wipe All Students
            </Button>
          </div>

          {/* Option 2: Purge Active Students */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              Purge Active Continuing Students (All Classes)
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "CURRENT_STUDENTS_ONLY",
                  title: "Purge All Active Continuing Students",
                })
              }
            >
              Purge Current Students
            </Button>
          </div>

          {/* Option 3: Purge Old Students */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Building className="h-4 w-4 text-sky-500" />
              Purge Archived & Alumni Students Only
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "OLD_STUDENTS_ONLY",
                  title: "Purge Old / Alumni & Archived Students",
                })
              }
            >
              Purge Old Students
            </Button>
          </div>

          {/* Option 4: Purge Active Students by Specific Class */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-semibold text-foreground">Purge Active Students by Specific Class</h3>
            </div>
            <div className="flex items-center gap-2">
              <Select value={targetClass} onValueChange={(val) => { if (val) setTargetClass(val); }}>
                <SelectTrigger className="h-8 w-28 text-xs font-semibold">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls} className="text-xs font-medium">
                      Class {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap h-8"
                onClick={() =>
                  openWipeModal({
                    scope: "CLASS_SPECIFIC",
                    title: `Purge Active Students in Class ${targetClass}`,
                    cls: targetClass,
                  })
                }
              >
                Purge Class {targetClass}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Generated Documents & Print Registry Purge */}
      <Card className="border-amber-200 dark:border-amber-900/50 bg-card shadow-xs">
        <CardHeader className="border-b border-amber-100 dark:border-amber-950/50 bg-amber-50/50 dark:bg-amber-950/20 py-3 px-4">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Sliders className="h-4 w-4" />
            <CardTitle className="text-sm font-semibold">Generated Documents & Print Registry Purge</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="divide-y divide-border/60 p-0">
          {/* Row 1: Fee Invoices Registry */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Admission & Fee Receipts Registry (admission_invoices)
            </h3>
            <div className="flex items-center gap-2">
              <Select value={invoiceSubScope} onValueChange={(val) => { if (val) setInvoiceSubScope(val); }}>
                <SelectTrigger className="h-8 w-36 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Invoices</SelectItem>
                  <SelectItem value="BLANK_ONLY" className="text-xs">Blank Slips Only</SelectItem>
                  <SelectItem value="REGULAR_ONLY" className="text-xs">Regular Receipts Only</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-400 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs font-semibold whitespace-nowrap h-8"
                onClick={() =>
                  openWipeModal({
                    scope: "INVOICES_REGISTRY",
                    title: `Purge Fee Invoices (${invoiceSubScope})`,
                    subScope: invoiceSubScope,
                  })
                }
              >
                Purge Invoices
              </Button>
            </div>
          </div>

          {/* Row 2: Certificates Registry */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-500" />
              Issued Certificates Registry (certificates_registry)
            </h3>
            <div className="flex items-center gap-2">
              <Select value={certificateSubScope} onValueChange={(val) => { if (val) setCertificateSubScope(val); }}>
                <SelectTrigger className="h-8 w-44 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Certificates</SelectItem>
                  <SelectItem value="transfer-certificate" className="text-xs">Transfer Certificates (TC)</SelectItem>
                  <SelectItem value="character-certificate" className="text-xs">Character Certificates</SelectItem>
                  <SelectItem value="bonafide" className="text-xs">Bonafide Certificates</SelectItem>
                  <SelectItem value="pass-certificate" className="text-xs">Pass Certificates</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-400 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs font-semibold whitespace-nowrap h-8"
                onClick={() =>
                  openWipeModal({
                    scope: "CERTIFICATES_REGISTRY",
                    title: `Purge Certificates Registry (${certificateSubScope})`,
                    subScope: certificateSubScope,
                  })
                }
              >
                Purge Certificates
              </Button>
            </div>
          </div>

          {/* Row 3: Routine & Exam Seating Cache */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-sky-500" />
              Routine Timetable Assignments & EMS Seating Allocations
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-400 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs font-semibold whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "ROUTINE_AND_EMS_CACHE",
                  title: "Clear Timetable Assignments & EMS Seating Allocations",
                })
              }
            >
              Clear Routine & Seating
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: System Presets & Factory Reset */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="border-b border-border bg-muted/40 py-3 px-4">
          <div className="flex items-center gap-2 text-foreground">
            <RotateCcw className="h-4 w-4" />
            <CardTitle className="text-sm font-semibold">System Presets & Factory Reset</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="divide-y divide-border/60 p-0">
          {/* Row 1: Fee Structure Presets */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground">
              Admission & Annual Fee Structure Presets
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "PRESETS_RESET",
                  title: "Reset Fee Structure to Default Government School Slabs",
                  preset: "FEE_PRESETS",
                })
              }
            >
              Reset Fee Presets
            </Button>
          </div>

          {/* Row 2: Address & Location Presets */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground">
              Address & Geographical Dropdown Presets (Villages, P.O, P.S, Districts)
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "PRESETS_RESET",
                  title: "Reset Address Presets to Standard Regional Defaults",
                  preset: "ADDRESS_PRESETS",
                })
              }
            >
              Reset Address Presets
            </Button>
          </div>

          {/* Row 3: Marks & Evaluation Schemes */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground">
              Marks Schemes & Evaluation Framework (Summative S1, S2, S3)
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "PRESETS_RESET",
                  title: "Reset Marks Schemes to WBBSE Standard Schemes",
                  preset: "MARKS_SCHEMES",
                })
              }
            >
              Reset Marks Schemes
            </Button>
          </div>

          {/* Row 4: Student Data Entry Defaults */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground">
              Student Admission Data Entry Defaults (Guardian, Religion, Language)
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "PRESETS_RESET",
                  title: "Reset Student Entry Defaults",
                  preset: "STUDENT_ENTRY_DEFAULTS",
                })
              }
            >
              Reset Entry Defaults
            </Button>
          </div>

          {/* Row 5: Reset All Presets */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-foreground">
              All System Presets (Factory Reset All)
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap h-8"
              onClick={() =>
                openWipeModal({
                  scope: "PRESETS_RESET",
                  title: "Factory Reset All System Presets",
                  preset: "ALL_PRESETS",
                })
              }
            >
              Factory Reset All Presets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unified Wipeout Authorization Dialog */}
      <Dialog open={isWipeoutModalOpen} onOpenChange={setIsWipeoutModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-rose-600">{modalTitle}</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              This operation is completely destructive and cannot be undone. Enter your administrative password and type the confirmation phrase below to proceed.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              wipeoutMutation.mutate({
                adminPassword: adminPasswordInput,
                confirmationPhrase: confirmationPhraseInput,
                wipeoutScope,
                targetClass,
                subScope:
                  wipeoutScope === "INVOICES_REGISTRY"
                    ? invoiceSubScope
                    : wipeoutScope === "CERTIFICATES_REGISTRY"
                    ? certificateSubScope
                    : undefined,
                presetTarget: wipeoutScope === "PRESETS_RESET" ? presetTarget : undefined,
              });
            }}
            className="space-y-4 py-2"
          >
            {wipeoutError && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                {wipeoutError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Admin Password</Label>
              <Input
                type="password"
                placeholder="Enter current login password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                required
                disabled={wipeoutMutation.isPending}
                className="h-10 sm:h-9 text-base sm:text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Confirmation Phrase (Type <span className="font-mono text-rose-600 font-bold">PERMANENT WIPE</span>)
              </Label>
              <Input
                placeholder="PERMANENT WIPE"
                value={confirmationPhraseInput}
                onChange={(e) => setConfirmationPhraseInput(e.target.value)}
                required
                disabled={wipeoutMutation.isPending}
                className="h-10 sm:h-9 text-base sm:text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWipeoutModalOpen(false)}
                disabled={wipeoutMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                disabled={
                  wipeoutMutation.isPending ||
                  !adminPasswordInput.trim() ||
                  confirmationPhraseInput !== "PERMANENT WIPE"
                }
              >
                {wipeoutMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Executing Wipeout...
                  </>
                ) : (
                  "Confirm & Wipeout"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
