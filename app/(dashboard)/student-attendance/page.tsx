"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Info,
  Save,
  ArrowLeft,
  Loader2,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function StudentAttendancePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [className, setClassName] = useState("V");
  const [section, setSection] = useState("A");

  const [roster, setRoster] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [historyStudent, setHistoryStudent] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/teachers/attendance?className=${className}&section=${section}&date=${date}`);
      const data = await res.json();
      if (data.success) {
        setRoster(data.roster || []);
      } else {
        setError(data.error || "Failed to load roster");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [className, section, date]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/analytics`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
    fetchAnalytics();
  }, [fetchRoster, fetchAnalytics]);

  const fetchHistory = async (student: any) => {
    setHistoryStudent(student);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/students/${student.studentId}/attendance`);
      const data = await res.json();
      if(data.success) {
        setHistoryData(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingHistory(false);
  };

  const handleToggle = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "PRESENT" ? "ABSENT" : "PRESENT";
    setRoster(prev => prev.map(r => r.studentId === id ? { ...r, status: newStatus } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        className,
        section,
        date,
        records: roster.map((r) => ({
          studentId: r.studentId,
          studentName: r.studentName,
          rollNo: r.rollNo,
          section: r.section,
          status: r.status,
          remarks: r.remarks,
        })),
      };

      const res = await fetch("/api/teachers/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("Attendance saved successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Failed to save attendance");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const isPastDate = date < todayStr;
  const isFutureDate = date > todayStr;
  const canEdit = !isPastDate && !isFutureDate;

  // Chart Data
  const presentCount = roster.filter(r => r.status === "PRESENT").length;
  const absentCount = roster.filter(r => r.status === "ABSENT").length;
  
  const pieData = [
    { name: "Present", value: presentCount, color: "#10b981" },
    { name: "Absent", value: absentCount, color: "#f43f5e" }
  ];

  const trendData = analytics?.trend ? [...analytics.trend].reverse().map(t => ({
    name: new Date(t.date).toLocaleDateString("en-US", { weekday: "short" }),
    present: t.present,
    absent: t.absent
  })) : [];

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="p-2 bg-muted hover:bg-muted/80 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Student Attendance</h1>
            <p className="text-sm text-muted-foreground">Record and track daily attendance</p>
          </div>
        </div>
        
        <Button 
          variant={showAnalytics ? "default" : "outline"}
          onClick={() => setShowAnalytics(!showAnalytics)} 
          className="flex items-center gap-2 rounded-xl transition-all h-11 px-5 shadow-sm"
        >
          <BarChart3 className="w-4 h-4" />
          {showAnalytics ? "Hide Analytics" : "View Global Analytics"}
          {showAnalytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Analytics Visuals (Hidden by default) */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Class Overview Donut */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 self-start w-full text-center">Today's Class Overview</h2>
            <div className="h-44 w-full max-w-[240px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-foreground">{roster.length}</span>
                <span className="text-[11px] text-muted-foreground font-bold tracking-wider">STUDENTS</span>
              </div>
            </div>
            <div className="flex gap-8 mt-6">
              <span className="text-sm font-bold flex items-center gap-2 text-emerald-600"><span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"/> {presentCount} Present</span>
              <span className="text-sm font-bold flex items-center gap-2 text-rose-600"><span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"/> {absentCount} Absent</span>
            </div>
          </div>

          {/* Global Trend Bar */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col">
             <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">School 7-Day Trend</h2>
             <div className="flex-1 min-h-[180px] w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'var(--muted)'}}
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', fontSize: '13px' }}
                    />
                    <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="absent" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                 <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading trend data...</div>
              )}
             </div>
          </div>
        </div>
      )}

      {/* Controls & Top Save Button */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto lg:flex-1 max-w-2xl">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Date</label>
            <Input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Class</label>
            <Select value={className} onValueChange={(v) => setClassName(v || "V")}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map(c => (
                  <SelectItem key={c} value={c}>Class {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Section</label>
            <Select value={section} onValueChange={(v) => setSection(v || "A")}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {["A", "B", "C", "D", "ALL"].map(s => (
                  <SelectItem key={s} value={s}>Section {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Save button duplicated at the top for convenience on large screens */}
        {canEdit && roster.length > 0 && (
          <Button
            disabled={saving}
            onClick={handleSave}
            className="w-full lg:w-auto h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md gap-2"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save Changes
          </Button>
        )}
      </div>

      {isPastDate && (
        <div className="flex items-center gap-2 p-4 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-xl text-sm font-medium animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          Editing past dates is restricted. This roster is in read-only mode.
        </div>
      )}

      {/* Roster List */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Student Roster</h2>
          <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold">{roster.length} Enrolled</span>
        </div>
        
        {loading ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary/50" />
            <p className="text-sm font-medium">Loading class roster...</p>
          </div>
        ) : roster.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground bg-card border border-border rounded-2xl shadow-sm">
            <p className="text-lg font-bold text-foreground mb-2">No students found.</p>
            <p className="text-sm">Please select a valid class and section to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {roster.map(student => {
              let badge = null;
              if (student.consecutiveAbsences >= 30) badge = { label: "1m+ Abs", color: "bg-red-500 text-white" };
              else if (student.consecutiveAbsences >= 14) badge = { label: "2w Abs", color: "bg-orange-500 text-white" };
              else if (student.consecutiveAbsences >= 7) badge = { label: "1w Abs", color: "bg-amber-500 text-white" };

              return (
                <div key={student.studentId} className={`bg-card border ${student.status === "ABSENT" ? "border-rose-500/50 shadow-rose-500/10" : "border-border shadow-sm"} rounded-2xl flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md`}>
                  {/* Top Main Section */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[15px] text-foreground truncate" title={student.studentName}>
                        {student.studentName}
                      </h3>
                      <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground font-medium mt-1.5">
                        <span className="font-semibold">Roll: {student.rollNo || "--"}</span>
                        <span className="opacity-50">•</span>
                        <span className={`${student.monthPercentage < 75 ? 'text-rose-500' : 'text-emerald-500'} font-bold`}>{student.monthPercentage}% MTD</span>
                        {badge && (
                          <>
                            <span className="opacity-50">•</span>
                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold tracking-wide ${badge.color}`}>
                              {badge.label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Touch Friendly Toggle */}
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => handleToggle(student.studentId, student.status)}
                      className={`relative w-[60px] h-9 flex-shrink-0 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${student.status === "PRESENT" ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    >
                      <div className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full transition-transform duration-300 shadow-sm flex items-center justify-center ${student.status === "PRESENT" ? 'translate-x-[24px]' : 'translate-x-0'}`}>
                        {student.status === "PRESENT" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                      </div>
                    </button>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="bg-muted/30 border-t border-border/50 px-4 py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => fetchHistory(student)}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Clock className="h-4 w-4" />
                        History
                      </button>
                      <Link 
                        href={`/students/${student.studentId}`} 
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Info className="h-4 w-4" />
                        Profile
                      </Link>
                    </div>
                    {student.contactNumber && (
                      <a 
                        href={`tel:${student.contactNumber}`} 
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Save Section (Replaces floating bar) */}
      {roster.length > 0 && canEdit && (
        <div className="mt-8 mb-4 flex flex-col items-center justify-center p-8 bg-card border border-border rounded-3xl shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <p className="text-sm font-medium text-muted-foreground mb-5 text-center">Done marking attendance? Make sure to submit your changes.</p>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-80 h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-full shadow-lg transition-transform active:scale-95"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Save className="w-6 h-6 mr-2" />}
            Submit Attendance
          </Button>
          
          {error && <div className="mt-4 text-rose-500 font-bold bg-rose-500/10 px-4 py-2 rounded-xl text-sm">{error}</div>}
          {success && <div className="mt-4 text-emerald-600 font-bold bg-emerald-500/10 px-4 py-2 rounded-xl text-sm">{success}</div>}
        </div>
      )}

      {/* Student History Modal */}
      <Dialog open={!!historyStudent} onOpenChange={(open) => !open && setHistoryStudent(null)}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {historyStudent?.studentName}
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-medium mt-1">Last 30 Days Attendance History</p>
          </DialogHeader>
          <div className="p-4 sm:p-6 bg-card">
            {loadingHistory ? (
               <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                 <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary/50" />
                 <p className="text-sm font-medium">Loading history...</p>
               </div>
            ) : historyData.length === 0 ? (
               <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-2xl border border-border/50">
                 <p className="text-sm font-medium">No recent attendance records found.</p>
               </div>
            ) : (
               <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                 {historyData.map((record, i) => (
                   <div key={i} className="flex justify-between items-center p-4 bg-muted/20 hover:bg-muted/40 transition-colors rounded-2xl border border-border/50">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border shadow-sm">
                         <Calendar className="w-4 h-4 text-muted-foreground" />
                       </div>
                       <span className="text-sm font-bold text-foreground">
                         {new Date(record.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                       </span>
                     </div>
                     <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${record.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                       {record.status}
                     </span>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
