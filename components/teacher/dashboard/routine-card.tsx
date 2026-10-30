"use client";

import Link from "next/link";
import { UserCheck, Calendar, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CustomSelect } from "@/components/ui/custom-select";
import { DAYS_OF_WEEK } from "@/components/teacher/dashboard/constants";
import type { TeacherDashboardState } from "./use-teacher-dashboard";

export function RoutineCard({ gen }: { gen: TeacherDashboardState }) {
  const { handleOpenFullRoutine, handleOpenMyWeekRoutine, loadingRoutine, routinePeriodsByDay, routineTeacherId, routineTeachers, selectedDay, setRoutineTeacherId, setSelectedDay } = gen;
  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Daily Class Routine &amp; Timetable
          </h2>
          <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">· Session {new Date().getFullYear()}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {routineTeachers.length > 0 && (
            <CustomSelect
              value={routineTeacherId}
              onChange={setRoutineTeacherId}
              options={[{ label: "Select teacher", value: "" }, ...routineTeachers.map((t) => ({ label: t.name, value: t.id }))]}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenMyWeekRoutine}
            className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 cursor-pointer shadow-2xs"
          >
            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>My Weekly Routine</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenFullRoutine}
            className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer shadow-2xs"
          >
            <Maximize2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Full Routine</span>
          </Button>
        </div>
      </div>

      {/* Day selection tabs with Today indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {DAYS_OF_WEEK.map((day) => {
          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const isActualToday = dayNames[new Date().getDay()] === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedDay === day
                  ? "bg-emerald-600 text-white shadow-xs"
                  : isActualToday
                  ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              <span>{day}</span>
              {isActualToday && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedDay === day
                      ? "bg-white/20 text-white"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Period Slots with 1-Click Roll-Call button */}
      {loadingRoutine ? (
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Spinner className="h-4 w-4 text-emerald-500" />
          Loading your schedule...
        </div>
      ) : (routinePeriodsByDay[selectedDay] || []).length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-muted/20 border border-dashed border-border/70 text-xs text-muted-foreground">
          {routineTeachers.length > 0 && !routineTeacherId ? "Select a teacher to see the routine." : `No classes scheduled for ${selectedDay}.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {(routinePeriodsByDay[selectedDay] || []).map((slot: any, idx: number) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2.5 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    {slot.period}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">{slot.time}</span>
                </div>
                <p className="text-xs font-bold text-foreground">
                  {slot.subj} {slot.isLab && <span className="text-[10px] text-sky-600 font-semibold">(Lab)</span>}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>{slot.cls?.startsWith("Class") ? slot.cls : `Class ${slot.cls}`}-{slot.sec}</span>
                  {slot.room ? <span className="italic">{slot.room}</span> : null}
                </div>
              </div>

              {/* 1-Click Quick Attendance Button for Period */}
              <Link
                href={`/student-attendance?class=${encodeURIComponent(slot.cls)}&section=${encodeURIComponent(slot.sec)}`}
                className="w-full py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{slot.isFirst ? "1st Period Roll-Call" : "Take Attendance"}</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
