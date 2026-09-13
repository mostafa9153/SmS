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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";

export function DangerZoneTab() {
  const queryClient = useQueryClient();

  const [isWipeoutModalOpen, setIsWipeoutModalOpen] = useState(false);
  const [wipeoutScope, setWipeoutScope] = useState<string>("ALL_DATA");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [confirmationPhraseInput, setConfirmationPhraseInput] = useState("");
  const [wipeoutError, setWipeoutError] = useState("");

  const wipeoutMutation = useMutation({
    mutationFn: async (payload: {
      adminPassword: string;
      confirmationPhrase: string;
      wipeoutScope: string;
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

      showToast({
        type: "success",
        title: "Data Wipeout Completed",
        description: `Wiped out ${data.summary?.deletedStudentsCount || 0} students and ${data.summary?.deletedResultsCount || 0} results.`,
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
    <>
      <Card className="border-rose-200 dark:border-rose-900/50 bg-card shadow-xs">
        <CardHeader className="border-b border-rose-100 dark:border-rose-950/50 bg-rose-50/50 dark:bg-rose-950/20 pb-4">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <CardTitle className="text-base font-semibold">Danger Zone & Administrative Purge</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="divide-y divide-border/60 p-0">
          {/* Option 1: Complete Student Database Wipeout */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Wipe Out All Student Records (Master Reset)
              </h3>
              <p className="text-xs text-muted-foreground">
                Permanently deletes all student demographic profiles, academic enrollment histories, and all examination marks & rankings. Ideal when clearing dummy or test batches to start fresh.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs whitespace-nowrap w-full sm:w-auto h-10 sm:h-9"
              onClick={() => {
                setWipeoutScope("ALL_DATA");
                setAdminPasswordInput("");
                setConfirmationPhraseInput("");
                setWipeoutError("");
                setIsWipeoutModalOpen(true);
              }}
            >
              Wipe All Students
            </Button>
          </div>

          {/* Option 2: Purge Current / Active Students Only */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                Purge Current / Active Continuing Students Only
              </h3>
              <p className="text-xs text-muted-foreground">
                Removes all currently active enrolled students (status &apos;Continuing&apos;) and their marks, leaving historical alumni and archived students intact.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap w-full sm:w-auto h-10 sm:h-9"
              onClick={() => {
                setWipeoutScope("CURRENT_STUDENTS_ONLY");
                setAdminPasswordInput("");
                setConfirmationPhraseInput("");
                setWipeoutError("");
                setIsWipeoutModalOpen(true);
              }}
            >
              Purge Current Students
            </Button>
          </div>

          {/* Option 3: Purge Old / Archived Students */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building className="h-4 w-4 text-sky-500" />
                Purge Old / Alumni & Archived Students Only
              </h3>
              <p className="text-xs text-muted-foreground">
                Removes all historical students with status &apos;Passed Out&apos;, &apos;Drop Out&apos;, &apos;Sent Up M.P.&apos;, or archived alumni, leaving only current active continuing students.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap w-full sm:w-auto h-10 sm:h-9"
              onClick={() => {
                setWipeoutScope("OLD_STUDENTS_ONLY");
                setAdminPasswordInput("");
                setConfirmationPhraseInput("");
                setWipeoutError("");
                setIsWipeoutModalOpen(true);
              }}
            >
              Purge Old Students
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wipeout Authorization Dialog */}
      <Dialog open={isWipeoutModalOpen} onOpenChange={setIsWipeoutModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-rose-600">Irreversible Action: Authorize Wipeout</DialogTitle>
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
                    Wiping Database...
                  </>
                ) : (
                  "Confirm & Wipeout"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
