/**
 * Everything the top-bar command palette can open: pages, settings sections and
 * direct actions. Add a new module or settings section here so it is searchable.
 */
export type CommandGroup = "Actions" | "Pages" | "Settings";

export interface CommandItem {
  id: string;
  label: string;
  group: CommandGroup;
  href: string;
  /** Extra words people type for this item (short names, synonyms). */
  keywords?: string[];
  /** Hidden from non-admins, same rule as the sidebar. */
  adminOnly?: boolean;
}

export const COMMANDS: CommandItem[] = [
  // Actions: open the form or tool directly
  { id: "a-new-admission", group: "Actions", label: "New Admission", href: "/admission/new", keywords: ["admit", "enroll", "register student"] },
  { id: "a-offline-admission", group: "Actions", label: "Offline Admission Form", href: "/admission/new/offline", keywords: ["manual admission"] },
  { id: "a-ai-scan", group: "Actions", label: "AI Scan Admission", href: "/admission/new/ai-scan", keywords: ["scan form", "camera"] },
  { id: "a-re-admission", group: "Actions", label: "Re-Admission", href: "/admission/re", keywords: ["readmission", "renew"] },
  { id: "a-add-student", group: "Actions", label: "Add Student", href: "/students/add", keywords: ["new student", "manual"] },
  { id: "a-bulk-upload", group: "Actions", label: "Bulk Upload Students", href: "/students/bulk-upload", keywords: ["csv", "excel", "import"] },
  { id: "a-marks-entry", group: "Actions", label: "Marks Entry", href: "/results", keywords: ["result", "exam marks", "score"] },
  { id: "a-promotion", group: "Actions", label: "Promote Students", href: "/students/promotion", keywords: ["promotion", "next class"] },
  { id: "a-attendance", group: "Actions", label: "Student Attendance", href: "/student-attendance", keywords: ["mark attendance", "present", "absent"] },
  { id: "a-seat", group: "Actions", label: "Seat Arrangement", href: "/ems", keywords: ["ems", "exam hall", "seating", "admit card", "bench slip"] },
  { id: "a-routine", group: "Actions", label: "Generate Routine", href: "/routine/generate", keywords: ["timetable", "schedule"] },
  { id: "a-tc", group: "Actions", label: "Transfer Certificate", href: "/generate/transfer-certificate", keywords: ["tc", "leaving certificate"] },
  { id: "a-marksheet", group: "Actions", label: "Generate Marksheet", href: "/generate/marksheet", keywords: ["report card", "result sheet"] },
  { id: "a-tabulation", group: "Actions", label: "Tabulation Sheet", href: "/generate/tabulation", keywords: ["tabulation"] },
  { id: "a-id-card", group: "Actions", label: "Student ID Card", href: "/generate/id-card", keywords: ["identity card", "id"] },
  { id: "a-invoice", group: "Actions", label: "Fee Invoice", href: "/generate/invoice", keywords: ["fee", "receipt", "challan", "collect fee"] },
  { id: "a-character", group: "Actions", label: "Character Certificate", href: "/generate/certificate", keywords: ["cc", "conduct"] },
  { id: "a-pass", group: "Actions", label: "Pass Certificate", href: "/generate/pass-certificate", keywords: ["promotion certificate"] },
  { id: "a-bonafide", group: "Actions", label: "Bonafide Certificate", href: "/generate/bonafide", keywords: ["bonafide", "study certificate"] },
  { id: "a-kanyashree", group: "Actions", label: "Kanyashree Certificate", href: "/generate/kanyashree", keywords: ["k1", "k2", "scheme"] },
  { id: "a-admission-form", group: "Actions", label: "Blank Admission Form", href: "/generate/admission-form", keywords: ["print form"] },
  { id: "a-attendance-register", group: "Actions", label: "Attendance Register", href: "/generate/attendance-register", keywords: ["register print"] },
  { id: "a-class-teacher-list", group: "Actions", label: "Class Teacher List", href: "/generate/class-teacher-list" },
  { id: "a-blank-pad", group: "Actions", label: "Blank Letter Pad", href: "/generate/blank-pad", keywords: ["letterhead", "pad"] },
  { id: "a-library-issue", group: "Actions", label: "Library Desk", href: "/library", keywords: ["issue book", "return book", "renew"] },
  { id: "a-asset-rooms", group: "Actions", label: "Assets", href: "/assets", keywords: ["stock", "inventory", "dead stock", "furniture", "bench"] },
  { id: "a-library-stickers", group: "Actions", label: "Book Stickers", href: "/library/stickers", keywords: ["label", "barcode"] },

  // Pages
  { id: "p-dashboard", group: "Pages", label: "Dashboard", href: "/", keywords: ["home", "overview"] },
  { id: "p-active", group: "Pages", label: "Active Students", href: "/active-students", keywords: ["students register", "student list"] },
  { id: "p-pending", group: "Pages", label: "Pending Students", href: "/pending-students" },
  { id: "p-old", group: "Pages", label: "Old Students", href: "/old-students", keywords: ["alumni", "past students"] },
  { id: "p-teaching", group: "Pages", label: "Teaching Staff", href: "/employees?type=teaching", keywords: ["employee register", "teachers"] },
  { id: "p-non-teaching", group: "Pages", label: "Non-Teaching Staff", href: "/employees?type=non-teaching", keywords: ["employee register", "staff"] },
  { id: "p-admission", group: "Pages", label: "Admission", href: "/admission" },
  { id: "p-applications", group: "Pages", label: "Admission Applications", href: "/admission/applications", keywords: ["online applications"] },
  { id: "p-admission-invoices", group: "Pages", label: "Admission Invoices", href: "/admission/invoices", keywords: ["admission fee", "receipts"] },
  { id: "p-generators", group: "Pages", label: "Generators", href: "/generate", keywords: ["certificates", "documents", "print"] },
  { id: "p-cert-tracker", group: "Pages", label: "Certificate Tracker", href: "/generate/certificate-tracker", keywords: ["serial", "issued certificates"] },
  { id: "p-sports", group: "Pages", label: "Sports & Games", href: "/sports", keywords: ["sports meet", "events"] },
  { id: "p-library-books", group: "Pages", label: "Library Books", href: "/library/books", keywords: ["catalog", "books"] },
  { id: "p-library-overdue", group: "Pages", label: "Library Overdue", href: "/library/overdue", keywords: ["late", "due"] },
  { id: "p-library-fines", group: "Pages", label: "Library Fines", href: "/library/fines", keywords: ["penalty"] },
  { id: "p-library-reports", group: "Pages", label: "Library Reports", href: "/library/reports" },
  { id: "p-ems", group: "Pages", label: "EMS (Exam Manager)", href: "/ems", keywords: ["exam"] },
  { id: "p-routine", group: "Pages", label: "Routine Maker", href: "/routine", keywords: ["timetable"] },
  { id: "p-routine-viewer", group: "Pages", label: "Routine Viewer", href: "/routine/viewer", keywords: ["timetable"] },
  { id: "p-routine-assign", group: "Pages", label: "Routine Assignments", href: "/routine/assignments", keywords: ["subject allotment"] },
  { id: "p-reports", group: "Pages", label: "Reports", href: "/reports", keywords: ["analytics"] },
  { id: "p-welfare", group: "Pages", label: "Welfare & Schemes Report", href: "/reports/welfare", keywords: ["kanyashree", "sikshashree", "oasis", "scholarship"] },
  { id: "p-teacher", group: "Pages", label: "Teacher Workspace", href: "/teacher", keywords: ["tasks"] },
  { id: "p-profile", group: "Pages", label: "My Profile", href: "/profile", keywords: ["account"] },
  { id: "p-admin-hub", group: "Pages", label: "Admin Panel", href: "/admin-hub", adminOnly: true },

  // Settings
  { id: "s-users", group: "Settings", label: "User Management", href: "/settings/users", keywords: ["login", "accounts", "roles", "access"], adminOnly: true },
  { id: "s-teachers", group: "Settings", label: "Teacher Management", href: "/teacher-management", keywords: ["permissions", "teacher login"], adminOnly: true },
  { id: "s-tasks", group: "Settings", label: "Delegate Teacher Tasks", href: "/teacher-management?tab=tasks", keywords: ["assign task"], adminOnly: true },
  { id: "s-session", group: "Settings", label: "Academic Session", href: "/settings/academic-session", keywords: ["year", "new session"], adminOnly: true },
  { id: "s-audit", group: "Settings", label: "Audit Logs", href: "/settings/audit", keywords: ["history", "activity"], adminOnly: true },
  { id: "s-school", group: "Settings", label: "School Details", href: "/settings/school-details", keywords: ["school name", "logo", "udise"], adminOnly: true },
  { id: "s-presets", group: "Settings", label: "Presets", href: "/settings/presets", adminOnly: true },
  { id: "s-classes", group: "Settings", label: "Classes & Sections", href: "/settings/presets?section=classes", keywords: ["class teacher", "sections", "streams"], adminOnly: true },
  { id: "s-marks-scheme", group: "Settings", label: "Marks Scheme", href: "/settings/presets?section=marks_scheme", keywords: ["subjects", "full marks", "distribution"], adminOnly: true },
  { id: "s-fee", group: "Settings", label: "Fee Presets", href: "/settings/presets?section=fee", keywords: ["fee structure"], adminOnly: true },
  { id: "s-address", group: "Settings", label: "Address Presets", href: "/settings/presets?section=address", keywords: ["village", "post office"], adminOnly: true },
  { id: "s-bank", group: "Settings", label: "Bank Presets", href: "/settings/presets?section=bank", keywords: ["ifsc"], adminOnly: true },
  { id: "s-defaults", group: "Settings", label: "Default Values", href: "/settings/presets?section=defaults", adminOnly: true },
  { id: "s-ai", group: "Settings", label: "AI Settings", href: "/settings/presets?section=ai", keywords: ["api key"], adminOnly: true },
  { id: "s-admission-link", group: "Settings", label: "Admission Link", href: "/settings/admission-link", keywords: ["online form link", "public link"], adminOnly: true },
  { id: "s-backup", group: "Settings", label: "Backup & Cloud", href: "/settings/backup", keywords: ["export", "restore"], adminOnly: true },
  { id: "s-library", group: "Settings", label: "Library Settings", href: "/library/settings", keywords: ["fine rate", "loan days"] },
  { id: "s-danger", group: "Settings", label: "Danger Zone", href: "/settings/danger", keywords: ["reset", "delete data"], adminOnly: true },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Scores an item against a query: label prefix > word prefix > keyword match >
 * letters in order (so "trcert" still finds "Transfer Certificate"). 0 = no match.
 */
export function scoreCommand(item: CommandItem, query: string): number {
  const q = norm(query);
  if (!q) return 1;
  const label = norm(item.label);
  const words = label.split(" ");
  const keys = (item.keywords || []).map(norm);

  if (label === q || keys.includes(q)) return 100;
  if (label.startsWith(q)) return 90;
  if (words.some((w) => w.startsWith(q))) return 80;
  if (keys.some((k) => k.startsWith(q) || k.split(" ").some((w) => w.startsWith(q)))) return 70;
  if (label.includes(q)) return 60;
  // Every typed word must hit the label or a keyword
  const parts = q.split(" ");
  const hay = [label, ...keys].join(" ");
  if (parts.length > 1 && parts.every((p) => hay.split(" ").some((w) => w.startsWith(p)))) return 55;
  // Letters in order inside the label
  const compact = q.replace(/ /g, "");
  let i = 0;
  for (const ch of label.replace(/ /g, "")) if (ch === compact[i]) i++;
  return i === compact.length && compact.length >= 3 ? 30 : 0;
}

export function searchCommands(query: string, isAdmin: boolean, limit = 12): CommandItem[] {
  const visible = COMMANDS.filter((c) => isAdmin || !c.adminOnly);
  const order: Record<CommandGroup, number> = { Actions: 0, Pages: 1, Settings: 2 };
  return visible
    .map((c) => ({ c, s: scoreCommand(c, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || order[a.c.group] - order[b.c.group])
    .slice(0, limit)
    .map((x) => x.c);
}
