import { DEFAULT_TEACHER_PERMISSIONS, type TeacherPermissions } from "@/lib/types/teacher";

type PermKey = Exclude<keyof TeacherPermissions, "allowed_classes">;

/** `staff` = Admin/Staff only; otherwise a Teacher needs at least one listed permission. */
type Rule = { staff: true } | { any: PermKey[] };

const GEN: PermKey[] = [
  "can_generate_invoices", "can_generate_marksheets", "can_generate_admit_cards", "can_generate_certificates",
  "can_generate_transfer_certificate", "can_generate_pass_certificate", "can_generate_kanyashree",
  "can_generate_id_card", "can_print_admission_form", "can_generate_tabulation", "can_view_certificate_tracker",
];
const ADM: PermKey[] = [
  "can_handle_readmission", "can_handle_new_admission", "can_handle_new_admission_online",
  "can_handle_ai_scan_admission", "can_view_admission_applications", "can_view_admission_invoices",
];

// Longest prefix wins.
const RULES: [string, Rule][] = [
  ["/sports", { any: ["can_manage_sports"] }],
  ["/library", { any: ["can_manage_library"] }],
  ["/ems", { any: ["can_manage_ems", "can_view_seating_plan"] }],
  ["/results", { any: ["can_enter_results"] }],
  ["/reports", { any: ["can_view_reports"] }],
  ["/admission/re", { any: ["can_handle_readmission"] }],
  ["/admission/new", { any: ["can_handle_new_admission", "can_handle_new_admission_online", "can_handle_ai_scan_admission"] }],
  ["/admission/applications", { any: ["can_view_admission_applications", "can_handle_new_admission"] }],
  ["/admission/invoices", { any: ["can_view_admission_invoices", "can_generate_invoices"] }],
  ["/admission", { any: ADM }],
  ["/students/bulk-upload", { any: ["can_bulk_upload_students"] }],
  ["/students/add", { any: ["can_add_student_manual"] }],
  ["/students/promotion", { staff: true }],
  ["/students/transfer", { staff: true }],
  ["/students", { any: ["can_view_students", "can_view_student_profile"] }],
  ["/active-students", { any: ["can_view_students"] }],
  ["/old-students", { any: ["can_view_old_students"] }],
  ["/generate/invoice", { any: ["can_generate_invoices"] }],
  ["/generate/marksheet", { any: ["can_generate_marksheets"] }],
  ["/generate/ems", { any: ["can_generate_admit_cards"] }],
  ["/generate/certificate-tracker", { any: ["can_view_certificate_tracker"] }],
  ["/generate/certificate", { any: ["can_generate_certificates"] }],
  ["/generate/transfer-certificate", { any: ["can_generate_transfer_certificate"] }],
  ["/generate/pass-certificate", { any: ["can_generate_pass_certificate"] }],
  ["/generate/kanyashree", { any: ["can_generate_kanyashree"] }],
  ["/generate/id-card", { any: ["can_generate_id_card"] }],
  ["/generate/admission-form", { any: ["can_print_admission_form"] }],
  ["/generate/tabulation", { any: ["can_generate_tabulation"] }],
  ["/generate", { any: GEN }],
  ["/teacher-management", { staff: true }],
  ["/admin-hub", { staff: true }],
  ["/settings", { staff: true }],
];

export interface AccessProfile {
  role: string | null;
  permissions?: Partial<TeacherPermissions> | null;
}

/** Non-teachers (and unknown role) are never restricted here; the API enforces the rest. */
export function canAccessPath(path: string, profile: AccessProfile): boolean {
  if (profile.role !== "Teacher") return true;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  let match: Rule | null = null;
  let len = -1;
  for (const [prefix, rule] of RULES) {
    if ((clean === prefix || clean.startsWith(prefix + "/")) && prefix.length > len) {
      match = rule;
      len = prefix.length;
    }
  }
  if (!match) return true;
  if ("staff" in match) return false;
  const granted = { ...DEFAULT_TEACHER_PERMISSIONS, ...(profile.permissions ?? {}) };
  return match.any.some((k) => granted[k] === true);
}
