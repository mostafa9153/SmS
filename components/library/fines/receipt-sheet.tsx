import type { ReceiptDetail } from "@/lib/library/db-library-fines";

const KIND = { overdue: "Overdue fine", lost: "Lost book", damaged: "Damaged book" } as const;
const money = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One library fine receipt, sized by the page's paper (width in mm, content flows). */
export function ReceiptSheet({ receipt, school, widthMm }: { receipt: ReceiptDetail; school: string; widthMm: number }) {
  const b = receipt.borrower;
  const who = b.type === "student" ? [b.className, b.section, b.roll && `Roll ${b.roll}`, b.schoolId].filter(Boolean).join(" · ") : b.uniqueId;
  return (
    <div className="relative bg-white p-6 text-black" style={{ width: `${widthMm}mm` }}>
      {receipt.voided && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-black text-rose-500/30 -rotate-12">
          VOID
        </div>
      )}
      <div className="border-b-2 border-black pb-2 text-center">
        <p className="text-lg font-bold">{school}</p>
        <p className="text-sm font-semibold">Library {receipt.kind === "refund" ? "Refund receipt" : "Receipt"}</p>
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span>Receipt No: <b>#{receipt.receiptNo}</b></span>
        <span>Date: <b>{receipt.paidOn}</b></span>
      </div>
      <p className="mt-1 text-sm">
        Name: <b>{b.name}</b>
        {who && <span className="text-xs"> ({who})</span>}
      </p>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-black">
            <th className="py-1 text-left">Description</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((l, i) => (
            <tr key={i} className="border-b border-black/20">
              <td className="py-1">
                {KIND[l.kind]}
                {l.title && <span className="text-xs"> · {l.title}</span>}
              </td>
              <td className="py-1 text-right tabular-nums">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black font-bold">
            <td className="py-1">{receipt.kind === "refund" ? "Total refunded" : "Total paid"}</td>
            <td className="py-1 text-right tabular-nums">{money(receipt.total)}</td>
          </tr>
        </tfoot>
      </table>
      {receipt.note && <p className="mt-2 text-xs">Note: {receipt.note}</p>}
      {receipt.voided && receipt.voidReason && <p className="mt-2 text-xs">Void reason: {receipt.voidReason}</p>}
      <div className="mt-12 flex justify-end text-sm">
        <span className="border-t border-black px-6 pt-1">Librarian</span>
      </div>
    </div>
  );
}
