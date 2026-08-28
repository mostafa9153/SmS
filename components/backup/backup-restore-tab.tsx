"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  CloudOff,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  HardDrive,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { BackupFrequency, DriveBackupFile, GoogleAccountInfo, RestorePreview } from "@/lib/backup/types";

export function BackupRestoreTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Frequency change state
  const [selectedFrequency, setSelectedFrequency] = useState<BackupFrequency>("monthly");

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreSource, setRestoreSource] = useState<"drive" | "local">("drive");
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveBackupFile | null>(null);
  const [uploadedPayload, setUploadedPayload] = useState<any | null>(null);
  const [localFilePreview, setLocalFilePreview] = useState<RestorePreview | null>(null);
  const [restoreMode, setRestoreMode] = useState<"clean_restore" | "merge_upsert">("clean_restore");
  const [adminPassword, setAdminPassword] = useState("");
  const [restoreError, setRestoreError] = useState("");

  // 1. Fetch Google Drive Status & Cloud Backups
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "backup-status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/backup/drive");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch backup status");
      }
      return res.json() as Promise<{
        status: GoogleAccountInfo;
        backups: DriveBackupFile[];
        driveError: string | null;
        dbSummary: { totalStudents: number; totalResults: number };
      }>;
    },
  });

  const status = data?.status;
  const backups = data?.backups || [];
  const dbSummary = data?.dbSummary;

  useEffect(() => {
    if (status?.frequency) {
      setSelectedFrequency(status.frequency);
    }
  }, [status?.frequency]);

  // 2. Connect Google Drive Mutation (Initiates OAuth redirect)
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/backup/auth");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to initiate Google authorization");
      }
      return res.json() as Promise<{ authUrl: string }>;
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Connection Failed",
        description: err.message || "Could not connect to Google.",
      });
    },
  });

  // 3. Backup to Drive Now Mutation
  const backupNowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/backup/drive", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Backup upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "backup-status"] });
      showToast({
        type: "success",
        title: "Backup Complete",
        description: "Latest database snapshot was successfully saved to your Google Drive.",
      });
    },
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Backup Failed",
        description: err.message || "Failed to back up to Google Drive.",
      });
    },
  });

  // 4. Update Frequency Mutation
  const updateFrequencyMutation = useMutation({
    mutationFn: async (frequency: BackupFrequency) => {
      const res = await fetch("/api/admin/backup/drive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update schedule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "backup-status"] });
      showToast({
        type: "success",
        title: "Schedule Updated",
        description: "Automatic backup frequency saved successfully.",
      });
    },
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Update Failed",
        description: err.message || "Could not update schedule.",
      });
    },
  });

  // 5. Disconnect Google Drive Mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/backup/drive", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to disconnect");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "backup-status"] });
      showToast({
        type: "success",
        title: "Google Drive Disconnected",
        description: "Your account was unlinked. Existing files in Drive remain intact.",
      });
    },
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Disconnect Failed",
        description: err.message || "Could not disconnect Google Drive.",
      });
    },
  });

  // 6. Execute Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (restoreSource === "drive") {
        if (!selectedDriveFile) throw new Error("No cloud backup selected.");
        const res = await fetch("/api/admin/backup/drive/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: selectedDriveFile.id,
            adminPassword,
            mode: restoreMode,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Cloud restoration failed");
        }
        return res.json();
      } else {
        if (!uploadedPayload) throw new Error("No local file loaded.");
        const res = await fetch("/api/admin/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "execute",
            payload: uploadedPayload,
            adminPassword,
            mode: restoreMode,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Local restoration failed");
        }
        return res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["student-results"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "backup-status"] });

      showToast({
        type: "success",
        title: "System Restored Successfully",
        description: `Restored ${data.summary?.restoredStudents || 0} students and ${data.summary?.restoredResults || 0} results.`,
      });

      setIsRestoreModalOpen(false);
      setAdminPassword("");
      setRestoreError("");
      setSelectedDriveFile(null);
      setUploadedPayload(null);
      setLocalFilePreview(null);
    },
    onError: (err: any) => {
      setRestoreError(err.message || "Restoration failed");
      showToast({
        type: "error",
        title: "Restoration Failed",
        description: err.message || "Could not restore database.",
      });
    },
  });

  // Handle Local File Selection
  const handleLocalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Request dry-run preview from API
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", payload: json }),
      });

      const data = await res.json();
      if (!res.ok || !data.preview?.isValid) {
        throw new Error(data.preview?.error || data.error || "Invalid backup JSON file");
      }

      setUploadedPayload(json);
      setLocalFilePreview(data.preview);
      setRestoreSource("local");
      setSelectedDriveFile(null);
      setAdminPassword("");
      setRestoreError("");
      setIsRestoreModalOpen(true);
    } catch (err: any) {
      showToast({
        type: "error",
        title: "File Parse Error",
        description: err.message || "Could not read the selected backup file.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Open Drive Restore Modal
  const openDriveRestore = (file: DriveBackupFile) => {
    setSelectedDriveFile(file);
    setRestoreSource("drive");
    setUploadedPayload(null);
    setLocalFilePreview(null);
    setAdminPassword("");
    setRestoreError("");
    setIsRestoreModalOpen(true);
  };

  // Download Local Backup
  const handleDownloadLocal = () => {
    window.location.href = "/api/admin/backup/export";
    showToast({
      type: "success",
      title: "Downloading Backup",
      description: "Generating database snapshot. File download will begin shortly.",
    });
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Never";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Quick Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border bg-card/90 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Active Students</span>
              <p className="text-2xl font-bold text-foreground">{dbSummary?.totalStudents ?? 0}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/90 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Exam Records</span>
              <p className="text-2xl font-bold text-foreground">{dbSummary?.totalResults ?? 0}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <FileCode className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/90 shadow-2xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Last Cloud Backup</span>
              <p className="text-sm font-bold text-foreground truncate max-w-[170px]">
                {formatDate(status?.lastBackupAt)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CloudCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Main Google Drive WhatsApp-Style Integration Card */}
      <Card className="rounded-2xl border bg-card/90 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                <Cloud className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">Google Drive Backup</h2>
                  {status?.isConnected ? (
                    <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 gap-1 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] font-semibold bg-muted text-muted-foreground">
                      Not Linked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated cloud snapshots stored directly in your Google Drive (WhatsApp-style)
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {status?.isConnected && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => backupNowMutation.mutate()}
                  disabled={backupNowMutation.isPending}
                  className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 gap-1.5 shadow-xs"
                >
                  <CloudUpload className={`h-4 w-4 ${backupNowMutation.isPending ? "animate-bounce" : ""}`} />
                  {backupNowMutation.isPending ? "Backing Up..." : "Back Up Now"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="rounded-xl text-xs font-semibold px-2.5"
                  title="Refresh Cloud List"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {status?.isConnected ? (
            <div className="space-y-6">
              {/* Account details & Frequency Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl border bg-muted/20">
                {/* Account Info */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Linked Google Account</span>
                  <div className="flex items-center gap-3">
                    {status.picture ? (
                      <img src={status.picture} alt="Profile" className="h-9 w-9 rounded-full border shadow-2xs" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {status.email?.charAt(0).toUpperCase() || "G"}
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-sm font-bold text-foreground leading-tight truncate">
                        {status.name || status.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{status.email}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Folder: <span className="font-mono font-medium text-foreground">{status.folderName}</span>
                  </p>
                </div>

                {/* Frequency Picker */}
                <div className="space-y-1.5 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Auto Backup Frequency
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: "off", label: "Off" },
                        { id: "weekly", label: "Weekly" },
                        { id: "monthly", label: "Monthly" },
                        { id: "yearly", label: "Yearly" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setSelectedFrequency(f.id as BackupFrequency);
                            updateFrequencyMutation.mutate(f.id as BackupFrequency);
                          }}
                          className={`text-xs font-semibold py-1.5 px-2 rounded-lg border transition-all ${
                            selectedFrequency === f.id
                              ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                              : "bg-card text-muted-foreground hover:bg-muted/50 border-input"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-muted-foreground">
                      {selectedFrequency === "off"
                        ? "Only manual backups are taken."
                        : `Next auto backup will trigger on schedule via Vercel Cron.`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to disconnect Google Drive? Your existing files in Drive will not be deleted.")) {
                          disconnectMutation.mutate();
                        }
                      }}
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      Disconnect Account
                    </button>
                  </div>
                </div>
              </div>

              {/* Backups Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Cloud className="h-4 w-4 text-primary" />
                    Available Cloud Snapshots ({backups.length})
                  </h3>
                  <span className="text-xs text-muted-foreground">Click "Restore" to recover any state</span>
                </div>

                {backups.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed bg-muted/10 space-y-2">
                    <CloudOff className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-xs font-semibold text-foreground">No Cloud Backups Found</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Click the "Back Up Now" button above to upload your first snapshot to Google Drive.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <div className="divide-y max-h-[340px] overflow-y-auto">
                      {backups.map((file) => (
                        <div
                          key={file.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <FileCode className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground font-mono truncate">{file.name}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>{formatDate(file.createdAt)}</span>
                                <span>•</span>
                                <span>{formatBytes(file.sizeBytes)}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDriveRestore(file)}
                              className="h-7 text-xs rounded-lg font-semibold border-primary/30 text-primary hover:bg-primary/5 gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restore
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Not Connected View (WhatsApp Style Connect CTA) */
            <div className="flex flex-col items-center justify-center text-center p-6 sm:p-10 space-y-4 rounded-xl border border-dashed bg-muted/10">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <Cloud className="h-7 w-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-foreground">Link Google Drive for Automatic Backups</h3>
                <p className="text-xs text-muted-foreground">
                  Connect any Google account (School or Principal email) to automatically save snapshots on a weekly, monthly, or yearly schedule. Restore with 1 click anytime.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                  className="rounded-xl font-semibold text-xs px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 16.14 15.645 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.47 0 2.805.54 3.84 1.425l2.4-2.4C16.89 3.525 14.7 2.6 12.24 2.6 7.035 2.6 2.8 6.835 2.8 12.04s4.235 9.44 9.44 9.44c5.44 0 9.07-3.82 9.07-9.24 0-.62-.065-1.22-.185-1.955H12.24z" />
                  </svg>
                  {connectMutation.isPending ? "Connecting..." : "Connect Google Account"}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 inline" />
                Zero access to your personal files. Only saves into a dedicated <span className="font-mono">SMS_School_Backups</span> folder.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Manual Local File Backup & Restore Card */}
      <Card className="rounded-2xl border bg-card/90 shadow-sm overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b bg-muted/20">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Local Offline Backup & Restore
          </CardTitle>
          <CardDescription className="text-xs">
            Export a portable JSON backup directly to your computer or restore a previously saved snapshot.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Export */}
            <div className="rounded-xl border p-4 sm:p-5 space-y-3 bg-muted/10 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-foreground">Download Local Snapshot</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bundles all students, academic histories, exam results, and audit logs into a single structured JSON file.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleDownloadLocal}
                className="w-full rounded-xl text-xs font-semibold gap-2 border-input hover:bg-card shadow-2xs"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                Download Snapshot (.json)
              </Button>
            </div>

            {/* Import / Restore */}
            <div className="rounded-xl border p-4 sm:p-5 space-y-3 bg-muted/10 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-bold text-foreground">Restore from Local File</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a previously downloaded JSON snapshot. You will see a safety preview before restoring.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl text-xs font-semibold gap-2 border-input hover:bg-card shadow-2xs"
                >
                  <Upload className="h-4 w-4 text-blue-600" />
                  Select File to Restore (.json)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Restore Confirmation Modal (For Both Cloud & Local) */}
      <Dialog open={isRestoreModalOpen} onOpenChange={setIsRestoreModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <RotateCcw className="h-5 w-5 text-primary" />
              Database Restoration Authorization
            </DialogTitle>
            <DialogDescription className="text-xs">
              {restoreSource === "drive"
                ? `Restoring cloud snapshot from Google Drive: ${selectedDriveFile?.name}`
                : `Restoring uploaded local JSON snapshot.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Snapshot Summary Box */}
            <div className="rounded-xl border p-3.5 bg-muted/30 space-y-2">
              <span className="font-bold text-foreground block">Snapshot Details</span>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <span className="text-[11px] block">Created Date:</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(selectedDriveFile?.createdAt || localFilePreview?.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] block">Total Records:</span>
                  <span className="font-semibold text-foreground">
                    {localFilePreview?.totalRecords ?? "Included in file"}
                  </span>
                </div>
              </div>

              {localFilePreview?.tableCounts && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(localFilePreview.tableCounts).map(([table, count]) => (
                    <Badge key={table} variant="secondary" className="text-[10px] py-0.5">
                      {table}: {count}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Restore Mode Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Restoration Mode</Label>
              <div className="grid grid-cols-1 gap-2">
                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  restoreMode === "clean_restore" ? "bg-primary/5 border-primary shadow-2xs" : "bg-card"
                }`}>
                  <input
                    type="radio"
                    name="restoreMode"
                    value="clean_restore"
                    checked={restoreMode === "clean_restore"}
                    onChange={() => setRestoreMode("clean_restore")}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-foreground block">Clean Disaster Recovery (Recommended)</span>
                    <span className="text-[11px] text-muted-foreground">
                      Clears existing records and replaces them exactly as they were in this backup snapshot.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  restoreMode === "merge_upsert" ? "bg-primary/5 border-primary shadow-2xs" : "bg-card"
                }`}>
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge_upsert"
                    checked={restoreMode === "merge_upsert"}
                    onChange={() => setRestoreMode("merge_upsert")}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-foreground block">Merge & Update (Keep Unmatched)</span>
                    <span className="text-[11px] text-muted-foreground">
                      Overwrites matched records by ID, but does not delete new records created after this backup.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Password Authorization */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Admin Password Required
              </Label>
              <Input
                type="password"
                placeholder="Enter your admin login password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="text-xs font-medium"
              />
              <p className="text-[11px] text-muted-foreground">
                For security, your login password is required before writing restored records to the database.
              </p>
            </div>

            {restoreError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRestoreModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => restoreMutation.mutate()}
              disabled={!adminPassword || restoreMutation.isPending}
              className="text-xs rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-xs"
            >
              {restoreMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Restoring Database...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Confirm & Execute Restore
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
