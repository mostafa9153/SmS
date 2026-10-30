import re
import time
from typing import Any
from routine_models import _day_name
from routine_plan import RELAX_LABELS, ct_first_violations, effective_tiffin_mins, teacher_day_caps

def _sec_norm(s):
    s = (s or "").lower().replace("section", "").strip()
    return s.split("(")[0].strip()


def ct_matches(label, cls):
    """True when the teacher's class-teacher label (e.g. 'Class VII - Section A') names this exact class and section."""
    low = (label or "").strip().lower()
    if not low:
        return False
    m = re.match(r"^(.*?)\s*[-–]\s*(.+)$", low)
    cname = (m.group(1) if m else low).strip()
    sec = _sec_norm(m.group(2)) if m else None
    if cname != (cls.className or "").strip().lower():
        return False
    return sec is None or sec == _sec_norm(cls.section)


def max_day_with_consec(avail, day_cap, c, breaks):
    """Most periods a teacher can take in one day without more than c in a row (runs reset at tiffin)."""
    NEG = -10**9
    dp = {0: 0}
    for p in range(1, day_cap + 1):
        if (p - 1) in breaks:
            dp = {0: max(dp.values())}
        new = {0: max(dp.values())}
        if p in avail:
            for r, v in dp.items():
                if r < c and v + 1 > new.get(r + 1, NEG):
                    new[r + 1] = v + 1
        dp = new
    return max(dp.values())


def explain_strict_failures(request, units):
    """Counting proofs for why the strict rules cannot all hold. Each item is a certain impossibility."""
    settings = request.settings
    working_days = sorted(settings.workingDays)
    P = settings.periodsPerDay
    half_days = settings.halfDays
    break_p = min(settings.breaks) if settings.breaks else P // 2
    teachers = {t.id: t for t in request.teachers}
    classes = {c.id: c for c in request.classes}
    subjects = {s.id: s for s in request.subjects}
    items = []

    load = {}
    t_units = {}
    for u in units:
        for tid in u["tids"]:
            load[tid] = load.get(tid, 0) + u["sz"]
            t_units.setdefault(tid, []).append(u)

    def day_cap_for(day_val):
        return min(settings.halfDayPeriods, P) if day_val in half_days else P

    # Class capacity
    demand = {}
    for u in units:
        for cid in u["cids"]:
            demand[cid] = demand.get(cid, 0) + u["sz"]
    for cid, dem in demand.items():
        c = classes.get(cid)
        if not c:
            continue
        cap = 0
        for d in working_days:
            cap += min(day_cap_for(d), c.dailyPeriods or P)
        if dem > cap:
            items.append({
                "type": "capacity_overflow", "severity": "error",
                "title": f"{c.className} {c.section}: {dem} periods demanded, only {cap} slots in a week",
                "description": "The class has more periods than timetable slots.",
                "solution": "Reduce weekly periods of some subjects or raise this class's daily periods.",
                "className": f"{c.className} {c.section}",
            })

    for tid, ld in load.items():
        t = teachers.get(tid)
        if not t:
            continue
        avail = {d: set(t.availableSlots.get(str(d), list(range(1, P + 1)))) for d in working_days}
        caps = teacher_day_caps(settings, ld, working_days)

        # Availability
        total_av = sum(len([p for p in avail[d] if p <= day_cap_for(d)]) for d in working_days)
        if ld > total_av:
            items.append({
                "type": "teacher_availability", "severity": "error",
                "title": f"{t.name}: {ld} periods assigned but only {total_av} slots marked available",
                "description": "The teacher's availability matrix is smaller than their load.",
                "solution": "Open more slots in the teacher's availability, or move some periods to another teacher.",
                "teacherName": t.name,
            })

        # Max consecutive
        c = settings.tchConsecMax
        weekly = sum(
            min(max_day_with_consec(avail[d], day_cap_for(d), c, settings.breaks), caps[d])
            for d in working_days
        )
        if ld > weekly:
            need = c
            while need < P and sum(
                min(max_day_with_consec(avail[d], day_cap_for(d), need, settings.breaks), caps[d])
                for d in working_days
            ) < ld:
                need += 1
            items.append({
                "type": "consecutive_fatigue", "severity": "error",
                "title": f"{t.name}: Max Consecutive = {c} allows only {weekly} periods/week, load is {ld}",
                "description": f"With at most {c} periods in a row (tiffin resets the count) this teacher can fill {weekly} slots in a week.",
                "solution": f"Raise Max Consecutive Periods to {need}, or reduce {t.name}'s load to {weekly}.",
                "teacherName": t.name,
            })

        # Morning / afternoon preference
        for pref in ("morning", "afternoon"):
            pref_units = [u for u in t_units[tid] if u["timePref"] == pref]
            if not pref_units:
                continue
            need_slots = sum(u["sz"] for u in pref_units)
            cap_cls = max(
                (min((classes[cid].dailyPeriods or P) for cid in u["cids"] if cid in classes) for u in pref_units),
                default=P,
            )
            slots = 0
            for d in working_days:
                top = min(day_cap_for(d), cap_cls)
                for p in avail[d]:
                    if p <= top and ((p <= break_p) if pref == "morning" else (p > break_p)):
                        slots += 1
            if need_slots > slots:
                names = sorted({
                    (subjects[u["sid"]].name if u["sid"] in subjects else u["sid"]) for u in pref_units
                })
                items.append({
                    "type": "time_pref_saturation", "severity": "error",
                    "title": f"{t.name}: {need_slots} {pref}-only periods but only {slots} {pref} slots",
                    "description": f"Subjects {', '.join(names)} must be in the {pref}, and the teacher has fewer {pref} slots than that.",
                    "solution": f"Set the time preference of {', '.join(names)} to Any, or free up {pref} availability.",
                    "teacherName": t.name,
                })

    return items


