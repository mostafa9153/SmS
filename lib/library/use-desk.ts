"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { BorrowerSummary, ScanResult } from "./db-library";
import { decideScanAction, type DeskPanel, type DeskScan, type DeskAction } from "./decide-scan";
import { playTone, type DeskTone } from "./desk-sound";
import { newRequestId } from "./request-id";
import { createScanDebouncer, normalizeScan } from "./scan-code";
import type { BorrowerKey } from "./types";
import { libraryWrite, useRefreshLibrary } from "./use-catalog";
import { usePanelTimer } from "./use-panel-timer";
import type { DeskShortcut } from "./scanner-input";

/** One of today's desk actions as the server returns it (see lib/library/desk-activity.ts). */
interface ServerActivityRow {
  id: string;
  at: string;
  kind: "issue" | "return" | "renew" | "found" | "damaged";
  label: string;
  undoId: string | null;
  undone: boolean;
  loanId?: string;
}

export interface Activity {
  id: string;
  at: number;
  kind: "issue" | "return" | "renew" | "found" | "damaged" | "restore" | "scan";
  status: "ok" | "failed";
  label: string;
  undoId?: string | null;
  undone?: boolean;
  /** Set on a return row: offers [Renew instead] and [Damaged]. */
  loanId?: string;
  error?: string;
  retry?: () => void;
}

export interface DeskChip {
  copyId: string;
  code: string;
  title: string;
}

export type DeskPrompt =
  | { kind: "found"; copyId: string; code: string; title: string }
  | { kind: "damaged"; loanId: string; title: string };

export type DeskNotice =
  | { kind: "info"; text: string }
  | { kind: "pass_on"; text: string; copyId: string; title: string; to: BorrowerKey; toName: string }
  | { kind: "withdrawn"; text: string; copyId: string };

export interface DeskChoice {
  key: BorrowerKey;
  name: string;
  detail: string | null;
}

interface DeskWrite {
  body: Record<string, unknown>;
  kind: Activity["kind"];
  label: (data: Record<string, unknown>) => string;
  loanId?: string;
  onDone?: () => void;
}

const SCAN_DEBOUNCE_MS = 2000;

