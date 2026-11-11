/**
 * Single source of truth for teacher permissions.
 *
 * Adding a section to the app:
 *   1. add an item here (key, label, default, routes). The Permissions dialog,
 *      sidebar, search, page guard and the TeacherPermissions type pick it up;
 *   2. guard its API routes with requireStaff("<key>").
 * A dashboard page with no rule here is closed to Teachers, and
 * tests/unit/route-access.test.ts fails until the page is mapped.
 *
 * Pure data: imported by the proxy, server routes and client components.
 */

interface Item {
  key: string;
  label: string;
  desc: string;
  /** Granted to a teacher account until an admin changes it. */
  default: boolean;
  /** Page prefixes this permission opens. `*` matches one segment. */
  routes?: readonly string[];
  /** Needs to read student lists (GET /api/students and friends). */
  students?: boolean;
}

interface Group {
  id: string;
  title: string;
  shortTitle: string;
  desc: string;
  items: readonly Item[];
}

export const PERMISSION_GROUPS = [
  {
    id: "admission",
    title: "Student Admission",
    shortTitle: "Admission",
    desc: "Re-admission, offline/online new entry & application logs",
    items: [
      { key: "can_handle_readmission", label: "Re-Admission Processing", desc: "Process student re-admissions & class upgrades", default: true, routes: ["/admission/re"], students: true },
      { key: "can_handle_new_admission", label: "New Admission (Offline / Manual)", desc: "Enter manual offline admission forms", default: false, routes: ["/admission/new/offline"], students: true },
      { key: "can_handle_new_admission_online", label: "New Admission (Online Form)", desc: "Process incoming online applications", default: false, routes: ["/admission/new/apply"], students: true },
      { key: "can_handle_ai_scan_admission", label: "AI Scan Admission", desc: "Use camera/doc scanner for admission", default: false, routes: ["/admission/new/ai-scan"], students: true },
      { key: "can_view_admission_applications", label: "View Admission Applications", desc: "Browse & inspect applicant submissions", default: false, routes: ["/admission/applications", "/pending-students"], students: true },
      { key: "can_view_admission_invoices", label: "View Admission Invoices", desc: "Inspect admission receipts & payments", default: false, routes: ["/admission/invoices", "/admission/receipt"], students: true },
    ],
  },
  {
    id: "students",
    title: "Students Management",
    shortTitle: "Students",
    desc: "Directory, student profiles, edits, attendance & bulk imports",
    items: [
      { key: "can_view_students", label: "View Students Directory", desc: "Search & browse active students list", default: true, routes: ["/students", "/active-students"], students: true },
      { key: "can_view_student_profile", label: "View Student Profile", desc: "Inspect student personal, parent & academic info", default: true, routes: ["/students/*"], students: true },
      { key: "can_edit_student_profile", label: "Edit Student Profile", desc: "Modify student bio, phone, roll, blood group", default: false, routes: ["/students/*/edit"], students: true },
      { key: "can_add_student_manual", label: "Add Student Manually", desc: "Directly create new student record", default: false, routes: ["/students/add"], students: true },
      { key: "can_bulk_upload_students", label: "Bulk CSV Upload", desc: "Import multi-student spreadsheet", default: false, routes: ["/students/bulk-upload"], students: true },
      { key: "can_view_old_students", label: "Old / Alumni Students", desc: "Browse alumni & past academic records", default: false, routes: ["/old-students"], students: true },
      { key: "can_manage_student_attendance", label: "Student Attendance", desc: "Take and review daily student attendance", default: false, routes: ["/student-attendance"], students: true },
    ],
  },
  {
    id: "documents",
    title: "Generate & Documents",
    shortTitle: "Documents",
    desc: "Invoices, marksheets, ID cards, registers & certificates",
    items: [
      { key: "can_generate_invoices", label: "Fee Invoices", desc: "Create & print fee payment receipts", default: true, routes: ["/generate/invoice"], students: true },
      { key: "can_generate_marksheets", label: "Exam Marksheets", desc: "Generate & print CCE format student marksheets", default: true, routes: ["/generate/marksheet"], students: true },
      { key: "can_generate_admit_cards", label: "Admit Cards", desc: "Generate official exam admission cards", default: true, routes: ["/ems"], students: true },
      { key: "can_generate_certificates", label: "Character Certificate", desc: "Issue official student character certificates", default: false, routes: ["/generate/certificate"], students: true },
      { key: "can_generate_bonafide", label: "Bonafide Certificate", desc: "Issue bonafide student certificates", default: false, routes: ["/generate/bonafide"], students: true },
      { key: "can_generate_transfer_certificate", label: "Transfer Certificate (TC)", desc: "Generate official school transfer certificates", default: false, routes: ["/generate/transfer-certificate"], students: true },
      { key: "can_generate_pass_certificate", label: "Pass / Promotion Certificate", desc: "Issue pass & completion certificates", default: false, routes: ["/generate/pass-certificate"], students: true },
      { key: "can_generate_kanyashree", label: "Kanyashree Certificate", desc: "Generate government scheme certificates", default: false, routes: ["/generate/kanyashree"], students: true },
      { key: "can_generate_id_card", label: "Student ID Cards", desc: "Generate & print student identity cards", default: false, routes: ["/generate/id-card"], students: true },
      { key: "can_print_admission_form", label: "Blank Admission Form", desc: "Print blank physical school admission forms", default: false, routes: ["/generate/admission-form"] },
      { key: "can_generate_tabulation", label: "Tabulation Sheet", desc: "Export multi-student academic result sheets", default: false, routes: ["/generate/tabulation"], students: true },
      { key: "can_generate_attendance_register", label: "Attendance Register", desc: "Print class attendance registers", default: false, routes: ["/generate/attendance-register"], students: true },
      { key: "can_generate_class_teacher_list", label: "Class Teacher List", desc: "Print the class teacher list", default: false, routes: ["/generate/class-teacher-list"] },
      { key: "can_generate_blank_pad", label: "Official Blank Pad", desc: "Print the school letterhead pad", default: false, routes: ["/generate/blank-pad"] },
      { key: "can_view_certificate_tracker", label: "Certificate Tracker", desc: "Track & verify generated certificate serials", default: false, routes: ["/generate/certificate-tracker"] },
    ],
  },
  {
    id: "academics",
    title: "Results & Exam (EMS)",
    shortTitle: "Results & EMS",
    desc: "Marks entry, seating plan & exam hall scheduling",
    items: [
      { key: "can_enter_results", label: "Result / Marks Entry", desc: "Enter exam scores for assigned subjects & classes", default: false, routes: ["/results"], students: true },
      { key: "can_view_seating_plan", label: "Exam Seating Plan", desc: "View exam hall arrangement and roll seating", default: false, routes: ["/ems"], students: true },
      { key: "can_manage_ems", label: "EMS Auto Seating", desc: "Manage exam halls and auto seating generator", default: false, routes: ["/ems"], students: true },
    ],
  },
  {
    id: "activities",
    title: "Sports, Routine & Staff",
    shortTitle: "Activities",
    desc: "Sports meet, class routine & staff directory",
    items: [
      { key: "can_manage_sports", label: "Sports & Games", desc: "Create events, enrol students and record results", default: false, routes: ["/sports"], students: true },
      { key: "can_view_routine", label: "Class Routine", desc: "View the published class routine", default: true, routes: ["/routine/viewer"] },
      { key: "can_view_employees", label: "Employee Register", desc: "Browse teaching & non-teaching staff", default: false, routes: ["/employees"] },
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    shortTitle: "Reports",
    desc: "School analytics, student demographics & fee reports",
    items: [
      { key: "can_view_reports", label: "View Reports & Analytics", desc: "Access reports & analytics section", default: false, routes: ["/reports"], students: true },
    ],
  },
  {
    id: "library",
    title: "Library",
    shortTitle: "Library",
    desc: "Library desk, catalog and fines",
    items: [
      { key: "can_manage_library", label: "Library Desk & Catalog", desc: "Issue, return, renew, catalog and fine collection", default: false, routes: ["/library"], students: true },
      { key: "can_waive_library_fines", label: "Waive Library Fines", desc: "Waive all or part of a library fine", default: false },
    ],
  },
] as const satisfies readonly Group[];

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["items"][number]["key"];
export type PermissionGroupId = (typeof PERMISSION_GROUPS)[number]["id"];

export type TeacherPermissions = Record<PermissionKey, boolean> & {
  /** Scope: specific classes allowed (empty = all). */
  allowed_classes: string[];
};

export const PERMISSION_ITEMS: readonly (Item & { key: PermissionKey })[] = PERMISSION_GROUPS.flatMap((g) => [...g.items]);

export const DEFAULT_TEACHER_PERMISSIONS: TeacherPermissions = {
  ...(Object.fromEntries(PERMISSION_ITEMS.map((i) => [i.key, i.default])) as Record<PermissionKey, boolean>),
  allowed_classes: [],
};

/** Every permission whose work needs student lists. */
export const STUDENT_READ_PERMISSIONS: PermissionKey[] = PERMISSION_ITEMS.filter((i) => i.students).map((i) => i.key);

export function isPermissionKey(key: string): key is PermissionKey {
  return PERMISSION_ITEMS.some((i) => i.key === key);
}

/** Stored flags over the defaults, with unknown keys dropped. */
export function normalizePermissions(stored: unknown): TeacherPermissions {
  const src = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const out = { ...DEFAULT_TEACHER_PERMISSIONS };
  for (const item of PERMISSION_ITEMS) {
    if (typeof src[item.key] === "boolean") out[item.key] = src[item.key] as boolean;
  }
  out.allowed_classes = Array.isArray(src.allowed_classes) ? src.allowed_classes.filter((c): c is string => typeof c === "string") : [];
  return out;
}

/** Pages only Admin/Staff may open. */
export const STAFF_ONLY_ROUTES = [
  "/settings", "/teacher-management", "/admin-hub", "/academic-session",
  "/promotion", "/students/promotion", "/students/transfer",
  "/routine", "/employees/*/edit",
] as const;

/** Pages every signed-in user may open. `/` is matched exactly. */
export const OPEN_ROUTES = ["/", "/teacher", "/profile"] as const;
