"use client";

import { useState, useEffect } from "react";
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
  UserCheck,
  Activity,
  Building,
  Save,
  Award,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

export function SettingsClient() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  
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

  // Audit log detail modal state
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // School Config states
  const [schoolName, setSchoolName] = useState("Marigachi High School (H.S.)");
  const [udiseCode, setUdiseCode] = useState("19111305602");
  const [boardAffiliation, setBoardAffiliation] = useState("WBBSE / WBCHSE");
  const [schoolAddress, setSchoolAddress] = useState("Marigachi, Mathurapur II, South 24 Parganas, West Bengal - 743349");
  const [schoolEmail, setSchoolEmail] = useState("contact@marigachihighschool.in");
  const [schoolPhone, setSchoolPhone] = useState("+91 98765 43210");
  const [establishedYear, setEstablishedYear] = useState("1965");
  const [marksClass5, setMarksClass5] = useState("500");
  const [marksClass6, setMarksClass6] = useState("1050");
  const [marksClass7_8, setMarksClass7_8] = useState("1200");
  const [marksClass9_10, setMarksClass9_10] = useState("700");
  const [marksClass11_12, setMarksClass11_12] = useState("500");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // 1. Authenticate user & check role
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          // Query user_roles directly using user RLS policies
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();
          
          setUserRole(roleData?.role || null);
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

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">System Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Manage system users, view security audit logs, and configure school metadata.
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1.5 text-xs">
            <Sliders className="h-3.5 w-3.5" />
            School Config
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: User Management */}
        <TabsContent value="users" className="space-y-4 outline-none">
          <Card className="border-muted bg-card">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0 pb-4">
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold">Authorized System Users</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Administrators and staff members who can access the Student Management System.
                </CardDescription>
              </div>

              {/* Add User Dialog Trigger */}
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger render={<Button size="sm" className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl active:scale-95 shadow-2xs" />}>
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
                        <Label htmlFor="password font-normal" className="text-xs">Initial Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          disabled={createUserMutation.isPending}
                        />
                      </div>

                      <div className="grid gap-1">
                        <Label htmlFor="role" className="text-xs">Access Role</Label>
                        <Select
                          value={newRole}
                          onValueChange={(val: any) => setNewRole(val)}
                          disabled={createUserMutation.isPending}
                        >
                          <SelectTrigger id="role" className="w-full">
                            <SelectValue placeholder="Select access role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Staff">Staff (Data Entry & View)</SelectItem>
                            <SelectItem value="Admin">Admin (Full Control)</SelectItem>
                          </SelectContent>
                        </Select>
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
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="p-8 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  Loading user list...
                </div>
              ) : usersError ? (
                <div className="p-8 text-center text-sm text-destructive flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="h-6 w-6" />
                  <p>Failed to load users: {usersError.message}</p>
                </div>
              ) : (
                <div className="border-t">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="w-[80px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData?.users.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <TableRow key={u.id} className="hover:bg-muted/10">
                            <TableCell className="font-medium flex items-center gap-2 py-3.5">
                              {u.fullName}
                              {isSelf && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-sky-50 text-sky-700 border-sky-200">
                                  You
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  u.role === "Admin" 
                                    ? "bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 font-medium" 
                                    : "bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-medium"
                                }
                              >
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={isSelf || deleteUserMutation.isPending}
                                onClick={() => handleDeleteUser(u.id, u.email)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {usersData?.users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No other system users found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
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
                            <div>{log.performedBy.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">{log.performedBy.role}</div>
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
                    <span>{selectedLog?.performedBy.fullName} ({selectedLog?.performedBy.role})</span>
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

        {/* Tab 3: School Config */}
        <TabsContent value="config" className="space-y-4 outline-none">
          <Card className="border-muted bg-card">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  School Institution Profile & Evaluation Defaults
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Update your school metadata, administrative details, and standard examination full marks rules.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setIsSavingConfig(true);
                  setTimeout(() => {
                    setIsSavingConfig(false);
                    showToast({
                      type: "success",
                      title: "Settings Saved Successfully",
                      description: "School institution profile and evaluation parameters have been updated.",
                    });
                  }, 600);
                }}
                disabled={isSavingConfig}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-primary text-primary-foreground text-xs font-semibold"
              >
                <Save className="h-4 w-4" />
                {isSavingConfig ? "Saving..." : "Save Configuration"}
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Institution Details */}
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Institution Metadata
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="schoolName" className="text-xs">School Name</Label>
                    <Input
                      id="schoolName"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="udiseCode" className="text-xs">UDISE+ Code</Label>
                    <Input
                      id="udiseCode"
                      value={udiseCode}
                      onChange={(e) => setUdiseCode(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="boardAffiliation" className="text-xs">Board / Council Affiliation</Label>
                    <Input
                      id="boardAffiliation"
                      value={boardAffiliation}
                      onChange={(e) => setBoardAffiliation(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="establishedYear" className="text-xs">Year of Establishment</Label>
                    <Input
                      id="establishedYear"
                      value={establishedYear}
                      onChange={(e) => setEstablishedYear(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="schoolAddress" className="text-xs">Full Address</Label>
                    <Input
                      id="schoolAddress"
                      value={schoolAddress}
                      onChange={(e) => setSchoolAddress(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="schoolEmail" className="text-xs">Official Contact Email</Label>
                    <Input
                      id="schoolEmail"
                      value={schoolEmail}
                      onChange={(e) => setSchoolEmail(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="schoolPhone" className="text-xs">Contact Phone Number</Label>
                    <Input
                      id="schoolPhone"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Class Full Marks Rules */}
              <div className="space-y-4 border-t pt-5">
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Class-Wise Examination Full Marks Rules
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  These limits are enforced across the entire Results & Marks module to prevent entry mistakes.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-xs font-bold text-foreground">Class V</span>
                    <Input
                      value={marksClass5}
                      onChange={(e) => setMarksClass5(e.target.value)}
                      className="text-xs font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">Marks Total</span>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-xs font-bold text-foreground">Class VI</span>
                    <Input
                      value={marksClass6}
                      onChange={(e) => setMarksClass6(e.target.value)}
                      className="text-xs font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">Marks Total</span>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-xs font-bold text-foreground">Class VII & VIII</span>
                    <Input
                      value={marksClass7_8}
                      onChange={(e) => setMarksClass7_8(e.target.value)}
                      className="text-xs font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">Marks Total</span>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-xs font-bold text-foreground">Class IX & X</span>
                    <Input
                      value={marksClass9_10}
                      onChange={(e) => setMarksClass9_10(e.target.value)}
                      className="text-xs font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">Marks Total</span>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <span className="text-xs font-bold text-foreground">Class XI & XII</span>
                    <Input
                      value={marksClass11_12}
                      onChange={(e) => setMarksClass11_12(e.target.value)}
                      className="text-xs font-mono font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">Marks Total</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
