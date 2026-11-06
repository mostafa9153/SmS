"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RefObject } from "react";
import type { DeskTone } from "@/lib/library/desk-sound";

const QRScannerModal = dynamic(() => import("@/components/certificate/qr-scanner-modal").then((m) => m.QRScannerModal), { ssr: false });

const FLASH = {
  ok: "border-emerald-500 ring-4 ring-emerald-500/25 bg-emerald-500/5",
  warn: "border-amber-500 ring-4 ring-amber-500/25 bg-amber-500/5",
  error: "border-rose-500 ring-4 ring-rose-500/30 bg-rose-500/10",
} as const;

export function ScanBox({
  inputRef,
  flash,
  cameraOpen,
  setCameraOpen,
  onScan,
  moveSelection,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  flash: DeskTone | null;
  cameraOpen: boolean;
  setCameraOpen: (open: boolean) => void;
  onScan: (code: string) => void;
  moveSelection: (delta: number) => void;
}) {
  const [value, setValue] = useState("");
  // The camera needs HTTPS; plain http only works on localhost.
  const cameraOk = typeof window !== "undefined" && window.isSecureContext;

  return (
    <>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onScan(value);
          setValue("");
        }}
      >
        <div
          className={cn(
            "flex flex-1 items-center gap-2 rounded-2xl border-2 bg-card px-4 transition-colors",
            flash ? FLASH[flash] : "border-border focus-within:border-primary",
          )}
        >
          <ScanLine className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                moveSelection(e.key === "ArrowDown" ? 1 : -1);
              }
            }}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Scan বা লিখুন: বইয়ের code, School ID, PEN"
            aria-label="Scan code"
            className="h-14 w-full bg-transparent text-lg font-medium outline-none placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-2xl"
          disabled={!cameraOk}
          title={cameraOk ? "Camera" : "HTTPS লাগবে"}
          onClick={() => setCameraOpen(true)}
        >
          <Camera />
        </Button>
      </form>
      {cameraOpen && (
        <QRScannerModal variant="code" open onOpenChange={setCameraOpen} onScanSuccess={onScan} />
      )}
    </>
  );
}
