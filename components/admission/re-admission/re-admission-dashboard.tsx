"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CheckCircle2,
  Clock,
  Globe,
  UserCheck,
  Search,
  ArrowLeft,
  Loader2,
  TrendingUp,
  History,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Filter,
  Calendar,
} from "lucide-react";
import { getReAdmissionDashboardStats } from "@/lib/data/admission";
import { getDistinctClasses, getDistinctSections } from "@/lib/data/students";
import { cn, sortClasses } from "@/lib/utils";
import { toast } from "sonner";

interface ReAdmissionDashboardProps {
  onClose: () => void;
  onSelectStudentForAdmission?: (student: any) => void;
}

export function ReAdmissionDashboard({
  onClose,
  onSelectStudentForAdmission,
}: ReAdmissionDashboardProps) {
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sms_readmission_class") || "V";
    }
    return "V";
  });

  const [selectedSection, setSelectedSection] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sms_readmission_section") || "all";
    }
    return "all";
  });

  const [availableClasses, setAvailableClasses] = useState<string[]>([
    "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"
  ]);
  const [availableSections, setAvailableSections] = useState<string[]>([
    "A", "B", "C", "D"
  ]);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "admitted" | "online" | "offline">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getDistinctClasses().then((cls) => {
      if (cls && cls.length > 0) setAvailableClasses(sortClasses(cls));
    }).catch(() => {});

    getDistinctSections().then((secs) => {
      if (secs && secs.length > 0) setAvailableSections(secs);
    }).catch(() => {});
  }, []);

  const handleFetchStats = async () => {
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

      const res = await getReAdmissionDashboardStats({
        targetClass: selectedClass,
        section: selectedSection,
        year: selectedYear,
      });

      setDashboardData(res);
      setHasLoaded(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const studentsList = dashboardData?.students || [];
  const onlineApps = dashboardData?.onlineApplications || [];
  const stats = dashboardData?.stats;

  // Filter students based on active tab and search query
  const filteredStudents = studentsList.filter((s: any) => {
    if (statusTab === "admitted" && s.re_admission_status !== "admitted") return false;
    if (statusTab === "pending" && s.re_admission_status === "admitted") return false;
    
    const isOnline = onlineApps.some(
      (app: any) =>
        app.admitted_student_id === s.id ||
        app.student_name?.toLowerCase() === s.name?.toLowerCase()
    );

    if (statusTab === "online" && !isOnline) return false;
    if (statusTab === "offline" && isOnline) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = s.name?.toLowerCase() || "";
      const roll = String(s.present_roll || "");
      const schoolId = s.school_id?.toLowerCase() || "";
      const pen = s.pen?.toLowerCase() || "";
      const phone = s.student_contact || s.alt_mobile || "";
      return name.includes(q) || roll.includes(q) || schoolId.includes(q) || pen.includes(q) || phone.includes(q);
    }

    return true;
  });

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200 max-w-6xl mx-auto py-2">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
            title="Back to Wizard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">Re-Admission Dashboard</h2>
          </div>
        </div>

        {/* Academic Session Selector in place of duplicate invoice queue */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Session:</span>
          <Select value={selectedYear} onValueChange={(v) => v && setSelectedYear(v)}>
            <SelectTrigger className="h-8 w-28 text-xs font-semibold">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026" className="text-xs font-medium">2026</SelectItem>
              <SelectItem value="2025" className="text-xs font-medium">2025</SelectItem>
              <SelectItem value="2024" className="text-xs font-medium">2024</SelectItem>
              <SelectItem value="2023" className="text-xs font-medium">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Class, Section & Status Filter Bar */}
      <div className="p-3.5 rounded-xl bg-card border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Class:</span>
            <Select value={selectedClass} onValueChange={(v) => v && setSelectedClass(v)}>
              <SelectTrigger className="h-8 w-24 sm:w-28 text-xs font-semibold">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls} value={cls} className="text-xs font-medium">
                    Class {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Section:</span>
            <Select value={selectedSection} onValueChange={(v) => v && setSelectedSection(v)}>
              <SelectTrigger className="h-8 w-28 sm:w-32 text-xs font-semibold">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium">All Sections</SelectItem>
                {availableSections.map((sec) => (
                  <SelectItem key={sec} value={sec} className="text-xs font-medium">
                    Section {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Status:</span>
            <Select value={statusTab} onValueChange={(v: any) => v && setStatusTab(v)}>
              <SelectTrigger className="h-8 w-32 sm:w-36 text-xs font-semibold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium">All Statuses</SelectItem>
                <SelectItem value="pending" className="text-xs font-medium">Pending Re-Admission</SelectItem>
                <SelectItem value="admitted" className="text-xs font-medium">Admitted Only</SelectItem>
                <SelectItem value="online" className="text-xs font-medium">Online Submissions</SelectItem>
                <SelectItem value="offline" className="text-xs font-medium">Offline Candidates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleFetchStats}
          disabled={loading}
          size="sm"
          className="h-8 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
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

      {/* Main Dashboard Content */}
      {!hasLoaded ? (
        <Card className="border shadow-xs">
          <CardContent className="p-10 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Filter className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Select Class &amp; Section</h3>
              <p className="text-xs text-muted-foreground">
                Choose class and section above and click Proceed to view real-time re-admission tracking.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Key Metrics Grid - Interactive Filter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Students Card */}
            <Card
              onClick={() => setStatusTab("all")}
              className={cn(
                "border shadow-2xs cursor-pointer transition-all duration-150 hover:shadow-xs",
                statusTab === "all" && "ring-2 ring-primary border-primary bg-primary/5"
              )}
            >
              <CardContent className="p-3.5 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-semibold">Total Students</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-bold text-foreground">{stats?.totalEligible || 0}</span>
                  {stats?.previousYearHistory && (
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-0.5">
                      <History className="w-3 h-3" />
                      <span>Prev: {stats.previousYearHistory.totalCount}</span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admitted Students Card */}
            <Card
              onClick={() => setStatusTab("admitted")}
              className={cn(
                "border border-emerald-500/20 bg-emerald-500/5 shadow-2xs cursor-pointer transition-all duration-150 hover:shadow-xs",
                statusTab === "admitted" && "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/15"
              )}
            >
              <CardContent className="p-3.5 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                  <span className="text-[11px] font-semibold">Re-Admitted</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    {stats?.admittedCount || 0}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    {stats?.reAdmissionRate || 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Pending Students Card */}
            <Card
              onClick={() => setStatusTab("pending")}
              className={cn(
                "border border-amber-500/20 bg-amber-500/5 shadow-2xs cursor-pointer transition-all duration-150 hover:shadow-xs",
                statusTab === "pending" && "ring-2 ring-amber-500 border-amber-500 bg-amber-500/15"
              )}
            >
              <CardContent className="p-3.5 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                  <span className="text-[11px] font-semibold">Pending</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                    {stats?.pendingCount || 0}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    Remaining
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Online Breakdown Card */}
            <Card
              onClick={() => setStatusTab("online")}
              className={cn(
                "border border-blue-500/20 bg-blue-500/5 shadow-2xs cursor-pointer transition-all duration-150 hover:shadow-xs",
                statusTab === "online" && "ring-2 ring-blue-500 border-blue-500 bg-blue-500/15"
              )}
            >
              <CardContent className="p-3.5 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
                  <span className="text-[11px] font-semibold">Online Submissions</span>
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {stats?.online?.totalSubmitted || 0}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    {stats?.online?.admitted || 0} Confirmed
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Roster Section */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/15">
              {/* Status Segmented Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                <Button
                  variant={statusTab === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusTab("all")}
                  className="h-7 text-xs font-semibold px-2.5"
                >
                  <span>All ({studentsList.length})</span>
                </Button>

                <Button
                  variant={statusTab === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusTab("pending")}
                  className={cn(
                    "h-7 text-xs font-semibold px-2.5",
                    statusTab !== "pending" && "text-amber-700 dark:text-amber-400 border-amber-500/30"
                  )}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Pending ({stats?.pendingCount || 0})</span>
                </Button>

                <Button
                  variant={statusTab === "admitted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusTab("admitted")}
                  className={cn(
                    "h-7 text-xs font-semibold px-2.5",
                    statusTab !== "admitted" && "text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  )}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  <span>Admitted ({stats?.admittedCount || 0})</span>
                </Button>

                <Button
                  variant={statusTab === "online" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusTab("online")}
                  className={cn(
                    "h-7 text-xs font-semibold px-2.5",
                    statusTab !== "online" && "text-blue-700 dark:text-blue-400 border-blue-500/30"
                  )}
                >
                  <Globe className="w-3 h-3 mr-1" />
                  <span>Online ({stats?.online?.totalSubmitted || 0})</span>
                </Button>

                <Button
                  variant={statusTab === "offline" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusTab("offline")}
                  className={cn(
                    "h-7 text-xs font-semibold px-2.5",
                    statusTab !== "offline" && "text-muted-foreground border-border/80"
                  )}
                >
                  <UserCheck className="w-3 h-3 mr-1" />
                  <span>Offline</span>
                </Button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, roll, school ID..."
                  className="h-7 pl-8 text-xs font-medium rounded-lg"
                />
              </div>
            </div>

            {/* List View */}
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No students match the selected filter.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredStudents.map((s: any) => {
                  const isAdmitted = s.re_admission_status === "admitted";
                  const isOnline = onlineApps.some(
                    (a: any) => a.admitted_student_id === s.id || a.student_name?.toLowerCase() === s.name?.toLowerCase()
                  );

                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "p-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors",
                        isAdmitted ? "bg-emerald-500/[0.02]" : ""
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            s.name?.charAt(0)?.toUpperCase() || "S"
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground truncate">{s.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-mono font-bold text-foreground border">
                              Roll #{s.present_roll}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                            <span>{s.school_id || "ID Pending"}</span>
                            <span>&bull;</span>
                            <span>Guardian: {s.father_name || s.guardian_name || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isOnline ? (
                          <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-bold bg-muted text-muted-foreground border-border/80">
                            Offline
                          </Badge>
                        )}

                        {isAdmitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Admitted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}

                        {onSelectStudentForAdmission && (
                          <Button
                            size="sm"
                            variant={isAdmitted ? "outline" : "default"}
                            onClick={() => onSelectStudentForAdmission(s)}
                            className="h-7 text-xs font-semibold px-2.5"
                          >
                            {isAdmitted ? "Edit" : "Admit"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
