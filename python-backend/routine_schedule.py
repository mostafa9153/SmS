import time
import math
from routine_diagnostics import audit_relaxations, ct_matches, explain_strict_failures
from routine_models import GenerateRoutineRequest, allowed_periods, effective_settings
from routine_phase import run_solver_phase
from routine_plan import PHASES, PHASE_TIME_LIMIT, RELAX_LABELS, build_tiffin_plan, coverage_violations, describe_adjustments

def generate_schedule(request: GenerateRoutineRequest, diagnose_only: bool = False):
    # Generate schedule
    request = request.model_copy(update={"settings": effective_settings(request.settings)})
    settings = request.settings
    working_days = sorted(settings.workingDays)
    P = settings.periodsPerDay
    D = len(working_days)
    
    if D == 0 or P == 0:
        return {"success": False, "diagnostics": ["No working days or periods configured."]}
        
    half_days = settings.halfDays
    full_days_count = len([d for d in working_days if d not in half_days])
    
    subjects_map = {s.id: s for s in request.subjects}
    teachers_map = {t.id: t for t in request.teachers}
    classes_map = {c.id: c for c in request.classes}

    def open_days(allowed):
        def cap(d):
            return min(settings.halfDayPeriods, P) if d in half_days else P
        return max(1, len([d for d in working_days if any(p <= cap(d) for p in allowed_periods(allowed, d, P))]))

    unit_counter = [0]  # list to mutate inside helper closure

    def _append_unit(units_list, *, cids, tids, rids, sid, sz, hard, multi, max_daily,
                     time_pref, is_ct, target_first_periods, gid=None, opts=None, allowed=None):
        unit = {
            "uid": unit_counter[0],
            "cids": cids,
            "tids": tids,
            "rids": rids,
            "sid": sid,
            "sz": sz,
            "hard": hard,
            "multi": multi,
            "maxPerDay": max_daily,
            "timePref": time_pref,
            "isClassTeacherUnit": is_ct,
            "targetFirstPeriods": target_first_periods,
            "allowedSlots": allowed,
        }
        if gid is not None:
            unit["gid"] = gid
        if opts is not None:
            unit["opts"] = opts
        units_list.append(unit)
        unit_counter[0] += 1

    def make_units():
        """Build the full list of scheduling units from assignments + groups.
        Each unit is one placement in the solver, with lists of occupied
        classes/teachers/rooms so a group unit can occupy them all in one slot.
        """
        out = []

        # ---- Regular assignments -------------------------------------------
        for a in request.assignments:
            subj = subjects_map.get(a.subjectId)
            if not subj:
                continue

            tch = teachers_map.get(a.teacherId)
            cls = classes_map.get(a.classId)

            is_ct = bool(tch and cls and tch.classTeacherOf and ct_matches(tch.classTeacherOf, cls))

            target_first_periods = (
                tch.classTeacherFirstPeriods
                if is_ct and tch.classTeacherFirstPeriods is not None
                else (3 if is_ct else 0)
            )

            class_subj_total = sum(
                ass.periodsPerWeek for ass in request.assignments
                if ass.classId == a.classId and ass.subjectId == a.subjectId
            )

            auto_max_daily = math.ceil(class_subj_total / open_days(subj.allowedSlots))
            if len(half_days) > 0 and class_subj_total > full_days_count:
                auto_max_daily = max(2, auto_max_daily)

            max_daily = max(
                auto_max_daily,
                (subj.maxPerDay or 2) if subj.allowMultiplePerDay else auto_max_daily
            )
            allow_multiple = subj.allowMultiplePerDay or auto_max_daily > 1

            common = dict(
                cids=[a.classId],
                tids=[a.teacherId],
                rids=[a.roomId] if a.roomId else [],
                sid=a.subjectId,
                hard=subj.isHard,
                multi=allow_multiple,
                max_daily=max_daily,
                time_pref=subj.timePref,
                is_ct=is_ct,
                target_first_periods=target_first_periods,
                allowed=subj.allowedSlots,
            )

            rem = a.periodsPerWeek
            if a.isLab is False:
                for _ in range(rem):
                    _append_unit(out, sz=1, **common)
            elif a.isLab is True or (subj.isLab and a.isLab is not False):
                while rem >= 2:
                    _append_unit(out, sz=2, **common)
                    rem -= 2
                if rem == 1:
                    _append_unit(out, sz=1, **common)
            else:
                for _ in range(rem):
                    _append_unit(out, sz=1, **common)

        # ---- Subject groups (parallel options in one slot) -----------------
        for g in (request.groups or []):
            if not g.classIds or len(g.options) < 2:
                continue
            cids = list(dict.fromkeys(g.classIds))        # dedupe, preserve order
            tids = list(dict.fromkeys(o.teacherId for o in g.options))
            rids = list(dict.fromkeys(o.roomId for o in g.options if o.roomId))

            # Group's effective maxPerDay (fallback: use periods_per_week spread)
            auto_max_daily = math.ceil(g.periodsPerWeek / open_days(g.allowedSlots))
            max_daily = max(auto_max_daily, g.maxPerDay or 1)

            opts = [
                {"sid": o.subjectId, "tid": o.teacherId, "rid": o.roomId}
                for o in g.options
            ]
            # Use a synthetic sid "g:<gid>" so that per-class spreading /
            # daily-cap bookkeeping treats the group as a single subject key.
            synth_sid = f"g:{g.gid}"

            common = dict(
                cids=cids,
                tids=tids,
                rids=rids,
                sid=synth_sid,
                hard=False,
                multi=g.periodsPerWeek > 1,
                max_daily=max_daily,
                time_pref=g.timePref,
                is_ct=False,
                target_first_periods=0,
                gid=g.gid,
                opts=opts,
                allowed=g.allowedSlots,
            )

            rem = g.periodsPerWeek
            if g.periodSize == 2:
                while rem >= 2:
                    _append_unit(out, sz=2, **common)
                    rem -= 2
                if rem == 1:
                    _append_unit(out, sz=1, **common)
            else:
                for _ in range(rem):
                    _append_unit(out, sz=1, **common)

        return out

    units = make_units()

    # Pre-flight: each group needs at least `periodsPerWeek` common slots
    # across all member classes AND all option teachers. If no slot
    # satisfies that intersection the solver will fail with no useful
    # explanation, so detect it here and emit a structured diagnostic.
    group_preflight_diag = []
    for g in (request.groups or []):
        if not g.classIds or len(g.options) < 2:
            continue
        tids = list(dict.fromkeys(o.teacherId for o in g.options))
        t_objs = [teachers_map[tid] for tid in tids if tid in teachers_map]
        c_daily_vals = [
            (classes_map[cid].dailyPeriods if classes_map[cid].dailyPeriods else P)
            for cid in g.classIds if cid in classes_map
        ]
        c_daily_cap = min(c_daily_vals) if c_daily_vals else P

        common_slots = 0
        for day_val in working_days:
            is_half = day_val in half_days
            day_max_p = min(settings.halfDayPeriods, c_daily_cap) if is_half else c_daily_cap
            if t_objs:
                avail_sets = [
                    set(t.availableSlots.get(str(day_val), list(range(1, P + 1))))
                    for t in t_objs
                ]
                day_set = set.intersection(*avail_sets)
            else:
                day_set = set(range(1, P + 1))
            day_set &= allowed_periods(g.allowedSlots, day_val, P)
            for p_num in day_set:
                if p_num > day_max_p:
                    continue
                if g.periodSize == 2:
                    if p_num in settings.breaks:
                        continue
                    if (p_num + 1) not in day_set or (p_num + 1) > day_max_p:
                        continue
                    common_slots += 1
                else:
                    common_slots += 1

        required = g.periodsPerWeek
        if common_slots < required:
            group_preflight_diag.append({
                "type": "faculty_shortage",
                "severity": "error",
                "title": f"Group '{g.name or g.gid}' has no common free slot",
                "description": (
                    f"All option teachers (and member sections) share only "
                    f"{common_slots} compatible slot(s), but the group asks "
                    f"for {required} period(s) per week. Loosen a teacher's "
                    f"availability or reduce the group's weekly periods."
                ),
            })

    if group_preflight_diag:
        return {
            "success": False,
            "diagnostics": [d["title"] for d in group_preflight_diag],
            "diagnosticItems": group_preflight_diag,
            "metadata": {"groupsHonored": True},
            "stats": {
                "totalUnits": len(units),
                "placedUnits": 0,
                "iterations": 0,
                "executionTimeMs": 0,
                "phase": 0,
            },
        }

    # Counting proofs first: they are certain, instant, and tell the ladder which rules it must give up.
    tiffin_plan = build_tiffin_plan(request, units)
    adjustments = describe_adjustments(request, units, tiffin_plan)
    reasons = explain_strict_failures(request, units)
    if diagnose_only:
        return {
            "success": not reasons,
            "reasons": reasons,
            "adjustments": adjustments,
            "stats": {"totalUnits": len(units)},
        }
    RULE_OF = {"teacher_daily_max": "tiffin", "time_pref_saturation": "timepref", "consecutive_fatigue": "fatigue"}
    proven = {RULE_OF[i["type"]] for i in reasons if i["type"] in RULE_OF}
    unrelaxable = [i for i in reasons if i["type"] not in RULE_OF]

    attempts = []
    solver = None
    x = None
    phase = 0
    used_relax = frozenset()
    if not unrelaxable:
        for ph, relax in PHASES:
            entry = {"phase": ph, "relaxed": [RELAX_LABELS[r] for r in sorted(relax)]}
            if not proven <= relax:
                # A proof above shows this phase still contains an impossible rule: skip the solve
                attempts.append({**entry, "status": "PROVEN_INFEASIBLE", "seconds": 0})
                continue
            t0 = time.time()
            s, xx, status = run_solver_phase(request, units, relax, tiffin_plan)
            attempts.append({**entry, "status": status, "seconds": round(time.time() - t0, 1)})
            solver = s or solver
            if xx:
                solver, x, phase, used_relax = s, xx, ph, relax
                break
    if phase == 1:
        reasons = []

    if x:
        grid = {}
        for c in request.classes:
            grid[c.id] = [[None for _ in range(P)] for _ in range(D)]

        placed = []  # (unit, day index, period index)
        for u in units:
            u_id = u["uid"]
            for d in range(D):
                for p in range(P):
                    if (u_id, d, p) in x and solver.Value(x[(u_id, d, p)]):
                        placed.append((u, d, p))
                        is_lab = u["sz"] == 2
                        is_group = "gid" in u
                        # For legacy single-class/single-teacher units we keep
                        # sid/tid/rid as the actual values. For group units we
                        # still populate them (first option) for backward-compat
                        # consumers that pre-date opts/gid.
                        if is_group:
                            first_opt = u["opts"][0]
                            cell = {
                                "sid": first_opt["sid"],
                                "tid": first_opt["tid"],
                                "rid": first_opt["rid"],
                                "sz": u["sz"],
                                "lab": is_lab,
                                "uid": u_id,
                                "gid": u["gid"],
                                "opts": u["opts"],
                            }
                        else:
                            cell = {
                                "sid": u["sid"],
                                "tid": u["tids"][0],
                                "rid": u["rids"][0] if u["rids"] else None,
                                "sz": u["sz"],
                                "lab": is_lab,
                                "uid": u_id,
                            }

                        for cid in u["cids"]:
                            if cid not in grid:
                                continue
                            if is_lab:
                                start = dict(cell)
                                start["half"] = "start"
                                grid[cid][d][p] = start
                                end = dict(cell)
                                end["half"] = "end"
                                grid[cid][d][p + 1] = end
                            else:
                                grid[cid][d][p] = dict(cell)
                        break

        # What was actually broken (a relaxed rule that ended up unused is not reported)
        relaxations = audit_relaxations(request, units, placed, used_relax, tiffin_plan)
        coverage = coverage_violations(request, units, placed)
        if coverage:
            relaxations.append({
                "rule": "daily_coverage",
                "title": "Teacher minimum periods on available days",
                "summary": f"{len(coverage)} teacher-day(s) below the minimum",
                "count": len(coverage),
                "details": coverage[:80],
            })
        active_relaxations = [r["title"] for r in relaxations]
        tiffin_warnings = next((r["details"] for r in relaxations if r["rule"] == "tiffin"), [])
        violations = sum(r["count"] for r in relaxations)
        total_ms = int(sum(a["seconds"] for a in attempts) * 1000)

        return {
            "success": True,
            "grid": grid,
            "days": working_days,
            "teachingPeriods": list(range(1, P+1)),
            "breaks": settings.breaks,
            "iterations": int(solver.NumBranches()) if solver else 0,
            "executionTimeMs": total_ms,
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "metadata": {
                "phase": phase,
                "relaxedConstraints": active_relaxations,
                "relaxations": relaxations,
                "violations": violations,
                "attempts": attempts,
                "reasons": reasons,
                "adjustments": adjustments,
                "tiffinWarnings": tiffin_warnings,
                "groupsHonored": True,
            },
            "stats": {
                "totalUnits": len(units),
                "placedUnits": len(units),
                "iterations": int(solver.NumBranches()) if solver else 0,
                "executionTimeMs": total_ms,
                "phase": phase,
                "relaxedConstraints": active_relaxations,
            }
        }

    unproven = [a for a in attempts if a["status"] == "UNKNOWN"]
    items = list(reasons)
    if unproven:
        items.append({
            "type": "general",
            "severity": "warning",
            "title": "Solver ran out of time",
            "description": f"{len(unproven)} phase(s) hit the {int(PHASE_TIME_LIMIT)}s limit without proof either way, so a solution may exist.",
            "solution": "Run again, or free up some slack (fewer fully-packed classes).",
        })
    return {
        "success": False,
        "diagnostics": [i["title"] for i in items] or ["The solver could not find a feasible schedule even with every rule relaxed."],
        "diagnosticItems": items,
        "metadata": {"groupsHonored": True, "attempts": attempts},
        "stats": {
            "totalUnits": len(units),
            "placedUnits": 0,
            "iterations": int(solver.NumBranches()) if solver else 0,
            "executionTimeMs": int(sum(a["seconds"] for a in attempts) * 1000),
            "phase": len(attempts),
        }
    }
