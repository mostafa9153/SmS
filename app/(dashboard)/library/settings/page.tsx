"use client";

import { RotateCcw, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { HolidaysSection } from "@/components/library/settings/holidays-section";
import { FineSection, LoanSection } from "@/components/library/settings/rules-sections";
import { ScannerTestSection } from "@/components/library/settings/scanner-test";
import { StickerSection } from "@/components/library/settings/sticker-section";
import { useLibrarySettings } from "@/lib/library/use-library-settings";

export default function LibrarySettingsPage() {
  const s = useLibrarySettings();
  const problems = Object.keys(s.errors).length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <PageHeader
        title="Library Settings"
        icon={Settings}
        back="/library"
        actions={
          s.canEdit && (
            <>
              <Button variant="outline" onClick={s.reset} disabled={!s.dirty || s.saving}>
                <RotateCcw /> বাতিল
              </Button>
              <Button onClick={() => void s.save()} disabled={!s.dirty || problems > 0 || s.saving}>
                <Save /> সংরক্ষণ
              </Button>
            </>
          )
        }
      />
      {s.loading ? (
        <Spinner label="লোড হচ্ছে…" className="py-16" />
      ) : (
        <>
          {!s.canEdit && <p className="rounded-xl border bg-muted/40 px-3 py-2 text-sm">শুধু Admin বদলাতে পারেন</p>}
          <LoanSection s={s} />
          <FineSection s={s} />
          <HolidaysSection s={s} />
          <StickerSection s={s} />
          <ScannerTestSection />
        </>
      )}
    </div>
  );
}
