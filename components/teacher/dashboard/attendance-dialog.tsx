"use client";

import { CheckCircle2, UserCheck, GraduationCap, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function AttendanceDialog({ gen }: { gen: TeacherDashboardState }) {
  const { attendanceClass, attendanceDate, attendanceError, attendanceRoster, attendanceSection, attendanceSuccessMsg, handleAttendanceStatusChange, handleMarkAllAttendance, handleSaveAttendance, isAttendanceModalOpen, loadingAttendance, savingAttendance, setAttendanceClass, setAttendanceDate, setAttendanceRoster, setAttendanceSection, setIsAttendanceModalOpen } = gen;
  return (
    <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
      <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-4xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              Student Daily Attendance / Roll-Call
            </DialogTitle>
            {attendanceSuccessMsg && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="h-3.5 w-3.5" /> {attendanceSuccessMsg}
              </span>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Mark student attendance for your class or first period. Defaults to Present for quick 1-click recording.
          </DialogDescription>
        </DialogHeader>

        {/* Class, Section, Date Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-b border-border/50">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class</label>
            <Select value={attendanceClass} onValueChange={(val) => setAttendanceClass(val || "V")}>
              <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map((c) => (
                  <SelectItem key={c} value={c}>Class {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Section</label>
            <Select value={attendanceSection} onValueChange={(val) => setAttendanceSection(val || "A")}>
              <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["ALL", "A", "B", "C", "D"].map((s) => (
                  <SelectItem key={s} value={s}>Section {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</label>
            <Input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="h-8 text-xs rounded-xl bg-background font-bold"
            />
          </div>

          {/* Quick Bulk Actions */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Action</label>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleMarkAllAttendance("PRESENT")}
                className="h-7 text-[10px] font-bold px-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              >
                All Present
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleMarkAllAttendance("ABSENT")}
                className="h-7 text-[10px] font-bold px-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
              >
                All Absent
              </Button>
            </div>
          </div>
        </div>

        {attendanceError && (
          <div className="p-3 my-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{attendanceError}</span>
          </div>
        )}

        {/* Roster Table */}
        <div className="flex-1 overflow-y-auto my-3 border rounded-2xl border-border/70">
          {loadingAttendance ? (
            <div className="p-12 text-center text-muted-foreground">
              <Spinner className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
              <p className="text-xs">Loading students for Class {attendanceClass} ({attendanceSection})...</p>
            </div>
          ) : attendanceRoster.length === 0 ? (
            <EmptyState compact icon={GraduationCap} title={`No active students in Class ${attendanceClass} (${attendanceSection})`} className="p-12" />
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 border-b border-border/80 sticky top-0 z-10 text-[11px] text-muted-foreground">
                <tr>
                  <th className="p-3 font-semibold">Roll</th>
                  <th className="p-3 font-semibold">Student Name</th>
                  <th className="p-3 font-semibold">Class / Sec</th>
                  <th className="p-3 font-semibold text-center w-52">Attendance Status</th>
                  <th className="p-3 font-semibold">Remarks (Optional)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {attendanceRoster.map((st) => (
                  <tr key={st.studentId} className="hover:bg-muted/30">
                    <td className="p-3 font-bold">{st.rollNo || "—"}</td>
                    <td className="p-3 font-medium">{st.studentName}</td>
                    <td className="p-3 text-muted-foreground">
                      Class {st.className} ({st.section})
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
                        <button
                          type="button"
                          onClick={() => handleAttendanceStatusChange(st.studentId, "PRESENT")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                            st.status === "PRESENT"
                              ? "bg-emerald-600 text-white shadow-2xs scale-105"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          P (Present)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttendanceStatusChange(st.studentId, "ABSENT")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                            st.status === "ABSENT"
                              ? "bg-rose-600 text-white shadow-2xs scale-105"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          A (Absent)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttendanceStatusChange(st.studentId, "LATE")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                            st.status === "LATE"
                              ? "bg-amber-500 text-white shadow-2xs scale-105"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          L (Late)
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <Input
                        type="text"
                        placeholder="e.g. sick, doctor note"
                        value={st.remarks || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAttendanceRoster((prev) =>
                            prev.map((item) =>
                              item.studentId === st.studentId ? { ...item, remarks: val } : item
                            )
                          );
                        }}
                        className="h-7 text-xs bg-background rounded-lg max-w-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Total: <strong>{attendanceRoster.length}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              Present: {attendanceRoster.filter((r) => r.status === "PRESENT").length}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-bold">
              Absent: {attendanceRoster.filter((r) => r.status === "ABSENT").length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAttendanceModalOpen(false)}
              className="text-xs text-muted-foreground"
            >
              Close
            </Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={savingAttendance || attendanceRoster.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer gap-1.5 shadow-xs"
            >
              {savingAttendance ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>Save Attendance</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
