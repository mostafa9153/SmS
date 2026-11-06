import { daysOverdue, type ClassGroup } from "@/lib/library/clearance";

const money = (n: number) => (n > 0 ? `₹${n.toLocaleString("en-IN")}` : "–");

/** One class's slip: who still holds which book. Width follows the paper; content flows. */
export function SlipSheet({
  group,
  school,
  today,
  widthMm,
  basis,
  title,
}: {
  group: ClassGroup;
  school: string;
  today: string;
  widthMm: number;
  basis: "issue" | "now";
  title: string;
}) {
  return (
    <div className="bg-white p-6 text-black" style={{ width: `${widthMm}mm` }}>
      <div className="border-b-2 border-black pb-2 text-center">
        <p className="text-lg font-bold">{school}</p>
        <p className="text-sm font-semibold">
          Library {title} · {group.label}
        </p>
        <p className="text-xs">
          {today} · {basis === "issue" ? "Issue-এর সময়ের class" : "এখনকার class"} · {group.books}টি বই
        </p>
      </div>
      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1 pr-2">Roll</th>
            <th className="py-1 pr-2">নাম</th>
            <th className="py-1 pr-2">বই</th>
            <th className="py-1 pr-2">Due</th>
            <th className="py-1 pr-2 text-right">Fine</th>
            <th className="py-1 text-center">Sign</th>
          </tr>
        </thead>
        <tbody>
          {group.borrowers.flatMap((b) =>
            b.loans.map((l, i) => (
              <tr key={l.loanId} className="border-b border-black/20 align-top">
                <td className="py-1 pr-2">{i === 0 ? (b.roll ?? "") : ""}</td>
                <td className="py-1 pr-2">
                  {i === 0 && (
                    <>
                      {b.name}
                      {!b.active && <span className="ml-1">(inactive)</span>}
                    </>
                  )}
                </td>
                <td className="py-1 pr-2">
                  {l.title} <span className="text-[10px]">({l.code})</span>
                </td>
                <td className="py-1 pr-2 whitespace-nowrap">
                  {l.dueOn}
                  {daysOverdue(l.dueOn, today) > 0 && <span> ({daysOverdue(l.dueOn, today)} দিন)</span>}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">{money(l.accruing)}</td>
                <td className="w-16 py-1" />
              </tr>
            )),
          )}
        </tbody>
      </table>
      <div className="mt-10 flex justify-between text-xs">
        <span className="border-t border-black px-6 pt-1">Class Teacher</span>
        <span className="border-t border-black px-6 pt-1">Librarian</span>
      </div>
    </div>
  );
}
