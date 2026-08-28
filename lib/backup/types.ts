// ============================================================
//  lib/backup/types.ts
//  Central types for the Backup & Disaster Recovery system
// ============================================================

export type BackupFrequency = "off" | "weekly" | "monthly" | "yearly";

export interface BackupMetadata {
  schoolName: string;
  version: string;
  exportedAt: string;
  exportedBy?: {
    id: string;
    email: string;
  };
  counts: {
    students: number;
    academicHistory: number;
    studentResults: number;
    auditLogs: number;
    [tableName: string]: number;
  };
}

export interface BackupPayload {
  version: "1.0";
  source: "SMS_WEB_APP";
  createdAt: string;
  metadata: BackupMetadata;
  tables: {
    students: any[];
    academic_history: any[];
    student_results: any[];
    audit_log?: any[];
    [tableName: string]: any[] | undefined; // Extensible for future tables!
  };
  storage?: {
    student_photos?: { name: string; url?: string; path?: string }[];
    [bucketName: string]: any[] | undefined; // Extensible for future storage buckets!
  };
}

export interface GoogleAccountInfo {
  isConnected: boolean;
  email?: string;
  name?: string;
  picture?: string;
  connectedAt?: string;
  folderId?: string;
  folderName?: string;
  frequency: BackupFrequency;
  lastBackupAt?: string;
  lastBackupStatus?: "success" | "failed";
  lastBackupMessage?: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  description?: string;
  metadataSummary?: {
    studentsCount?: number;
    resultsCount?: number;
  };
}

export interface RestorePreview {
  isValid: boolean;
  version: string;
  createdAt: string;
  schoolName?: string;
  tableCounts: Record<string, number>;
  totalRecords: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  summary: {
    restoredStudents: number;
    restoredHistory: number;
    restoredResults: number;
    restoredOther: Record<string, number>;
  };
  auditLogId?: string;
}
