"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSportsConfig } from "@/lib/sports/use-sports-config";
import { useSportsEvents, useSportsParticipants, useStudentEventCounts } from "@/lib/sports/use-sports-events";
import { useEnrollment } from "@/lib/sports/use-enrollment";
import { SportsRulesModal } from "@/components/sports/sports-rules-modal";
import { SportsEventHeader } from "@/components/sports/sports-event-header";
import { StudentPicker } from "@/components/sports/enroll/student-picker";
import { EnrolledList } from "@/components/sports/enroll/enrolled-list";

export default function SportsEnrollmentPage() {
  const params = useParams();
  const eventId = params.id as string;
  // Remount per event so filters/selection never leak between events
  return <SportsEnrollmentView key={eventId} eventId={eventId} />;
}

function SportsEnrollmentView({ eventId }: { eventId: string }) {
  const { config } = useSportsConfig();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"select" | "enrolled">("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: events = [] } = useSportsEvents();
  const event = events.find((e) => e.id === eventId);
  const { data: participants = [], isLoading: isLoadingParticipants } = useSportsParticipants(eventId);
  const { data: studentEventCounts = {} } = useStudentEventCounts();
  const enrolledStudentIds = useMemo(() => new Set(participants.map((p) => p.studentId)), [participants]);
  const { enroll, remove, updateChestNumber, isEnrolling } = useEnrollment(eventId, event);

  const handleEnroll = async () => {
    if (await enroll(Array.from(selectedIds))) setSelectedIds(new Set());
  };

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
              {config.maxEventsPerStudent === 0 ? "∞" : config.maxEventsPerStudent}
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
          {selectedIds.size > 0 && (
            <span className="ml-1.5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px]">
              {selectedIds.size}
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
        <StudentPicker
          event={event}
          enrolledStudentIds={enrolledStudentIds}
          studentEventCounts={studentEventCounts}
          config={config}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onEnroll={handleEnroll}
          isEnrolling={isEnrolling}
          className={mobileTab === "enrolled" ? "hidden lg:flex" : undefined}
        />
        <EnrolledList
          eventId={eventId}
          participants={participants}
          isLoading={isLoadingParticipants}
          config={config}
          onRemove={remove}
          onUpdateChest={updateChestNumber}
          className={mobileTab === "select" ? "hidden lg:flex" : undefined}
        />
      </div>

      <SportsRulesModal open={isRulesOpen} onOpenChange={setIsRulesOpen} />
    </div>
  );
}
