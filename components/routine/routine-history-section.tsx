"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchGeneratedRoutineHistoryDb,
  activateGeneratedRoutineDb,
  deleteGeneratedRoutineHistoryDb,
  RoutineHistoryEntry,
} from "@/lib/supabase/db-routine";
import { GeneratedRoutine } from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Clock,
  Sparkles,
  ArrowRight,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  Cpu,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface RoutineHistorySectionProps {
  onSelectRoutine?: (routine: GeneratedRoutine) => void;
  lastGeneratedTime?: number; // Prop to trigger reload when a new routine is generated
}

export function RoutineHistorySection({
  onSelectRoutine,
  lastGeneratedTime,
}: RoutineHistorySectionProps) {
  const router = useRouter();
  const [history, setHistory] = useState<RoutineHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const items = await fetchGeneratedRoutineHistoryDb(10);
      setHistory(items);
    } catch (err) {
      console.error("Failed to load routine history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [lastGeneratedTime]);

  const handleActivateAndView = async (item: RoutineHistoryEntry) => {
    setActivatingId(item.id);
    try {
      const activated = await activateGeneratedRoutineDb(item.id);
      if (activated && onSelectRoutine) {
        onSelectRoutine(activated);
      }
      // Navigate to viewer with the activated routine
      router.push("/routine/viewer");
    } catch (err) {
      console.error("Failed to activate routine:", err);
      setActivatingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this routine from history?")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteGeneratedRoutineHistoryDb(id);
      await loadHistory();
    } catch (err) {
      console.error("Failed to delete routine history:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        formatted: date.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        relative: getRelativeTime(date),
      };
    } catch {
      return { formatted: dateString, relative: "" };
    }
  };

  const getRelativeTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-card border rounded-lg p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Generation History (সর্বশেষ ১০টি রুটিন)
            </h2>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Auto-Prune Active (Max 10)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            সর্বশেষ ১০টি জেনারেট হওয়া রুটিনের তালিকা। পুরনো রুটিনগুলো ডাটাবেস থেকে স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs px-2.5 py-1 font-mono">
            {history.length} / 10 Saved
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs gap-1.5"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* History List */}
      {isLoading && history.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>রুটিন হিস্ট্রি লোড হচ্ছে...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="py-10 border border-dashed rounded-lg flex flex-col items-center justify-center text-center p-6 bg-muted/5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">কোনো পূর্ববর্তী রুটিন নেই</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            উপরে &quot;Generate Timetable&quot; বাটনে ক্লিক করে রুটিন তৈরি করুন। এখানে স্বয়ংক্রিয়ভাবে সর্বশেষ ১০টি রুটিনের হিস্ট্রি সংরক্ষিত থাকবে।
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((item, index) => {
            const timeInfo = formatDate(item.createdAt);
            const isActivating = activatingId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className={`group border rounded-lg p-3.5 transition-all bg-card hover:bg-muted/30 ${
                  item.isActive
                    ? "border-emerald-500/50 dark:border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/5 shadow-xs"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left info: Index, timestamp, status */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        #{index + 1} {index === 0 && "(Latest)"}
                      </span>

                      {item.isActive ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active in Viewer
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Archived Run
                        </Badge>
                      )}

                      {item.phase && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono"
                        >
                          {item.phase === 1 ? "Phase 1: Strict" : "Phase 2: Relaxed"}
                        </Badge>
                      )}

                      <span className="text-xs font-semibold text-foreground truncate">
                        {item.title || "Academic Timetable"}
                      </span>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                      <span className="flex items-center gap-1 text-foreground/80 font-medium">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {timeInfo.formatted}
                        {timeInfo.relative && (
                          <span className="text-muted-foreground text-[10px] font-normal">
                            ({timeInfo.relative})
                          </span>
                        )}
                      </span>

                      {item.executionTimeMs !== undefined && (
                        <span className="flex items-center gap-1 font-mono">
                          <Cpu className="w-3.5 h-3.5 text-primary" />
                          {item.executionTimeMs > 1000
                            ? `${(item.executionTimeMs / 1000).toFixed(1)}s`
                            : `${item.executionTimeMs}ms`}
                        </span>
                      )}

                      {item.iterations !== undefined && item.iterations > 0 && (
                        <span className="flex items-center gap-1 font-mono">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          {item.iterations.toLocaleString()} branches
                        </span>
                      )}

                      {item.days && item.days.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          {item.days.length} Days • {item.teachingPeriods?.length || 0} Periods
                        </span>
                      )}

                      {item.relaxedConstraints && item.relaxedConstraints.length > 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Relaxed: {item.relaxedConstraints.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant={item.isActive ? "secondary" : "default"}
                      size="sm"
                      onClick={() => handleActivateAndView(item)}
                      disabled={isActivating || isDeleting}
                      className={`h-8 text-xs font-semibold gap-1.5 px-3.5 ${
                        item.isActive
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : ""
                      }`}
                    >
                      {isActivating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      {item.isActive ? "View in Viewer" : "Activate & View"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={isDeleting || isActivating}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete this history record"
                    >
                      {isDeleting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-destructive" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
