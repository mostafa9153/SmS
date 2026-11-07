"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, HandCoins, Printer, Undo2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { refundLimit } from "@/lib/library/fine-report";
import type { LedgerFine, ReceiptView } from "@/lib/library/db-library-fines";
import { COLLECT_ERRORS, type useFines } from "@/lib/library/use-fines";

const KIND = { overdue: "Overdue", lost: "Lost", damaged: "Damaged" } as const;
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

type Fines = ReturnType<typeof useFines>;

function FineRow({ fine, f, canWaive }: { fine: LedgerFine; f: Fines; canWaive: boolean }) {
  const [form, setForm] = useState<"waive" | "refund" | null>(null);
  const [mode, setMode] = useState<"full" | "half" | "custom">("full");
  const [amount, setAmount] = useState("");
  const [text, setText] = useState("");
  const picked = f.picks[fine.fineId] !== undefined;
  const canRefund = refundLimit(fine) > 0;
  const close = () => {
    setForm(null);
    setAmount("");
    setText("");
  };

  return (
    <div className={cn("space-y-2 rounded-lg border px-3 py-2", picked && "border-primary bg-primary/5", fine.cancelled && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="checkbox"
          aria-label="Add to collection"
          disabled={fine.cancelled || fine.outstanding <= 0}
          checked={picked}
          onChange={() => f.togglePick(fine.fineId, fine.outstanding)}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            <span className="mr-1.5 text-xs font-semibold text-muted-foreground">{KIND[fine.kind]}</span>
            {fine.title}
            {fine.cancelled && <span className="ml-1.5 text-xs text-rose-600">Cancelled</span>}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {money(fine.amount)} · paid {money(fine.paid - fine.refunded)} · waived {money(fine.waived)}
          </p>
        </div>
        <span className={cn("text-sm font-bold tabular-nums", fine.outstanding > 0 ? "text-rose-600" : "text-muted-foreground")}>
          {money(fine.outstanding)}
        </span>
        {picked && (
          <Input
            inputMode="decimal"
            value={f.picks[fine.fineId]}
            onChange={(e) => f.setPickAmount(fine.fineId, e.target.value)}
            className="h-8 w-24"
            aria-label="Amount to collect"
          />
        )}
        {!fine.cancelled && canWaive && fine.outstanding > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setForm(form === "waive" ? null : "waive")}>
            Waive
          </Button>
        )}
        {!fine.cancelled && canRefund && (
          <Button size="sm" variant="ghost" onClick={() => setForm(form === "refund" ? null : "refund")}>
            <Undo2 /> Refund
          </Button>
        )}
      </div>

      {form === "waive" && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
          {(["full", "half", "custom"] as const).map((m) => (
            <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
              {m === "full" ? "Full" : m === "half" ? "50% of due" : "Custom"}
            </Button>
          ))}
          {mode === "custom" && (
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹" className="h-8 w-24" />
          )}
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reason" className="h-8 min-w-40 flex-1" />
          <Button
            size="sm"
            disabled={f.busy || !text.trim() || (mode === "custom" && !(Number(amount) > 0))}
            onClick={() => void f.waive(fine.fineId, mode, text, mode === "custom" ? Number(amount) : undefined).then((ok) => ok && close())}
          >
            Confirm
          </Button>
        </div>
      )}

      {form === "refund" && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Max ₹${refundLimit(fine)}`}
            className="h-8 w-32"
          />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Note" className="h-8 min-w-40 flex-1" />
          <Button
            size="sm"
            disabled={f.busy || !(Number(amount) > 0) || Number(amount) > refundLimit(fine)}
            onClick={() => void f.refund(fine.fineId, Number(amount), text).then((ok) => ok && close())}
          >
            Refund
          </Button>
        </div>
      )}
    </div>
  );
}

function ReceiptRow({ r, f }: { r: ReceiptView; f: Fines }) {
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <div className={cn("space-y-2 rounded-lg border px-3 py-2 text-sm", r.voided && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("font-semibold tabular-nums", r.voided && "line-through")}>#{r.receiptNo}</span>
        <span className="text-xs text-muted-foreground">
          {r.kind === "refund" ? "Refund" : "Payment"} · {r.paidOn}
        </span>
        <span className="flex-1 text-right font-semibold tabular-nums">{money(r.total)}</span>
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/library/fines/receipt/${r.receiptNo}`} target="_blank">
            <Printer />
          </Link>
        </Button>
        {!r.voided && (
          <Button size="sm" variant="ghost" onClick={() => setVoiding((v) => !v)}>
            <Ban /> Void
          </Button>
        )}
      </div>
      {r.voided && r.voidReason && <p className="text-xs text-rose-600">Voided: {r.voidReason}</p>}
      {voiding && (
        <div className="flex gap-2 border-t pt-2">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Void reason" className="h-8 flex-1" />
          <Button
            size="sm"
            variant="destructive"
            disabled={f.busy || !reason.trim()}
            onClick={() => void f.voidReceipt(r.receiptNo, reason.trim()).then((done) => done && setVoiding(false))}
          >
            Void
          </Button>
        </div>
      )}
    </div>
  );
}

export function LedgerPanel({ f }: { f: Fines }) {
  const l = f.ledger.data;
  if (f.ledger.isLoading || !l) return <Spinner label="Loading…" className="py-16" />;
  const { profile, balance } = l;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- stored photo
            <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
          ) : (
            <User className="m-3 h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{profile.name}</h2>
          <p className="text-xs text-muted-foreground">
            {[profile.className, profile.section, profile.schoolId ?? profile.uniqueId].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-rose-600">{money(balance.total)}</p>
          {balance.accruing > 0 && <p className="text-xs text-muted-foreground">Accruing {money(balance.accruing)}</p>}
        </div>
      </div>

      {f.lastReceipt && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          <span className="font-semibold">Receipt #{f.lastReceipt}</span>
          <Button size="sm" asChild>
            <Link href={`/library/fines/receipt/${f.lastReceipt}`} target="_blank">
              <Printer /> Print
            </Link>
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        {l.fines.length ? (
          l.fines.map((fine) => <FineRow key={fine.fineId} fine={fine} f={f} canWaive={l.canWaive} />)
        ) : (
          <p className="text-sm text-muted-foreground">No fines</p>
        )}
      </div>

      {f.hasPicks && (
        <div className="space-y-1">
          {f.collect.error && f.collect.error !== "none" && <p className="text-sm text-rose-600">{COLLECT_ERRORS[f.collect.error]}</p>}
          <Button className="w-full" disabled={f.busy || f.collect.error !== null} onClick={() => void f.pay()}>
            <HandCoins /> Collect {money(f.collect.total)}
          </Button>
        </div>
      )}

      {l.receipts.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-muted-foreground">Receipts</h3>
          {l.receipts.map((r) => (
            <ReceiptRow key={r.receiptNo} r={r} f={f} />
          ))}
        </div>
      )}

      {l.waivers.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground">Waivers</h3>
          {l.waivers.map((w, i) => (
            <p key={i} className={cn("text-xs", w.voided && "line-through opacity-60")}>
              {money(w.amount)} · {w.title} · {w.reason} · {new Date(w.at).toLocaleDateString("en-IN")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
