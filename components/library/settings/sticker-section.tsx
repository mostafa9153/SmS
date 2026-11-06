"use client";

import { Tags } from "lucide-react";
import { FormGrid, FormSection } from "@/components/forms/form-layout";
import { perSheet } from "@/lib/library/sticker-layout";
import type { LibrarySettingsState } from "@/lib/library/use-library-settings";
import { NumField } from "./fields";

/** A4 sticker sheet layout (K5). The printer offset is per computer, set on the print page. */
export function StickerSection({ s }: { s: LibrarySettingsState }) {
  const g = s.value!.sticker;
  const off = !s.canEdit;
  const f = (key: keyof typeof g, label: string, step = 1) => (
    <NumField label={label} suffix={key.endsWith("Mm") ? "mm" : undefined} step={step} value={g[key]} onChange={(n) => s.updateSticker({ [key]: n as number })} disabled={off} error={s.errors[`sticker.${key}`]} />
  );
  return (
    <FormSection title="Sticker sheet (A4)" icon={<Tags className="h-4 w-4" />}>
      <FormGrid>
        {f("cols", "কলাম")}
        {f("rows", "সারি")}
        {f("widthMm", "Sticker চওড়া", 0.5)}
        {f("heightMm", "Sticker উচ্চতা", 0.5)}
        {f("gapXMm", "আড়াআড়ি ফাঁক", 0.5)}
        {f("gapYMm", "লম্বালম্বি ফাঁক", 0.5)}
      </FormGrid>
      <p className="text-sm tabular-nums text-muted-foreground">প্রতি sheet-এ {perSheet(g)}টি</p>
      {s.errors.sticker && <p className="text-sm text-destructive">{s.errors.sticker}</p>}
    </FormSection>
  );
}
