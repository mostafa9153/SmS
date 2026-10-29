"use client";

import { AlertCircle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import type { TeacherManagementState } from "./use-teacher-management";

export function CreateAccountDialog({ tm }: { tm: TeacherManagementState }) {
  const { createAccountError, createAccountModal, handleCreateAccount, newEmail, newPassword, setCreateAccountError, setCreateAccountModal, setNewEmail, setNewPassword, submitting } = tm;
  return (
    <Dialog open={!!createAccountModal} onOpenChange={(open) => !open && setCreateAccountModal(null)}>
      <DialogContent className="rounded-3xl max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Key className="h-4 w-4 text-emerald-500" />
            Enable Teacher Login
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create portal credentials for {createAccountModal?.fullName}.
          </DialogDescription>
        </DialogHeader>

        {createAccountError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p className="font-bold">Failed to enable login</p>
              <p className="text-[11px] mt-0.5">{createAccountError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateAccount} className="space-y-3.5 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Teacher Email</Label>
            <Input
              type="email"
              placeholder="teacher@school.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="h-9 text-xs rounded-xl"
              required
            />
            <p className="text-[10px] text-muted-foreground">The teacher will use this email to log in to the Teacher Portal.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Initial Password</Label>
            <Input
              type="text"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 text-xs rounded-xl font-mono"
              required
            />
            <p className="text-[10px] text-muted-foreground">Minimum 6 characters. Teacher can use this password to sign in.</p>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreateAccountModal(null);
                setCreateAccountError("");
              }}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
            >
              {submitting ? (
                <>
                  <Spinner className="h-3.5 w-3.5 mr-1.5" /> Saving...
                </>
              ) : (
                "Save Credentials"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
