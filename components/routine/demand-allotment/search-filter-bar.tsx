"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowRight, X } from "lucide-react";

import type { DemandAllotmentState } from "./use-routine-demand-allotment";

export function SearchFilterBar({ da }: { da: DemandAllotmentState }) {
  const { collapseAll, configuredSchoolStreams, distinctClassNames, expandAll, filterClass, filterStatus, filterStream, searchQuery, setFilterClass, setFilterStatus, setFilterStream, setSearchQuery } = da;
  return (
    <div className="bg-card border rounded-lg p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 flex-1">
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search class, section, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Select value={filterClass} onValueChange={(val) => setFilterClass(val || "all")}>
          <SelectTrigger className="h-8 text-xs w-32 bg-background font-medium">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Classes
            </SelectItem>
            {distinctClassNames.map((cls) => (
              <SelectItem key={cls} value={cls} className="text-xs">
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStream} onValueChange={(val) => setFilterStream(val || "all")}>
          <SelectTrigger className="h-8 text-xs w-32 bg-background font-medium">
            <SelectValue placeholder="All Streams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Streams
            </SelectItem>
            {configuredSchoolStreams.map((st) => (
              <SelectItem key={st} value={st} className="text-xs">
                {st}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "all")}>
          <SelectTrigger className="h-8 text-xs w-32 bg-background font-medium">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Statuses
            </SelectItem>
            <SelectItem value="balanced" className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Balanced
            </SelectItem>
            <SelectItem value="under_allotted" className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Under-Allotted
            </SelectItem>
            <SelectItem value="over_capacity" className="text-xs text-rose-700 dark:text-rose-400 font-medium">
              Over Capacity
            </SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || filterClass !== "all" || filterStream !== "all" || filterStatus !== "all") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setFilterClass("all");
              setFilterStream("all");
              setFilterStatus("all");
            }}
            className="h-8 text-xs font-medium px-2 text-muted-foreground hover:text-foreground"
          >
            Reset Filters
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={expandAll}
          className="h-8 text-xs font-medium px-2.5"
        >
          Expand All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={collapseAll}
          className="h-8 text-xs font-medium px-2.5"
        >
          Collapse
        </Button>
        <Link href="/routine/assignments">
          <Button size="sm" className="h-8 text-xs font-semibold gap-1">
            <span>Verify & Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
