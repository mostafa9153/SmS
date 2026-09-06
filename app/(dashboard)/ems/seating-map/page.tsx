"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EmsNavTabs } from "@/components/ems/ems-nav-tabs";
import { VisualRoomBlueprint } from "@/components/ems/visual-room-blueprint";
import {
  getSavedAllocations,
  getSavedRooms,
  updateSeatSwap,
  saveAllocation,
} from "@/lib/ems/room-storage";
import {
  ExamAllocation,
  AllocatedRoom,
  SeatAssignment,
  EmsRoom,
} from "@/lib/ems/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  DoorOpen,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  Wand2,
  Armchair,
} from "lucide-react";

export default function EmsSeatingMapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const allocIdFromUrl = searchParams.get("id");

  const [allocations, setAllocations] = useState<ExamAllocation[]>([]);
  const [currentAllocation, setCurrentAllocation] = useState<ExamAllocation | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = getSavedAllocations();
    setAllocations(saved);

    let activeAlloc: ExamAllocation | undefined;

    if (allocIdFromUrl) {
      activeAlloc = saved.find((a) => a.id === allocIdFromUrl);
    }

    if (!activeAlloc && saved.length > 0) {
      activeAlloc = saved[0];
    }

    // If still no allocation exists, generate a rich demo allocation for immediate viewing!
    if (!activeAlloc) {
      const demoAlloc = generateDemoAllocation();
      saveAllocation(demoAlloc);
      setAllocations([demoAlloc]);
      activeAlloc = demoAlloc;
    }

    setCurrentAllocation(activeAlloc);
    if (activeAlloc && activeAlloc.roomAllocations.length > 0) {
      setSelectedRoomId(activeAlloc.roomAllocations[0].roomId);
    }

    setMounted(true);
  }, [allocIdFromUrl]);

  // Handle seat swap
  const handleSwapSeats = (seat1: SeatAssignment, seat2: SeatAssignment) => {
    if (!currentAllocation) return;

    const updated = updateSeatSwap(
      currentAllocation.id,
      selectedRoomId,
      seat1.seatId,
      seat2.seatId
    );

    if (updated) {
      setCurrentAllocation(updated);
      setAllocations(getSavedAllocations());
    }
  };

  const handleSelectAllocation = (allocId: string) => {
    const found = allocations.find((a) => a.id === allocId);
    if (found) {
      setCurrentAllocation(found);
      if (found.roomAllocations.length > 0) {
        setSelectedRoomId(found.roomAllocations[0].roomId);
      }
      router.push(`/ems/seating-map?id=${found.id}`);
    }
  };

  const activeRoom = currentAllocation?.roomAllocations.find(
    (r) => r.roomId === selectedRoomId
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <MapPin className="h-6 w-6" />
            </span>
            <span>Visual Seating Blueprint</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Explore the 2D classroom floor plan with teacher desk, column-wise benches, and student details.
          </p>
        </div>

        {/* Allocation Switcher */}
        {allocations.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Session:</span>
            <select
              value={currentAllocation?.id || ""}
              onChange={(e) => handleSelectAllocation(e.target.value)}
              className="h-9 px-3 text-xs rounded-xl border border-input bg-card font-semibold max-w-[260px] truncate"
            >
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <EmsNavTabs activeTab="seating-map" />

      {/* Allocation Context Banner & Room Switcher Tabs */}
      {currentAllocation && (
        <div className="space-y-3">
          {/* Allocation Info Bar */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {currentAllocation.title}
                </h3>
                <Badge className="bg-primary/15 text-primary border-primary/20 text-xs font-bold">
                  {currentAllocation.examType}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  Year {currentAllocation.academicYear}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Total Seated: <strong>{currentAllocation.summary.totalStudents}</strong> Students •{" "}
                Rooms: <strong>{currentAllocation.roomAllocations.length}</strong>
              </p>
            </div>

            {/* Room Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {currentAllocation.roomAllocations.map((room) => {
                const isSelected = room.roomId === selectedRoomId;
                return (
                  <button
                    key={room.roomId}
                    onClick={() => setSelectedRoomId(room.roomId)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    <DoorOpen className="h-3.5 w-3.5" />
                    <span>{room.roomNumber}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? "bg-primary-foreground/20 text-white"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {room.occupiedSeats}/{room.totalSeats}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Room 2D Seating Blueprint */}
          {activeRoom ? (
            <VisualRoomBlueprint
              room={activeRoom}
              onSwapSeats={handleSwapSeats}
              examTitle={currentAllocation.title}
              examType={currentAllocation.examType}
            />
          ) : (
            <div className="p-12 text-center border border-dashed rounded-2xl">
              <Armchair className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold">No room selected</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to generate a demo allocation if the user has no saved allocations yet
function generateDemoAllocation(): ExamAllocation {
  const rooms = getSavedRooms();
  const room1 = rooms[0];

  const sampleStudents = [
    { name: "Rahul Mondal", roll: 1, class: "IX", sec: "A", id: "s1" },
    { name: "Suman Das", roll: 2, class: "IX", sec: "A", id: "s2" },
    { name: "Priyanka Roy", roll: 3, class: "IX", sec: "A", id: "s3" },
    { name: "Ananya Sen", roll: 4, class: "IX", sec: "A", id: "s4" },
    { name: "Sourav Paul", roll: 5, class: "IX", sec: "A", id: "s5" },
    { name: "Riya Karmakar", roll: 6, class: "IX", sec: "A", id: "s6" },
    { name: "Debjit Ghosh", roll: 7, class: "IX", sec: "A", id: "s7" },
    { name: "Arpita Sarkar", roll: 8, class: "IX", sec: "A", id: "s8" },
    { name: "Sneha Mallick", roll: 9, class: "IX", sec: "A", id: "s9" },
    { name: "Abhishek Das", roll: 10, class: "IX", sec: "A", id: "s10" },
    { name: "Tanmoy Dutta", roll: 11, class: "IX", sec: "A", id: "s11" },
    { name: "Puja Barman", roll: 12, class: "IX", sec: "A", id: "s12" },
    // Class VIII
    { name: "Amitava Saha", roll: 1, class: "VIII", sec: "A", id: "s13" },
    { name: "Moumita Ghosh", roll: 2, class: "VIII", sec: "A", id: "s14" },
    { name: "Bikram Pal", roll: 3, class: "VIII", sec: "A", id: "s15" },
    { name: "Rupam Nandi", roll: 4, class: "VIII", sec: "A", id: "s16" },
    { name: "Sayani Basak", roll: 5, class: "VIII", sec: "A", id: "s17" },
    { name: "Rohit Biswas", roll: 6, class: "VIII", sec: "A", id: "s18" },
    { name: "Anirban Maji", roll: 7, class: "VIII", sec: "A", id: "s19" },
    { name: "Payel Roy", roll: 8, class: "VIII", sec: "A", id: "s20" },
    { name: "Subhajit Dey", roll: 9, class: "VIII", sec: "A", id: "s21" },
    { name: "Pooja Halder", roll: 10, class: "VIII", sec: "A", id: "s22" },
    // Class IX continuing
    { name: "Kushal Roy", roll: 13, class: "IX", sec: "A", id: "s23" },
    { name: "Dipayan Sau", roll: 14, class: "IX", sec: "A", id: "s24" },
    { name: "Manisha Kar", roll: 15, class: "IX", sec: "A", id: "s25" },
    { name: "Shubham Paul", roll: 16, class: "IX", sec: "A", id: "s26" },
    { name: "Nisha Khatun", roll: 17, class: "IX", sec: "A", id: "s27" },
    { name: "Raktim Barik", roll: 18, class: "IX", sec: "A", id: "s28" },
    { name: "Tuhin Samanta", roll: 19, class: "IX", sec: "A", id: "s29" },
    { name: "Sathi Mondal", roll: 20, class: "IX", sec: "A", id: "s30" },
    { name: "Rohan Laha", roll: 21, class: "IX", sec: "A", id: "s31" },
    { name: "Aniket Bag", roll: 22, class: "IX", sec: "A", id: "s32" },
  ];

  let studentIdx = 0;
  let globalSeat = 1;
  const seats: SeatAssignment[] = [];

  room1.columns.forEach((col) => {
    for (let b = 1; b <= col.benchCount; b++) {
      for (let s = 1; s <= col.seatsPerBench; s++) {
        const student = sampleStudents[studentIdx++];
        seats.push({
          seatId: `${room1.id}-C${col.columnIndex}-B${b}-S${s}`,
          roomId: room1.id,
          roomNumber: room1.roomNumber,
          columnIndex: col.columnIndex,
          benchIndex: b,
          seatPosition: s,
          globalSeatNumber: globalSeat++,
          studentId: student?.id,
          studentName: student?.name,
          studentRoll: student?.roll,
          studentClass: student?.class,
          studentSection: student?.sec,
          schoolId: student ? `MHS/2026/01/${student.class}/${student.sec}/${String(student.roll).padStart(3, "0")}` : undefined,
          isVacant: !student,
        });
      }
    }
  });

  const occupied = seats.filter((s) => !s.isVacant).length;

  return {
    id: "alloc-demo-2026",
    title: "1st Summative Evaluation 2026 (Demo Session)",
    academicYear: 2026,
    examType: "1st Summative Evaluation",
    mode: "auto",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roomAllocations: [
      {
        roomId: room1.id,
        roomNumber: room1.roomNumber,
        floor: room1.floor,
        building: room1.building,
        columns: room1.columns,
        seats,
        totalSeats: seats.length,
        occupiedSeats: occupied,
        vacantSeats: seats.length - occupied,
        classesPresent: ["IX-A", "VIII-A"],
      },
    ],
    summary: {
      totalStudents: occupied,
      totalRooms: 1,
      classesAllocated: ["IX-A", "VIII-A"],
    },
  };
}
