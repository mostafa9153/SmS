import os
import math
from routine_models import _day_name, allowed_periods

def effective_tiffin_mins(settings, teacher, day_val, load, break_p, P, min_b=None, min_a=None):
    """Min periods before/after tiffin for a teacher on a teaching day, capped by
    the teacher's availability on each side and by their weekly load.
    min_b / min_a override the global settings (used for the per-teacher adapted minimum)."""
    min_b = max(0, settings.tchMinBefore if min_b is None else min_b)
    min_a = max(0, settings.tchMinAfter if min_a is None else min_a)
    if (min_b == 0 and min_a == 0) or break_p >= P:
        return 0, 0
    day_cap = min(settings.halfDayPeriods, P) if day_val in settings.halfDays else P
    avail = teacher.availableSlots.get(str(day_val), list(range(1, P + 1)))
    avail_b = len([p for p in avail if p <= min(break_p, day_cap)])
    avail_a = len([p for p in avail if break_p < p <= day_cap])
    eff_b = min(min_b, avail_b)
    eff_a = min(min_a, avail_a)
    if eff_b + eff_a > load:
        eff_a = max(0, load - eff_b)
        eff_b = min(eff_b, load)
    return eff_b, eff_a


# Relaxation ladder: each phase relaxes only what the previous phase proved it must.
# Phase 1 is fully strict. Rules are ordered from least to most harmful to give up.
PHASES = [
    (1, frozenset()),
    (2, frozenset({"tiffin"})),
    (3, frozenset({"tiffin", "timepref"})),
    (4, frozenset({"tiffin", "timepref", "fatigue"})),
    # Last resort only: every other rule is given up before a teacher may skip an available weekday
    (5, frozenset({"tiffin", "timepref", "fatigue", "coverage", "ct_first"})),
]
RELAX_LABELS = {
    "tiffin": "Min periods before/after tiffin",
    "timepref": "Morning/afternoon subject preference",
    "fatigue": "Teacher daily max and max consecutive (+1)",
    "coverage": "Minimum periods on each available weekday",
    "ct_first": "Class teacher first-period minimum",
}
PHASE_TIME_LIMIT = float(os.environ.get("ROUTINE_SOLVER_TIME_LIMIT", "60"))
SOLVER_WORKERS = 8
# Soft rule: a teacher who is available on a weekday should teach on it. Penalty per missing period.
COVERAGE_WEIGHT = 1500
COVERAGE_DAYS_DIVISOR = 6  # weekly load / 6 = minimum periods per available weekday (Saturday itself is never forced)
SOLVER_SEED = 1


def teacher_day_caps(settings, load, working_days):
    """Daily cap per working day for a teacher (strict values, before any relaxation).
    The full-day cap rises with the teacher's load so a heavy load is still schedulable."""
    half_days = settings.halfDays
    half_days_count = len([d for d in working_days if d in half_days])
    full_days_count = len(working_days) - half_days_count
    half_day_contrib = half_days_count * min(settings.tchDailyMax, settings.halfDayPeriods)
    full_day_req = math.ceil(max(0, load - half_day_contrib) / max(1, full_days_count)) if full_days_count > 0 else 0
    base_cap_full = max(settings.tchDailyMax, full_day_req)
    base_cap_half = min(settings.tchDailyMax, settings.halfDayPeriods)
    return {d: (base_cap_half if d in half_days else base_cap_full) for d in working_days}


