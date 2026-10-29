// ============================================================
//  lib/types/teacher.ts
//  Type definitions for the Teacher Management System
// ============================================================

export interface TeacherPermissions {
  // === 1. 🎓 Student Admission ===
  can_handle_readmission: boolean;              // Re-Admission (Default: true)
  can_handle_new_admission: boolean;            // New Admission - Offline/Manual (Default: false)
  can_handle_new_admission_online: boolean;     // New Admission - Online Form (Default: false)
  can_handle_ai_scan_admission: boolean;        // AI Scan Admission (Default: false)
  can_view_admission_applications: boolean;     // View Admission Applications (Default: false)
  can_view_admission_invoices: boolean;         // View Admission Invoices (Default: false)

  // === 2. 👩‍🎓 Students Management ===
  can_view_students: boolean;                   // View Student Directory (Default: true)
  can_view_student_profile: boolean;            // View Student Profile Read-only (Default: true)
  can_edit_student_profile: boolean;            // Edit Student Profile (Default: false)
  can_add_student_manual: boolean;              // Add Student Manually (Default: false)
  can_bulk_upload_students: boolean;            // Bulk Upload CSV (Default: false)
  can_view_old_students: boolean;               // View Old / Alumni Students (Default: false)

  // === 3. 📄 Generate & Documents ===
  can_generate_invoices: boolean;               // Fee Invoices (Default: true)
  can_generate_marksheets: boolean;             // Marksheets (Default: true)
  can_generate_admit_cards: boolean;            // Admit Cards (Default: true)
  can_generate_certificates: boolean;           // Character Certificate (Default: false)
  can_generate_transfer_certificate: boolean;   // Transfer Certificate (Default: false)
  can_generate_pass_certificate: boolean;       // Pass Certificate (Default: false)
  can_generate_kanyashree: boolean;             // Kanyashree Certificate (Default: false)
  can_generate_id_card: boolean;                // Student ID Cards (Default: false)
  can_print_admission_form: boolean;            // Blank Admission Form Print (Default: false)
  can_generate_tabulation: boolean;             // Tabulation Sheets (Default: false)
  can_view_certificate_tracker: boolean;        // Certificate Registry Tracker (Default: false)

  // === 4. 📝 Results & Exam Management ===
  can_enter_results: boolean;                   // Result / Marks Entry (Default: false)
  can_view_seating_plan: boolean;               // Exam Seating Plan View (Default: false)
  can_manage_ems: boolean;                      // EMS (Auto Seating & Exam Hall) (Default: false)
  can_manage_sports: boolean;                   // Sports: events, enrolment, results (Default: false)

  // === 5. 📊 Reports & Analytics ===
  can_view_reports: boolean;                    // View Reports & Analytics (Default: false)

  // Scope: Specific classes allowed (empty = all assigned classes)
  allowed_classes: string[];
}

export const DEFAULT_TEACHER_PERMISSIONS: TeacherPermissions = {
  // 1. Admission
  can_handle_readmission: true,
  can_handle_new_admission: false,
  can_handle_new_admission_online: false,
  can_handle_ai_scan_admission: false,
  can_view_admission_applications: false,
  can_view_admission_invoices: false,

  // 2. Students Management
  can_view_students: true,
  can_view_student_profile: true,
  can_edit_student_profile: false,
  can_add_student_manual: false,
  can_bulk_upload_students: false,
  can_view_old_students: false,

  // 3. Documents
  can_generate_invoices: true,
  can_generate_marksheets: true,
  can_generate_admit_cards: true,
  can_generate_certificates: false,
  can_generate_transfer_certificate: false,
  can_generate_pass_certificate: false,
  can_generate_kanyashree: false,
  can_generate_id_card: false,
  can_print_admission_form: false,
  can_generate_tabulation: false,
  can_view_certificate_tracker: false,

  // 4. Results & Exam
  can_enter_results: false,
  can_view_seating_plan: false,
  can_manage_ems: false,
  can_manage_sports: false,

  // 5. Reports
  can_view_reports: false,

  allowed_classes: [],
};

export type TeacherActionType =
  | "RE_ADMISSION"
  | "INVOICE_GENERATED"
  | "MARKSHEET_GENERATED"
  | "CERTIFICATE_GENERATED"
  | "ADMIT_CARD_GENERATED";

export interface TeacherPortalStats {
  readmissionsCount: number;
  totalCollected: number;
  tasksPending: number;
  tasksCompleted: number;
  marksheetsCount: number;
}

export interface TeacherChatMessage {
  id: string;
  user_id: string;
  teacher_id?: string | null;
  sender_name: string;
  message: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeacherAbsence {
  id: string;
  teacher_id: string;
  user_id?: string | null;
  teacher_name: string;
  start_date: string;
  end_date: string;
  dates: string[];
  reason?: string | null;
  status: "RECORDED" | "APPROVED" | "CANCELLED";
  created_at: string;
  updated_at: string;
}
