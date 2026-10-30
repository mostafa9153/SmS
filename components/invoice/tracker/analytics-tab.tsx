"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { FileText, UserCheck, Calendar, ChevronRight, IndianRupee, Copy, Receipt, Layers, Filter, Printer, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { DatePreset } from "@/components/invoice/tracker/helpers";
import { PAGE_SIZE } from "@/components/invoice/tracker/constants";
import type { InvoiceTrackerState } from "./use-invoice-tracker";

export function AnalyticsTab({ tracker }: { tracker: InvoiceTrackerState }) {
  const { admissionCategoryFilter, admissionCategoryOptions, classFilter, classSelectOptions, currentPage, dateFilterPreset, datePresetOptions, displayedStats, endDate, filteredList, handleCopyInvoice, handleDirectVerify, handlePrintStudentCopy, hasProceeded, invoicesList, isFiltered, paginatedList, sessionFilter, sessionOptions, setAdmissionCategoryFilter, setClassFilter, setCurrentPage, setDateFilterPreset, setEndDate, setHasProceeded, setModeFilter, setSessionFilter, setStartDate, setStatusFilter, setTableSearch, setTypeFilter, startDate, statusFilter, tableSearch, totalPages, typeFilter } = tracker;
  return (
    <div className="space-y-4">
      {/* TOP EXECUTIVE KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Total Generated Receipts */}
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Total Invoices {sessionFilter !== "ALL" ? `(${sessionFilter})` : ""}
            </span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {displayedStats?.totalInvoices || 0}
          </p>
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-medium">
            <span className="text-emerald-600 font-semibold">{displayedStats?.totalActive || 0} active</span>
            <span>&bull;</span>
            <span className="text-rose-600 font-semibold">{displayedStats?.totalCancelled || 0} void</span>
          </div>
        </div>

        {/* 2. Total Revenue Collection */}
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Total Fee Collection {sessionFilter !== "ALL" ? `(${sessionFilter})` : ""}
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 truncate">
            ₹{(displayedStats?.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[10px] text-muted-foreground truncate">
            {displayedStats && displayedStats.totalInvoices > 0 ? (
              <span>
                Avg: ₹{Math.round((displayedStats.totalAmount || 0) / (displayedStats.totalActive || 1))} / invoice
              </span>
            ) : (
              "Session receipts total"
            )}
          </div>
        </div>

        {/* 3. Filled vs Blank Slips Inventory */}
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Filled vs Blank</span>
            <div className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 text-sm font-bold">
            <span className="text-teal-700 dark:text-teal-400 font-mono text-lg">
              {displayedStats?.totalFilled || 0}
            </span>
            <span className="text-muted-foreground text-[11px] font-normal">roster</span>
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-amber-700 dark:text-amber-400 font-mono text-lg">
              {displayedStats?.totalBlank || 0}
            </span>
            <span className="text-muted-foreground text-[11px] font-normal">blank</span>
          </div>
          {/* Progress Ratio Bar */}
          <div className="w-full bg-muted/80 h-1.5 rounded-full overflow-hidden flex">
            <div
              style={{
                width: `${
                  displayedStats && displayedStats.totalInvoices > 0
                    ? (displayedStats.totalFilled / displayedStats.totalInvoices) * 100
                    : 50
                }%`,
              }}
              className="bg-teal-500 h-full transition-all"
              title="Pre-Filled Invoices"
            />
            <div
              style={{
                width: `${
                  displayedStats && displayedStats.totalInvoices > 0
                    ? (displayedStats.totalBlank / displayedStats.totalInvoices) * 100
                    : 50
                }%`,
              }}
              className="bg-amber-500 h-full transition-all"
              title="Blank Slips"
            />
          </div>
        </div>

        {/* 4. Generation Mode (Batch vs Single) */}
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Mode Breakdown</span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 text-sm font-bold">
            <span className="text-blue-700 dark:text-blue-400 font-mono text-lg">
              {displayedStats?.totalBulk || 0}
            </span>
            <span className="text-muted-foreground text-[11px] font-normal">batch</span>
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-foreground font-mono text-lg">{displayedStats?.totalSingle || 0}</span>
            <span className="text-muted-foreground text-[11px] font-normal">single</span>
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {displayedStats && displayedStats.totalInvoices > 0
              ? `${Math.round(((displayedStats.totalBulk || 0) / displayedStats.totalInvoices) * 100)}% printed in batch`
              : "Batch generator mode"}
          </div>
        </div>
      </div>

      {/* TOOLBAR: SEARCH & PROPORTIONAL DROPDOWN FILTERS & PROCEED BUTTON */}
      <div className="p-3 rounded-2xl border border-border/80 bg-muted/20 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <SearchInput value={tableSearch} onChange={setTableSearch} placeholder="Search receipt, student, roll, ID..." size="sm" className="min-w-[180px] flex-1" />

          {/* 0. Academic Session / Year Dropdown Selector */}
          <div className="w-[140px] shrink-0">
            <CustomSelect
              value={sessionFilter}
              onChange={(val) => setSessionFilter(String(val))}
              options={sessionOptions}
              searchable={false}
              placeholder="Session: 2026"
              triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background border-primary/40 text-primary"
            />
          </div>

          {/* 1. Class Dropdown Selector */}
          <div className="w-[140px] shrink-0">
            <CustomSelect
              value={classFilter}
              onChange={(val) => setClassFilter(String(val))}
              options={classSelectOptions}
              searchable={false}
              placeholder="Class: All"
              triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background"
            />
          </div>

          {/* 2. Admission Category & Mode Filter */}
          <div className="w-[160px] shrink-0">
            <CustomSelect
              value={admissionCategoryFilter}
              onChange={(val) => setAdmissionCategoryFilter(val as any)}
              options={admissionCategoryOptions}
              searchable={false}
              placeholder="Category: All"
              triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background"
            />
          </div>

          {/* 3. Date Range Preset Filter */}
          <div className="w-[135px] shrink-0">
            <CustomSelect
              value={dateFilterPreset}
              onChange={(val) => setDateFilterPreset(val as DatePreset)}
              options={datePresetOptions}
              searchable={false}
              placeholder="Date: All"
              triggerClassName="h-8 text-xs font-semibold rounded-xl bg-background"
            />
          </div>

          {/* 4. Slip Type Filter */}
          <div className="w-[120px] shrink-0">
            <CustomSelect
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as any)}
              options={[
                { label: "All Types", value: "ALL" },
                { label: "Pre-Filled", value: "FILLED" },
                { label: "Blank Slips", value: "BLANK" },
              ]}
              searchable={false}
              placeholder="Type: All"
              triggerClassName="h-8 text-xs rounded-xl bg-background"
            />
          </div>

          {/* 5. Status Filter */}
          <div className="w-[115px] shrink-0">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={[
                { label: "All Status", value: "ALL" },
                { label: "Active", value: "ACTIVE" },
                { label: "Cancelled", value: "CANCELLED" },
              ]}
              searchable={false}
              placeholder="Status: All"
              triggerClassName="h-8 text-xs rounded-xl bg-background"
            />
          </div>

          {/* 6. Proceed / Apply Filters Button */}
          <Button
            size="sm"
            onClick={() => setHasProceeded(true)}
            className="h-8 px-4 text-xs font-bold rounded-xl shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs flex items-center gap-1.5"
          >
            <span>Proceed</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Custom Date Inputs Row when Custom Range is selected */}
        {dateFilterPreset === "CUSTOM" && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-xs">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Custom Range:
            </span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-7 text-xs w-[140px] rounded-lg bg-background"
              placeholder="Start Date"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-7 text-xs w-[140px] rounded-lg bg-background"
              placeholder="End Date"
            />
          </div>
        )}

        {/* Filter Summary & Quick Reset */}
        {isFiltered && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
            <span>
              {hasProceeded ? (
                <>
                  Filtered: <strong className="text-foreground">{filteredList.length}</strong> of{" "}
                  {invoicesList.length} invoices
                  {sessionFilter !== "ALL" && (
                    <> (Session: <strong className="text-primary">{sessionFilter}</strong>)</>
                  )}
                </>
              ) : (
                <>Filters selected. Click <strong>Proceed</strong> to load results.</>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setTableSearch("");
                setSessionFilter(null);
                setTypeFilter("ALL");
                setAdmissionCategoryFilter("ALL");
                setClassFilter("ALL");
                setStatusFilter("ALL");
                setModeFilter("ALL");
                setDateFilterPreset("ALL");
                setStartDate("");
                setEndDate("");
              }}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* CONDITIONAL TABLE RENDERING: PROCEED FIRST OR VIEW TABLE */}
      {!hasProceeded ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-10 text-center space-y-3.5 shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto ring-1 ring-primary/20">
            <Filter className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-foreground text-sm">Select Filters &amp; Click Proceed</h3>
            <p className="text-xs text-muted-foreground">
              Configure your class, admission category, date range, or slip type filters above, then click Proceed to load matching invoice records.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setHasProceeded(true)}
            className="h-8 px-5 text-xs font-bold rounded-xl cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs inline-flex items-center gap-1.5"
          >
            <span>Proceed &amp; Load Records</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        /* STANDARD INVOICES REGISTRY TABLE */
        <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-2xs">
          {/* Table Header Row (Desktop) */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-2 bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Invoice # / Type</div>
            <div className="col-span-4">Student &amp; Guardian Info</div>
            <div className="col-span-2">Class &amp; Roll</div>
            <div className="col-span-2 text-right">Fee Amount</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          {/* Table Content List */}
          <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto text-xs">
            {filteredList.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={invoicesList.length > 0 ? "No matching invoices" : "No invoices yet"}
                action={
                  isFiltered && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTableSearch("");
                        setTypeFilter("ALL");
                        setAdmissionCategoryFilter("ALL");
                        setModeFilter("ALL");
                        setClassFilter("ALL");
                        setStatusFilter("ALL");
                        setDateFilterPreset("ALL");
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="h-8 text-xs rounded-xl cursor-pointer"
                    >
                      Clear All Filters
                    </Button>
                  )
                }
              />
            ) : (
              paginatedList.map((inv) => {
                const isCancelled = (inv as any).invoice_status === "cancelled";
                return (
                  <div
                    key={inv.id || inv.invoice_number}
                    className={cn(
                      "p-3 sm:px-3 sm:py-2.5 sm:grid sm:grid-cols-12 gap-2 items-center hover:bg-muted/40 transition-colors",
                      isCancelled && "opacity-60 bg-rose-500/5"
                    )}
                  >
                    {/* Col 1: Invoice # & Type */}
                    <div className="col-span-3 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-foreground text-xs select-all">
                          {inv.invoice_number}
                        </span>
                        <button
                          type="button"
                          title="Copy invoice number"
                          onClick={(e) => handleCopyInvoice(inv.invoice_number, e)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-muted"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 rounded-md font-semibold",
                            inv.is_blank
                              ? "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/20"
                              : "border-teal-400 text-teal-700 bg-teal-50 dark:bg-teal-950/20"
                          )}
                        >
                          {inv.is_blank ? "Blank Slip" : "Pre-Filled"}
                        </Badge>
                        <span className="text-[9.5px] text-muted-foreground font-mono">
                          {inv.generator_mode === "bulk" ? "Batch" : "Single"}
                        </span>
                        {isCancelled && (
                          <Badge className="text-[9px] px-1 py-0 bg-rose-500/10 text-rose-600 border border-rose-400/30">
                            Cancelled
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Col 2: Student & Guardian Info */}
                    <div className="col-span-4 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {inv.student_name || (
                          <span className="text-muted-foreground italic font-normal">
                            [Blank Student Write-in]
                          </span>
                        )}
                      </p>
                      <div className="text-[10.5px] text-muted-foreground flex items-center gap-1 truncate">
                        {inv.guardian_name ? (
                          <span>G: {inv.guardian_name}</span>
                        ) : inv.assigned_to ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Teacher: {inv.assigned_to}
                          </span>
                        ) : null}
                        {inv.student_id && (
                          <span className="font-mono">({inv.student_id})</span>
                        )}
                      </div>
                    </div>

                    {/* Col 3: Class & Roll & Issue Date */}
                    <div className="col-span-2">
                      <p className="font-mono font-bold text-foreground">
                        Class {inv.student_class}
                        {inv.section ? `-${inv.section}` : ""}
                        {inv.roll_no ? ` • Roll: ${inv.roll_no}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {inv.issue_date} {inv.issue_time || ""}
                      </p>
                    </div>

                    {/* Col 4: Amount */}
                    <div className="col-span-2 text-left sm:text-right mt-1 sm:mt-0">
                      <span className="font-mono font-bold text-sm text-foreground">
                        ₹{Number(inv.total_amount).toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {inv.payment_mode || "Cash"}
                      </span>
                    </div>

                    {/* Col 5: Actions */}
                    <div className="col-span-1 flex items-center justify-end sm:justify-center gap-1 mt-2 sm:mt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDirectVerify(inv.invoice_number)}
                        className="h-7 text-[11px] px-2 font-semibold text-primary hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                        title="Verify full particulars and fee heads"
                      >
                        <span>Verify</span>
                        <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintStudentCopy(inv);
                        }}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0 border-border/70"
                        title="1-Click Reprint Student Copy"
                      >
                        <Printer className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PAGINATION FOOTER */}
          {filteredList.length > 0 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              total={filteredList.length}
              pageSize={PAGE_SIZE}
              alwaysShow
              className="p-2.5 px-4 bg-muted/30 border-t"
            />
          )}
        </div>
      )}
    </div>
  );
}
