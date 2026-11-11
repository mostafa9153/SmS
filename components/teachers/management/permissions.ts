import { GraduationCap, ClipboardList, FileCheck, Activity, BarChart3, Library, Trophy, type LucideIcon } from "lucide-react";
import { PERMISSION_GROUPS, type PermissionGroupId, type PermissionKey } from "@/lib/permissions/registry";

interface SectionStyle {
  icon: LucideIcon;
  color: string;
  badgeColor: string;
  activeBadge: string;
}

// Look only: which permissions exist is decided in lib/permissions/registry.ts.
const STYLE: Record<PermissionGroupId, SectionStyle> = {
  admission: { icon: FileCheck, color: "text-blue-500", badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20", activeBadge: "bg-blue-600 text-white" },
  students: { icon: GraduationCap, color: "text-emerald-500", badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", activeBadge: "bg-emerald-600 text-white" },
  documents: { icon: ClipboardList, color: "text-purple-500", badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20", activeBadge: "bg-purple-600 text-white" },
  academics: { icon: Activity, color: "text-amber-500", badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20", activeBadge: "bg-amber-600 text-white" },
  activities: { icon: Trophy, color: "text-indigo-500", badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", activeBadge: "bg-indigo-600 text-white" },
  reports: { icon: BarChart3, color: "text-rose-500", badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20", activeBadge: "bg-rose-600 text-white" },
  library: { icon: Library, color: "text-teal-500", badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/20", activeBadge: "bg-teal-600 text-white" },
};

interface PermissionSection extends SectionStyle {
  id: PermissionGroupId;
  title: string;
  shortTitle: string;
  desc: string;
  items: { key: PermissionKey; label: string; desc: string }[];
}

export const PERMISSION_SECTIONS: PermissionSection[] = PERMISSION_GROUPS.map((g) => ({
  id: g.id,
  title: g.title,
  shortTitle: g.shortTitle,
  desc: g.desc,
  items: g.items.map((i) => ({ key: i.key, label: i.label, desc: i.desc })),
  ...STYLE[g.id],
}));
