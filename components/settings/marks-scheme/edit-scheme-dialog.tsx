"use client";

import { Sliders, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";
import { getDefaultHsSubjectMarks } from "@/lib/utils/marks-config";

import type { MarksSchemeState } from "./use-marks-scheme";

export function EditSchemeDialog({ ms }: { ms: MarksSchemeState }) {
  const { editScheme1stPractical, editScheme1stWritten, editScheme2ndPractical, editScheme2ndWritten, editSchemeAnnualPractical, editSchemeAnnualWritten, editSchemeSubjectCount, editSubjectBreakdown, editVariations, editingScheme, handleSaveEditScheme, setEditScheme1stPractical, setEditScheme1stWritten, setEditScheme2ndPractical, setEditScheme2ndWritten, setEditSchemeAnnualPractical, setEditSchemeAnnualWritten, setEditSubjectBreakdown, setEditVariations, setEditingScheme } = ms;
  return (
    <Dialog open={!!editingScheme} onOpenChange={(open) => !open && setEditingScheme(null)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Edit Marks Scheme: {editingScheme?.className}
          </DialogTitle>
        </DialogHeader>

        {editingScheme && (
          <form onSubmit={handleSaveEditScheme} className="space-y-4 pt-2">
            {editingScheme.classCode === "XI" || editingScheme.classCode === "XII" ? (
              <div className="space-y-3.5">
                {/* 1. Marks Split Variations Definition */}
                <div className="p-3 rounded-xl border space-y-2.5 bg-card shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Marks Split Variations (Division Presets)</span>
                      </h4>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newId = `var-${Date.now()}`;
                        setEditVariations((prev) => [
                          ...prev,
                          { id: newId, name: `Variation ${prev.length + 1}`, written: 40, practical: 10 },
                        ]);
                      }}
                      className="h-6 text-[11px] px-2 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Split Variation</span>
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {editVariations.map((v, vIdx) => {
                      const total = (Number(v.written) || 0) + (Number(v.practical) || 0);
                      return (
                        <div
                          key={v.id || vIdx}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 p-1.5 rounded-lg border bg-muted/30"
                        >
                          <div className="flex-1">
                            <Input
                              placeholder="Variation Label (e.g. Lab, Project, Theory)"
                              value={v.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditVariations((prev) =>
                                  prev.map((item, i) => (i === vIdx ? { ...item, name: val } : item))
                                );
                              }}
                              className="h-6 text-xs font-medium"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-semibold">Written:</span>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={v.written}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditVariations((prev) =>
                                    prev.map((item, i) => (i === vIdx ? { ...item, written: val } : item))
                                  );
                                }}
                                className="h-6 text-xs font-mono w-14 text-center p-0"
                              />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">+</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-semibold">Practical:</span>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={v.practical}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditVariations((prev) =>
                                    prev.map((item, i) => (i === vIdx ? { ...item, practical: val } : item))
                                  );
                                }}
                                className="h-6 text-xs font-mono w-14 text-center p-0"
                              />
                            </div>
                            <div className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
                              = {total} M
                            </div>
                            {editVariations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setEditVariations((prev) => prev.filter((_, i) => i !== vIdx))}
                                className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                title="Remove Variation"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Subject Allocation to Split Variations Table */}
                <div className="p-3 rounded-xl border space-y-2 bg-card shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Subject Allocation to Split Variations
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {(editingScheme.subjects || []).length} Subjects
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const autoMap: Record<string, { written?: number; practical?: number }> = {};
                        (editingScheme.subjects || []).forEach((sub) => {
                          const smart = getDefaultHsSubjectMarks(sub);
                          autoMap[sub] = { written: smart.written, practical: smart.practical };
                        });
                        setEditSubjectBreakdown(autoMap);
                        showToast({
                          type: "info",
                          title: "WBCHSE Splits Auto-Assigned",
                          description: "Lab subjects assigned 35+15 and Project subjects assigned 40+10.",
                        });
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer underline"
                    >
                      Auto WBCHSE Assign
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-56 border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/95 backdrop-blur-xs text-muted-foreground text-[10px] z-10 border-b">
                        <tr>
                          <th className="py-1.5 px-2.5 text-left font-semibold">Subject</th>
                          <th className="py-1.5 px-2 text-left font-semibold">Assign Split</th>
                          <th className="py-1.5 px-1 text-center font-semibold w-16">Written</th>
                          <th className="py-1.5 px-1 text-center font-semibold w-16">Practical</th>
                          <th className="py-1.5 px-1 text-center font-semibold w-12">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {(editingScheme.subjects || []).map((sub) => {
                          const item = editSubjectBreakdown[sub] || getDefaultHsSubjectMarks(sub);
                          const w = item.written !== undefined ? item.written : 40;
                          const p = item.practical !== undefined ? item.practical : 10;
                          const tot = w + p;

                          return (
                            <tr key={sub} className="hover:bg-muted/20">
                              <td className="py-1.5 px-2.5 font-medium text-foreground">
                                <span className="truncate block max-w-[150px]" title={sub}>
                                  {sub}
                                </span>
                              </td>
                              <td className="py-1.5 px-2">
                                <div className="flex flex-wrap gap-1">
                                  {editVariations.map((v) => {
                                    const isSelected = w === v.written && p === v.practical;
                                    return (
                                      <button
                                        key={v.id}
                                        type="button"
                                        onClick={() =>
                                          setEditSubjectBreakdown((prev) => ({
                                            ...prev,
                                            [sub]: { written: v.written, practical: v.practical },
                                          }))
                                        }
                                        className={cn(
                                          "px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold transition-all cursor-pointer",
                                          isSelected
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                            : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                        title={`${v.name} (${v.written}w + ${v.practical}p)`}
                                      >
                                        {v.written}+{v.practical}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-1.5 px-1 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={w}
                                  onChange={(e) => {
                                    const newW = parseFloat(e.target.value) || 0;
                                    setEditSubjectBreakdown((prev) => ({
                                      ...prev,
                                      [sub]: {
                                        written: newW,
                                        practical: prev[sub]?.practical !== undefined ? prev[sub].practical : p,
                                      },
                                    }));
                                  }}
                                  className="h-6 text-xs font-mono text-center w-14 mx-auto p-0"
                                />
                              </td>
                              <td className="py-1.5 px-1 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={p}
                                  onChange={(e) => {
                                    const newP = parseFloat(e.target.value) || 0;
                                    setEditSubjectBreakdown((prev) => ({
                                      ...prev,
                                      [sub]: {
                                        written: prev[sub]?.written !== undefined ? prev[sub].written : w,
                                        practical: newP,
                                      },
                                    }));
                                  }}
                                  className="h-6 text-xs font-mono text-center w-14 mx-auto p-0"
                                />
                              </td>
                              <td className="py-1.5 px-1 text-center font-mono font-bold text-foreground">
                                {tot}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grand Total Preview */}
                <div className="rounded-lg p-2.5 bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Semester Marks Standard:</span>
                  <span className="font-mono font-extrabold text-xs text-indigo-700 dark:text-indigo-300">
                    50 Marks / Subject (Sem 1 + Sem 2 = 100/sub • Total: {editSchemeSubjectCount * 100} Marks)
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="text-xs font-bold text-foreground">1st Summative</span>
                    <span className="text-[11px] font-mono font-bold text-primary">
                      Total: {editSchemeSubjectCount * ((Number(editScheme1stWritten) || 0) + (Number(editScheme1stPractical) || 0))} Marks
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editScheme1stWritten}
                        onChange={(e) => setEditScheme1stWritten(parseFloat(e.target.value) || 0)}
                        className="text-xs font-mono h-7"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Practical / Oral</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editScheme1stPractical}
                        onChange={(e) => setEditScheme1stPractical(parseFloat(e.target.value) || 0)}
                        className="text-xs font-mono h-7"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="text-xs font-bold text-foreground">2nd Summative</span>
                    <span className="text-[11px] font-mono font-bold text-primary">
                      Total: {editSchemeSubjectCount * ((Number(editScheme2ndWritten) || 0) + (Number(editScheme2ndPractical) || 0))} Marks
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editScheme2ndWritten}
                        onChange={(e) => setEditScheme2ndWritten(parseFloat(e.target.value) || 0)}
                        className="text-xs font-mono h-7"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Practical / Oral</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editScheme2ndPractical}
                        onChange={(e) => setEditScheme2ndPractical(parseFloat(e.target.value) || 0)}
                        className="text-xs font-mono h-7"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="text-xs font-bold text-foreground">3rd / Annual Exam</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      Total: {editSchemeSubjectCount * ((Number(editSchemeAnnualWritten) || 0) + (Number(editSchemeAnnualPractical) || 0))} Marks
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editSchemeAnnualWritten}
                        onChange={(e) => setEditSchemeAnnualWritten(parseFloat(e.target.value) || 0)}
                        className="text-xs font-mono h-7"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Practical / Project</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editSchemeAnnualPractical}
                        onChange={(e) => setEditSchemeAnnualPractical(parseFloat(e.target.value) || 0)}
                        className="text-xs font-mono h-7"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg p-2.5 bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Grand Total Marks:</span>
                  <span className="font-mono font-extrabold text-xs text-primary">
                    {editSchemeSubjectCount * (
                      (Number(editScheme1stWritten) || 0) +
                      (Number(editScheme1stPractical) || 0) +
                      (Number(editScheme2ndWritten) || 0) +
                      (Number(editScheme2ndPractical) || 0) +
                      (Number(editSchemeAnnualWritten) || 0) +
                      (Number(editSchemeAnnualPractical) || 0)
                    )}{" "}
                    Marks
                  </span>
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingScheme(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Save Scheme
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
