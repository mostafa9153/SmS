"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { groupClearance, matchesLoan, onlyOverdue, type ClassGroup, type ClearanceBasis, type OpenLoanRow } from "./clearance";

export type LoanScope = "overdue" | "open";

export function useOpenLoans() {
  return useQuery<{ today: string; loans: OpenLoanRow[] }>({
    queryKey: ["library", "loans"],
    queryFn: () => apiFetch(`/api/library/loans`),
  });
}

/** The grouped list for one view: overdue only or every open book, by class at issue or now. */
export function useClearanceView(scope: LoanScope, basis: ClearanceBasis, q = "") {
  const query = useOpenLoans();
  const today = query.data?.today ?? "";
  const groups = useMemo<ClassGroup[]>(() => {
    if (!query.data) return [];
    const rows = (scope === "overdue" ? onlyOverdue(query.data.loans, today) : query.data.loans).filter((r) => matchesLoan(r, q));
    return groupClearance(rows, basis, today);
  }, [query.data, today, scope, basis, q]);
  return { query, today, groups, books: groups.reduce((s, g) => s + g.books, 0) };
}

/** State of the Overdue / Clearance page. */
export function useOverduePage() {
  const [scope, setScope] = useState<LoanScope>("overdue");
  const [basis, setBasis] = useState<ClearanceBasis>("issue");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const view = useClearanceView(scope, basis, q);
  // A class picked under one view may not exist under another (basis, scope, search): then show all.
  const shown = group && view.groups.some((g) => g.key === group) ? view.groups.filter((g) => g.key === group) : view.groups;
  return { scope, setScope, basis, setBasis, q, setQ, group, setGroup, view, shown };
}
