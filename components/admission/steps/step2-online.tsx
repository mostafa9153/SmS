"use client";

import React, { useState, useEffect } from "react";
import { getAdmissionApplications } from "@/lib/data/admission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Link as LinkIcon, QrCode, Download, ArrowLeft, User, Phone, CheckCircle, Clock, Share2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

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

  useEffect(() => {
    setOrigin(window.location.origin);
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const apps = await getAdmissionApplications({ status: "pending", admissionType: "new" });
        setApplications(apps);
      } catch (e) {
        toast.error("Failed to load applications");
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const publicUrl = `${origin}/admission/new/apply`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Application link copied to clipboard!");
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.guardianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.contactNumber.includes(searchQuery);
    
    const matchesClass = classFilter === "all" || app.targetClass === classFilter;
    
    return matchesSearch && matchesClass;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Online Applications</h2>
          </div>
        </div>

        <Dialog>
          <DialogTrigger>
            <Button variant="outline" className="gap-2 rounded-full px-4 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary">
              <Share2 className="w-4 h-4" />
              Share Portal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Share Admission Portal
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 flex flex-col items-center">
              <div className="p-4 bg-white dark:bg-black rounded-xl border shadow-sm">
                <QRCode value={publicUrl} size={150} className="w-full h-auto max-w-[150px]" />
              </div>
              <div className="w-full flex gap-2">
                <Input value={publicUrl} readOnly className="text-xs font-mono h-9" />
                <Button size="icon" variant="secondary" className="shrink-0 h-9 w-9" onClick={copyLink}>
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
              <Button className="w-full" variant="outline" onClick={() => window.open(publicUrl, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, phone..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={classFilter} onValueChange={(v) => v && setClassFilter(v)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="V">Class V</SelectItem>
            <SelectItem value="VI">Class VI</SelectItem>
            <SelectItem value="VII">Class VII</SelectItem>
            <SelectItem value="VIII">Class VIII</SelectItem>
            <SelectItem value="IX">Class IX</SelectItem>
            <SelectItem value="X">Class X</SelectItem>
            <SelectItem value="XI">Class XI</SelectItem>
            <SelectItem value="XII">Class XII</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 text-amber-500" />
        <span className="font-medium">{filteredApps.length}</span> pending applications found
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">Loading applications...</div>
        ) : filteredApps.length === 0 ? (
          <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/30">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No pending applications found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </Card>
        ) : (
          filteredApps.map(app => (
            <Card 
              key={app.id} 
              className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden"
              onClick={() => onNext(app)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-center">
                  <div className="p-4 sm:p-5 flex-1 w-full">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{app.studentName}</h3>
                          <Badge variant="outline" className="text-xs bg-primary/5">Class {app.targetClass}</Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground gap-4">
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {app.guardianName}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {app.contactNumber}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 font-mono text-xs">{app.id}</Badge>
                    </div>
                  </div>
                  <div className="bg-muted/20 p-4 sm:p-5 sm:w-48 flex items-center justify-center border-t sm:border-t-0 sm:border-l w-full sm:h-full">
                    <Button className="w-full" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      onNext(app);
                    }}>
                      Verify & Admit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
