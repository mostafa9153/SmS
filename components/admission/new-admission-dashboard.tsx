"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Users, Clock, CheckCircle, Search, Banknote, Eye, FileText, ChevronRight, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAdmissionApplications } from "@/lib/data/admission";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViewApplicationFormDialog } from "./view-application-form-dialog";
import { format } from "date-fns";

export function NewAdmissionDashboard({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const apps = await getAdmissionApplications({ admissionType: "new" });
        if (active) {
          setApplications(apps);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  const filteredApps = applications.filter(a => {
    if (sourceFilter !== "All") {
      const isOnline = a.formMethod === "online";
      if (sourceFilter === "Online" && !isOnline) return false;
      if (sourceFilter === "Offline" && isOnline) return false;
    }
    if (statusFilter !== "All") {
      if (statusFilter === "Pending" && a.status !== "pending") return false;
      if (statusFilter === "Admitted" && a.status !== "admitted") return false;
    }
    if (classFilter !== "All") {
      const cls = a.admittedClass || a.targetClass;
      if (cls !== classFilter) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (
        !a.studentName?.toLowerCase().includes(s) &&
        !a.id?.toLowerCase().includes(s) &&
        !a.applicationNo?.toLowerCase().includes(s) &&
        !a.formNo?.toLowerCase().includes(s) &&
        !a.studentId?.toLowerCase().includes(s) &&
        !a.contactNumber?.includes(s)
      ) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: applications.length,
    onlinePending: applications.filter(a => a.formMethod === "online" && a.status === "pending").length,
    totalAdmitted: applications.filter(a => a.status === "admitted").length,
    totalCollected: applications.filter(a => a.feePaid).reduce((sum, a) => sum + (Number(a.feeAmount) || 0), 0)
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="p-3 sm:p-4 border-b flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full cursor-pointer">
            <X className="w-4 h-4" />
          </Button>
          <h2 className="text-base sm:text-xl font-bold flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span>Admission Dashboard</span>
          </h2>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 bg-muted/10 space-y-3 sm:space-y-6 pb-28 sm:pb-10">
        {/* Metric Cards: 2x2 on mobile, 4 columns on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4 shadow-2xs">
            <div className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Total Applications</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black mt-1 text-foreground">{stats.total}</div>
          </Card>
          <Card className="p-3 sm:p-4 shadow-2xs">
            <div className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Online Pending</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black mt-1 text-amber-600">{stats.onlinePending}</div>
          </Card>
          <Card className="p-3 sm:p-4 shadow-2xs">
            <div className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Total Admitted</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black mt-1 text-emerald-600">{stats.totalAdmitted}</div>
          </Card>
          <Card className="p-3 sm:p-4 shadow-2xs">
            <div className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">Total Collected</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black mt-1 text-primary">₹{stats.totalCollected.toLocaleString("en-IN")}</div>
          </Card>
        </div>

        {/* Search & Filter Card */}
        <Card className="flex flex-col flex-1 min-h-[400px] shadow-2xs">
          <CardHeader className="p-3 sm:p-4 pb-3 shrink-0 border-b space-y-2.5">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search name, ID, phone..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9 h-9 text-xs bg-background" 
              />
            </div>

            {/* 3-Dropdown Grid for seamless mobile alignment */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              <Select value={sourceFilter} onValueChange={v => v && setSourceFilter(v)}>
                <SelectTrigger className="h-8 sm:h-9 text-[11px] sm:text-xs bg-background px-2 sm:px-3">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Sources</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={v => v && setStatusFilter(v)}>
                <SelectTrigger className="h-8 sm:h-9 text-[11px] sm:text-xs bg-background px-2 sm:px-3">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Admitted">Admitted</SelectItem>
                </SelectContent>
              </Select>

              <Select value={classFilter} onValueChange={v => v && setClassFilter(v)}>
                <SelectTrigger className="h-8 sm:h-9 text-[11px] sm:text-xs bg-background px-2 sm:px-3">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Classes</SelectItem>
                  {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            {/* Mobile View: Clean Card List */}
            <div className="block md:hidden divide-y divide-border/60">
              {loading ? (
                <div className="text-center py-8 text-xs text-muted-foreground">Loading data...</div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">No applications found</div>
              ) : (
                filteredApps.map(app => {
                  const formNum = app.applicationNo || app.formNo || (app.targetClass ? `APP-2026-${app.id.slice(0, 4).toUpperCase()}` : app.id.slice(0, 8));
                  const cls = app.admittedClass || app.targetClass || "V";
                  const sec = app.admittedSection ? ` - ${app.admittedSection}` : "";
                  const roll = app.admittedRoll ? ` • Roll #${app.admittedRoll}` : "";

                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="p-3.5 hover:bg-muted/60 active:bg-muted/80 transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {app.studentName || "Unnamed Student"}
                          </h4>
                          <Badge 
                            variant="secondary" 
                            className={app.status === "admitted" ? "bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0 shrink-0 font-semibold" : "bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 shrink-0 font-semibold"}
                          >
                            {app.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-x-2 gap-y-0.5">
                          <span className="font-medium text-foreground">Class {cls}{sec}{roll}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">{formNum}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                          <Badge variant="outline" className={app.formMethod === "online" ? "bg-blue-50 text-blue-700 text-[9px] px-1 py-0 font-medium" : "bg-purple-50 text-purple-700 text-[9px] px-1 py-0 font-medium"}>
                            {app.formMethod === "online" ? "Online" : "Offline"}
                          </Badge>
                          <span className={app.feePaid ? "text-emerald-600 font-semibold" : "text-amber-600 font-medium"}>
                            {app.feePaid ? "Paid" : "Fee Pending"}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View: Full Responsive Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 border-b shadow-2xs">
                  <TableRow>
                    <TableHead className="w-[140px]">App/Form No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class & Section</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>School ID</TableHead>
                    <TableHead>Fee Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    <TableHead className="w-[80px] text-center">Form</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8">Loading data...</TableCell></TableRow>
                  ) : filteredApps.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No applications found</TableCell></TableRow>
                  ) : (
                    filteredApps.map(app => (
                      <TableRow 
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className="cursor-pointer hover:bg-muted/70 transition-colors group"
                        title="Click to open filled admission form"
                      >
                        <TableCell className="font-medium text-xs font-mono">
                          {app.applicationNo || app.formNo || (app.targetClass ? `AP/${app.academicYear || "2026"}/${app.targetClass}/${app.id.slice(0, 4).toUpperCase()}` : app.id.slice(0, 8))}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {app.studentName}
                        </TableCell>
                        <TableCell>{app.admittedClass || app.targetClass} {app.admittedSection ? `- ${app.admittedSection}` : ""}</TableCell>
                        <TableCell>{app.admittedRoll || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={app.formMethod === "online" ? "bg-blue-50 text-blue-700 text-xs" : "bg-purple-50 text-purple-700 text-xs"}>
                            {app.formMethod === "online" ? "Online" : "Offline"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={app.status === "admitted" ? "bg-emerald-100 text-emerald-800 text-xs" : "bg-amber-100 text-amber-800 text-xs"}>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{app.studentId || "-"}</TableCell>
                        <TableCell>
                          {app.feePaid ? <span className="text-emerald-600 font-medium">Paid</span> : <span className="text-muted-foreground">Pending</span>}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {app.createdAt ? format(new Date(app.createdAt), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10 gap-1 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1-Click Filled Admission Form Dialog */}
      <ViewApplicationFormDialog
        open={!!selectedApp}
        onOpenChange={(open) => !open && setSelectedApp(null)}
        application={selectedApp}
      />
    </div>
  );
}
