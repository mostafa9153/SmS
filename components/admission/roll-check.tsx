"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { checkRoll } from "@/lib/data/admission";

/**
 * Checks as staff type whether a roll is already held in the class-section (the same check the
 * admit routes run), so a clash shows before Confirm instead of as an error after it.
 */
export function useRollCheck(params: {
  className: string;
  section: string;
  roll: string;
  academicYear?: string;
  excludeStudentId?: string;
  excludeApplicationId?: string;
}) {
  const { className, section, roll, academicYear, excludeStudentId, excludeApplicationId } = params;
  const [state, setState] = useState<{ key: string; taken: string | null; nextRoll: number } | null>(null);
  const n = parseInt(roll, 10);
  const key = `${className}|${section}|${n}|${academicYear}`;

  useEffect(() => {
    if (!className || !section || !(n > 0)) return;
    let active = true;
    const t = window.setTimeout(() => {
      checkRoll({ className, section, roll: n, academicYear, excludeStudentId, excludeApplicationId })
        .then((r) => active && setState({ key, ...r }))
        .catch(() => active && setState(null));
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [key, className, section, n, academicYear, excludeStudentId, excludeApplicationId]);

  // A result for an older roll / section is not shown
  const current = state?.key === key ? state : null;
  return { taken: current?.taken ?? null, nextRoll: current?.nextRoll ?? null, checking: n > 0 && !current };
}

/** Red note under the roll box with a one-click switch to the next free roll. */
export function RollTakenNote({ taken, nextRoll, onUse }: { taken: string | null; nextRoll: number | null; onUse: (roll: number) => void }) {
  if (!taken) return null;
  return (
    <div className="mt-1 flex items-start gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        {taken}
        {nextRoll ? (
          <>
            {" · "}
            <button type="button" onClick={() => onUse(nextRoll)} className="font-bold underline underline-offset-2">
              Use {nextRoll}
            </button>
          </>
        ) : null}
      </span>
    </div>
  );
}
