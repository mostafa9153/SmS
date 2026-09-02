"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  UserPlus, 
  Trash2, 
  ShieldAlert, 
  FileText, 
  Sliders, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Lock,
  KeyRound,
  UserCheck,
  Activity,
  Building,
  Save,
  Award,
  Sparkles,
  CalendarClock,
  Cloud,
  ArrowLeft,
  School,
  Eye,
  EyeOff,
} from "lucide-react";
import dynamic from "next/dynamic";

const TabLoadingSkeleton = () => (
  <div className="p-6 space-y-4 rounded-2xl border bg-card/50">
    <Skeleton className="h-8 w-48 rounded-xl" />
    <Skeleton className="h-4 w-72 rounded-lg" />
    <Skeleton className="h-[300px] w-full rounded-2xl" />
  </div>
);

const BackupRestoreTab = dynamic(
  () => import("@/components/backup/backup-restore-tab").then((mod) => mod.BackupRestoreTab),
  { loading: () => <TabLoadingSkeleton /> }
);

const AcademicSessionClient = dynamic(
  () => import("@/app/(dashboard)/academic-session/academic-session-client"),
  { loading: () => <TabLoadingSkeleton /> }
);

const SchoolDetailsTab = dynamic(
  () => import("@/components/school-details/school-details-tab").then((mod) => mod.SchoolDetailsTab),
  { loading: () => <TabLoadingSkeleton /> }
);
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toast-banner";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: "Admin" | "Staff";
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  tableName: string;
  recordId: string | null;
  oldValues: any;
  newValues: any;
  metadata: any;
  createdAt: string;
  performedBy: {
    id: string;
    fullName: string;
    role: string;
  };
}

import { getCurrentUserRole } from "@/lib/data/students";

