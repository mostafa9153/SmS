"use client";

import { Button } from "@/components/ui/button";
import { Plus, Check, Sparkles, School, Layers, Split, Share2, Atom, Briefcase, Palette, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isHsClass } from "@/lib/routine/routine-helpers";
import { formatDemandBreakdown } from "@/lib/routine/routine-domain";
import { Spinner } from "@/components/ui/spinner";

import type { RoutineSubjectsState } from "./use-routine-subjects";

export function ClassSwitcher({ tab }: { tab: RoutineSubjectsState }) {
  const { activeClass, availableClasses, classSubjectCounts, classes, configuredStreamsForActive, handleOpenAddDialog, handleSaveAll, handleSelectClass, handleSelectStream, handleSyncCommonCore, handleSyncFromPresets, isCurrentClassHs, isSavedRecently, isSaving, isSubmitting, isSyncing, selectedStream, subjects, totalSchoolGroupDemand, totalSchoolOrdinaryDemand } = tab;
  return (
    <div className="bg-card border rounded-lg p-2.5 shadow-xs">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b">
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Classes</span>
          <Badge variant="outline" className="text-[10px] font-mono bg-background text-foreground border-border/80 font-bold">
            {formatDemandBreakdown(totalSchoolOrdinaryDemand, totalSchoolGroupDemand.slots, totalSchoolGroupDemand.extra)} p/wk Total Demand {classes && classes.length > 0 ? `(${classes.length} Sections)` : ""}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAddDialog}
            className="h-7 text-xs font-semibold gap-1 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Subject
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSyncFromPresets}
            disabled={isSyncing}
            className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Sync from Presets</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveAll}
            disabled={isSaving || subjects.length === 0}
            className={cn(
              "h-7 text-xs font-semibold gap-1.5 px-3 transition-all duration-150 shadow-xs",
              isSavedRecently
                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {isSaving ? (
              <><Spinner className="w-3 h-3" /><span>Saving...</span></>
            ) : isSavedRecently ? (
              <><Check className="w-3 h-3" /><span>Saved</span></>
            ) : (
              <><Save className="w-3 h-3" /><span>Save</span></>
            )}
          </Button>
        </div>
      </div>


      {/* Horizontal Class Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {availableClasses.map((cls) => {
          const isActive = activeClass === cls;
          const count = classSubjectCounts[cls] || 0;
          const isHs = isHsClass(cls);
          return (
            <button
              key={cls}
              type="button"
              onClick={() => handleSelectClass(cls)}
              className={cn(
                "px-3 py-1.5 rounded-md flex items-center gap-2 whitespace-nowrap transition-all select-none border text-xs font-semibold",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <span>{cls}</span>
              {isHs && (
                <span className={cn(
                  "text-[9px] px-1 rounded uppercase font-mono tracking-wider",
                  isActive ? "bg-primary-foreground/30 text-primary-foreground" : "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                )}>
                  HS
                </span>
              )}
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className={cn(
                  "text-[10px] px-1.5 py-0 font-mono font-bold leading-tight",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                    : count > 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </Badge>
            </button>
          );
        })}


      </div>

      {/* Stream Selector Sub-bar (Only for Higher Secondary classes XI and XII - Filtered Strictly by Configured Streams) */}
      {isCurrentClassHs && (
        <div className="mt-2.5 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Split className="w-3.5 h-3.5 text-purple-600" />
              Stream:
            </span>

            {/* All Streams button */}
            <button
              type="button"
              onClick={() => handleSelectStream("all")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                selectedStream === "all"
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Layers className="w-3 h-3" />
              <span>All Streams</span>
            </button>

            {/* Common Core button */}
            <button
              type="button"
              onClick={() => handleSelectStream("Common")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                selectedStream === "Common"
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Share2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Common (Languages)</span>
            </button>

            {/* Only the streams configured in presets for this class / school */}
            {configuredStreamsForActive.includes("Science") && (
              <button
                type="button"
                onClick={() => handleSelectStream("Science")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                  selectedStream === "Science"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Atom className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                <span>Science</span>
              </button>
            )}

            {configuredStreamsForActive.includes("Commerce") && (
              <button
                type="button"
                onClick={() => handleSelectStream("Commerce")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                  selectedStream === "Commerce"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Briefcase className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Commerce</span>
              </button>
            )}

            {configuredStreamsForActive.includes("Arts") && (
              <button
                type="button"
                onClick={() => handleSelectStream("Arts")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                  selectedStream === "Arts"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Palette className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>Arts / Humanities</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncCommonCore}
              disabled={isSyncing || isSubmitting}
              className="h-6 text-[11px] font-semibold gap-1 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <Share2 className="w-3 h-3" />
              <span>Sync Common (Bengali & English)</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
