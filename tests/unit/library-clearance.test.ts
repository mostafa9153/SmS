import { describe, expect, it } from "vitest";
import {
  classRank,
  daysOverdue,
  groupClearance,
  matchesLoan,
  monthRange,
  neverLent,
  onlyOverdue,
  topBooks,
  topReaders,
  waiversByMonth,
  type OpenLoanRow,
} from "@/lib/library/clearance";

const TODAY = "2026-11-06";

const row = (over: Partial<OpenLoanRow>): OpenLoanRow => ({
  loanId: "l1",
  borrower: "student:a",
  type: "student",
  name: "Asha",
  active: true,
  classAtIssue: "VIII",
  sectionAtIssue: "A",
  classNow: "VIII",
  sectionNow: "A",
  roll: "5",
  idLabel: "SCH/1",
  title: "Pather Panchali",
  code: "B0001-1",
  dueOn: "2026-11-01",
  accruing: 4,
  ...over,
});

describe("classRank / daysOverdue", () => {
  it("orders roman classes numerically, others after", () => {
    expect(["X", "V", "XII", "IX", "Nursery", null].map(classRank)).toEqual([10, 5, 12, 9, 1000, Number.MAX_SAFE_INTEGER]);
  });

  it("counts calendar days late, never negative", () => {
    expect(daysOverdue("2026-11-01", TODAY)).toBe(5);
    expect(daysOverdue("2026-11-06", TODAY)).toBe(0);
    expect(daysOverdue("2026-11-09", TODAY)).toBe(0);
  });
});

describe("groupClearance", () => {
  const promoted = row({ loanId: "l2", borrower: "student:b", name: "Bimal", classAtIssue: "VIII", sectionAtIssue: "A", classNow: "IX", sectionNow: "B", roll: "2" });
  const passedOut = row({ loanId: "l3", borrower: "student:c", name: "Chitra", classAtIssue: "XII", sectionAtIssue: "A", classNow: null, sectionNow: null, active: false, roll: "9" });
  const teacher = row({ loanId: "l4", borrower: "staff:t", type: "staff", name: "Mr Das", classAtIssue: null, classNow: null, idLabel: "T-1" });
  const rows = [teacher, passedOut, promoted, row({})];

  it("by class at issue: a promoted student stays with the class that lent the book", () => {
    const g = groupClearance(rows, "issue", TODAY);
    expect(g.map((x) => x.label)).toEqual(["VIII A", "XII A", "Teacher / Staff"]);
    expect(g[0].borrowers.map((b) => b.name)).toEqual(["Bimal", "Asha"]); // roll 2 before 5
  });

  it("by class now: the promoted student moves, the passed-out one has no class", () => {
    const g = groupClearance(rows, "now", TODAY);
    expect(g.map((x) => x.label)).toEqual(["VIII A", "IX B", "Class নেই", "Teacher / Staff"]);
  });

  it("falls back to the present class when none was recorded at issue", () => {
    const g = groupClearance([row({ classAtIssue: null, sectionAtIssue: null, classNow: "IX", sectionNow: "B" })], "issue", TODAY);
    expect(g.map((x) => x.label)).toEqual(["IX B"]);
  });

  it("keeps inactive borrowers", () => {
    const g = groupClearance(rows, "issue", TODAY);
    expect(g[1].borrowers[0]).toMatchObject({ name: "Chitra", active: false });
  });

  it("totals fine and books per borrower and group", () => {
    const two = [row({ loanId: "x", accruing: 2.5 }), row({ loanId: "y", accruing: 1.5, dueOn: "2026-10-30", code: "B0002-1" })];
    const [g] = groupClearance(two, "issue", TODAY);
    expect(g.books).toBe(2);
    expect(g.borrowers[0]).toMatchObject({ fine: 4, maxDaysOverdue: 7 });
    expect(g.borrowers[0].loans.map((l) => l.code)).toEqual(["B0002-1", "B0001-1"]); // oldest due first
  });
});

describe("onlyOverdue / matchesLoan", () => {
  it("keeps loans strictly past due", () => {
    const rows = [row({ dueOn: "2026-11-05" }), row({ dueOn: TODAY }), row({ dueOn: "2026-11-07" })];
    expect(onlyOverdue(rows, TODAY)).toHaveLength(1);
  });

  it("matches name, id, title and code, ignoring case", () => {
    expect(matchesLoan(row({}), "asha")).toBe(true);
    expect(matchesLoan(row({}), "sch/1")).toBe(true);
    expect(matchesLoan(row({}), "PANCHALI")).toBe(true);
    expect(matchesLoan(row({}), "b0001")).toBe(true);
    expect(matchesLoan(row({}), "zzz")).toBe(false);
    expect(matchesLoan(row({}), "  ")).toBe(true);
  });
});

describe("rankings", () => {
  it("counts loans per title across copies, ties by name", () => {
    const loans = [
      { bookId: "1", title: "B" },
      { bookId: "2", title: "A" },
      { bookId: "1", title: "B" },
      { bookId: "3", title: "C" },
    ];
    expect(topBooks(loans, 2)).toEqual([
      { key: "1", label: "B", count: 2 },
      { key: "2", label: "A", count: 1 },
    ]);
  });

  it("ranks readers", () => {
    const r = topReaders([
      { borrower: "student:a", name: "Asha" },
      { borrower: "student:b", name: "Bimal" },
      { borrower: "student:a", name: "Asha" },
    ]);
    expect(r[0]).toMatchObject({ label: "Asha", count: 2 });
  });

  it("finds titles never lent", () => {
    expect(neverLent([{ id: "1" }, { id: "2" }, { id: "3" }], ["2"]).map((b) => b.id)).toEqual(["1", "3"]);
  });
});

describe("waiversByMonth", () => {
  it("groups by month, newest first, with who waived how much", () => {
    const m = waiversByMonth([
      { day: "2026-10-30", amount: 10, by: "Admin" },
      { day: "2026-11-02", amount: 20.1, by: "Mrs Roy" },
      { day: "2026-11-03", amount: 5.2, by: "Admin" },
      { day: "2026-11-04", amount: 4.7, by: "Mrs Roy" },
    ]);
    expect(m.map((x) => x.month)).toEqual(["2026-11", "2026-10"]);
    expect(m[0]).toMatchObject({ total: 30, count: 3 });
    expect(m[0].byPerson[0]).toEqual({ by: "Mrs Roy", total: 24.8, count: 2 });
  });
});

describe("monthRange", () => {
  it("is the month start to the next month start", () => {
    expect(monthRange("2026-11")).toEqual({ from: "2026-11-01", to: "2026-12-01" });
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-03-01" });
  });
});
