"use client";

import React, { useState, useEffect } from "react";
import { getAdmissionApplications } from "@/lib/data/admission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Link as LinkIcon, Download, ArrowLeft, User, Phone, Clock, Share2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

interface Step2OnlineProps {
  onNext: (appData: any) => void;
  onBack: () => void;
  academicYear?: string;
}

export function Step2Online({ onNext, onBack, academicYear }: Step2OnlineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [origin, setOrigin] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOrigin(window.location.origin);
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const apps = await getAdmissionApplications({ 
          status: "pending", 
          admissionType: "new",
          academicYear: academicYear || undefined 
        });
        setApplications(apps);
      } catch (e) {
        toast.error("Failed to load applications");
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, [academicYear]);

  const publicUrl = `${origin}/admission/new/apply`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Application link copied to clipboard!");
  };

  const filteredApps = applications.filter(app => {
    const s = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery ||
      app.studentName?.toLowerCase().includes(s) ||
      app.id?.toLowerCase().includes(s) ||
      app.applicationNo?.toLowerCase().includes(s) ||
      app.formNo?.toLowerCase().includes(s) ||
      app.guardianName?.toLowerCase().includes(s) ||
      app.contactNumber?.includes(s) ||
      app.studentContact?.includes(s);
    
    const matchesClass = classFilter === "all" || (app.targetClass || app.admittedClass) === classFilter;
    
    return matchesSearch && matchesClass;
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">Online Applications</h2>
        </div>

        <Dialog>
          <DialogTrigger>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full px-3 sm:px-4 h-8 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-semibold shrink-0 cursor-pointer">
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Portal</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-md w-[92vw] p-5 sm:p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Share Admission Portal
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3 flex flex-col items-center">
              <div className="p-3 bg-white rounded-xl border shadow-xs">
                <QRCode value={publicUrl} size={140} className="w-full h-auto max-w-[140px]" />
              </div>
              <div className="w-full flex gap-2">
                <Input value={publicUrl} readOnly className="text-xs font-mono h-9" />
                <Button size="icon" variant="secondary" className="shrink-0 h-9 w-9 cursor-pointer" onClick={copyLink} title="Copy Link">
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
              <Button className="w-full text-xs font-semibold h-9 cursor-pointer" variant="outline" onClick={() => window.open(publicUrl, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Open / Download QR
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, phone..."
            className="pl-9 h-9 text-xs bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={classFilter} onValueChange={(v) => v && setClassFilter(v)}>
          <SelectTrigger className="w-full h-9 text-xs bg-background">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map(c => (
              <SelectItem key={c} value={c}>Class {c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span><strong className="text-foreground">{filteredApps.length}</strong> pending applications found</span>
      </div>

      {/* Applications List */}
      <div className="space-y-2.5 sm:space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">Loading applications...</div>
        ) : filteredApps.length === 0 ? (
          <Card className="border-dashed flex flex-col items-center justify-center p-8 sm:p-12 text-center text-muted-foreground bg-muted/20 rounded-xl">
            <Search className="w-10 h-10 mb-3 opacity-20" />
            <p className="font-semibold text-sm">No pending applications found</p>
          </Card>
        ) : (
          filteredApps.map(app => {
            const displayAppNo = app.applicationNo || app.formNo || (app.targetClass ? `APP-2026-${app.id.slice(0, 4).toUpperCase()}` : `APP-${app.id.slice(0, 6).toUpperCase()}`);
            const guardian = app.guardianName || app.fatherName || "";
            const contact = app.contactNumber || app.studentContact || app.primaryMobile || "";

            return (
              <Card 
                key={app.id} 
                className="group hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer overflow-hidden rounded-xl border bg-card"
                onClick={() => onNext(app)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <div className="p-3.5 sm:p-4 flex-1 w-full min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <h3 className="font-bold text-sm sm:text-base text-foreground truncate max-w-[200px] sm:max-w-none group-hover:text-primary transition-colors">
                              {app.studentName || "Unnamed Applicant"}
                            </h3>
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 bg-primary/5 text-primary border-primary/20 font-semibold">
                              Class {app.targetClass || app.admittedClass || "V"}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-x-3 gap-y-1">
                            {guardian && (
                              <span className="flex items-center gap-1 truncate max-w-[150px]">
                                <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                                <span className="truncate">{guardian}</span>
                              </span>
                            )}
                            {contact && (
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <Phone className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                                <span>{contact}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Clean, compact Application Number badge (replaces raw UUID) */}
                        <Badge variant="secondary" className="shrink-0 font-mono text-[10px] sm:text-xs px-2 py-0.5 font-semibold bg-muted/80 text-foreground border shadow-2xs">
                          {displayAppNo}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-muted/10 p-2.5 sm:p-4 sm:w-44 flex items-center justify-center border-t sm:border-t-0 sm:border-l w-full shrink-0">
                      <Button 
                        className="w-full h-8 sm:h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onNext(app);
                        }}
                      >
                        <span>Verify & Admit</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
