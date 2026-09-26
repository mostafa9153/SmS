"use client";

import React, { useState, useEffect } from "react";
import { getReAdmissionCandidates } from "@/lib/data/admission";
import { getDistinctClasses, getDistinctSections } from "@/lib/data/students";
import type { Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Hash,
  Filter,
} from "lucide-react";
import { cn, sortClasses } from "@/lib/utils";
import { StatusBadge } from "@/components/students/status-badge";
import { toast } from "sonner";

interface Step2OfflineProps {
  onNext: (studentData: Student) => void;
  onBack: () => void;
  initialClass?: string;
  initialSection?: string;
}

export function Step2Offline({
  onNext,
  onBack,
  initialClass,
  initialSection,
}: Step2OfflineProps) {
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (initialClass) return initialClass;
    if (typeof window !== "undefined") {
      return localStorage.getItem("sms_readmission_class") || "V";
    }
    return "V";
  });

  const [selectedSection, setSelectedSection] = useState<string>(() => {
    if (initialSection) return initialSection;
    if (typeof window !== "undefined") {
      return localStorage.getItem("sms_readmission_section") || "A";
    }
    return "A";
  });

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "admitted" | "not_admitted">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<Student[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<string[]>([
    "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"
  ]);
  const [availableSections, setAvailableSections] = useState<string[]>([
    "A", "B", "C", "D"
  ]);

  // Fetch classes and sections on mount
  useEffect(() => {
    getDistinctClasses().then((cls) => {
      if (cls && cls.length > 0) setAvailableClasses(sortClasses(cls));
    }).catch(() => {});

    getDistinctSections().then((secs) => {
      if (secs && secs.length > 0) setAvailableSections(secs);
    }).catch(() => {});
  }, []);

  // Fetch candidates only on clicking Proceed & Load or search
  const fetchCandidates = async () => {
    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("sms_readmission_class", selectedClass);
        if (selectedSection !== "all") {
          localStorage.setItem("sms_readmission_section", selectedSection);
        }
      }

      const data = await getReAdmissionCandidates({
        targetClass: selectedClass,
        section: selectedSection === "all" ? undefined : selectedSection,
        status: statusFilter,
        search: searchQuery.trim() || undefined,
      });

      setCandidates(data);
      setHasLoaded(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load candidates");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates();
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto py-2 px-2 sm:px-4 animate-in fade-in duration-200">
      {/* Header controls & Selection bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0" title="Back to Mode">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs sm:text-sm font-bold text-foreground truncate">Select Candidate</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Class Select */}
          <div className="flex items-center gap-1 flex-1 sm:flex-initial">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">Class:</span>
            <Select value={selectedClass} onValueChange={(v) => v && setSelectedClass(v)}>
              <SelectTrigger className="h-8 flex-1 sm:w-24 text-xs font-semibold">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls} value={cls} className="text-xs">
                    Class {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section Select */}
          <div className="flex items-center gap-1 flex-1 sm:flex-initial">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">Sec:</span>
            <Select value={selectedSection} onValueChange={(v) => v && setSelectedSection(v)}>
              <SelectTrigger className="h-8 flex-1 sm:w-24 text-xs font-semibold">
                <SelectValue placeholder="Sec" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                {availableSections.map((sec) => (
                  <SelectItem key={sec} value={sec} className="text-xs">
                    Sec {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 flex-1 sm:flex-initial">
            <Select value={statusFilter} onValueChange={(v: any) => v && setStatusFilter(v)}>
              <SelectTrigger className="h-8 w-full sm:w-32 text-xs font-semibold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" className="text-xs font-medium">Pending Only</SelectItem>
                <SelectItem value="admitted" className="text-xs font-medium">Admitted Only</SelectItem>
                <SelectItem value="not_admitted" className="text-xs font-medium">Not Admitted</SelectItem>
                <SelectItem value="all" className="text-xs font-medium">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Proceed & Load Button */}
          <Button
            onClick={fetchCandidates}
            disabled={loading}
            size="sm"
            className="h-8 w-full sm:w-auto px-3.5 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Proceed &amp; Load</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {!hasLoaded ? (
        <Card className="border shadow-xs">
          <CardContent className="p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Filter className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Select Class &amp; Section</h3>
              <p className="text-xs text-muted-foreground">
                Choose class and section above and click Proceed to view candidates.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate by name, roll, PEN, ID, or mobile..."
                className="pl-9 h-9 text-xs font-medium rounded-xl"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 px-3 sm:px-4 text-xs font-semibold shrink-0">
              Search
            </Button>
          </form>

          {/* Candidates List */}
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading candidates for Class {selectedClass}...</span>
            </div>
          ) : candidates.length === 0 ? (
            <Card className="border shadow-xs">
              <CardContent className="p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <User className="w-8 h-8 opacity-40" />
                <span className="text-xs font-medium">No candidates found for Class {selectedClass} ({selectedSection})</span>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border bg-card shadow-xs overflow-hidden divide-y divide-border/60">
              {candidates.map((student) => {
                const isAdmitted = student.reAdmissionStatus === "admitted" || (student as any).re_admission_status === "admitted";
                const isNotAdmitted = student.reAdmissionStatus === "not_admitted" || (student as any).re_admission_status === "not_admitted";

                return (
                  <div
                    key={student.id}
                    className={cn(
                      "p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors",
                      isAdmitted && "bg-emerald-500/[0.03]"
                    )}
                  >
                    {/* Left: Student Info */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 overflow-hidden border">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground truncate">{student.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-mono font-bold text-foreground border">
                            Roll #{student.presentRoll || (student as any).present_roll}
                          </span>
                          {(student.currentStatus || (student as any).current_status) && (
                            <StatusBadge status={student.currentStatus || (student as any).current_status} size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5 flex-wrap">
                          <span>{student.schoolId || (student as any).school_id || "ID Pending"}</span>
                          <span>&bull;</span>
                          <span>{student.fatherName || (student as any).father_name || student.guardianName || "N/A"}</span>
                          {student.studentContact && (
                            <>
                              <span>&bull;</span>
                              <a href={`tel:${student.studentContact}`} className="text-primary hover:underline font-bold">
                                {student.studentContact}
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed">
                      {isAdmitted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Admitted</span>
                        </span>
                      ) : isNotAdmitted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          <span>Not Admitted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}

                      <Button
                        size="sm"
                        variant={isAdmitted ? "outline" : "default"}
                        onClick={() => onNext(student)}
                        className={cn(
                          "h-7.5 sm:h-8 px-3 text-xs font-semibold gap-1 rounded-lg",
                          !isAdmitted && "bg-primary text-primary-foreground"
                        )}
                      >
                        <span>{isAdmitted ? "Edit / Re-confirm" : "Select & Continue"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
