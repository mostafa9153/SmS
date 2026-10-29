"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Edit2, Medal, Trash2 } from "lucide-react";
import type { SportsConfig, SportsParticipant } from "@/lib/sports/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

interface EnrolledListProps {
  eventId: string;
  participants: SportsParticipant[];
  isLoading: boolean;
  config: SportsConfig;
  onRemove: (p: SportsParticipant) => void;
  /** Resolves true when the new number was saved. */
  onUpdateChest: (studentId: string, chestNumber: string) => Promise<boolean>;
  className?: string;
}

/** Students already in the event, with inline chest-number editing. */
export function EnrolledList({ eventId, participants, isLoading, config, onRemove, onUpdateChest, className }: EnrolledListProps) {
  const [search, setSearch] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingChestNo, setEditingChestNo] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        String(p.chestNumber).includes(q) ||
        `${p.presentClass}-${p.presentSection}`.toLowerCase().includes(q)
    );
  }, [participants, search]);

  const saveChest = async (studentId: string) => {
    if (await onUpdateChest(studentId, editingChestNo)) setEditingStudentId(null);
  };

  const limit = config.maxEventsPerStudent;

  return (
    <Card className={cn("rounded-2xl p-3 gap-2.5 border shadow-2xs", className)}>
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, chest #, class..." size="sm" />
      )}

      <div className="h-[52vh] min-h-[320px] lg:h-[600px] overflow-y-auto border rounded-xl divide-y custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading...</div>
        ) : participants.length === 0 ? (
          <EmptyState compact title="No one enrolled yet." />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No match.</div>
        ) : (
          filtered.map((p) => {
            const isEditing = editingStudentId === p.studentId;
            const overLimit = limit > 0 && (p.registeredEventsCount || 0) > limit;

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
                            if (e.key === "Enter") saveChest(p.studentId);
                            if (e.key === "Escape") setEditingStudentId(null);
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-6 rounded-md" onClick={() => saveChest(p.studentId)}>
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
                      title={`In ${p.registeredEventsCount} games (limit ${limit})`}
                      className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-semibold"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {p.registeredEventsCount}/{limit}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(p)}
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
  );
}
