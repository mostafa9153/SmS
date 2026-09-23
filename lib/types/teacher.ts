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

  // 5. Reports
  can_view_reports: false,

  allowed_classes: [],
};

export type ClassRoleType = "CLASS_TEACHER" | "SUBJECT_TEACHER";

export interface TeacherClassAssignment {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  user_id?: string | null;
  academic_year: number;
  class_name: string;
  section: string;
  role_type: ClassRoleType;
  subject?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TaskType = "RE_ADMISSION" | "MARKSHEET" | "INVOICE_COLLECTION" | "GENERAL";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type AssigneeStatus = "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED";

export interface TaskCompletionReport {
  students_count?: number;
  fees_collected?: number;
  notes?: string;
  submitted_at?: string;
}

export interface TeacherTaskAssignee {
  id: string;
  task_id: string;
  teacher_id: string;
  teacher_name?: string;
  user_id: string;
  status: AssigneeStatus;
  completion_report: TaskCompletionReport;
  assigned_at: string;
  completed_at?: string | null;
}

export interface TeacherTask {
  id: string;
  title: string;
  description?: string | null;
  task_type: TaskType;
  target_class?: string | null;
  target_section?: string | null;
  due_date?: string | null;
  status: TaskStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  assignees?: TeacherTaskAssignee[];
}

export type TeacherActionType =
  | "RE_ADMISSION"
  | "INVOICE_GENERATED"
  | "MARKSHEET_GENERATED"
  | "CERTIFICATE_GENERATED"
  | "ADMIT_CARD_GENERATED";

export interface TeacherActivityLog {
  id: string;
  user_id: string | null;
  teacher_id: string | null;
  teacher_name: string;
  action_type: TeacherActionType;
  target_student_id?: string | null;
  target_student_name?: string | null;
  student_class?: string | null;
  section?: string | null;
  amount_collected: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TeacherNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface TeacherPortalStats {
  readmissionsCount: number;
  totalCollected: number;
  tasksPending: number;
  tasksCompleted: number;
  marksheetsCount: number;
}

export interface AdminTeacherPerformanceItem {
  teacher_id: string;
  teacher_name: string;
  designation?: string;
  user_id?: string | null;
  total_readmissions: number;
  total_fees_collected: number;
  total_marksheets: number;
  tasks_completed: number;
  tasks_pending: number;
  email?: string;
  permissions?: TeacherPermissions;
  class_assignments?: TeacherClassAssignment[];
}

export interface TeacherItem {
  id: string;
  uniqueId: string;
  fullName: string;
  designation?: string;
  email?: string;
  mobile?: string;
  status: string;
  profilePictureUrl?: string;
  appointedSubject?: string;
  primaryMeta?: Record<string, any>;
  hasLogin: boolean;
  userId?: string | null;
  role?: string | null;
  permissions?: TeacherPermissions;
  assignments?: TeacherClassAssignment[];
}

export interface TeacherMetadataResponse {
  classes: string[];
  sections: string[];
  subjects: string[];
}

export interface TeacherPermissionGrant {
  id: string;
  user_id: string;
  teacher_id?: string | null;
  permission_key: keyof TeacherPermissions | string;
  task_id?: string | null;
  granted_by?: string | null;
  expires_at: string;
  is_active: boolean;
  created_at: string;
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

export interface StudentMark {
  id: string;
  academic_year: number;
  student_id: string;
  student_name?: string;
  roll_no?: string;
  class_name: string;
  section: string;
  subject: string;
  exam_type: "S1" | "S2" | "S3" | string;
  full_marks: number;
  marks_obtained: number | null;
  grade?: string | null;
  remarks?: string | null;
  entered_by?: string | null;
  teacher_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TeacherRoutineSlot {
  id: string;
  teacher_id?: string | null;
  user_id?: string | null;
  day_of_week: string;
  period_number: number;
  start_time?: string | null;
  end_time?: string | null;
  class_name: string;
  section: string;
  subject: string;
  room_no?: string | null;
  academic_year: number;
  created_at?: string;
  updated_at?: string;
}


