// ============================================================
//  lib/types/teacher.ts
//  Type definitions for the Teacher Management System
// ============================================================

// Permission keys, labels, defaults and routes live in one registry.
export { DEFAULT_TEACHER_PERMISSIONS, type TeacherPermissions } from "@/lib/permissions/registry";

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