def coverage_targets(request, units):
    """Minimum periods per available weekday for each teacher (Saturday never forced).
    Target = max(1, weekly load // 5), limited by what the day can physically hold. When the load is
    smaller than the number of available days the targets cannot all be met, so the solver is simply
    rewarded for touching as many different days as possible. Returns {teacher_id: {day_index: target}}."""
    s = request.settings
    working_days = sorted(s.workingDays)
    P = s.periodsPerDay
    teachers = {t.id: t for t in request.teachers}
    load = {}
    t_units = {}
    for u in units:
        for tid in u["tids"]:
            load[tid] = load.get(tid, 0) + u["sz"]
            t_units.setdefault(tid, []).append(u)
    out = {}
    for tid, ld in load.items():
        t = teachers.get(tid)
        if not t or ld <= 0:
            continue
        caps = teacher_day_caps(s, ld, working_days)
        base = max(1, ld // COVERAGE_DAYS_DIVISOR)
        per_day = {}
        for d_idx, day_val in enumerate(working_days):
            if _day_name(day_val) == "Sat":
                continue
            day_cap = min(s.halfDayPeriods, P) if day_val in s.halfDays else P
            avail = [q for q in t.availableSlots.get(str(day_val), list(range(1, P + 1))) if q <= day_cap]
            # A day none of this teacher's subjects may use is not a coverage day
            subj_open = set().union(*(allowed_periods(u.get("allowedSlots"), day_val, P) for u in t_units[tid]))
            avail = [q for q in avail if q in subj_open]
            if not avail:
                continue
            per_day[d_idx] = min(base, len(avail), caps[day_val])
        if per_day:
            out[tid] = per_day
    return out


def class_teacher_groups(units):
    """Units of each (class, class teacher) pair. Group units never set isClassTeacherUnit,
    so cids[0]/tids[0] is safe here."""
    groups = {}
    for u in units:
        if u.get("isClassTeacherUnit") and u.get("targetFirstPeriods", 0) > 0:
            key = (u["cids"][0], u["tids"][0])
            groups.setdefault(key, {"target": u["targetFirstPeriods"], "units": []})["units"].append(u)
    return groups


def ct_first_violations(request, units, placed):
    """Class teachers whose class has fewer first-period placements than their target."""
    teachers = {t.id: t for t in request.teachers}
    classes = {c.id: c for c in request.classes}
    got = {}
    for u, d, p in placed:
        if p == 0 and u.get("isClassTeacherUnit"):
            key = (u["cids"][0], u["tids"][0])
            got[key] = got.get(key, 0) + 1
    out = []
    for key, group in class_teacher_groups(units).items():
        wanted = min(group["target"], len(group["units"]))
        n = got.get(key, 0)
        if n < wanted:
            cid, tid = key
            t, c = teachers.get(tid), classes.get(cid)
            label = f"{c.className} {c.section}" if c else cid
            out.append(f"{t.name if t else tid} - {label}: {n} first-period(s) (wanted {wanted})")
    return sorted(out)


def coverage_violations(request, units, placed):
    """Teacher-days (Mon-Fri, available) that ended up below their minimum."""
    working_days = sorted(request.settings.workingDays)
    teachers = {t.id: t for t in request.teachers}
    count = {}
    for u, d, p in placed:
        for tid in u["tids"]:
            count[(tid, d)] = count.get((tid, d), 0) + u["sz"]
    out = []
    for tid, per_day in sorted(coverage_targets(request, units).items(), key=lambda kv: teachers[kv[0]].name):
        for d_idx, target in per_day.items():
            got = count.get((tid, d_idx), 0)
            if got < target:
                out.append(f"{teachers[tid].name} - {_day_name(working_days[d_idx])}: {got} period(s) (wanted {target})")
    return out


def build_tiffin_plan(request, units):
    """Per-teacher tiffin minimum. A teacher whose load cannot be split into valid teaching days
    (each day needing min before + min after) gets the largest smaller minimum that fits, so a
    low-load teacher is never forced into an impossible pattern. Returns {teacher_id: {...}}."""
    s = request.settings
    big_b, big_a = max(0, s.tchMinBefore), max(0, s.tchMinAfter)
    if big_b == 0 and big_a == 0:
        return {}
    working_days = sorted(s.workingDays)
    P = s.periodsPerDay
    break_p = min(s.breaks) if s.breaks else P // 2
    teachers = {t.id: t for t in request.teachers}
    load, keys = {}, {}
    for u in units:
        for tid in u["tids"]:
            load[tid] = load.get(tid, 0) + u["sz"]
            k = (tuple(u["cids"]), u["sid"])
            per_day = max(2, u["maxPerDay"]) if u["sz"] == 2 else u["maxPerDay"]
            d = keys.setdefault(tid, {})
            d[k] = max(d.get(k, 0), per_day)

    def day_cap_for(day_val):
        return min(s.halfDayPeriods, P) if day_val in s.halfDays else P

    plan = {}
    for tid, ld in load.items():
        t = teachers.get(tid)
        if not t:
            continue
        caps = teacher_day_caps(s, ld, working_days)
        avail = {d: set(t.availableSlots.get(str(d), list(range(1, P + 1)))) for d in working_days}
        subj_cap = sum(keys[tid].values())

        def reachable(mb, ma):
            reach = {0}
            for d in working_days:
                eb, ea = effective_tiffin_mins(s, t, d, ld, break_p, P, mb, ma)
                m = eb + ea
                cap_d = min(caps[d], subj_cap, len([p for p in avail[d] if p <= day_cap_for(d)]))
                options = [0] + (list(range(m, cap_d + 1)) if m > 0 else list(range(1, cap_d + 1)))
                reach = {x + k for x in reach for k in options}
            return ld in reach

        cands = sorted(((b, a) for b in range(big_b + 1) for a in range(big_a + 1)),
                       key=lambda c: (-(c[0] + c[1]), -min(c)))
        applied = next(((b, a) for b, a in cands if reachable(b, a)), (0, 0))
        plan[tid] = {"wanted": (big_b, big_a), "applied": applied}
    return plan


def describe_adjustments(request, units, plan):
    """Plain-language notes about rules the engine adapted per teacher so the routine stays possible."""
    s = request.settings
    working_days = sorted(s.workingDays)
    teachers = {t.id: t for t in request.teachers}
    load = {}
    for u in units:
        for tid in u["tids"]:
            load[tid] = load.get(tid, 0) + u["sz"]
    notes = []
    for tid, p in plan.items():
        if p["applied"] != p["wanted"]:
            wb, wa = p["wanted"]
            ab, aa = p["applied"]
            notes.append(f"{teachers[tid].name}: tiffin minimum lowered from {wb} before / {wa} after to {ab} / {aa} (load {load[tid]} cannot fit the full rule)")
    for tid, ld in load.items():
        t = teachers.get(tid)
        if not t:
            continue
        top = max(teacher_day_caps(s, ld, working_days).values())
        if top > s.tchDailyMax:
            notes.append(f"{t.name}: daily maximum raised from {s.tchDailyMax} to {top} to fit load {ld}")
    return sorted(notes)
