"use client";

import { Receipt, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function RecentActivity({ gen }: { gen: TeacherDashboardState }) {
  const { activities, isActivityFeedOpen, setIsActivityFeedOpen } = gen;
  return (
    <section className="rounded-2xl bg-card border border-border/80 shadow-xs transition-all overflow-hidden">
      <button
        type="button"
        onClick={() => setIsActivityFeedOpen((prev) => !prev)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            My Real-Time Collection &amp; Activity Feed
          </h2>
          {activities.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {activities.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">Live Activity Tracker</span>
          <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-transform">
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isActivityFeedOpen && "rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      {isActivityFeedOpen && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 space-y-3 border-t border-border/60 animate-in fade-in-50 duration-200">
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              No recent re-admissions or fee collections recorded yet for this session.
            </p>
          ) : (
            <div className="overflow-x-auto pt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] text-muted-foreground">
                    <th className="pb-2.5 font-semibold">Time</th>
                    <th className="pb-2.5 font-semibold">Action</th>
                    <th className="pb-2.5 font-semibold">Student Name</th>
                    <th className="pb-2.5 font-semibold">Class / Sec</th>
                    <th className="pb-2.5 font-semibold text-right">Fee Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-foreground">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 text-muted-foreground text-[10px]">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                          {act.action_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium">{act.target_student_name || "—"}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {act.student_class ? `Class ${act.student_class} (${act.section || "—"})` : "—"}
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        {act.amount_collected > 0 ? `₹${Number(act.amount_collected).toLocaleString()}` : "₹0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
