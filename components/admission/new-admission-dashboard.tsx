"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Users, Clock, CheckCircle, Search, Banknote, Eye, FileText } from "lucide-react";
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
      <div className="p-4 border-b flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              New Admission Dashboard
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-muted/10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Online Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-600">{stats.onlinePending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Admitted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-600">{stats.totalAdmitted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Fee Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-primary">₹{stats.totalCollected.toLocaleString("en-IN")}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="flex flex-col flex-1 min-h-[400px]">
          <CardHeader className="pb-3 shrink-0 border-b">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search name, ID, phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={sourceFilter} onValueChange={v => v && setSourceFilter(v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Sources</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => v && setStatusFilter(v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Admitted">Admitted</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={v => v && setClassFilter(v)}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Classes</SelectItem>
                  {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-auto flex-1 p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 border-b shadow-sm">
                <TableRow>
                  <TableHead className="w-[150px]">App/Form No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class & Section</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>School ID</TableHead>
                  <TableHead>Fee Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="w-[90px] text-center">Form</TableHead>
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
                        {app.applicationNo || app.formNo || (app.targetClass ? `AP/${app.academicYear || "2026"}/${app.targetClass}/${app.id.slice(0, 4).toUpperCase()}` : app.id)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {app.studentName}
                      </TableCell>
                      <TableCell>{app.admittedClass || app.targetClass} {app.admittedSection ? `- ${app.admittedSection}` : ""}</TableCell>
                      <TableCell>{app.admittedRoll || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={app.formMethod === "online" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}>
                          {app.formMethod === "online" ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={app.status === "admitted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
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
