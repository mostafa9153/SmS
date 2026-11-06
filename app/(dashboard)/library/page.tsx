"use client";

import Link from "next/link";
import { AlertTriangle, BarChart3, BookOpen, HandCoins, Library, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityList } from "@/components/library/desk/activity-list";
import { BorrowerPanel } from "@/components/library/desk/borrower-panel";
import { DeskChoices, DeskNoticeBar, DeskPromptBar } from "@/components/library/desk/desk-prompts";
import { ScanBox } from "@/components/library/desk/scan-box";
import { PANEL_IDLE_MS } from "@/lib/library/use-panel-timer";
import { useDesk } from "@/lib/library/use-desk";
import { useScannerCapture } from "@/lib/library/use-scanner-capture";

export default function LibraryDeskPage() {
  const desk = useDesk();
  useScannerCapture({ enabled: !desk.cameraOpen, onScan: desk.handleScan, onShortcut: desk.onShortcut });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <PageHeader
        title="Library Desk"
        icon={Library}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/library/overdue">
                <AlertTriangle /> Overdue
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/library/reports">
                <BarChart3 /> Reports
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/library/fines">
                <HandCoins /> Fines
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/library/settings">
                <Settings /> Settings
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/library/books">
                <BookOpen /> Catalog
              </Link>
            </Button>
          </>
        }
      />
      <ScanBox
        inputRef={desk.inputRef}
        flash={desk.flash}
        cameraOpen={desk.cameraOpen}
        setCameraOpen={desk.setCameraOpen}
        onScan={desk.handleScan}
        moveSelection={desk.moveSelection}
      />
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          {desk.notice && (
            <DeskNoticeBar notice={desk.notice} onPassOn={desk.passOn} onRestore={desk.restoreCopy} onDismiss={desk.dismissNotice} />
          )}
          {desk.choices && <DeskChoices choices={desk.choices} onPick={desk.pickChoice} />}
          {desk.prompt && (
            <DeskPromptBar prompt={desk.prompt} onFound={desk.markFound} onDamaged={desk.markDamaged} onCancel={() => desk.setPrompt(null)} />
          )}
          {desk.panel && desk.summary ? (
            <BorrowerPanel
              summary={desk.summary}
              openedBy={desk.panel.openedBy}
              chip={desk.chip}
              selected={desk.selected}
              leftMs={desk.panelLeftMs}
              idleMs={PANEL_IDLE_MS}
              onSelect={desk.setSelected}
              onRenew={(loan) => desk.renewLoan(loan.loanId, loan.title)}
              onIssueChip={desk.issueChip}
              onClose={desk.closePanel}
            />
          ) : desk.chip ? (
            <div className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium">
              {desk.chip.title} ({desk.chip.code}): scan the card
            </div>
          ) : (
            !desk.panel && <p className="py-12 text-center text-sm text-muted-foreground">Scan a card or book sticker</p>
          )}
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Today&apos;s activity</h2>
          <ActivityList
            activity={desk.activity}
            onUndo={desk.undo}
            onRenewInstead={desk.renewInstead}
            onDamaged={desk.askDamaged}
            onDismiss={desk.dismiss}
          />
        </div>
      </div>
    </div>
  );
}
