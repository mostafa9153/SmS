"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Printer, Search, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [newAdmissions, setNewAdmissions] = useState<any[]>([]);
  const [reAdmissions, setReAdmissions] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/invoices?limit=100");
        if (!res.ok) throw new Error("Failed to fetch invoices");
        const json = await res.json();
        if (!active) return;

        const allInvoices: any[] = json.data || [];
        const newApps = allInvoices
          .filter(inv => inv.remarks?.toLowerCase().includes("new admission") || inv.student_id?.startsWith("ADM") || inv.student_id?.startsWith("APP") || inv.student_id?.startsWith("FRM"))
          .map(inv => ({
            id: inv.invoice_number,
            student: inv.student_name || "Applicant",
            class: `${inv.student_class} ${inv.section ? `- ${inv.section}` : ""}`,
            amount: Number(inv.total_amount) || 0,
            date: inv.issue_date || new Date().toISOString().split("T")[0],
            status: inv.payment_status || "Paid",
          }));

        const reApps = allInvoices
          .filter(inv => !inv.remarks?.toLowerCase().includes("new admission") && !inv.student_id?.startsWith("ADM") && !inv.student_id?.startsWith("APP") && !inv.student_id?.startsWith("FRM"))
          .map(inv => ({
            id: inv.invoice_number,
            student: inv.student_name || "Continuing Student",
            class: `${inv.student_class} ${inv.section ? `- ${inv.section}` : ""}`,
            amount: Number(inv.total_amount) || 0,
            date: inv.issue_date || new Date().toISOString().split("T")[0],
            status: inv.payment_status || "Paid",
          }));

        setNewAdmissions(newApps);
        setReAdmissions(reApps);
      } catch (err) {
        console.error("Error loading invoices:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchInvoices();
    return () => {
      active = false;
    };
  }, []);

  const renderInvoiceList = (invoices: any[]) => {
    const filtered = invoices.filter(inv => 
      inv.student.toLowerCase().includes(search.toLowerCase()) || 
      inv.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="space-y-4 mt-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by student name or receipt number..." 
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            No invoices found matching "{search}"
          </div>
        ) : (
          filtered.map(inv => (
            <Card key={inv.id} className="group hover:border-primary/50 transition-colors">
              <CardContent className="p-0 flex items-center justify-between">
                <div className="p-4 sm:p-6 flex-1 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold">{inv.student}</h4>
                      <p className="text-sm text-muted-foreground">Class {inv.class}</p>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block">
                    <p className="text-sm font-mono text-muted-foreground">{inv.id}</p>
                    <p className="text-xs text-muted-foreground">{inv.date}</p>
                  </div>
                  
                  <div className="flex-1 sm:text-right">
                    <div className="font-bold text-lg">₹{inv.amount}</div>
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {inv.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 bg-muted/20 border-l flex items-center justify-center h-full">
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                    <Printer className="w-4 h-4" /> Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Admission Invoices</h1>
          <p className="text-muted-foreground">Manage and print fee receipts for admissions.</p>
        </div>
        <Button className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Batch Print
        </Button>
      </div>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="new">New Admissions</TabsTrigger>
          <TabsTrigger value="readmission">Re-Admissions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-6">
              <CardTitle>New Admission Receipts</CardTitle>
              <CardDescription>Invoices generated from the New Admission Wizard.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {renderInvoiceList(newAdmissions)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="readmission">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-6">
              <CardTitle>Re-Admission Receipts</CardTitle>
              <CardDescription>Invoices generated for returning students.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {renderInvoiceList(reAdmissions)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
