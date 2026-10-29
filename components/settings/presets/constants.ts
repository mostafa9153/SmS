import React from "react";
import { MapPin, Landmark, School, Sparkles, UserCheck } from "lucide-react";
import { Receipt, GraduationCap, Award } from "lucide-react";


export type PresetSection = "defaults" | "classes" | "marks_scheme" | "fee" | "address" | "bank" | "school" | "ai";
export const VALID_PRESET_SECTIONS: PresetSection[] = ["defaults", "classes", "marks_scheme", "fee", "address", "bank", "school", "ai"];

export interface PresetItemConfig {
  id: PresetSection;
  title: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  activeBg: string;
  activeShadow: string;
  iconBg: string;
  iconColor: string;
}

export const ACADEMIC_PRESET_ITEMS: PresetItemConfig[] = [
  {
    id: "classes",
    title: "Class Management",
    tag: "Classes, Sections & Streams",
    icon: GraduationCap,
    activeBg: "bg-blue-600 text-white border-blue-600",
    activeShadow: "shadow-md shadow-blue-500/25 ring-2 ring-blue-500/30",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "marks_scheme",
    title: "Exam Marks Scheme",
    tag: "V–X Summative & XI–XII Sem",
    icon: Award,
    activeBg: "bg-purple-600 text-white border-purple-600",
    activeShadow: "shadow-md shadow-purple-500/25 ring-2 ring-purple-500/30",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "fee",
    title: "Invoice Fee Presets",
    tag: "Class 5–8, 9–10 & 11–12",
    icon: Receipt,
    activeBg: "bg-violet-600 text-white border-violet-600",
    activeShadow: "shadow-md shadow-violet-500/25 ring-2 ring-violet-500/30",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "defaults",
    title: "Student Entry Defaults",
    tag: "Guardian, Religion, Medium",
    icon: UserCheck,
    activeBg: "bg-amber-600 text-white border-amber-600",
    activeShadow: "shadow-md shadow-amber-500/25 ring-2 ring-amber-500/30",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

export const SYSTEM_PRESET_ITEMS: PresetItemConfig[] = [
  {
    id: "address",
    title: "Address Presets",
    tag: "Villages, PO, PS, Block & GP",
    icon: MapPin,
    activeBg: "bg-emerald-600 text-white border-emerald-600",
    activeShadow: "shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "bank",
    title: "Bank & IFSC Presets",
    tag: "Bank Names & IFSC Codes",
    icon: Landmark,
    activeBg: "bg-teal-600 text-white border-teal-600",
    activeShadow: "shadow-md shadow-teal-500/25 ring-2 ring-teal-500/30",
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "school",
    title: "Feeder Schools",
    tag: "Previous Primary & High Schools",
    icon: School,
    activeBg: "bg-indigo-600 text-white border-indigo-600",
    activeShadow: "shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/30",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "ai",
    title: "AI & OCR Vision Key",
    tag: "Gemini & OpenAI API Config",
    icon: Sparkles,
    activeBg: "bg-pink-600 text-white border-pink-600",
    activeShadow: "shadow-md shadow-pink-500/25 ring-2 ring-pink-500/30",
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
];

export const ALL_PRESET_ITEMS = [...ACADEMIC_PRESET_ITEMS, ...SYSTEM_PRESET_ITEMS];
