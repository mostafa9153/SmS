import { GraduationCap, ClipboardList, FileCheck, Activity, BarChart3 } from "lucide-react";
import { TeacherPermissions } from "@/lib/types/teacher";


interface PermissionItem {
  key: keyof TeacherPermissions;
  label: string;
  desc: string;
}

interface PermissionSection {
  id: string;
  title: string;
  shortTitle: string;
  icon: any;
  color: string;
  badgeColor: string;
  activeBadge: string;
  desc: string;
  items: PermissionItem[];
}

export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    id: "admission",
    title: "Student Admission",
    shortTitle: "Admission",
    icon: FileCheck,
    color: "text-blue-500",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    activeBadge: "bg-blue-600 text-white",
    desc: "Re-admission, offline/online new entry & application logs",
    items: [
      { key: "can_handle_readmission", label: "Re-Admission Processing", desc: "Process student re-admissions & class upgrades" },
      { key: "can_handle_new_admission", label: "New Admission (Offline / Manual)", desc: "Enter manual offline admission forms" },
      { key: "can_handle_new_admission_online", label: "New Admission (Online Form)", desc: "Process incoming online applications" },
      { key: "can_handle_ai_scan_admission", label: "AI Scan Admission", desc: "Use camera/doc scanner for admission" },
      { key: "can_view_admission_applications", label: "View Admission Applications", desc: "Browse & inspect applicant submissions" },
      { key: "can_view_admission_invoices", label: "View Admission Invoices", desc: "Inspect admission receipts & payments" },
    ],
  },
  {
    id: "students",
    title: "Students Management",
    shortTitle: "Students",
    icon: GraduationCap,
    color: "text-emerald-500",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    activeBadge: "bg-emerald-600 text-white",
    desc: "Directory, student profiles, edits & bulk imports",
    items: [
      { key: "can_view_students", label: "View Students Directory", desc: "Search & browse active students list" },
      { key: "can_view_student_profile", label: "View Student Profile", desc: "Inspect student personal, parent & academic info" },
      { key: "can_edit_student_profile", label: "Edit Student Profile", desc: "Modify student bio, phone, roll, blood group" },
      { key: "can_add_student_manual", label: "Add Student Manually", desc: "Directly create new student record" },
      { key: "can_bulk_upload_students", label: "Bulk CSV Upload", desc: "Import multi-student spreadsheet" },
      { key: "can_view_old_students", label: "Old / Alumni Students", desc: "Browse alumni & past academic records" },
    ],
  },
  {
    id: "documents",
    title: "Generate & Documents",
    shortTitle: "Documents",
    icon: ClipboardList,
    color: "text-purple-500",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    activeBadge: "bg-purple-600 text-white",
    desc: "Invoices, marksheets, admit cards, ID cards & certificates",
    items: [
      { key: "can_generate_invoices", label: "Fee Invoices", desc: "Create & print fee payment receipts" },
      { key: "can_generate_marksheets", label: "Exam Marksheets", desc: "Generate & print CCE format student marksheets" },
      { key: "can_generate_admit_cards", label: "Admit Cards", desc: "Generate official exam admission cards" },
      { key: "can_generate_certificates", label: "Character Certificate", desc: "Issue official student character certificates" },
      { key: "can_generate_transfer_certificate", label: "Transfer Certificate (TC)", desc: "Generate official school transfer certificates" },
      { key: "can_generate_pass_certificate", label: "Pass / Promotion Certificate", desc: "Issue pass & completion certificates" },
      { key: "can_generate_kanyashree", label: "Kanyashree Certificate", desc: "Generate government scheme certificates" },
      { key: "can_generate_id_card", label: "Student ID Cards", desc: "Generate & print student identity cards" },
      { key: "can_print_admission_form", label: "Blank Admission Form", desc: "Print blank physical school admission forms" },
      { key: "can_generate_tabulation", label: "Tabulation Sheet", desc: "Export multi-student academic result sheets" },
      { key: "can_view_certificate_tracker", label: "Certificate Tracker", desc: "Track & verify generated certificate serials" },
    ],
  },
  {
    id: "academics",
    title: "Results & Exam (EMS)",
    shortTitle: "Results & EMS",
    icon: Activity,
    color: "text-amber-500",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    activeBadge: "bg-amber-600 text-white",
    desc: "Marks entry, seating plan & exam hall scheduling",
    items: [
      { key: "can_enter_results", label: "Result / Marks Entry", desc: "Enter exam scores for assigned subjects & classes" },
      { key: "can_view_seating_plan", label: "Exam Seating Plan", desc: "View exam hall arrangement and roll seating" },
      { key: "can_manage_ems", label: "EMS Auto Seating", desc: "Manage exam halls and auto seating generator" },
      { key: "can_manage_sports", label: "Sports & Games", desc: "Create events, enrol students and record results" },
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    shortTitle: "Reports",
    icon: BarChart3,
    color: "text-rose-500",
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    activeBadge: "bg-rose-600 text-white",
    desc: "School analytics, student demographics & fee reports",
    items: [
      { key: "can_view_reports", label: "View Reports & Analytics", desc: "Access reports & analytics section" },
    ],
  },
];
