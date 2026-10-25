# Master Prompt: Routine Maker Deep Audit

> এই পুরো লেখাটা কপি করে একটা নতুন Claude Code session এ পেস্ট করো (project folder খোলা অবস্থায়)।
> Report বাংলা অক্ষরে আসবে, প্রযুক্তিগত শব্দ ইংরেজিতে।

---

## ROLE

You are a principal engineer doing a read-only audit of the **Routine Maker** module of this School Management System. Be skeptical, evidence-driven and precise. The owner is not a programmer: they know the school rules perfectly but cannot describe bugs technically. Your job is to find the bugs for them and explain each in plain Bengali, with a technical evidence trail underneath.

**Do NOT modify any code or data.** Output is a report only. Fixes come later, after the owner approves the report.

## THE CORE PROBLEM (investigate this first)

The owner can build a valid class routine **by hand** using the school's rules. But the generator fails **Phase 1** (all hard constraints) and falls back to **Phase 2** (relaxed constraints: soft time preferences, fatigue bound `tchConsecMax + 1`, penalised shortfalls). Phase 2 is supposed to be a rare rescue, not the normal path.

Find out **exactly why Phase 1 is infeasible for real data**. For every cause classify it as one of:
1. **Data/modeling bug**: wrong input reaches the solver (duplicate subjects inflating demand, group members counted twice, section vs class scope mixed up, stale ids, unit mismatch between p/wk and slots, double periods counted as 1, etc.).
2. **Engine bug**: constraint encoded wrongly or too strictly (off-by-one, per-day vs per-week confusion, teacher availability applied twice, group slot not shared across sections, lab/double-period adjacency, tiffin/class-teacher-first-period rules, symmetry or domain pruning that removes valid solutions).
3. **Genuine infeasibility**: the rules truly cannot all be met. Prove it with counting (capacity vs demand per teacher / class / room / day) and name the exact binding constraint.
4. **UI/engine mismatch**: the UI promises a rule that the engine does not enforce, or enforces differently.

Never guess. If you cannot prove a cause, say "unproven" and list what evidence is missing.

## HOW TO PROVE IT (mandatory method)

1. Capture the **exact payload** the UI sends to `app/api/routine/generate` for the current real school data (log it, save to a scratch file). Do not use synthetic data for the main finding.
2. Write a throwaway **validator script** (in the scratchpad, not in the repo) that checks a candidate routine against every hard constraint the engine claims in Phase 1. Feed it (a) a hand-made routine for one class and (b) the solver output. A hand-made routine that passes the validator but is rejected by the solver pinpoints an engine bug.
3. **Bisect constraints**: run the Phase 1 model with constraint groups disabled one at a time (teacher availability, consecutive limit, daily max, groups, rooms, time preference, tiffin, class-teacher first period...) and report which single constraint, or smallest set, flips INFEASIBLE to FEASIBLE. This is the strongest evidence you can give.
4. Run `python-backend/test_solver.py`, `python-backend/test_groups.py` and `scripts/test-routine-solver.ts`. Report what they do and do not cover.

## SECOND SCOPE: UI vs ENGINE LOGIC MISMATCHES

Build a **traceability matrix** for every setting and number the user can see or edit, from the screen to the database to the payload to the solver, and back:

`UI field -> component -> state -> db-routine.ts column -> payload field -> main.py / routineGenerator.ts use -> result shown back in UI`

Look especially for: values saved but never sent; values sent but ignored; labels or counters that compute differently from the engine (p/wk totals, "Total Demand", section loads, teacher workload, "Free/Rem" pills, overload badges); defaults that differ between UI and engine; localStorage vs Supabase divergence; stale caches (60s role cache, local state vs DB); sorting/ordering that the engine depends on but the UI does not persist.

Known issues already fixed recently (do not re-report, but check for siblings of the same pattern): duplicate subject rows from the preset sync race; group member subjects double-counted in section load; tab badge vs table count using different dedupe keys.

**Specifically hunt the same bug class everywhere:** the same quantity computed in more than one place with slightly different logic (count, dedupe, load, demand, capacity). List every duplicated computation and which copies disagree.

## THIRD SCOPE: CODE QUALITY AND ENGINE HEALTH

Review `lib/routine/*`, `lib/supabase/db-routine.ts`, `python-backend/main.py`, `components/routine/*`, `app/api/routine/*`, `app/(dashboard)/routine/page.tsx`. Report on:
- duplicated logic and divergent copies; dead code; very large functions/components that hide bugs
- type safety holes (`any`, unchecked casts), silent `catch {}` / swallowed errors, `console.warn` instead of surfaced errors
- race conditions, non-idempotent writes, random-UUID inserts without a natural key or unique constraint
- data integrity: missing unique constraints, orphan rows (group options, assignments, teacher records pointing to deleted subjects/sections), localStorage-as-source-of-truth
- TS solver (`routineGenerator.ts`) vs Python solver (`main.py`): are both still used? Do they implement the same rules? Which is authoritative?
- solver diagnostics quality: when generation fails, does the message tell the owner the real reason in plain words?
- testability: what can be unit-tested with zero refactor, what needs extraction. No JS test framework exists; recommend the smallest viable setup.
- performance: solver time limit, worker count, payload size, repeated re-computation in render paths.

## RULES OF EVIDENCE

- Every finding needs: **file:line**, a minimal reproduction or counting proof, and the observed vs expected behaviour.
- Rate each finding: **Severity** (Blocker / High / Medium / Low), **Confidence** (Proven / Likely / Unproven), **Effort** (S / M / L).
- Separate **facts** (you verified) from **hypotheses** (you did not). Never present a hypothesis as a fact.
- Check the actual database (read-only) when claiming something about data. Do not write to it.
- Respect `CLAUDE.md` and `AGENTS.md`. Read the relevant Next.js docs in `node_modules/next/dist/docs/` before judging framework usage; this Next.js version has breaking changes.

## REPORT FORMAT (write to `docs/routine-audit-report.md`, in Bengali script, technical terms in English)

1. **এক পাতার সারসংক্ষেপ**: why Phase 1 fails, in plain words, top 5 problems, overall health score out of 10 for engine / UI / data / code quality.
2. **Phase 1 vs Phase 2 root cause**: the bisect table, the binding constraint(s), and the classification (1-4 above) with proof.
3. **UI vs Engine mismatch matrix**: table of every mismatch found.
4. **Duplicated-computation register**: where the same number is computed in several places and which copies disagree.
5. **Data integrity findings**.
6. **Code quality findings** grouped by theme.
7. **Full findings table**: id, title, severity, confidence, effort, file:line.
8. **Fix roadmap**: ordered batches. Quick wins first, then structural fixes, each with risk, rollback, and how to verify. Include the single refactor that would remove the most bug surface (for example one shared "demand / load" module used by the UI and the solver payload builder).
9. **Questions for the owner**: only rule ambiguities that code cannot answer, each in one line with a recommended default.

## BEHAVIOUR

- Work autonomously. Do not stop to ask routine questions; make a reasonable assumption and record it.
- Push back: if a school rule as configured is contradictory or impossible, say so and show the arithmetic.
- Be honest about what you could not verify. A short true report beats a long speculative one.
- At the end, print only a 5-line summary and the path of the report.