export function SettingsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  // Tab state
  const [activeTab, setActiveTab] = useState(tabParam || "users");

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  
  // Current user state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Form states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"Admin" | "Staff">("Staff");
  const [formError, setFormError] = useState("");

  // Edit / Reset Password State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<"Admin" | "Staff">("Staff");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Audit log detail modal state
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);


  // Danger Zone / Data Wipeout state
  const [isWipeoutModalOpen, setIsWipeoutModalOpen] = useState(false);
  const [wipeoutScope, setWipeoutScope] = useState<"ALL_DATA" | "CURRENT_STUDENTS_ONLY" | "OLD_STUDENTS_ONLY" | "EXAM_RESULTS_ONLY">("ALL_DATA");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [confirmationPhraseInput, setConfirmationPhraseInput] = useState("");
  const [wipeoutError, setWipeoutError] = useState("");

  // 1. Authenticate user & check role via central API
  useEffect(() => {
    async function checkAuth() {
      try {
        const authData = await getCurrentUserRole();
        if (authData.role !== "Guest") {
          setCurrentUser({ id: authData.userId, fullName: authData.fullName });
          setUserRole(authData.role);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Fetch Users List
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch users");
      }
      return res.json() as Promise<{ users: UserProfile[] }>;
    },
    enabled: userRole === "Admin",
  });

  // 3. Fetch Audit Logs
  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-logs");
      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      return res.json() as Promise<{ logs: AuditLogEntry[] }>;
    },
    enabled: userRole === "Admin",
  });

  // 4. Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast({
        type: "success",
        title: "User Account Created",
        description: `Successfully created ${variables.role} account for ${variables.fullName}.`,
      });
      // Reset form
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("Staff");
      setFormError("");
      setIsAddUserOpen(false);
    },
    onError: (error: any) => {
      setFormError(error.message || "An error occurred");
      showToast({
        type: "error",
        title: "User Creation Failed",
        description: error.message || "Failed to create account.",
      });
    },
  });

  // 5. Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast({
        type: "success",
        title: "User Account Removed",
        description: "User profile was deleted successfully.",
      });
    },
    onError: (error: any) => {
      showToast({
        type: "error",
        title: "Delete Failed",
        description: error.message || "Failed to delete user.",
      });
    },
  });

  // 5.5. Update User / Reset Password Mutation
  const updateUserMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      newPassword?: string;
      newRole?: "Admin" | "Staff";
      newFullName?: string;
    }) => {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast({
        type: "success",
        title: "User Updated",
        description: "User details and password updated successfully.",
      });
      setEditingUser(null);
      setEditPassword("");
      setEditError("");
    },
    onError: (err: any) => {
      setEditError(err.message || "Failed to update user");
      showToast({
        type: "error",
        title: "Update Failed",
        description: err.message || "Could not update user.",
      });
    },
  });

  // 6. Data Wipeout Mutation
  const wipeoutMutation = useMutation({
    mutationFn: async (payload: {
      adminPassword: string;
      confirmationPhrase: string;
      wipeoutScope: string;
    }) => {
      const res = await fetch("/api/admin/data-wipeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Data wipeout operation failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["student-results"] });
      queryClient.invalidateQueries({ queryKey: ["class-results"] });
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });

      showToast({
        type: "success",
        title: "Data Wipeout Completed",
        description: `Wiped out ${data.summary?.deletedStudentsCount || 0} students and ${data.summary?.deletedResultsCount || 0} results.`,
      });

      setIsWipeoutModalOpen(false);
      setAdminPasswordInput("");
      setConfirmationPhraseInput("");
      setWipeoutError("");
    },
    onError: (err: any) => {
      setWipeoutError(err.message || "Failed to execute wipeout");
      showToast({
        type: "error",
        title: "Wipeout Authorization Failed",
        description: err.message || "Operation could not be completed.",
      });
    },
  });

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setFormError("Password must be at least 6 characters long");
      return;
    }
    setFormError("");
    createUserMutation.mutate({
      fullName: newFullName,
      email: newEmail,
      password: newPassword,
      role: newRole,
    });
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (window.confirm(`Are you sure you want to delete user account: ${email}? This action is irreversible.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Not logged in or not admin
  if (!currentUser || userRole !== "Admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="rounded-full bg-red-100 p-5 mb-4 text-red-600">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="text-xl font-bold text-red-700">Access Restricted</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Settings are restricted to Admin accounts only. Log in with an authorized Admin account to modify users and configure settings.
        </p>
      </div>
    );
  }

  const tabMeta: Record<string, { title: string; subtitle: string; icon: any; color: string }> = {
    users: {
      title: "User Management & Role Permissions",
      subtitle: "Manage authorized staff and admin accounts, passwords, and system access levels.",
      icon: UserPlus,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    },
    session: {
      title: "Academic Session, Promotion & Full Marks Rules",
      subtitle: "Configure examination full marks, RTE auto-promotion, merit cutoffs, and session advancement.",
      icon: CalendarClock,
      color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10",
    },
    audit: {
      title: "System Audit Logs & Security History",
      subtitle: "Track administrative operations, student changes, and security events.",
      icon: Activity,
      color: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    },
    "school-details": {
      title: "School Details & Institutional Setup",
      subtitle: "Manage institutional school profile and comprehensive class & section configuration.",
      icon: School,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    },
    config: {
      title: "School Details & Institutional Setup",
      subtitle: "Manage institutional school profile and comprehensive class & section configuration.",
      icon: School,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    },
    backup: {
      title: "Cloud & Local Database Backup Recovery",
      subtitle: "Automated Google Drive cloud backups, offline exports, and 1-click restore.",
      icon: Cloud,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    },
    danger: {
      title: "Danger Zone & System Reset",
      subtitle: "High-risk administrative operations: database wipeout and system state initialization.",
      icon: ShieldAlert,
      color: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
    },
  };

  const currentTab = tabMeta[activeTab] || tabMeta.users;
  const CurrentIcon = currentTab.icon;

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Dynamic Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <button
          onClick={() => router.back()}
          title="Back"
          className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0 shadow-2xs", currentTab.color)}>
          <CurrentIcon className="h-4.5 w-4.5" />
        </div>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
          {currentTab.title}
        </h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          router.push(`/settings?tab=${val}`);
        }}
        className="space-y-4 sm:space-y-6"
      >

        {/* Tab 1: User Management */}
        <TabsContent value="users" className="space-y-4 outline-none">
          <div className="rounded-2xl border bg-card/90 backdrop-blur shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-foreground">Authorized System Users</h2>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  {usersData?.users.length || 0} Registered
                </Badge>
              </div>

              {/* Add User Dialog Trigger */}
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger render={<Button size="sm" className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl active:scale-95 shadow-xs font-semibold text-xs px-3.5 py-2" />}>
                  <UserPlus className="h-4 w-4" />
                  Add New User
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleAddUserSubmit}>
                    <DialogHeader>
                      <DialogTitle>Add System User</DialogTitle>
                      <DialogDescription>
                        Create a staff or admin account. Confirmation email is bypassed; they can log in immediately.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      {formError && (
                        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <p>{formError}</p>
                        </div>
                      )}

                      <div className="grid gap-1">
                        <Label htmlFor="fullName" className="text-xs">Full Name</Label>
                        <Input
                          id="fullName"
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          placeholder="e.g. Mostafa Ahmed"
                          disabled={createUserMutation.isPending}
                        />
                      </div>

                      <div className="grid gap-1">
                        <Label htmlFor="email" className="text-xs">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="e.g. staff@marigachihighschool.in"
                          disabled={createUserMutation.isPending}
                        />
                      </div>

                      <div className="grid gap-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-xs">Initial Password</Label>
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                          >
                            {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {showNewPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            autoComplete="new-password"
                            disabled={createUserMutation.isPending}
                            className="pr-10 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-1">
                        <Label htmlFor="role" className="text-xs">Access Role</Label>
                        <CustomSelect
                          value={newRole}
                          onChange={(val) => setNewRole(val as any)}
                          options={[
                            { label: "Staff (Data Entry & View)", value: "Staff" },
                            { label: "Admin (Full Control)", value: "Admin" },
                          ]}
                          disabled={createUserMutation.isPending}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddUserOpen(false)}
                        disabled={createUserMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div>
              {isLoadingUsers ? (
                <div className="p-10 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  Loading user list...
                </div>
              ) : usersError ? (
                <div className="p-8 text-center text-sm text-destructive flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-6 w-6" />
                  <p>Failed to load users: {usersError.message}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Full Name</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Email Address</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Role</TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">Created At</TableHead>
                      <TableHead className="w-[80px] text-right font-semibold text-xs text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const initials = u.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "U";

                      return (
                        <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-semibold text-xs text-foreground py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                                {initials}
                              </div>
                              <span>{u.fullName}</span>
                              {isSelf && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200">
                                  You
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{u.email}</TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                u.role === "Admin" 
                                  ? "bg-amber-100 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 font-semibold text-[11px] px-2 py-0.5 rounded-md" 
                                  : "bg-emerald-100 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 font-semibold text-[11px] px-2 py-0.5 rounded-md"
                              }
                            >
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditFullName(u.fullName);
                                  setEditRole(u.role);
                                  setEditPassword("");
                                  setEditError("");
                                  setShowEditPassword(false);
                                }}
                                title="Reset password or change role"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                disabled={isSelf || deleteUserMutation.isPending}
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                title={isSelf ? "Cannot delete own account" : "Delete user account"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {usersData?.users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                          No other system users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Edit User / Reset Password Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
              <DialogContent className="sm:max-w-[425px]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editingUser) return;
                    updateUserMutation.mutate({
                      userId: editingUser.id,
                      newFullName: editFullName,
                      newRole: editRole,
                      newPassword: editPassword.trim() ? editPassword.trim() : undefined,
                    });
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Edit User & Reset Password
                    </DialogTitle>
                    <DialogDescription>
                      Update profile name, role, or assign a new password for <span className="font-semibold text-foreground">{editingUser?.email}</span>.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    {editError && (
                      <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <p>{editError}</p>
                      </div>
                    )}

                    <div className="grid gap-1">
                      <Label htmlFor="editFullName" className="text-xs">Full Name</Label>
                      <Input
                        id="editFullName"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        disabled={updateUserMutation.isPending}
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="editRole" className="text-xs">Access Role</Label>
                      <CustomSelect
                        value={editRole}
                        onChange={(val) => setEditRole(val as any)}
                        options={[
                          { label: "Staff (Data Entry & View)", value: "Staff" },
                          { label: "Admin (Full Control)", value: "Admin" },
                        ]}
                        disabled={updateUserMutation.isPending}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="editPassword" className="text-xs">
                          New Password <span className="text-muted-foreground font-normal">(Leave blank to keep unchanged)</span>
                        </Label>
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          {showEditPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {showEditPassword ? "Hide" : "Show"} Password
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="editPassword"
                          type={showEditPassword ? "text" : "password"}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Type new password (at least 6 chars)"
                          autoComplete="new-password"
                          disabled={updateUserMutation.isPending}
                          className="pr-10 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        🔒 সুরক্ষার কারণে পুরনো পাসওয়ার্ড ডেটাবেসে এনক্রিপ্ট থাকে। নতুন পাসওয়ার্ড সেট করতে চাইলে এখানে টাইপ করে <strong>Show Password</strong> চেপে নিশ্চিত হয়ে নিন এবং <strong>Save Changes</strong> চাপুন।
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingUser(null)}
                      disabled={updateUserMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateUserMutation.isPending}>
                      {updateUserMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* Tab 2: Audit Logs */}
        <TabsContent value="audit" className="space-y-4 outline-none">
          <Card className="border-muted bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Security & Access Logs</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Immutable track log of edits, deletions, and Aadhaar/PII lookups for regulatory compliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingLogs ? (
                <div className="p-8 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  Loading audit logs...
                </div>
              ) : (
                <div className="border-t max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="bg-muted/40">
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target Entity</TableHead>
                        <TableHead className="w-[100px] text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData?.logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/10 text-xs">
                          <TableCell className="whitespace-nowrap py-3 font-mono text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>{log.performedBy?.fullName || "System Admin"}</div>
                            <div className="text-[10px] text-muted-foreground">{log.performedBy?.role || "Admin"}</div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                log.action === "DELETE" 
                                  ? "border-red-200 bg-red-50 text-red-700" 
                                  : log.action === "VIEW_AADHAAR"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-sky-200 bg-sky-50 text-sky-700"
                              }
                            >
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">
                            {log.tableName} {log.recordId ? `(${log.recordId.substring(0, 8)}...)` : ""}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] px-2"
                              onClick={() => setSelectedLog(log)}
                            >
                              Inspect
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {logsData?.logs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                            No audit logs registered yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Log Detail Dialog */}
          <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Audit Log Details
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px]">
                  ID: {selectedLog?.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-2 text-sm">
                <div className="grid grid-cols-2 gap-2 border bg-muted/20 p-3 rounded-lg text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Timestamp</span>
                    <span>{selectedLog && new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Performer</span>
                    <span>{selectedLog?.performedBy?.fullName || "System Admin"} ({selectedLog?.performedBy?.role || "Admin"})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Action</span>
                    <span className="font-semibold">{selectedLog?.action}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Table Affected</span>
                    <span className="font-mono">{selectedLog?.tableName}</span>
                  </div>
                </div>

                {selectedLog?.metadata && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Action Metadata</span>
                    <pre className="p-2 border rounded-md bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {(selectedLog?.oldValues || selectedLog?.newValues) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedLog.oldValues && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Previous State</span>
                        <pre className="p-2 border rounded-md bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-48">
                          {JSON.stringify(selectedLog.oldValues, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.newValues && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">New State</span>
                        <pre className="p-2 border rounded-md bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-48">
                          {JSON.stringify(selectedLog.newValues, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button onClick={() => setSelectedLog(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab 3: School Details (Profile & Class Management) */}
        <TabsContent value="school-details" className="space-y-4 outline-none">
          <SchoolDetailsTab />
        </TabsContent>
        <TabsContent value="config" className="space-y-4 outline-none">
          <SchoolDetailsTab />
        </TabsContent>

        {/* Tab 4: Academic Session */}
        <TabsContent value="session" className="space-y-4 outline-none">
          <AcademicSessionClient />
        </TabsContent>

        {/* Tab 5: Backup & Cloud Recovery */}
        <TabsContent value="backup" className="space-y-4 outline-none">
          <BackupRestoreTab />
        </TabsContent>

        {/* Tab 6: Danger Zone */}
        <TabsContent value="danger" className="space-y-4 outline-none">
          <Card className="border-rose-200 dark:border-rose-900/50 bg-card shadow-xs">
            <CardHeader className="border-b border-rose-100 dark:border-rose-950/50 bg-rose-50/50 dark:bg-rose-950/20 pb-4">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                <CardTitle className="text-base font-semibold">Danger Zone</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="divide-y divide-border/60 p-0">
              {/* Option 1: Complete Student Database Wipeout */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Wipe Out All Student Records (Master Reset)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Permanently deletes all student demographic profiles, academic enrollment histories, and all examination marks & rankings. Ideal when clearing dummy or test batches to start fresh.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs whitespace-nowrap self-start sm:self-auto"
                  onClick={() => {
                    setWipeoutScope("ALL_DATA");
                    setAdminPasswordInput("");
                    setConfirmationPhraseInput("");
                    setWipeoutError("");
                    setIsWipeoutModalOpen(true);
                  }}
                >
                  Wipe All Students
                </Button>
              </div>

              {/* Option 2: Purge Current / Active Students Only */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-500" />
                    Purge Current / Active Continuing Students Only
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Removes all currently active enrolled students (status &apos;Continuing&apos;) and their marks, leaving historical alumni and archived students intact.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
                  onClick={() => {
                    setWipeoutScope("CURRENT_STUDENTS_ONLY");
                    setAdminPasswordInput("");
                    setConfirmationPhraseInput("");
                    setWipeoutError("");
                    setIsWipeoutModalOpen(true);
                  }}
                >
                  Purge Current Students
                </Button>
              </div>

              {/* Option 3: Purge Old / Archived Students */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building className="h-4 w-4 text-sky-500" />
                    Purge Old / Alumni & Archived Students Only
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Removes all historical students with status &apos;Passed Out&apos;, &apos;Drop Out&apos;, &apos;Sent Up M.P.&apos;, or archived alumni, leaving only current active continuing students.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
                  onClick={() => {
                    setWipeoutScope("OLD_STUDENTS_ONLY");
                    setAdminPasswordInput("");
                    setConfirmationPhraseInput("");
                    setWipeoutError("");
                    setIsWipeoutModalOpen(true);
                  }}
                >
                  Purge Old Students
                </Button>
              </div>

              {/* Option 4: Purge Marks Only */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Purge Examination Results Only
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Keeps all student admission profiles and demographics intact, but removes all examination marks, evaluation scorecards, and class rank entries.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
                  onClick={() => {
                    setWipeoutScope("EXAM_RESULTS_ONLY");
                    setAdminPasswordInput("");
                    setConfirmationPhraseInput("");
                    setWipeoutError("");
                    setIsWipeoutModalOpen(true);
                  }}
                >
                  Purge Results
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Secure Confirmation Dialog */}
          <Dialog open={isWipeoutModalOpen} onOpenChange={setIsWipeoutModalOpen}>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="h-5 w-5" />
                  <DialogTitle className="text-rose-700 dark:text-rose-400">
                    {wipeoutScope === "ALL_DATA"
                      ? "Confirm Full Data Wipeout"
                      : wipeoutScope === "CURRENT_STUDENTS_ONLY"
                      ? "Confirm Current Students Purge"
                      : wipeoutScope === "OLD_STUDENTS_ONLY"
                      ? "Confirm Old Students Purge"
                      : "Confirm Results Purge"}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  This action cannot be undone. To prevent accidental data loss, administrator authentication and confirmation phrase verification are strictly required.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                {wipeoutError && (
                  <div className="flex items-center gap-2 rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <p>{wipeoutError}</p>
                  </div>
                )}

                <div className="rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 space-y-1.5 text-rose-900 dark:text-rose-200">
                  <p className="font-semibold">⚠️ Irreversible Operation Warning:</p>
                  <p className="text-[11px] text-rose-800/90 dark:text-rose-300">
                    {wipeoutScope === "ALL_DATA"
                      ? "All registered students, academic years, enrollments, and examination scorecards will be permanently wiped."
                      : wipeoutScope === "CURRENT_STUDENTS_ONLY"
                      ? "All currently enrolled active students (Continuing status) and their marks will be removed."
                      : wipeoutScope === "OLD_STUDENTS_ONLY"
                      ? "All alumni, passed out, and archived student records will be removed."
                      : "All evaluation results across all academic years will be deleted."}
                  </p>
                </div>

                {/* Step 1: Admin Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="adminPassword" className="text-xs font-semibold flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Enter Your Admin Login Password *
                  </Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter your current password"
                    className="text-xs"
                    disabled={wipeoutMutation.isPending}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Verifies your identity as an authorized Administrator.
                  </p>
                </div>

                {/* Step 2: Confirmation Phrase */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmationPhrase" className="text-xs font-semibold">
                    Type <code className="bg-muted px-1.5 py-0.5 rounded text-rose-700 font-mono">WIPE ALL STUDENT DATA</code> to confirm *
                  </Label>
                  <Input
                    id="confirmationPhrase"
                    value={confirmationPhraseInput}
                    onChange={(e) => setConfirmationPhraseInput(e.target.value)}
                    placeholder="Type WIPE ALL STUDENT DATA"
                    className="text-xs font-mono"
                    disabled={wipeoutMutation.isPending}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWipeoutModalOpen(false)}
                  disabled={wipeoutMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={
                    wipeoutMutation.isPending ||
                    !adminPasswordInput.trim() ||
                    confirmationPhraseInput.trim() !== "WIPE ALL STUDENT DATA"
                  }
                  onClick={() => {
                    setWipeoutError("");
                    wipeoutMutation.mutate({
                      adminPassword: adminPasswordInput,
                      confirmationPhrase: confirmationPhraseInput.trim(),
                      wipeoutScope,
                    });
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  {wipeoutMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Wiping Data...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Authorize & Wipeout
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
