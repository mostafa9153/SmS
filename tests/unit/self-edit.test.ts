import { describe, expect, it } from "vitest";
import { pickSelfEditable } from "@/lib/employees/self-edit";

describe("pickSelfEditable", () => {
  it("keeps personal fields and drops pay, status, designation and IDs", () => {
    const out = pickSelfEditable({
      mobile: "9000000000",
      bank_details: { bank_name: "SBI" },
      basic_pay: 99999,
      status: "Active",
      designation: "Head Master",
      unique_id: "T-1",
      employee_type: "Teaching",
      professional_meta: { x: 1 },
      primary_meta: { appointed_subject: "Math" },
    });
    expect(out).toEqual({ mobile: "9000000000", bank_details: { bank_name: "SBI" } });
  });

  it("returns an empty object when nothing is editable", () => {
    expect(pickSelfEditable({ basic_pay: 1 })).toEqual({});
  });
});
