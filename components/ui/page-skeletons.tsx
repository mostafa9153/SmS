import React from "react";

export function Shimmer({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-slate-200/70 rounded-md before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent ${className}`}
    />
  );
}

export function TablePageSkeleton({
  title = "Loading records...",
  columns = 6,
  rows = 8,
}: {
  title?: string;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-8 w-48 rounded-lg" />
          <Shimmer className="h-4 w-72 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Shimmer className="h-10 w-32 rounded-lg" />
          <Shimmer className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Shimmer className="h-10 w-full rounded-lg" />
          <Shimmer className="h-10 w-full rounded-lg" />
          <Shimmer className="h-10 w-full rounded-lg" />
          <Shimmer className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3.5 flex items-center justify-between gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Shimmer key={i} className="h-4 w-24 rounded" />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div
              key={rIdx}
              className="px-6 py-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 w-44">
                <Shimmer className="h-8 w-8 rounded-full shrink-0" />
                <Shimmer className="h-4 w-28 rounded" />
              </div>
              {Array.from({ length: columns - 1 }).map((_, cIdx) => (
                <Shimmer
                  key={cIdx}
                  className="h-4 w-20 rounded"
                  style={{ width: `${60 + ((rIdx + cIdx) % 4) * 15}px` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  title = "Loading staff directory...",
  count = 8,
}: {
  title?: string;
  count?: number;
}) {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-8 w-44 rounded-lg" />
          <Shimmer className="h-4 w-64 rounded" />
        </div>
        <Shimmer className="h-10 w-36 rounded-lg" />
      </div>

      {/* Search & Filter bar */}
      <div className="flex gap-3">
        <Shimmer className="h-10 flex-1 rounded-lg" />
        <Shimmer className="h-10 w-32 rounded-lg" />
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-3">
              <Shimmer className="h-12 w-12 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Shimmer className="h-4 w-3/4 rounded" />
                <Shimmer className="h-3 w-1/2 rounded" />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Shimmer className="h-3.5 w-full rounded" />
              <Shimmer className="h-3.5 w-4/5 rounded" />
              <Shimmer className="h-3.5 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