/** All the library desk's state and handlers; the page and its components only render. */
export function useDesk() {
  const refresh = useRefreshLibrary();
  const [panel, setPanel] = useState<DeskPanel | null>(null);
  const [summary, setSummary] = useState<BorrowerSummary | null>(null);
  const [chip, setChip] = useState<DeskChip | null>(null);
  const [prompt, setPrompt] = useState<DeskPrompt | null>(null);
  const [notice, setNotice] = useState<DeskNotice | null>(null);
  const [choices, setChoices] = useState<DeskChoice[] | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);

  // After a refresh the list is empty; load today's desk actions from the event log (newest first, below anything new).
  useEffect(() => {
    let cancelled = false;
    apiFetch<ServerActivityRow[]>("/api/library/desk/activity")
      .then((rows) => {
        if (cancelled) return;
        setActivity((all) => {
          const have = new Set(all.map((a) => a.id));
          return [...all, ...rows.filter((r) => !have.has(r.id)).map((r) => ({ ...r, at: Date.parse(r.at), status: "ok" as const }))];
        });
      })
      .catch((err: unknown) => {
        // Do not hide a failed load: the list would look empty after every refresh.
        if (!cancelled) toast.error(err instanceof Error ? `Could not load today's activity: ${err.message}` : "Could not load today's activity");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [selected, setSelected] = useState(0);
  const [flash, setFlash] = useState<DeskTone | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounce = useRef(createScanDebouncer(SCAN_DEBOUNCE_MS));
  const names = useRef(new Map<string, string>());
  const live = useRef({ panel, chip, prompt, summary, selected, activity });
  // A failed row retries through these, so a callback never has to name itself.
  const performRef = useRef<(spec: DeskWrite, requestId: string) => Promise<boolean>>(async () => false);
  const resolveRef = useRef<(code: string, requestId: string) => Promise<void>>(async () => undefined);
  useEffect(() => {
    live.current = { panel, chip, prompt, summary, selected, activity };
  });

  const signal = useCallback((tone: DeskTone) => {
    playTone(tone);
    setFlash(tone);
    setTimeout(() => setFlash(null), 700);
  }, []);

  const record = useCallback((entry: Activity) => {
    setActivity((all) => [entry, ...all.filter((a) => a.id !== entry.id)].slice(0, 100));
  }, []);

  const loadSeq = useRef(0);
  const loadSummary = useCallback(async (key: BorrowerKey) => {
    const seq = ++loadSeq.current;
    const s = await apiFetch<BorrowerSummary>(`/api/library/borrowers/${encodeURIComponent(key)}`);
    names.current.set(key, s.profile.name);
    // An older answer never overwrites a newer one.
    if (seq === loadSeq.current) {
      setSummary(s);
      setSelected((i) => Math.min(i, Math.max(0, s.openLoans.length - 1)));
    }
    return s;
  }, []);

  // Load the panel's borrower unless the scan already brought the summary.
  useEffect(() => {
    if (!panel) return;
    const key = panel.borrower;
    if (panel.openedBy === "card" && live.current.summary?.profile.key === key) return;
    loadSummary(key).catch(() => toast.error("Could not load borrower."));
  }, [panel, loadSummary]);

  const reloadPanel = useCallback(() => {
    const p = live.current.panel;
    if (p) void loadSummary(p.borrower).catch(() => undefined);
    refresh();
  }, [loadSummary, refresh]);

  /** One desk write. A failure stays in the list with the same request id, so retry never applies it twice (D8, W6). */
  const perform = useCallback(
    async (spec: DeskWrite, requestId: string = newRequestId()): Promise<boolean> => {
      try {
        const r = await libraryWrite<Record<string, unknown>>("/api/library/desk", "POST", spec.body, requestId);
        signal("ok");
        record({ id: requestId, at: Date.now(), kind: spec.kind, status: "ok", label: spec.label(r.data), undoId: r.undoId, loanId: spec.loanId });
        spec.onDone?.();
        reloadPanel();
        return true;
      } catch (err) {
        signal("error");
        const retryable = !(err instanceof ApiError) || err.status >= 500;
        record({
          id: requestId,
          at: Date.now(),
          kind: spec.kind,
          status: "failed",
          label: spec.label({}),
          error: err instanceof Error ? err.message : "Failed",
          retry: retryable ? () => void performRef.current(spec, requestId) : undefined,
        });
        return false;
      }
    },
    [signal, record, reloadPanel],
  );

  useEffect(() => {
    performRef.current = perform;
  }, [perform]);

  const issue = useCallback(
    (copyId: string, title: string, borrower: BorrowerKey) => {
      const who = names.current.get(borrower) ?? "";
      return perform({
        body: { action: "issue", copyId, borrower },
        kind: "issue",
        label: (d) => `${title} → ${who}${d.dueOn ? ` (due ${d.dueOn})` : ""}`,
        onDone: () => setChip((c) => (c?.copyId === copyId ? null : c)),
      });
    },
    [perform],
  );

  const act = useCallback(
    (action: DeskAction, ctx: { code: string; title: string; holderName: string; options?: DeskChoice[] }) => {
      switch (action.type) {
        case "ignore_recent":
          return;
        case "return": {
          setPanel(action.panel);
          setSelected(0);
          names.current.set(action.panel.borrower, ctx.holderName);
          const n = action.notice;
          setNotice(null);
          void perform({
            body: { action: "return", loanId: action.loanId },
            kind: "return",
            loanId: action.loanId,
            label: (d) => `${ctx.title} ← ${ctx.holderName}${Number(d.fine) > 0 ? ` · fine ₹${d.fine}` : ""}`,
            onDone: () => {
              if (n) {
                setNotice({
                  kind: "pass_on",
                  text: `Returned from ${ctx.holderName}`,
                  copyId: n.copyId,
                  title: ctx.title,
                  to: n.passOnTo,
                  toName: names.current.get(n.passOnTo) ?? "",
                });
              }
            },
          });
          return;
        }
        case "issue":
          void issue(action.copyId, ctx.title, action.borrower);
          return;
        case "hold_chip":
          setChip({ copyId: action.copyId, code: ctx.code, title: ctx.title });
          setNotice({ kind: "info", text: `${ctx.title} — now scan the borrower card` });
          signal("ok");
          return;
        case "open_panel":
          setPanel(action.panel);
          setSelected(0);
          if (!action.chipCopyId) setChip(null);
          signal("ok");
          return;
        case "prompt_found":
          setPrompt({ kind: "found", copyId: action.copyId, code: ctx.code, title: ctx.title });
          signal("warn");
          return;
        case "notice_withdrawn":
          setNotice({ kind: "withdrawn", text: `${ctx.title} is withdrawn`, copyId: action.copyId });
          signal("warn");
          return;
        case "choose":
          setChoices(ctx.options ?? []);
          signal("warn");
          return;
        case "unknown":
          record({ id: newRequestId(), at: Date.now(), kind: "scan", status: "failed", label: `Not recognised: ${action.code}` });
          signal("error");
          return;
      }
    },
    [perform, issue, signal, record],
  );

  const resolve = useCallback(
    async (code: string, requestId: string = newRequestId()) => {
      let result: ScanResult;
      try {
        result = await apiFetch<ScanResult>(`/api/library/scan?code=${encodeURIComponent(code)}`);
      } catch (err) {
        signal("error");
        record({
          id: requestId,
          at: Date.now(),
          kind: "scan",
          status: "failed",
          label: `Scan failed: ${code}`,
          error: err instanceof Error ? err.message : undefined,
          retry: () => void resolveRef.current(code, requestId),
        });
        return;
      }
      setActivity((all) => all.filter((a) => a.id !== requestId));
      setNotice(null);
      setChoices(null);
      let scan: DeskScan;
      let title = "";
      let holderName = "";
      let options: DeskChoice[] | undefined;
      switch (result.kind) {
        case "copy": {
          title = result.copy.title;
          holderName = result.openLoan?.borrowerName ?? "";
          if (result.openLoan) names.current.set(result.openLoan.borrower, holderName);
          scan = {
            kind: "copy",
            copyId: result.copy.id,
            status: result.copy.status,
            openLoan: result.openLoan && {
              loanId: result.openLoan.loanId,
              borrower: result.openLoan.borrower,
              issuedAtMs: result.openLoan.issuedAtMs,
            },
            returnedAtMs: result.returnedAtMs,
          };
          break;
        }
        case "borrower":
          names.current.set(result.borrower.profile.key, result.borrower.profile.name);
          setSummary(result.borrower);
          scan = { kind: "borrower", borrower: result.borrower.profile.key };
          break;
        case "ambiguous":
          options = result.options.map((o) => ({ key: `${o.kind as "student" | "staff"}:${o.id}`, name: o.name, detail: o.detail }));
          scan = { kind: "ambiguous", options: result.options };
          break;
        default:
          scan = { kind: "unknown", code: result.code };
      }
      const { panel: p, chip: c, prompt: pr } = live.current;
      const action = decideScanAction({ panel: p, chipCopyId: c?.copyId ?? null, promptOpen: pr !== null }, scan, Date.now());
      if (action.cancelPrompt) setPrompt(null);
      act(action, { code, title, holderName, options });
    },
    [act, record, signal],
  );

  useEffect(() => {
    resolveRef.current = resolve;
  }, [resolve]);

  /** Every scanner burst, typed code and camera read comes through here. */
  const handleScan = useCallback(
    (raw: string) => {
      const code = normalizeScan(raw);
      if (!code || !debounce.current(code, Date.now())) return;
      void resolve(code);
    },
    [resolve],
  );

  const closePanel = useCallback(() => {
    setPanel(null);
    setSummary(null);
    setChip(null);
    setPrompt(null);
    setNotice(null);
    setChoices(null);
  }, []);

  const pickChoice = async (choice: DeskChoice) => {
    setChoices(null);
    try {
      await loadSummary(choice.key);
      const { panel: p, chip: c, prompt: pr } = live.current;
      const action = decideScanAction({ panel: p, chipCopyId: c?.copyId ?? null, promptOpen: pr !== null }, { kind: "borrower", borrower: choice.key }, Date.now());
      act(action, { code: "", title: "", holderName: "" });
    } catch {
      signal("error");
    }
  };

  const renewLoan = (loanId: string, title: string) =>
    perform({ body: { action: "renew", loanId }, kind: "renew", label: (d) => `${title} renew${d.dueOn ? ` → ${d.dueOn}` : ""}` });

  const renewInstead = (a: Activity) => {
    if (!a.loanId) return;
    const title = a.label.split(" ← ")[0];
    void perform({ body: { action: "return_to_renew", loanId: a.loanId }, kind: "renew", label: (d) => `${title} renewed instead of return${d.dueOn ? ` → ${d.dueOn}` : ""}` });
  };

  const markFound = (source: "borrower" | "library") => {
    if (prompt?.kind !== "found") return;
    const p = prompt;
    setPrompt(null);
    void perform({ body: { action: "found", copyId: p.copyId, source }, kind: "found", label: () => `${p.title} found` });
  };

  const markDamaged = (amount: number, withdraw: boolean) => {
    if (prompt?.kind !== "damaged") return;
    const p = prompt;
    setPrompt(null);
    void perform({ body: { action: "damaged", loanId: p.loanId, amount, withdraw }, kind: "damaged", label: () => `${p.title} damaged (₹${amount})` });
  };

  const restoreCopy = (copyId: string) => {
    setNotice(null);
    void perform({ body: { action: "restore", copyId }, kind: "restore", label: () => "Back to shelf" });
  };

  const undo = async (a: Activity) => {
    if (!a.undoId) return;
    try {
      await apiFetch(`/api/undo/${a.undoId}`, { method: "POST" });
      setActivity((all) => all.map((x) => (x.id === a.id ? { ...x, undone: true } : x)));
      toast.success("Undone");
      reloadPanel();
    } catch (err) {
      signal("error");
      toast.error(err instanceof Error ? err.message : "Undo failed");
    }
  };

  const dismiss = (id: string) => setActivity((all) => all.filter((a) => a.id !== id));

  const moveSelection = (delta: number) => {
    const n = live.current.summary?.openLoans.length ?? 0;
    if (n) setSelected((i) => (i + delta + n) % n);
  };

  const onShortcut = useCallback(
    (s: DeskShortcut) => {
      const { panel: p, chip: c, summary: sum, selected: sel, activity: acts } = live.current;
      if (s === "search") inputRef.current?.focus();
      else if (s === "close") closePanel();
      else if (s === "issue") {
        if (c && p?.openedBy === "card") void issue(c.copyId, c.title, p.borrower);
      } else if (s === "renew") {
        const loan = sum?.openLoans[sel];
        const lastReturn = acts.find((a) => a.kind === "return" && a.status === "ok" && !a.undone && a.loanId);
        if (loan) void renewLoan(loan.loanId, loan.title);
        else if (lastReturn) renewInstead(lastReturn);
      }
    },
    // renewLoan / renewInstead only close over `perform`, so they follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [closePanel, issue, perform],
  );

  const left = usePanelTimer(panel !== null, prompt !== null || choices !== null, closePanel);

  // W6: unsent work is never silently left behind.
  const hasFailed = activity.some((a) => a.status === "failed" && a.retry);
  useEffect(() => {
    if (!hasFailed) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasFailed]);

  // Keep the scan box ready after every change, unless a person is typing elsewhere.
  useEffect(() => {
    const el = document.activeElement;
    if (!el || el === document.body || el instanceof HTMLButtonElement) inputRef.current?.focus();
  }, [activity, panel, notice, prompt, choices]);

  return {
    panel,
    summary: summary && panel && summary.profile.key === panel.borrower ? summary : null,
    chip,
    prompt,
    setPrompt,
    notice,
    choices,
    activity,
    selected,
    setSelected,
    flash,
    cameraOpen,
    setCameraOpen,
    inputRef,
    panelLeftMs: left,
    handleScan,
    onShortcut,
    closePanel,
    pickChoice,
    issueChip: () => {
      if (chip && panel?.openedBy === "card") void issue(chip.copyId, chip.title, panel.borrower);
    },
    passOn: (n: Extract<DeskNotice, { kind: "pass_on" }>) => {
      setNotice(null);
      void issue(n.copyId, n.title, n.to);
    },
    renewLoan,
    renewInstead,
    markFound,
    markDamaged,
    restoreCopy,
    undo,
    dismiss,
    moveSelection,
    dismissNotice: () => setNotice(null),
    askDamaged: (a: Activity) => a.loanId && setPrompt({ kind: "damaged", loanId: a.loanId, title: a.label.split(" ← ")[0] }),
  };
}
