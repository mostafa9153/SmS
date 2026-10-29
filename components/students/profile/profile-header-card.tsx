"use client";

import { StatusBadge } from "@/components/students/status-badge";
import { StudentPhotoAvatar } from "@/components/students/student-photo-avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { formatDate, calculateDetailedAge } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, Award, Sparkles, FileText, GraduationCap, FileSpreadsheet, HeartHandshake, ChevronDown } from "lucide-react";
import Link from "next/link";

import type { StudentProfileState } from "./use-student-profile";

export function ProfileHeaderCard({ profile }: { profile: StudentProfileState }) {
  const { id, queryClient, router, setDeleteDialogOpen, student } = profile;
  if (!student) return null;
  return (
    <div className="rounded-2xl border bg-card shadow-xs p-4 sm:p-5">
      <div className="flex flex-col md:flex-row items-start justify-between gap-5">
        {/* Left / Center: Student Details & Actions */}
        <div className="flex-1 min-w-0 space-y-3.5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{student.name}</h1>
              <CopyButton text={student.name} label="Student Name" iconClassName="h-3.5 w-3.5" />
              <StatusBadge status={student.currentStatus || "Continuing"} size="md" />
              {student.presentSemester && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {student.presentSemester}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 border px-2.5 py-1 text-xs font-mono text-foreground shadow-2xs">
                <span className="text-muted-foreground font-sans text-[11px] font-medium">School ID:</span>
                <span className="font-semibold">{student.schoolId}</span>
                <CopyButton text={student.schoolId} label="School ID" />
              </span>
              {student.studentUniqueCode && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 border px-2.5 py-1 text-xs font-mono text-foreground shadow-2xs">
                  <span className="text-muted-foreground font-sans text-[11px] font-medium">BSP ID:</span>
                  <span className="font-semibold">{student.studentUniqueCode}</span>
                  <CopyButton text={student.studentUniqueCode} label="BSP ID" />
                </span>
              )}
              {student.pen ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 border px-2.5 py-1 text-xs font-mono text-foreground shadow-2xs">
                  <span className="text-muted-foreground font-sans text-[11px] font-medium">PEN:</span>
                  <span className="font-semibold">{student.pen}</span>
                  <CopyButton text={student.pen} label="PEN" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 border border-dashed px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  <span className="font-sans text-[11px]">PEN:</span>
                  <span>Not Assigned</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons (Generators Dropdown, Edit, Delete) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 text-sm font-medium shadow-2xs transition-all cursor-pointer active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Sparkles className="h-4 w-4" />
                <span>Generators</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 p-1.5 rounded-xl border shadow-xl bg-card">
                <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Document Generators
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                  className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors flex items-start gap-2.5"
                  onClick={() => router.push(`/generate/certificate?studentId=${student.id}`)}
                >
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <Award className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs sm:text-sm text-foreground">Character Cert</span>
                    <span className="text-[10px] text-muted-foreground">Standard conduct & character certificate</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors flex items-start gap-2.5"
                  onClick={() => router.push(`/generate/pass-certificate?studentId=${student.id}`)}
                >
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs sm:text-sm text-foreground">Pass Out Cert</span>
                    <span className="text-[10px] text-muted-foreground">Course completion & pass out certificate</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors flex items-start gap-2.5"
                  onClick={() => router.push(`/generate/transfer-certificate?studentId=${student.id}`)}
                >
                  <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs sm:text-sm text-foreground">Transfer Cert (TC)</span>
                    <span className="text-[10px] text-muted-foreground">Official school leaving certificate</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors flex items-start gap-2.5"
                  onClick={() => router.push(`/generate/kanyashree?studentId=${student.id}`)}
                >
                  <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs sm:text-sm text-foreground">Kanyashree Cert</span>
                    <span className="text-[10px] text-muted-foreground">Scheme eligibility document</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors flex items-start gap-2.5"
                  onClick={() => router.push(`/generate/invoice?studentId=${student.id}`)}
                >
                  <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs sm:text-sm text-foreground">Fee Invoice</span>
                    <span className="text-[10px] text-muted-foreground">Printable fee receipt & invoice</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href={`/students/${student.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors shadow-2xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </Link>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-3.5 py-1.5 text-sm font-medium hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 transition-colors shadow-2xs active:scale-95 cursor-pointer"
              title={`Delete ${student.name}'s profile`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Student</span>
            </button>
          </div>
        </div>

        {/* Extreme Right: 3:4 Student Passport Photo Frame */}
        <div className="shrink-0 self-center sm:self-start">
          <StudentPhotoAvatar
            studentId={student.id}
            studentName={student.name}
            photoUrl={student.photoUrl}
            gender={student.gender}
            onPhotoUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["student", id] });
              queryClient.invalidateQueries({ queryKey: ["students"] });
            }}
          />
        </div>
      </div>

      {/* Quick summary row */}
      <div className="mt-4 flex flex-wrap gap-6 border-t pt-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Class / Sec / Roll</p>
          <p className="font-medium">
            {student.presentClass} - {student.presentSection} - Roll {student.presentRoll}
            {student.presentSemester ? ` (${student.presentSemester})` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Current Status</p>
          <div className="mt-0.5">
            <StatusBadge status={student.currentStatus || "Continuing"} size="sm" />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Gender</p>
          <p className="font-medium">{student.gender}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">DOB & Age</p>
          <div className="font-medium flex items-center gap-1 text-xs sm:text-sm">
            <span>
              {formatDate(student.dob)}
              {(() => {
                const dAge = calculateDetailedAge(student.dob);
                return dAge ? ` (${dAge.formattedShort})` : "";
              })()}
            </span>
            {student.dob && (
              <CopyButton text={student.dob} label="Date of Birth" iconClassName="h-3 w-3" />
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Contact</p>
          <div className="font-medium flex items-center gap-1">
            <span>{student.studentContact || student.altMobile || "N/A"}</span>
            {(student.studentContact || student.altMobile) && (
              <CopyButton
                text={student.studentContact || student.altMobile || ""}
                label="Contact Phone"
                iconClassName="h-3 w-3"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
