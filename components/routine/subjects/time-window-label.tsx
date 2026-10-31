import { Clock, SlidersHorizontal } from "lucide-react";
import type { RoutineSubject } from "@/lib/routine/types";

export function TimeWindowLabel({ timePref, allowedSlots }: Pick<RoutineSubject, "timePref" | "allowedSlots">) {
  if (allowedSlots) {
    const total = Object.values(allowedSlots).reduce((n, list) => n + list.length, 0);
    return (
      <div className="flex items-center gap-1 text-primary">
        <SlidersHorizontal className="w-3 h-3" />
        <span className="normal-case">Custom · {total} slots</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Clock className="w-3 h-3 opacity-60" />
      <span>
        {timePref === "morning" ? "Morning Preference" : timePref === "afternoon" ? "Afternoon Preference" : "Flexible"}
      </span>
    </div>
  );
}
