"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface GeneratorModule {
  id: string;
  title: string;
  category: "certificates" | "exams" | "admissions" | "reports" | "tracker" | "others";
  categoryLabel: string;
  formatBadge: string;
  formatVariant?: "default" | "emerald" | "amber" | "sky" | "purple" | "outline";
  description: string;
  href: string;
  trackerHref?: string;
  icon: React.ElementType;
  iconBg: string;
  accentBorder: string;
  gradientGlow: string;
  highlights: string[];
  isFeatured?: boolean;
}

/**
 * Clean, interactive Info Popover (shows description + key highlights on hover or click)
 * Rendered via Base UI Popover & Portal so it never clips or overlaps behind neighboring elements.
 */
function CardInfoPopover({
  module,
  align = "end",
}: {
  module: GeneratorModule;
  align?: "start" | "center" | "end";
}) {
  return (
    <Popover modal={false}>
      <PopoverTrigger
        openOnHover
        delay={80}
        closeDelay={150}
        aria-label={`View specifications for ${module.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-accent/80 active:scale-95 transition-all cursor-pointer data-open:text-primary data-open:bg-primary/10 data-open:ring-1 data-open:ring-primary/30"
      >
        <Info className="h-3.5 w-3.5" />
      </PopoverTrigger>

      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-2rem)] p-3.5 rounded-2xl bg-popover/98 backdrop-blur-md text-popover-foreground text-xs shadow-2xl border border-border/80 space-y-2.5 pointer-events-auto"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <span className="font-bold text-foreground text-xs">{module.title}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {module.formatBadge}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          {module.description}
        </p>

        {/* Features */}
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Key Specifications:
          </p>
          <div className="grid grid-cols-1 gap-1">
            {module.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-foreground/90">
                <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="truncate">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ToolCard({ module: mod }: { module: GeneratorModule }) {
  const router = useRouter();
  const IconComponent = mod.icon;

  return (
    <div
      onClick={() => router.push(mod.href)}
      className={cn(
        "group relative rounded-2xl border bg-card/90 p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md overflow-visible cursor-pointer",
        mod.accentBorder,
        mod.isFeatured && "ring-1 ring-emerald-500/25"
      )}
    >
      {/* Background Hover Accent */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl",
          mod.gradientGlow
        )}
      />

      <div className="relative z-10 space-y-2.5 sm:space-y-3">
        {/* Top: Icon + Format Badge + Info Popover */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "p-2 sm:p-2.5 rounded-xl border group-hover:scale-105 transition-transform duration-200 shrink-0",
              mod.iconBg
            )}
          >
            <IconComponent className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Badge variant={mod.formatVariant || "outline"} className="text-[10px] px-2 py-0.5">
              {mod.formatBadge}
            </Badge>

            {/* Info Icon Button -> Popover */}
            <CardInfoPopover module={mod} align="end" />
          </div>
        </div>

        {/* Title & Category */}
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
            {mod.title}
            {mod.isFeatured && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            )}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {mod.categoryLabel}
          </p>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="relative z-10 pt-2.5 mt-2.5 sm:pt-3 sm:mt-3 border-t border-border/50 flex items-center justify-between gap-2">
        {mod.trackerHref ? (
          <Link
            href={mod.trackerHref}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] font-semibold text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 py-1 px-1.5 rounded-lg active:scale-95"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Track
          </Link>
        ) : (
          <span className="text-[10px] font-medium text-muted-foreground/70 px-1">
            Standard Print
          </span>
        )}

        <span
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-2xs group-hover:shadow-xs group-hover:translate-x-0.5"
        >
          Generate Now
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}