def tiffin_violations(request, units, placed, plan=None):
    settings = request.settings
    working_days = sorted(settings.workingDays)
    P = settings.periodsPerDay
    break_p = min(settings.breaks) if settings.breaks else P // 2
    if settings.tchMinBefore <= 0 and settings.tchMinAfter <= 0:
        return []
    teachers = {t.id: t for t in request.teachers}
    counts = {}
    load_map = {}
    for u in units:
        for tid in u["tids"]:
            load_map[tid] = load_map.get(tid, 0) + u["sz"]
    for u, d, p in placed:
        for k in range(u["sz"]):
            for tid in u["tids"]:
                c = counts.setdefault((tid, d), [0, 0])
                c[0 if p + k + 1 <= break_p else 1] += 1
    out = []
    for (tid, d), (nb, na) in sorted(counts.items()):
        t = teachers[tid]
        applied = (plan or {}).get(tid, {}).get("applied")
        eb, ea = effective_tiffin_mins(settings, t, working_days[d], load_map[tid], break_p, P, *(applied or (None, None)))
        if nb < eb or na < ea:
            out.append(f"{t.name} - {_day_name(working_days[d])}: {nb} before / {na} after tiffin (min {eb}/{ea})")
    return out


def audit_relaxations(request, units, placed, relax, plan=None):
    """Rules that were relaxed AND actually broken in the final routine, with every violation listed."""
    settings = request.settings
    working_days = sorted(settings.workingDays)
    P = settings.periodsPerDay
    break_p = min(settings.breaks) if settings.breaks else P // 2
    teachers = {t.id: t for t in request.teachers}
    classes = {c.id: c for c in request.classes}
    subjects = {s.id: s for s in request.subjects}
    groups = {g.gid: g for g in (request.groups or [])}
    out = []

    def add(rule, details, summary):
        if details:
            out.append({
                "rule": rule, "title": RELAX_LABELS[rule], "summary": summary,
                "count": len(details), "details": details[:80],
            })

    if "ct_first" in relax:
        details = ct_first_violations(request, units, placed)
        add("ct_first", details, f"{len(details)} class teacher(s) below first-period target")

    if "tiffin" in relax:
        details = tiffin_violations(request, units, placed, plan)
        add("tiffin", details, f"Min tiffin periods not met on {len(details)} teacher-day(s)")

    if "timepref" in relax:
        details = []
        for u, d, p in placed:
            if u["timePref"] == "any":
                continue
            periods = [p + k + 1 for k in range(u["sz"])]
            bad = any((q > break_p) if u["timePref"] == "morning" else (q <= break_p) for q in periods)
            if bad:
                name = subjects[u["sid"]].name if u["sid"] in subjects else (groups[u["gid"]].name if u.get("gid") in groups else u["sid"])
                cls = classes.get(u["cids"][0])
                label = f"{cls.className} {cls.section}" if cls else "?"
                details.append(f"{label} - {name}: {_day_name(working_days[d])} period {p + 1} (wanted {u['timePref']})")
        add("timepref", details, f"{len(details)} period(s) placed outside their morning/afternoon preference")

    if "fatigue" in relax:
        occ = {}
        for u, d, p in placed:
            for k in range(u["sz"]):
                for tid in u["tids"]:
                    occ.setdefault((tid, d), set()).add(p + k + 1)
        load_map = {}
        for u in units:
            for tid in u["tids"]:
                load_map[tid] = load_map.get(tid, 0) + u["sz"]
        details = []
        for (tid, d), periods in sorted(occ.items()):
            t = teachers[tid]
            cap = teacher_day_caps(settings, load_map[tid], working_days)[working_days[d]]
            if len(periods) > cap:
                details.append(f"{t.name} - {_day_name(working_days[d])}: {len(periods)} periods (limit {cap})")
            run = best = 0
            for q in range(1, P + 1):
                if (q - 1) in settings.breaks:
                    run = 0
                run = run + 1 if q in periods else 0
                best = max(best, run)
            if best > settings.tchConsecMax:
                details.append(f"{t.name} - {_day_name(working_days[d])}: {best} in a row (limit {settings.tchConsecMax})")
        add("fatigue", details, f"{len(details)} teacher-day(s) above the daily or consecutive limit")

    return out
