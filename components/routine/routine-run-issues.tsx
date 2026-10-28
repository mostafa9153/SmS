import { AlertTriangle, ShieldCheck } from "lucide-react";

/** One relaxed rule the solver actually broke, as reported by python-backend `audit_relaxations`. */
interface Relaxation {
  rule: string;
  title: string;
  count: number;
  details: string[];
}

interface Reason {
  title: string;
  description?: string;
  solution?: string;
}

type RunMetadata = Record<string, unknown> | null | undefined;

const relaxationsOf = (m: RunMetadata): Relaxation[] => (Array.isArray(m?.relaxations) ? (m.relaxations as Relaxation[]) : []);
const reasonsOf = (m: RunMetadata): Reason[] => (Array.isArray(m?.reasons) ? (m.reasons as Reason[]) : []);
const setupWarningsOf = (m: RunMetadata): string[] =>
  Array.isArray(m?.setupWarnings) ? (m.setupWarnings as string[]) : [];

/** Number of broken-rule cases plus setup warnings recorded with a generated routine. */
export function countRunIssues(metadata: RunMetadata): number {
  const broken = relaxationsOf(metadata).reduce((n, r) => n + (Number(r.count) || 0), 0);
  return broken + setupWarningsOf(metadata).length;
}

/** Every rule a generated routine broke, why the strict rules could not hold, and the setup warnings of that run. */
export function RoutineRunIssues({ metadata }: { metadata: RunMetadata }) {
  const relaxations = relaxationsOf(metadata);
  const reasons = reasonsOf(metadata);
  const setupWarnings = setupWarningsOf(metadata);

  if (relaxations.length === 0 && reasons.length === 0 && setupWarnings.length === 0) {
    return <p className="text-xs text-emerald-700 dark:text-emerald-300">All rules met.</p>;
  }

  return (
    <div className="space-y-3">
      {relaxations.map((r) => (
        <div key={r.rule} className="border border-amber-500/40 rounded-md bg-amber-500/5">
          <div className="px-3 py-2 font-semibold text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {r.title} ({r.count})
          </div>
          <ul className="px-3 pb-2 pl-8 list-disc space-y-0.5 text-[11px] text-muted-foreground max-h-48 overflow-y-auto">
            {r.details.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
            {r.count > r.details.length && <li>+{r.count - r.details.length} more</li>}
          </ul>
        </div>
      ))}

      {reasons.length > 0 && (
        <div className="border rounded-md divide-y bg-muted/10">
          <div className="px-3 py-2 bg-muted/40 font-semibold text-xs text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            Why strict rules could not be met ({reasons.length})
          </div>
          {reasons.map((diag, idx) => (
            <div key={idx} className="p-3 space-y-1">
              <div className="font-semibold text-foreground text-xs">{diag.title}</div>
              {diag.description && <p className="text-muted-foreground text-[11px]">{diag.description}</p>}
              {diag.solution && <p className="text-[11px] text-foreground">Fix: {diag.solution}</p>}
            </div>
          ))}
        </div>
      )}

      {setupWarnings.length > 0 && (
        <div className="border border-amber-500/40 rounded-md bg-amber-500/5">
          <div className="px-3 py-2 font-semibold text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Setup warnings ({setupWarnings.length})
          </div>
          <ul className="px-3 pb-2 pl-8 list-disc space-y-0.5 text-[11px] text-muted-foreground max-h-48 overflow-y-auto">
            {setupWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
