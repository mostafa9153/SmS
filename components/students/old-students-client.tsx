"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getOldStudents, type OldStudentItem } from "@/lib/data/students";
import {
  Search,
  X,
  Calendar,
  GraduationCap,
  Users,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/students/status-badge";
import type { StudentStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface OldStudentsClientProps {
  selectedYear: number;
}

export default function OldStudentsClient({ selectedYear }: OldStudentsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Generate a list of archive years (last 6 years)
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Query old students data for selected year
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["old-students", selectedYear, debouncedSearch, currentPage],
    queryFn: async () => {
      return getOldStudents({
        year: selectedYear,
        query: debouncedSearch || undefined,
        page: currentPage,
        pageSize,
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const students: OldStudentItem[] = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleYearChange = (year: number) => {
    startTransition(() => {
      router.push(`/old-students/${year}`);
    });
  };

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Top Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Old Students Archive
        </h1>
      </div>

      {/* Filter and Search Bar (Clean & Lightweight with Year Dropdown) */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, student ID, father name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 text-xs md:text-sm h-9"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Year Dropdown Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline shrink-0">
                Session Year:
              </span>
              <Select
                value={String(selectedYear)}
                onValueChange={(val: string | null) => {
                  if (val) handleYearChange(parseInt(val, 10));
                }}
              >
                <SelectTrigger className="h-9 text-xs md:text-sm w-full sm:w-[150px] font-semibold bg-background">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((yr) => (
                    <SelectItem key={yr} value={String(yr)} className="text-xs md:text-sm font-medium">
                      Session {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          Showing {students.length} of <span className="font-semibold text-foreground">{totalCount}</span> archived student{totalCount === 1 ? "" : "s"} for Session <span className="font-semibold text-foreground">{selectedYear}</span>
        </div>
        {(isLoading || isPending) && (
          <span className="text-primary font-medium animate-pulse">Loading records...</span>
        )}
      </div>

      {/* Mobile Card List (visible on mobile, hidden on md+) */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <Card key={idx} className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-44" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </Card>
          ))
        ) : isError ? (
          <Card className="p-6 text-center text-destructive text-xs">
            Failed to load archived records: {(error as Error)?.message || "Unknown error"}
          </Card>
        ) : students.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground space-y-2">
            <Users className="h-8 w-8 stroke-1 mx-auto" />
            <p className="text-sm font-medium text-foreground">No archived students found</p>
            <p className="text-xs">No student records match year {selectedYear}.</p>
          </Card>
        ) : (
          students.map((student, index) => {
            const slNo = (currentPage - 1) * pageSize + index + 1;
            return (
              <Card key={student.id} className="p-3.5 border-border/80 shadow-xs hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground shrink-0 mt-0.5">
                      {slNo}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-foreground leading-tight">
                        {student.name}
                      </h3>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        ID: {student.schoolId || student.id.slice(0, 8)}
                        {student.pen ? ` • PEN: ${student.pen}` : ""}
                      </div>
                    </div>
                  </div>
                  <StatusBadge
                    status={student.status as StudentStatus}
                    className="text-[10px] shrink-0"
                  />
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      Class {student.studentClass || "—"} {student.section ? `(${student.section})` : ""}
                    </span>
                    {student.roll ? (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        • Roll #{student.roll}
                      </span>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                    Session {student.exitYear || selectedYear}
                  </Badge>
                </div>

                {(student.fatherName || student.contact) && (
                  <div className="mt-2 pt-2 border-t border-dashed border-border/60 flex flex-col gap-1 text-xs">
                    {student.fatherName && (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium">{student.fatherName}</span>
                      </div>
                    )}
                    {student.contact && (
                      <a
                        href={`tel:${student.contact}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline text-[11px] font-mono"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{student.contact}</span>
                      </a>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop Table Container (hidden on mobile, visible md+) */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-12 text-center text-xs font-semibold">#</TableHead>
                <TableHead className="text-xs font-semibold">Student Name & ID</TableHead>
                <TableHead className="text-xs font-semibold">Exit Class & Roll</TableHead>
                <TableHead className="text-xs font-semibold">Session Year</TableHead>
                <TableHead className="text-xs font-semibold">Guardian / Contact</TableHead>
                <TableHead className="text-xs font-semibold">Exit Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36 mb-1" /><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-destructive text-sm">
                    Failed to load archived records: {(error as Error)?.message || "Unknown error"}
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                      <Users className="h-8 w-8 stroke-1" />
                      <p className="text-sm font-medium text-foreground">No archived students found</p>
                      <p className="text-xs">
                        No student records match year {selectedYear}.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, index) => {
                  const slNo = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <TableRow key={student.id} className="hover:bg-muted/30">
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {slNo}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs md:text-sm text-foreground">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          ID: {student.schoolId || student.id.slice(0, 8)} {student.pen ? `• PEN: ${student.pen}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">
                          {student.studentClass || "—"} {student.section ? `(${student.section})` : ""}
                        </div>
                        {student.roll ? (
                          <div className="text-[11px] text-muted-foreground">
                            Roll: #{student.roll}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {student.exitYear || selectedYear}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.fatherName && (
                          <div className="flex items-center gap-1 text-xs text-foreground">
                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{student.fatherName}</span>
                          </div>
                        )}
                        {student.contact ? (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Phone className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                            <span>{student.contact}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={student.status as StudentStatus}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Shared Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 rounded-xl border border-border bg-card text-xs shadow-2xs">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
