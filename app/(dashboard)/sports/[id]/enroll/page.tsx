"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SportsEvent, SportsParticipant } from "@/lib/sports/types";
import { Student } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Search,
  Check,
  UserCheck,
  Printer,
  Medal,
  AlertTriangle,
  Edit2,
  Trash2,
  Trophy,
  Users,
  Sliders,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useSportsConfig } from "@/lib/sports/use-sports-config";
import { SportsRulesModal } from "@/components/sports/sports-rules-modal";

export default function SportsEnrollmentPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();

  const { config: sportsConfig } = useSportsConfig();
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Mobile Active Tab: "select" or "enrolled"
  const [mobileTab, setMobileTab] = useState<"select" | "enrolled">("select");

  // Search & Filters
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingChestNo, setEditingChestNo] = useState("");

  // 1. Fetch Event Details
  const { data: events = [] } = useQuery<SportsEvent[]>({
    queryKey: ["sports-events"],
    queryFn: async () => {
      const res = await fetch("/api/sports/events");
      const json = await res.json();
      return json.data || [];
    },
  });

  const event = events.find((e) => e.id === eventId);

  // Set default selected class based on event eligibility
  React.useEffect(() => {
    if (event?.eligibleClasses && event.eligibleClasses.length > 0 && !selectedClass) {
      setSelectedClass(event.eligibleClasses[0]);
    }
  }, [event, selectedClass]);

  // 2. Fetch Active Participants for this Event
  const {
    data: participants = [],
    isLoading: isLoadingParticipants,
    refetch: refetchParticipants,
  } = useQuery<SportsParticipant[]>({
    queryKey: ["sports-participants", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/sports/registrations?eventId=${eventId}`);
      const json = await res.json();
      return json.data || [];
    },
  });

  // 3. Fetch Student Event Participation Counts
  const { data: studentEventCounts = {}, refetch: refetchStudentCounts } = useQuery<Record<string, number>>({
    queryKey: ["sports-student-counts"],
    queryFn: async () => {
      const res = await fetch("/api/sports/registrations?studentCounts=true");
      const json = await res.json();
      return json.data || {};
    },
  });

  // 4. Fetch Class Students
  const { data: classStudents = [], isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["students", selectedClass, selectedSection],
    queryFn: async () => {
      if (!selectedClass) return [];
      let url = `/api/students?paginated=false&projection=summary&class=${encodeURIComponent(selectedClass)}`;
      if (selectedSection !== "All") {
        url += `&section=${encodeURIComponent(selectedSection)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    },
    enabled: Boolean(selectedClass),
  });

  // Filter students by search
  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.presentRoll).includes(searchQuery);
      return matchesSearch;
    });
  }, [classStudents, searchQuery]);

  const enrolledStudentIds = useMemo(
    () => new Set(participants.map((p) => p.studentId)),
    [participants]
  );

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const selectAllEligible = () => {
    const unEnrolled = filteredStudents.filter((s) => {
      if (enrolledStudentIds.has(s.id)) return false;
      if (sportsConfig.maxEventsPerStudent > 0 && sportsConfig.enforcementMode === "strict") {
        const count = studentEventCounts[s.id] || 0;
        if (count >= sportsConfig.maxEventsPerStudent) return false;
      }
      return true;
    });
    setSelectedStudentIds(new Set(unEnrolled.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const handleEnroll = async () => {
    if (selectedStudentIds.size === 0) return;
    setIsEnrolling(true);
    try {
      const res = await fetch("/api/sports/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          studentIds: Array.from(selectedStudentIds),
        }),
      });

      if (!res.ok) throw new Error("Enrollment failed");
      toast.success(`Enrolled ${selectedStudentIds.size} student(s) successfully`);
      setSelectedStudentIds(new Set());
      refetchParticipants();
      refetchStudentCounts();
      setMobileTab("enrolled"); // Switch to view enrolled on mobile
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll students");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRemove = async (studentId: string) => {
    try {
      const res = await fetch(
        `/api/sports/registrations?eventId=${eventId}&studentId=${studentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove student");
      toast.success("Student removed from event");
      refetchParticipants();
      refetchStudentCounts();
    } catch (err: any) {
      toast.error(err.message || "Removal failed");
    }
  };

  const handleUpdateChestNumber = async (studentId: string) => {
    if (!editingChestNo.trim()) return;
    try {
      const res = await fetch("/api/sports/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          chestNumber: editingChestNo.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to update chest number");
      toast.success("Chest number updated");
      setEditingStudentId(null);
      refetchParticipants();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    }
  };

  const eligibleClassesList =
    event?.eligibleClasses.length
      ? event.eligibleClasses
      : ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto pb-16">
      {/* Top Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/sports"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-8 w-8 rounded-xl shrink-0"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                {event?.name || "Participant Enrollment"}
              </h1>
              {event && (
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {event.category} • {event.gender}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRulesOpen(true)}
            className="h-8 sm:h-9 rounded-xl text-xs font-semibold gap-1.5"
            title="Configure maximum games per student"
          >
            <Sliders className="h-3.5 w-3.5 text-primary" />
            <span>Limit:</span>
            <span className="font-mono font-bold">
              {sportsConfig.maxEventsPerStudent === 0 ? "∞" : `${sportsConfig.maxEventsPerStudent} Games`}
            </span>
          </Button>

          <Link
            href={`/sports/print?eventId=${eventId}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 sm:h-9 rounded-xl text-xs font-semibold gap-1.5"
            )}
          >
            <Printer className="h-3.5 w-3.5" />
            Print Studio
          </Link>

          <Link
            href={`/sports/${eventId}/results`}
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "h-8 sm:h-9 rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
            )}
          >
            <Medal className="h-3.5 w-3.5" />
            Score Sheet
          </Link>
        </div>
      </div>

      {/* Mobile Tab Switcher (< lg screens) */}
      <div className="grid grid-cols-2 lg:hidden border rounded-2xl p-1 bg-muted/40 text-xs font-bold">
        <button
          onClick={() => setMobileTab("select")}
          className={`py-2 rounded-xl transition-all ${
            mobileTab === "select" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
          }`}
        >
          Select Students
        </button>
        <button
          onClick={() => setMobileTab("enrolled")}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "enrolled" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
          }`}
        >
          <span>Enrolled</span>
          <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px]">
            {participants.length}
          </span>
        </button>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Left Panel: Class Roster & Selection */}
        <div className={`lg:col-span-6 space-y-3 ${mobileTab === "enrolled" ? "hidden lg:block" : "block"}`}>
          <Card className="rounded-2xl p-3.5 border shadow-2xs">
            {/* Filter Controls Row */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-semibold text-muted-foreground">Class:</span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="h-8 rounded-xl border bg-background px-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {eligibleClassesList.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="font-semibold text-muted-foreground">Sec:</span>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="h-8 rounded-xl border bg-background px-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="All">All</option>
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllEligible}
                  className="h-7 text-xs px-2.5 rounded-lg"
                >
                  Select All
                </Button>
                {selectedStudentIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    className="h-7 text-xs px-2.5 text-muted-foreground rounded-lg"
                  >
                    Clear ({selectedStudentIds.size})
                  </Button>
                )}
              </div>
            </div>

            {/* Student Search */}
            <div className="relative my-2.5">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search students by name or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs rounded-xl"
              />
            </div>

            {/* Students List */}
            <div className="h-[480px] sm:h-[520px] overflow-y-auto border rounded-xl divide-y custom-scrollbar">
              {isLoadingStudents ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading class roster...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No students found for this class.</div>
              ) : (
                filteredStudents.map((s) => {
                  const isEnrolled = enrolledStudentIds.has(s.id);
                  const isSelected = selectedStudentIds.has(s.id);
                  const registeredCount = studentEventCounts[s.id] || 0;
                  const isLimitReached =
                    sportsConfig.maxEventsPerStudent > 0 &&
                    registeredCount >= sportsConfig.maxEventsPerStudent;
                  const isStrictBlocked =
                    isLimitReached &&
                    sportsConfig.enforcementMode === "strict" &&
                    !isEnrolled;

                  return (
                    <div
                      key={s.id}
                      onClick={() => !isEnrolled && !isStrictBlocked && toggleStudentSelection(s.id)}
                      className={`flex items-center justify-between p-2.5 text-xs transition-colors select-none ${
                        isEnrolled
                          ? "bg-muted/20 opacity-60 cursor-not-allowed"
                          : isStrictBlocked
                          ? "bg-rose-500/5 opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary/10 border-l-2 border-primary cursor-pointer"
                          : "hover:bg-muted/40 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected || isEnrolled}
                          disabled={isEnrolled || isStrictBlocked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded-md border-gray-300 text-primary shrink-0"
                        />
                        <span className="font-mono font-bold w-6 text-center text-muted-foreground shrink-0">
                          #{s.presentRoll}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-foreground truncate">{s.name}</p>
                            {sportsConfig.maxEventsPerStudent > 0 && !isEnrolled && (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md ${
                                  isLimitReached
                                    ? sportsConfig.enforcementMode === "strict"
                                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/25"
                                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/25"
                                    : "bg-muted/70 text-muted-foreground font-medium"
                                }`}
                              >
                                {registeredCount}/{sportsConfig.maxEventsPerStudent} Games
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            Class {s.presentClass}-{s.presentSection} • {s.gender}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isEnrolled ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                            Enrolled
                          </Badge>
                        ) : isStrictBlocked ? (
                          <Badge variant="destructive" className="text-[9px] font-bold">
                            Max Limit
                          </Badge>
                        ) : isSelected ? (
                          <Badge variant="default" className="text-[10px] font-bold">
                            Selected
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Sticky Enroll CTA */}
            <div className="pt-3 border-t mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Selected: <span className="font-bold text-foreground">{selectedStudentIds.size}</span>
              </span>
              <Button
                onClick={handleEnroll}
                disabled={selectedStudentIds.size === 0 || isEnrolling}
                className="h-8 sm:h-9 text-xs font-bold gap-1.5 rounded-xl shadow-2xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                {isEnrolling ? "Enrolling..." : `Enroll Selected (${selectedStudentIds.size})`}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Panel: Enrolled Participants in this Event */}
        <div className={`lg:col-span-6 space-y-3 ${mobileTab === "select" ? "hidden lg:block" : "block"}`}>
          <Card className="rounded-2xl p-3.5 border shadow-2xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Enrolled Participants ({participants.length})</span>
              </div>
            </div>

            <div className="h-[555px] sm:h-[595px] overflow-y-auto border rounded-xl mt-2.5 divide-y custom-scrollbar">
              {isLoadingParticipants ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading participants...</div>
              ) : participants.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground italic">
                  No participants enrolled in this game yet. Select students from the left panel to enroll.
                </div>
              ) : (
                participants.map((p, index) => {
                  const isEditing = editingStudentId === p.studentId;

                  return (
                    <div key={p.studentId} className="flex items-center justify-between p-2.5 text-xs hover:bg-muted/30">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-muted-foreground w-5 text-center text-[11px] shrink-0">
                          {index + 1}.
                        </span>

                        {/* Chest Number Badge with Inline Edit */}
                        <div className="min-w-[76px] shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingChestNo}
                                onChange={(e) => setEditingChestNo(e.target.value)}
                                className="h-6 w-16 text-xs p-1 font-mono font-bold rounded-lg"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdateChestNumber(p.studentId);
                                  if (e.key === "Escape") setEditingStudentId(null);
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-md"
                                onClick={() => handleUpdateChestNumber(p.studentId)}
                              >
                                <Check className="h-3 w-3 text-emerald-600" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingStudentId(p.studentId);
                                setEditingChestNo(p.chestNumber);
                              }}
                              title="Click to edit Chest Number"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/70 font-mono font-black text-xs hover:bg-primary/20 cursor-pointer border transition-colors"
                            >
                              <span>#{p.chestNumber}</span>
                              <Edit2 className="h-2.5 w-2.5 opacity-40 hover:opacity-100" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-foreground uppercase truncate">{p.studentName}</p>
                          <span className="text-[11px] text-muted-foreground">
                            Class {p.presentClass}-{p.presentSection} • Roll #{p.presentRoll}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {sportsConfig.maxEventsPerStudent > 0 &&
                          p.registeredEventsCount &&
                          p.registeredEventsCount > sportsConfig.maxEventsPerStudent && (
                            <span
                              title={`Participating in ${p.registeredEventsCount} games (exceeds limit of ${sportsConfig.maxEventsPerStudent})`}
                              className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-semibold"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {p.registeredEventsCount}/{sportsConfig.maxEventsPerStudent}
                            </span>
                          )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(p.studentId)}
                          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                          title="Remove from event"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Rules & Limits Modal */}
      <SportsRulesModal open={isRulesOpen} onOpenChange={setIsRulesOpen} />
    </div>
  );
}
