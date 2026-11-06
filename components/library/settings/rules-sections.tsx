"use client";

import { BookOpen, Coins } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";
import { prefixProblem } from "@/lib/library/settings";
import type { LibrarySettingsState } from "@/lib/library/use-library-settings";
import type { BorrowerType } from "@/lib/library/types";
import { NumField } from "./fields";

const TYPES: { type: BorrowerType; label: string }[] = [
  { type: "student", label: "Student" },
  { type: "staff", label: "Teacher / Staff" },
];

/** Limits and loan days per borrower type, plus the book code prefix. */
export function LoanSection({ s }: { s: LibrarySettingsState }) {
  const v = s.value!;
  const off = !s.canEdit;
  return (
    <FormSection title="Loan" icon={<BookOpen className="h-4 w-4" />}>
      {TYPES.map(({ type, label }) => (
        <div key={type} className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground">{label}</p>
          <FormGrid>
            <NumField label="সর্বোচ্চ বই" value={v[type].maxBooks} onChange={(n) => s.updateTerms(type, { maxBooks: n as number })} disabled={off} error={s.errors[`${type}.maxBooks`]} />
            <NumField label="Loan" suffix="দিন" value={v[type].loanDays} onChange={(n) => s.updateTerms(type, { loanDays: n as number })} disabled={off} error={s.errors[`${type}.loanDays`]} />
            <NumField label="Renew" suffix="দিন" value={v[type].renewDays} onChange={(n) => s.updateTerms(type, { renewDays: n as number })} disabled={off} error={s.errors[`${type}.renewDays`]} />
            <NumField label="সর্বোচ্চ renew" value={v[type].maxRenews} onChange={(n) => s.updateTerms(type, { maxRenews: n as number })} disabled={off} error={s.errors[`${type}.maxRenews`]} />
            <NumField
              label="Renew খোলে due-এর আগে"
              suffix="দিন"
              value={v[type].renewWindowDays}
              onChange={(n) => s.updateTerms(type, { renewWindowDays: n as number })}
              disabled={off}
              error={s.errors[`${type}.renewWindowDays`]}
            />
          </FormGrid>
        </div>
      ))}
      <FormGrid>
        <FormField label="Book code prefix" error={s.errors.codePrefix ?? (prefixProblem(v.codePrefix) ?? undefined)}>
          <Input value={v.codePrefix} maxLength={4} disabled={off} onChange={(e) => s.update({ codePrefix: e.target.value.toUpperCase() })} />
        </FormField>
      </FormGrid>
    </FormSection>
  );
}

/** Fine, block, lost and TC rules. */
export function FineSection({ s }: { s: LibrarySettingsState }) {
  const v = s.value!;
  const off = !s.canEdit;
  return (
    <FormSection title="Fine ও নিয়ম" icon={<Coins className="h-4 w-4" />}>
      <FormGrid>
        <NumField label="Fine" suffix="₹ / কাজের দিন" step={0.5} value={v.finePerDay} onChange={(n) => s.update({ finePerDay: n as number })} disabled={off} error={s.errors.finePerDay} />
        <NumField label="Grace" suffix="দিন" value={v.graceDays} onChange={(n) => s.update({ graceDays: n as number })} disabled={off} error={s.errors.graceDays} />
        <NumField label="Fine সর্বোচ্চ" suffix="₹" nullable step={0.5} value={v.fineCap} onChange={(n) => s.update({ fineCap: n as number | null })} disabled={off} error={s.errors.fineCap} />
        <NumField label="Issue বন্ধ হবে বাকি" suffix="₹-র বেশি" nullable step={0.5} value={v.blockThreshold} onChange={(n) => s.update({ blockThreshold: n as number | null })} disabled={off} error={s.errors.blockThreshold} />
        <NumField label="Processing fee" suffix="₹" step={0.5} value={v.processingFee} onChange={(n) => s.update({ processingFee: n as number })} disabled={off} error={s.errors.processingFee} />
        <NumField label="দাম না থাকলে হারানোর দাম" suffix="₹" step={0.5} value={v.defaultLostAmount} onChange={(n) => s.update({ defaultLostAmount: n as number })} disabled={off} error={s.errors.defaultLostAmount} />
        <FormField label="হারানো বইয়ের দাম">
          <div>
            <CustomSelect
              searchable={false}
              disabled={off}
              value={v.lostPolicy}
              onChange={(x) => s.update({ lostPolicy: x })}
              options={[
                { label: "বইয়ের দাম", value: "price" },
                { label: "নির্দিষ্ট amount", value: "fixed" },
              ]}
            />
          </div>
        </FormField>
        <FormField label="TC-র সময় বাকি বই">
          <div>
            <CustomSelect
              searchable={false}
              disabled={off}
              value={v.tcMode}
              onChange={(x) => s.update({ tcMode: x })}
              options={[
                { label: "সতর্কবাণী", value: "warn" },
                { label: "Block (Admin override)", value: "block" },
                { label: "বন্ধ", value: "off" },
              ]}
            />
          </div>
        </FormField>
        <FormField label="Overdue অবস্থায় renew">
          <div className="flex h-9 items-center">
            <Switch checked={v.renewWhenOverdue} disabled={off} onCheckedChange={(x) => s.update({ renewWhenOverdue: x })} />
          </div>
        </FormField>
      </FormGrid>
    </FormSection>
  );
}
