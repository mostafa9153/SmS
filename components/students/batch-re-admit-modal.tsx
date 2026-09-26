"use client";

import React, { useState } from "react";
import { Student } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { executeBatchReAdmission } from "@/lib/data/students";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Users, GraduationCap, CheckCircle2 } from "lucide-react";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const SECTIONS = ["A", "B", "C", "D"];

const ROLL_STRATEGIES = [
  { label: "🏆 Rank-Based (Marks Merit)", value: "rank" },
  { label: "🔄 Preserve Current Roll", value: "preserve" },
  { label: "🔤 Alphabetical (A-Z)", value: "alphabetical" },
];

interface BatchReAdmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudents: Student[];
  onSuccess?: () => void;
}

export function BatchReAdmitModal({
  open,
  onOpenChange,
  selectedStudents,
  onSuccess,
}: BatchReAdmitModalProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [targetClass, setTargetClass] = useState<string>("VI");
  const [targetSection, setTargetSection] = useState<string>("A");
  const [targetYear, setTargetYear] = useState<number>(currentYear);
  const [rollStrategy, setRollStrategy] = useState<"rank" | "preserve" | "alphabetical">("rank");
  const [queueInvoice, setQueueInvoice] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive smart default target class from first student
  React.useEffect(() => {
    if (selectedStudents.length > 0) {
      const first = selectedStudents[0];
      const idx = STANDARD_CLASSES.indexOf(first.presentClass);
      if (idx >= 0 && idx < STANDARD_CLASSES.length - 1) {
        setTargetClass(STANDARD_CLASSES[idx + 1]);
      } else {
        setTargetClass(first.presentClass);
      }
      setTargetSection(first.presentSection || "A");
    }
  }, [selectedStudents]);

  if (selectedStudents.length === 0) return null;

  async function handleExecute() {
    setIsSubmitting(true);
    try {
      const res = await executeBatchReAdmission({
        studentIds: selectedStudents.map((s) => s.id),
        targetClass,
        targetSection,
        targetAcademicYear: targetYear,
        rollStrategy,
        isInvoiceQueued: queueInvoice,
      });

      toast.success(res.message || `Successfully re-admitted ${selectedStudents.length} student(s)!`);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["pending-students"] });
      queryClient.invalidateQueries({ queryKey: ["students-infinite"] });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute batch re-admission");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-5">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Batch Re-Admission Portal ({selectedStudents.length} Students)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Target Class & Section */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Target Class</Label>
              <CustomSelect
                value={targetClass}
                onChange={setTargetClass}
                options={STANDARD_CLASSES.map((c) => ({ label: `Class ${c}`, value: c }))}
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Target Section</Label>
              <CustomSelect
                value={targetSection}
                onChange={setTargetSection}
                options={SECTIONS.map((s) => ({ label: `Section ${s}`, value: s }))}
              />
            </div>
          </div>

          {/* Academic Session & Roll Strategy */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Target Session</Label>
              <CustomSelect
                value={String(targetYear)}
                onChange={(val) => setTargetYear(parseInt(val))}
                options={[
                  { label: `${currentYear}`, value: String(currentYear) },
                  { label: `${currentYear + 1}`, value: String(currentYear + 1) },
                ]}
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-muted-foreground mb-1 block">Roll Assignment</Label>
              <CustomSelect
                value={rollStrategy}
                onChange={(val) => setRollStrategy(val as any)}
                options={ROLL_STRATEGIES}
              />
            </div>
          </div>

          {/* Fee Queue Switch */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border bg-card">
            <div>
              <p className="text-xs font-semibold">Queue Admission Fee Invoices</p>
              <p className="text-[10px] text-muted-foreground">Adds all admitted students to the fee receipt queue</p>
            </div>
            <Switch checked={queueInvoice} onCheckedChange={setQueueInvoice} />
          </div>

          {/* Student Roster Preview */}
          <div className="rounded-xl border bg-muted/20 p-2.5 space-y-1.5 max-h-36 overflow-y-auto">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Selected Candidate Roster ({selectedStudents.length})
            </p>
            <div className="divide-y divide-border/60 text-xs">
              {selectedStudents.slice(0, 15).map((s) => (
                <div key={s.id} className="py-1 flex items-center justify-between">
                  <span className="font-medium text-foreground truncate max-w-[200px]">{s.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Cl {s.presentClass}-{s.presentSection} • Roll {s.presentRoll}
                  </span>
                </div>
              ))}
              {selectedStudents.length > 15 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1 italic">
                  + {selectedStudents.length - 15} more candidates...
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs h-8"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExecute}
            disabled={isSubmitting}
            className="text-xs h-8 gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Re-Admitting {selectedStudents.length}...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Admit {selectedStudents.length} Students</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
