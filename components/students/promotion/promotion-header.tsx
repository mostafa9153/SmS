"use client";

import { RotateCcw, Sliders, GraduationCap } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

import type { PromotionDeskState } from "./use-promotion-desk";

export function PromotionHeader({ desk }: { desk: PromotionDeskState }) {
  const { setUndoModalOpen } = desk;
  return (
    <PageHeader
      back
      icon={GraduationCap}
      title="Promotion"
      actions={<div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUndoModalOpen(true)}
          className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Undo Promotion
        </button>
        <Link
          href="/settings/academic-session"
          className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors inline-flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Sliders className="h-3.5 w-3.5" />
          School-Wide Session Transition →
        </Link>
      </div>}
      className="bg-card p-3.5 sm:p-4 rounded-2xl border shadow-2xs"
    />
  );
}
