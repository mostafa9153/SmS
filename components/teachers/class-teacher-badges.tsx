"use client";

import { useMemo } from "react";
import { useSchoolConfigQuery } from "@/lib/utils/school-config-client";
import { getSavedClassPresets } from "@/lib/utils/marks-config";
import { getClassSectionTeacherItems } from "@/components/settings/class-management/helpers";
import type { ClassItem } from "@/components/settings/class-management/types";

const norm = (s?: string) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

/** Chips for the classes/sections a teacher is class teacher of, read from Settings → Presets → Classes. */
export function ClassTeacherBadges({ teacherName }: { teacherName?: string }) {
  const { data: config } = useSchoolConfigQuery();

  const labels = useMemo(() => {
    const fromServer = config?.class_management;
    const classes = (Array.isArray(fromServer) && fromServer.length > 0 ? fromServer : getSavedClassPresets()) as ClassItem[];
    const me = norm(teacherName);
    if (!me) return [];
    const out: string[] = [];
    classes
      .filter((c) => c?.code && c.status !== "Inactive")
      .forEach((c) => {
        getClassSectionTeacherItems(c).forEach((item) => {
          if (norm(item.teacher) === me) out.push(`Class ${c.code} · ${item.label}`);
        });
      });
    return out;
  }, [config, teacherName]);

  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {labels.map((l) => (
        <span key={l} className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
          {l} · Class Teacher
        </span>
      ))}
    </div>
  );
}
