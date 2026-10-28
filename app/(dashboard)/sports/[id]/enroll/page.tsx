"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SportsParticipant } from "@/lib/sports/types";
import { Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, UserCheck, AlertTriangle, Edit2, Trash2, Sliders, X, Medal } from "lucide-react";
import { toast } from "sonner";
import { useSportsConfig } from "@/lib/sports/use-sports-config";
import { useSportsEvents, SPORTS_CLASS_OPTIONS, GENDER_LABEL } from "@/lib/sports/use-sports-events";
import { SportsRulesModal } from "@/components/sports/sports-rules-modal";
import { SportsEventHeader } from "@/components/sports/sports-event-header";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

export default function SportsEnrollmentPage() {
  const params = useParams();
  const eventId = params.id as string;
  // Remount per event so filters/selection never leak between events
  return <SportsEnrollmentView key={eventId} eventId={eventId} />;
}

function SportsEnrollmentView({ eventId }: { eventId: string }) {
  const { config: sportsConfig } = useSportsConfig();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"select" | "enrolled">("select");

  const [pickedClass, setPickedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideEnrolled, setHideEnrolled] = useState(false);
  const [enrolledSearch, setEnrolledSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingChestNo, setEditingChestNo] = useState("");

  const { data: events = [], refetch: refetchEvents } = useSportsEvents();
  const event = events.find((e) => e.id === eventId);

  const eligibleClassesList = event?.eligibleClasses.length ? event.eligibleClasses : SPORTS_CLASS_OPTIONS;

  // Fall back to the first eligible class until the user picks one
  const selectedClass = event
    ? eligibleClassesList.includes(pickedClass)
      ? pickedClass
      : eligibleClassesList[0]
    : "";

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

  const { data: studentEventCounts = {}, refetch: refetchStudentCounts } = useQuery<Record<string, number>>({
    queryKey: ["sports-student-counts"],
    queryFn: async () => {
      const res = await fetch("/api/sports/registrations?studentCounts=true");
      const json = await res.json();
      return json.data || {};
    },
  });

  // Whole class in one request; sections are derived and filtered client-side
  const { data: classStudents = [], isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["students", selectedClass],
    queryFn: async () => {
      const res = await fetch(
        `/api/students?paginated=false&projection=summary&class=${encodeURIComponent(selectedClass)}`
      );
      const json = await res.json();
      return json.data || [];
    },
    enabled: Boolean(selectedClass),
  });

  const sectionOptions = useMemo(
    () =>
      Array.from(new Set(classStudents.map((s) => s.presentSection).filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
    [classStudents]
  );

  const enrolledStudentIds = useMemo(() => new Set(participants.map((p) => p.studentId)), [participants]);

  const eventGender = event?.gender;
  const genderMatches = (s: Student) =>
    eventGender === "Boys" ? s.gender === "Male" : eventGender === "Girls" ? s.gender === "Female" : true;

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return classStudents
      .filter((s) => {
        if (!genderMatches(s)) return false;
        if (selectedSection !== "All" && s.presentSection !== selectedSection) return false;
        if (hideEnrolled && enrolledStudentIds.has(s.id)) return false;
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || String(s.presentRoll).includes(q);
      })
      .sort((a, b) => (Number(a.presentRoll) || 0) - (Number(b.presentRoll) || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classStudents, searchQuery, selectedSection, hideEnrolled, enrolledStudentIds, eventGender]);

  const isBlocked = (studentId: string) =>
    sportsConfig.maxEventsPerStudent > 0 &&
    sportsConfig.enforcementMode === "strict" &&
    (studentEventCounts[studentId] || 0) >= sportsConfig.maxEventsPerStudent;

  const selectableStudents = filteredStudents.filter((s) => !enrolledStudentIds.has(s.id) && !isBlocked(s.id));
  const allSelectableSelected =
    selectableStudents.length > 0 && selectableStudents.every((s) => selectedStudentIds.has(s.id));

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (allSelectableSelected) selectableStudents.forEach((s) => next.delete(s.id));
      else selectableStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const refreshAll = () => {
    refetchParticipants();
    refetchStudentCounts();
    refetchEvents();
  };

  const handleEnroll = async () => {
    if (selectedStudentIds.size === 0) return;
    setIsEnrolling(true);
    try {
      const res = await fetch("/api/sports/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, studentIds: Array.from(selectedStudentIds) }),
      });
      if (!res.ok) throw new Error("Enrollment failed");
      toast.success(`Enrolled ${selectedStudentIds.size} student(s)`);
      setSelectedStudentIds(new Set());
      refreshAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll students");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRemove = async (p: SportsParticipant) => {
    try {
      const res = await fetch(`/api/sports/registrations?eventId=${eventId}&studentId=${p.studentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove student");
      toast.success(`${p.studentName} removed`);
      refreshAll();
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
        body: JSON.stringify({ studentId, chestNumber: editingChestNo.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update chest number");
      toast.success("Chest number updated");
      setEditingStudentId(null);
      refetchParticipants();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    }
  };

  const filteredParticipants = useMemo(() => {
    const q = enrolledSearch.toLowerCase().trim();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        String(p.chestNumber).includes(q) ||
        `${p.presentClass}-${p.presentSection}`.toLowerCase().includes(q)
    );
  }, [participants, enrolledSearch]);

  const selectClass =
    "h-8 rounded-xl border bg-background px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none";

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto pb-16">
      <SportsEventHeader
        event={event}
        events={events}
        active="enroll"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRulesOpen(true)}
            className="h-8 rounded-xl text-xs font-semibold gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5 text-primary" />
            Limit
            <span className="font-mono font-bold">
              {sportsConfig.maxEventsPerStudent === 0 ? "∞" : sportsConfig.maxEventsPerStudent}
            </span>
          </Button>
        }
      />

      {/* Mobile tab switcher */}
      <div className="grid grid-cols-2 lg:hidden border rounded-xl p-1 bg-muted/40 text-xs font-bold">
        <button
          onClick={() => setMobileTab("select")}
          className={cn(
            "py-2 rounded-lg transition-all",
            mobileTab === "select" ? "bg-background shadow-2xs" : "text-muted-foreground"
          )}
        >
          Add Students
          {selectedStudentIds.size > 0 && (
            <span className="ml-1.5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px]">
              {selectedStudentIds.size}
            </span>
          )}
        </button>
        <button
          onClick={() => setMobileTab("enrolled")}
          className={cn(
            "py-2 rounded-lg transition-all",
            mobileTab === "enrolled" ? "bg-background shadow-2xs" : "text-muted-foreground"
          )}
        >
          Enrolled
          <span className="ml-1.5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px]">
            {participants.length}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
        {/* Left: class roster */}
        <Card className={cn("rounded-2xl p-3 gap-2.5 border shadow-2xs", mobileTab === "enrolled" && "hidden lg:flex")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedClass}
              onValueChange={(val) => {
                if (!val) return;
                setPickedClass(val);
                setSelectedSection("All");
              }}
            >
              <SelectTrigger size="sm" className="w-auto min-w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eligibleClassesList.map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSection} onValueChange={(val) => setSelectedSection(val || "All")}>
              <SelectTrigger size="sm" className="w-auto min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sections</SelectItem>
                {sectionOptions.map((sec) => (
                  <SelectItem key={sec} value={sec}>
                    Section {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eventGender && eventGender !== "All" && (
              <span
                className={cn(
                  "h-8 px-2.5 rounded-xl text-[11px] font-bold flex items-center",
                  eventGender === "Boys"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                )}
              >
                {GENDER_LABEL[eventGender]}
              </span>
            )}
          </div>

          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search name or roll..." size="sm" />

          <div className="flex items-center justify-between text-xs px-1">
            <label className="flex items-center gap-2 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelectableSelected}
                onChange={toggleSelectAll}
                disabled={selectableStudents.length === 0}
                className="h-4 w-4 rounded-md accent-primary"
              />
              Select all ({selectableStudents.length})
            </label>
            <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideEnrolled}
                onChange={(e) => setHideEnrolled(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Hide enrolled
            </label>
          </div>

          <div className="h-[52vh] min-h-[320px] lg:h-[520px] overflow-y-auto border rounded-xl divide-y custom-scrollbar">
            {isLoadingStudents ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>
            ) : filteredStudents.length === 0 ? (
              <EmptyState compact title="No students found." />
            ) : (
              filteredStudents.map((s) => {
                const isEnrolled = enrolledStudentIds.has(s.id);
                const isSelected = selectedStudentIds.has(s.id);
                const registeredCount = studentEventCounts[s.id] || 0;
                const isLimitReached =
                  sportsConfig.maxEventsPerStudent > 0 && registeredCount >= sportsConfig.maxEventsPerStudent;
                const isStrictBlocked = !isEnrolled && isBlocked(s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => !isEnrolled && !isStrictBlocked && toggleStudentSelection(s.id)}
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-2.5 text-xs transition-colors select-none",
                      isEnrolled
                        ? "bg-muted/20 opacity-60 cursor-not-allowed"
                        : isStrictBlocked
                        ? "bg-rose-500/5 opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "bg-primary/10 cursor-pointer"
                        : "hover:bg-muted/40 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected || isEnrolled}
                        disabled={isEnrolled || isStrictBlocked}
                        onChange={() => {}}
                        className="h-4 w-4 rounded-md accent-primary shrink-0 pointer-events-none"
                      />
                      <span className="font-mono font-bold w-7 text-muted-foreground shrink-0">#{s.presentRoll}</span>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{s.name}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {s.presentClass}-{s.presentSection} • {s.gender}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {sportsConfig.maxEventsPerStudent > 0 && !isEnrolled && registeredCount > 0 && (
                        <span
                          title="Games already joined"
                          className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded-md",
                            isLimitReached
                              ? sportsConfig.enforcementMode === "strict"
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {registeredCount}/{sportsConfig.maxEventsPerStudent}
                        </span>
                      )}
                      {isEnrolled ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                          Enrolled
                        </Badge>
                      ) : isStrictBlocked ? (
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          Max
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 -mx-3 -mb-3 px-3 py-2.5 border-t bg-card flex items-center justify-between gap-2">
            {selectedStudentIds.size > 0 ? (
              <button
                onClick={() => setSelectedStudentIds(new Set())}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear {selectedStudentIds.size}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Tap students to select</span>
            )}
            <Button
              onClick={handleEnroll}
              disabled={selectedStudentIds.size === 0 || isEnrolling}
              className="h-9 text-xs font-bold gap-1.5 rounded-xl shadow-2xs"
            >
              <UserCheck className="h-3.5 w-3.5" />
              {isEnrolling ? "Enrolling..." : `Enroll ${selectedStudentIds.size || ""}`.trim()}
            </Button>
          </div>
        </Card>

        {/* Right: enrolled participants */}
        <Card className={cn("rounded-2xl p-3 gap-2.5 border shadow-2xs", mobileTab === "select" && "hidden lg:flex")}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm">
              Enrolled <span className="text-muted-foreground font-semibold">({participants.length})</span>
            </span>
            {participants.length > 0 && (
              <Link
                href={`/sports/${eventId}/results`}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Medal className="h-3.5 w-3.5" />
                Go to Score
              </Link>
            )}
          </div>

          {participants.length > 5 && (
            <SearchInput value={enrolledSearch} onChange={setEnrolledSearch} placeholder="Search name, chest #, class..." size="sm" />
          )}

          <div className="h-[52vh] min-h-[320px] lg:h-[600px] overflow-y-auto border rounded-xl divide-y custom-scrollbar">
            {isLoadingParticipants ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>
            ) : participants.length === 0 ? (
              <EmptyState compact title="No one enrolled yet." />
            ) : filteredParticipants.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No match.</div>
            ) : (
              filteredParticipants.map((p) => {
                const isEditing = editingStudentId === p.studentId;
                const overLimit =
                  sportsConfig.maxEventsPerStudent > 0 &&
                  (p.registeredEventsCount || 0) > sportsConfig.maxEventsPerStudent;

                return (
                  <div key={p.studentId} className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs hover:bg-muted/30">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-[78px] shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-0.5">
                            <Input
                              value={editingChestNo}
                              onChange={(e) => setEditingChestNo(e.target.value)}
                              className="h-7 w-14 text-xs p-1 font-mono font-bold rounded-lg"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateChestNumber(p.studentId);
                                if (e.key === "Escape") setEditingStudentId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-6 rounded-md"
                              onClick={() => handleUpdateChestNumber(p.studentId)}
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingStudentId(p.studentId);
                              setEditingChestNo(p.chestNumber);
                            }}
                            title="Edit chest number"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/70 font-mono font-black hover:bg-primary/15 border transition-colors"
                          >
                            #{p.chestNumber}
                            <Edit2 className="h-2.5 w-2.5 opacity-40" />
                          </button>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold uppercase truncate">{p.studentName}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {p.presentClass}-{p.presentSection} • Roll {p.presentRoll}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {overLimit && (
                        <span
                          title={`In ${p.registeredEventsCount} games (limit ${sportsConfig.maxEventsPerStudent})`}
                          className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-semibold"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {p.registeredEventsCount}/{sportsConfig.maxEventsPerStudent}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(p)}
                        className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                        title="Remove"
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

      <SportsRulesModal open={isRulesOpen} onOpenChange={setIsRulesOpen} />
    </div>
  );
}
