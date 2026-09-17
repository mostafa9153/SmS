"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Trash2,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import { CustomSelect } from "@/components/ui/custom-select";
import { getCurrentUserRole } from "@/lib/data/students";
import { DataTableSkeleton } from "@/components/ui/skeleton-loaders";

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: "Admin" | "Staff";
  createdAt: string;
}

export function UsersTab() {
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<"Staff" | "Admin">("Staff");
  const [formError, setFormError] = useState("");

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<"Staff" | "Admin">("Staff");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState("");

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
      }
    }
    checkAuth();
  }, []);

  // Fetch Users List
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
    staleTime: 2 * 60 * 1000,
  });

  // Create User Mutation
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

  // Delete User Mutation
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
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Deletion Failed",
        description: err.message || "Failed to delete user.",
      });
    },
  });

  // Update User & Password Mutation
  const updateUserMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      newFullName?: string;
      newRole?: "Admin" | "Staff";
      newPassword?: string;
    }) => {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
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

  const isAdmin = userRole === "Admin";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stat Bar */}
      <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">Total Users: {usersData?.users.length || 0}</Badge>
        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 px-3 py-1">Admins: {usersData?.users.filter(u => u.role === "Admin").length || 0}</Badge>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1">Staff: {usersData?.users.filter(u => u.role === "Staff").length || 0}</Badge>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-foreground">Authorized System Users</h2>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              {usersData?.users.length || 0} Registered
            </Badge>
          </div>

          {/* Add User Dialog */}
          {isAdmin && (
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger render={<Button size="sm" className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl active:scale-95 shadow-xs font-semibold text-xs px-3.5 py-2 cursor-pointer">
                  <UserPlus className="h-4 w-4" />
                  Add New User
                  <Shield className="h-3 w-3 ml-1 opacity-70" />
                </Button>} />
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
                    className="h-10 sm:h-9 text-base sm:text-xs"
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
                    className="h-10 sm:h-9 text-base sm:text-xs"
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
                      className="pr-10 h-10 sm:h-9 text-base sm:text-xs"
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
        )}
      </div>

      <div>
        {isLoadingUsers ? (
          <div className="p-5">
            <DataTableSkeleton />
          </div>
        ) : usersError ? (
          <div className="p-8 text-center text-sm text-destructive flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6" />
            <p>Failed to load users: {usersError.message}</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {usersData?.users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const initials = u.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "U";

                return (
                  <div key={u.id} className="group p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${u.role === "Admin" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground text-sm truncate max-w-[120px] sm:max-w-[140px]" title={u.fullName}>{u.fullName}</p>
                            {isSelf && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 shrink-0">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[150px]" title={u.email}>{u.email}</p>
                        </div>
                      </div>
                      
                      <Badge className={
                        u.role === "Admin" 
                          ? "bg-indigo-100 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 font-semibold text-[10px] px-2 py-0.5 rounded-md" 
                          : "bg-emerald-100 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 font-semibold text-[10px] px-2 py-0.5 rounded-md"
                      }>
                        {u.role}
                      </Badge>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Added {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
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
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            disabled={isSelf || deleteUserMutation.isPending}
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title={isSelf ? "Cannot delete own account" : "Delete user account"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {usersData?.users.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                  No other system users found.
                </div>
              )}
            </div>
          </div>
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
                  placeholder="Full name"
                  disabled={updateUserMutation.isPending}
                  className="h-10 sm:h-9 text-base sm:text-xs"
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

              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="editPassword" className="text-xs">New Password (Leave blank to keep current)</Label>
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    {showEditPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showEditPassword ? "Hide" : "Show"}
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
                    className="pr-10 h-10 sm:h-9 text-base sm:text-xs font-mono"
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
    </div>
  );
}
