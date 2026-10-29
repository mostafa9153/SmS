"use client";

import { AlertTriangle, Sparkles, Award, Users, Check, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

import type { PromotionDeskState } from "./use-promotion-desk";

export function SummaryMetrics({ desk }: { desk: PromotionDeskState }) {
  const { filterCategory, metrics, setFilterCategory } = desk;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {([
        { key: "all", label: "Total Roster", value: metrics.total, icon: Users, iconCls: "text-muted-foreground", valueCls: undefined, activeCls: "ring-primary border-primary" },
        { key: "promoted", label: "Promoted / Advanced", value: metrics.promoted, icon: Check, iconCls: "text-emerald-700 dark:text-emerald-400", valueCls: "text-emerald-700 dark:text-emerald-400", activeCls: "ring-emerald-500 border-emerald-500 bg-emerald-500/5" },
        { key: "detained", label: "Detained / Repeat", value: metrics.detained, icon: AlertTriangle, iconCls: "text-rose-700 dark:text-rose-400", valueCls: "text-rose-700 dark:text-rose-400", activeCls: "ring-rose-500 border-rose-500 bg-rose-500/5" },
        { key: "supplementary", label: "Supplementary", value: metrics.supplementary, icon: RefreshCw, iconCls: "text-amber-700 dark:text-amber-400", valueCls: "text-amber-700 dark:text-amber-400", activeCls: "ring-amber-500 border-amber-500 bg-amber-500/5" },
        { key: "sent_up", label: "Sent Up / Board", value: metrics.sentUp + metrics.passedOut, icon: Award, iconCls: "text-blue-700 dark:text-blue-400", valueCls: "text-blue-700 dark:text-blue-400", activeCls: "ring-blue-500 border-blue-500 bg-blue-500/5" },
        { key: "overridden", label: "Overridden", value: metrics.overridden, icon: Sparkles, iconCls: "text-indigo-700 dark:text-indigo-400", valueCls: "text-indigo-700 dark:text-indigo-400", activeCls: "ring-indigo-500 border-indigo-500 bg-indigo-500/5" },
      ] as const).map(({ key, label, value, icon, iconCls, valueCls, activeCls }) => (
        <StatCard
          key={key}
          label={label}
          value={value}
          icon={icon}
          iconClassName={iconCls}
          valueClassName={valueCls}
          onClick={() => setFilterCategory(key)}
          active={filterCategory === key}
          className={filterCategory === key ? activeCls : undefined}
        />
      ))}
    </div>
  );
}
