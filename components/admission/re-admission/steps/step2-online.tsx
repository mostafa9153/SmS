"use client";

import React, { useState, useEffect } from "react";
import { getAdmissionApplications } from "@/lib/data/admission";
import { getDistinctClasses } from "@/lib/data/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Search,
  Link as LinkIcon,
  ArrowLeft,
  ArrowRight,
  Share2,
  Clock,
  Loader2,
  RefreshCw,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { cn, sortClasses } from "@/lib/utils";

interface Step2OnlineProps {
  onNext: (appData: any) => void;
  onBack: () => void;
}

export function Step2Online({ onNext, onBack }: Step2OnlineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [origin, setOrigin] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableClasses, setAvailableClasses] = useState<string[]>(["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    getDistinctClasses().then((cls) => {
      if (cls && cls.length > 0) setAvailableClasses(sortClasses(cls));
    }).catch(() => {});
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const apps = await getAdmissionApplications({ status: "pending", admissionType: "re" });
      setApplications(apps);
    } catch (e) {
      toast.error("Failed to load online re-admission submissions");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const publicUrl = `${origin}/admission/new/apply?type=re`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setIsCopied(true);
    toast.success("Re-admission link copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const filteredApps = applications.filter((app) => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      app.studentName?.toLowerCase().includes(s) ||
      app.id?.toLowerCase().includes(s) ||
      app.applicationNo?.toLowerCase().includes(s) ||
      app.guardianName?.toLowerCase().includes(s) ||
      app.contactNumber?.includes(s) ||
      app.studentContact?.includes(s);

    const matchesClass = classFilter === "all" || (app.targetClass || app.admittedClass) === classFilter;

    return matchesSearch && matchesClass;
  });

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto py-2 px-2 sm:px-4 animate-in fade-in duration-200">
      {/* Header controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-bold text-foreground">Online Submissions</span>
        </div>

        {/* Filters & Share Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Class:</span>
            <Select value={classFilter} onValueChange={(v) => v && setClassFilter(v)}>
              <SelectTrigger className="h-8 w-24 text-xs font-semibold">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls} value={cls} className="text-xs">
                    Class {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog>
            <DialogTrigger>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10">
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Portal</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm w-[92vw] p-5 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Share2 className="w-4 h-4 text-primary" />
                  <span>Re-Admission Form Link</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 flex flex-col items-center">
                <div className="p-3 bg-white rounded-xl border shadow-xs">
                  <QRCode value={publicUrl} size={140} className="w-full h-auto max-w-[140px]" />
                </div>
                <div className="w-full flex gap-2">
                  <Input value={publicUrl} readOnly className="text-xs font-mono h-9" />
                  <Button size="icon" variant="secondary" className="shrink-0 h-9 w-9" onClick={copyLink} title="Copy Link">
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchApplications}
            disabled={loading}
            className="h-8 w-8 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Search Input Form */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name, app no, PEN, guardian, or phone..."
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Applications List */}
      <div className="flex flex-col gap-2 min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-medium">Loading submissions...</span>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl bg-card/50">
            <Globe className="w-8 h-8 stroke-1 text-muted-foreground/60 mb-2" />
            <span className="text-xs font-medium">No pending online re-admission submissions</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredApps.map((app) => (
              <Card
                key={app.id}
                onClick={() => onNext(app)}
                className="cursor-pointer transition-all duration-150 border hover:border-blue-500/60 hover:shadow-xs group bg-card"
              >
                <CardContent className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center shrink-0 border border-blue-500/20">
                      <span className="text-[9px] uppercase font-bold leading-none">Class</span>
                      <span className="text-xs font-extrabold leading-tight">{app.targetClass || app.admittedClass || "V"}</span>
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {app.studentName}
                        </span>
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-semibold bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Online
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <span className="font-mono">{app.applicationNo}</span>
                        {app.guardianName && (
                          <span className="truncate">G: {app.guardianName}</span>
                        )}
                        {(app.contactNumber || app.studentContact) && (
                          <span>{app.contactNumber || app.studentContact}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-xs font-semibold gap-1 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white shrink-0"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
