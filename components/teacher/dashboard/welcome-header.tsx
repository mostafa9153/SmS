"use client";

import Link from "next/link";
import { Sparkles, CheckCircle2, User, Bell, CalendarX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function WelcomeHeader({ gen }: { gen: TeacherDashboardState }) {
  const { handleMarkNotificationRead, isAbsentToday, notifications, setIsMarkAbsenceOpen, setShowNotifications, showNotifications, stats, teacherName, unreadNotifsCount } = gen;
  return (
    <section className="relative rounded-3xl bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-primary/10 border border-emerald-500/20 p-6 sm:p-8 shadow-xs backdrop-blur-xs z-20">
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              Faculty Workspace v2
            </span>
            {isAbsentToday ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center gap-1">
                <CalendarX className="h-3 w-3" /> Marked On Leave Today
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> On Duty Today
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center gap-2">
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {teacherName} <Sparkles className="h-6 w-6 text-emerald-500" />
          </h2>
          <p className="text-sm text-muted-foreground">
            You have <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.tasksPending} tasks</span> pending today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl bg-background/80 hover:bg-background border border-border/80 text-foreground shadow-2xs hover:border-emerald-500/40 transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-emerald-500" /> In-App Alerts
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">{notifications.length} total</span>
                      {unreadNotifsCount > 0 && (
                        <button
                          onClick={() => handleMarkNotificationRead()}
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border/40 my-2 pr-1">
                    {notifications.length === 0 ? (
                      <EmptyState compact title="No notifications yet" />
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && handleMarkNotificationRead(n.id)}
                          className={`py-2.5 px-2 space-y-1 rounded-xl transition-colors cursor-pointer ${
                            !n.is_read ? "bg-emerald-500/10 hover:bg-emerald-500/15" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />}
                              {n.title}
                            </p>
                            <span className="text-[9px] text-muted-foreground/80 shrink-0">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mark Absence Button */}
          <Button
            variant="outline"
            onClick={() => setIsMarkAbsenceOpen(true)}
            className="h-9 px-3.5 rounded-xl border-border bg-background/80 hover:bg-background text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer hover:border-rose-500/40"
          >
            <CalendarX className="h-3.5 w-3.5 text-rose-500" />
            <span>Mark Leave / Absence</span>
          </Button>

          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background/80 hover:bg-background border border-border/80 text-xs font-semibold text-foreground shadow-2xs hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <User className="h-3.5 w-3.5 text-emerald-500" />
            <span>Profile</span>
          </Link>
        </div>
      </div>
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </section>
  );
}
