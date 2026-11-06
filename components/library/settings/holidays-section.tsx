"use client";

import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/components/forms/form-layout";
import type { LibrarySettingsState } from "@/lib/library/use-library-settings";

/** Closed days: due dates move past them and no overdue fine is counted on them. */
export function HolidaysSection({ s }: { s: LibrarySettingsState }) {
  const off = !s.canEdit;
  const list = s.value!.holidays;
  return (
    <FormSection title="ছুটি" icon={<CalendarOff className="h-4 w-4" />}>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">কোনো ছুটি যোগ করা নেই (রবিবার আগে থেকেই বাদ)</p>}
        {list.map((h, i) => {
          const error = s.errors[`holidays.${i}`] ?? s.errors[`holidays.${i}.from`] ?? s.errors[`holidays.${i}.to`];
          return (
            <div key={i} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" value={h.from} disabled={off} onChange={(e) => s.updateHoliday(i, { from: e.target.value, to: h.to || e.target.value })} className="w-40" aria-label="থেকে" />
                <Input type="date" value={h.to} disabled={off} onChange={(e) => s.updateHoliday(i, { to: e.target.value })} className="w-40" aria-label="পর্যন্ত" />
                <Input value={h.label ?? ""} disabled={off} onChange={(e) => s.updateHoliday(i, { label: e.target.value })} placeholder="নাম (যেমন Puja)" className="min-w-40 flex-1" maxLength={100} />
                <Button size="icon" variant="ghost" disabled={off} onClick={() => s.removeHoliday(i)} aria-label="সরাও">
                  <Trash2 />
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>
      {!off && (
        <Button size="sm" variant="outline" onClick={s.addHoliday}>
          <Plus /> ছুটি যোগ
        </Button>
      )}
    </FormSection>
  );
}
