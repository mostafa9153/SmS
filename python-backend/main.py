import os
import re
import time
import math
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal, Any
from ortools.sat.python import cp_model
from concurrent.futures import ThreadPoolExecutor

DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

app = FastAPI(title="Routine Forge Pro - Python Backend")

# The browser never calls this server directly (the Next.js API route proxies it), so CORS stays narrow.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ROUTINE_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

class RoutineSettings(BaseModel):
    id: Optional[str] = None
    workingDays: List[int]
    periodsPerDay: int
    halfDays: List[int]
    halfDayPeriods: int
    breaks: List[int]
    tchDailyMax: int
    tchConsecMax: int
    tchMinBefore: int = 0
    tchMinAfter: int = 0

class RoutineRoom(BaseModel):
    id: str
    name: str
    isLab: Optional[bool] = None

class RoutineClass(BaseModel):
    id: str
    className: str
    section: str
    dailyPeriods: Optional[int] = None

class RoutineSubject(BaseModel):
    id: str
    name: str
    className: Optional[str] = None
    classId: Optional[str] = None
    stream: Optional[str] = None
    isCommon: Optional[bool] = None
    isHard: bool
    isLab: bool
    theoryPeriods: Optional[int] = None
    labPeriods: Optional[int] = None
    timePref: Literal["any", "morning", "afternoon"]
    allowMultiplePerDay: bool
    maxPerDay: Optional[int] = None
    periodsPerWeek: Optional[int] = None
    sortOrder: Optional[int] = None

class RoutineTeacher(BaseModel):
    id: str
    name: str
    shortName: str
    maxPeriods: int
    availableSlots: Dict[str, List[int]]
    qualifiedClasses: Optional[List[str]] = None
    classSubjects: Optional[Dict[str, List[str]]] = None
    sectionSubjects: Optional[Dict[str, List[str]]] = None
    classSections: Optional[Dict[str, List[str]]] = None
    classPeriods: Optional[Dict[str, int]] = None
    sectionPeriods: Optional[Dict[str, int]] = None
    subjectPeriods: Optional[Dict[str, int]] = None
    primarySubject: Optional[str] = None
    classTeacherOf: Optional[str] = None
    classTeacherFirstPeriods: Optional[int] = None

class RoutineAssignment(BaseModel):
    id: str
    classId: str
    subjectId: str
    teacherId: str
    roomId: Optional[str] = None
    periodsPerWeek: int
    isLab: Optional[bool] = None

class SubjectGroupOption(BaseModel):
    subjectId: str
    teacherId: str
    roomId: Optional[str] = None

class SubjectGroup(BaseModel):
    gid: str
    name: Optional[str] = None
    classIds: List[str]
    periodsPerWeek: int = 1
    periodSize: Literal[1, 2] = 1
    timePref: Literal["any", "morning", "afternoon"] = "any"
    maxPerDay: Optional[int] = None
    options: List[SubjectGroupOption]

class GenerateRoutineRequest(BaseModel):
    settings: RoutineSettings
    classes: List[RoutineClass]
    teachers: List[RoutineTeacher]
    subjects: List[RoutineSubject]
    assignments: List[RoutineAssignment]
    rooms: Optional[List[RoutineRoom]] = []
    groups: Optional[List[SubjectGroup]] = []

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
    for u in units:
        for tid in u["tids"]:
            load[tid] = load.get(tid, 0) + u["sz"]
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


def run_solver_phase(request: GenerateRoutineRequest, units, relax=frozenset(), tiffin_plan=None):
    """Returns (solver, x, status_name). x is None when no solution was found."""
    settings = request.settings
    working_days = sorted(settings.workingDays)
    P = settings.periodsPerDay
    D = len(working_days)
    half_days = settings.halfDays
    full_days_count = len([d for d in working_days if d not in half_days])
    break_p = min(settings.breaks) if settings.breaks else P // 2
    tiffin_soft = "tiffin" in relax
    timepref_soft = "timepref" in relax
    fatigue_relaxed = "fatigue" in relax
    coverage_soft = "coverage" in relax
    ct_soft = "ct_first" in relax

    teachers_map = {t.id: t for t in request.teachers}
    classes_map = {c.id: c for c in request.classes}
    teacher_load_map = {}
    for u in units:
        for tid in u["tids"]:
            teacher_load_map[tid] = teacher_load_map.get(tid, 0) + u["sz"]

    model = cp_model.CpModel()
    x = {}

    class_occupancy = {c.id: [[[] for _ in range(P)] for _ in range(D)] for c in request.classes}
    teacher_occupancy = {t.id: [[[] for _ in range(P)] for _ in range(D)] for t in request.teachers}
    room_occupancy = {r.id: [[[] for _ in range(P)] for _ in range(D)] for r in request.rooms}

    for u in units:
        u_id = u["uid"]
        cids = u["cids"]
        tids = u["tids"]
        rids = u["rids"]
        sz = u["sz"]

        # Intersect member-class daily/half-day caps.
        c_daily_vals = [
            (classes_map[cid].dailyPeriods if classes_map[cid].dailyPeriods else P)
            for cid in cids if cid in classes_map
        ]
        c_daily = min(c_daily_vals) if c_daily_vals else P

        # Intersect member-teacher availability per day.
        t_objs = [teachers_map[tid] for tid in tids if tid in teachers_map]

        possible_placements = []

        for d_idx, day_val in enumerate(working_days):
            is_half = day_val in half_days
            day_max_p = min(settings.halfDayPeriods, c_daily) if is_half else c_daily

            # Common availability across every option teacher in this unit.
            if t_objs:
                avail_sets = [
                    set(t.availableSlots.get(str(day_val), list(range(1, P + 1))))
                    for t in t_objs
                ]
                t_avail_set = set.intersection(*avail_sets) if avail_sets else set()
            else:
                t_avail_set = set(range(1, P + 1))

            for p_idx in range(P):
                p_num = p_idx + 1

                if p_num > day_max_p:
                    continue

                if sz == 2:
                    if p_idx >= P - 1:
                        continue
                    p_num2 = p_num + 1
                    if p_num2 > day_max_p:
                        continue
                    if p_num in settings.breaks:
                        continue
                    if p_num not in t_avail_set or p_num2 not in t_avail_set:
                        continue

                    if not timepref_soft:
                        if u["timePref"] == "morning" and p_num2 > break_p:
                            continue
                        if u["timePref"] == "afternoon" and p_num <= break_p:
                            continue
                else:
                    if p_num not in t_avail_set:
                        continue

                    if not timepref_soft:
                        if u["timePref"] == "morning" and p_num > break_p:
                            continue
                        if u["timePref"] == "afternoon" and p_num <= break_p:
                            continue
                        
                var = model.NewBoolVar(f"x_{u_id}_{d_idx}_{p_idx}")
                x[(u_id, d_idx, p_idx)] = var
                possible_placements.append(var)

                for cid in cids:
                    if cid in class_occupancy:
                        class_occupancy[cid][d_idx][p_idx].append(var)
                for tid in tids:
                    if tid in teacher_occupancy:
                        teacher_occupancy[tid][d_idx][p_idx].append(var)
                for rid in rids:
                    if rid in room_occupancy:
                        room_occupancy[rid][d_idx][p_idx].append(var)

                if sz == 2:
                    for cid in cids:
                        if cid in class_occupancy:
                            class_occupancy[cid][d_idx][p_idx + 1].append(var)
                    for tid in tids:
                        if tid in teacher_occupancy:
                            teacher_occupancy[tid][d_idx][p_idx + 1].append(var)
                    for rid in rids:
                        if rid in room_occupancy:
                            room_occupancy[rid][d_idx][p_idx + 1].append(var)

        if possible_placements:
            model.AddExactlyOne(possible_placements)
        else:
            return None, None, "NO_PLACEMENT"

    for c_id in class_occupancy:
        for d in range(D):
            for p in range(P):
                if class_occupancy[c_id][d][p]:
                    model.AddAtMostOne(class_occupancy[c_id][d][p])
                    
    for t_id in teacher_occupancy:
        for d in range(D):
            for p in range(P):
                if teacher_occupancy[t_id][d][p]:
                    model.AddAtMostOne(teacher_occupancy[t_id][d][p])
                    
    for r_id in room_occupancy:
        for d in range(D):
            for p in range(P):
                if room_occupancy[r_id][d][p]:
                    model.AddAtMostOne(room_occupancy[r_id][d][p])

    for c_id in class_occupancy:
        c_units = [u for u in units if c_id in u["cids"]]
        sid_groups = {}
        for u in c_units:
            sid_groups.setdefault(u["sid"], []).append(u)

        for sid, s_units in sid_groups.items():
            max_daily_allowed = max((max(2, u["maxPerDay"]) if u["sz"] == 2 else u["maxPerDay"]) for u in s_units)
            for d in range(D):
                day_vars = []
                for u in s_units:
                    sz = u["sz"]
                    for p in range(P):
                        if (u["uid"], d, p) in x:
                            day_vars.append(x[(u["uid"], d, p)] * sz)
                if day_vars:
                    model.Add(sum(day_vars) <= max_daily_allowed)

    teacher_day_sums = {}
    for t_id in teacher_occupancy:
        t_units = [u for u in units if t_id in u["tids"]]
        if not t_units: continue

        load = teacher_load_map.get(t_id, 0)
        day_caps = teacher_day_caps(settings, load, working_days)

        for d_idx, day_val in enumerate(working_days):
            tch_cap = day_caps[day_val]
            if fatigue_relaxed:
                tch_cap += 1
            day_vars = []
            for u in t_units:
                sz = u["sz"]
                for p in range(P):
                    if (u["uid"], d_idx, p) in x:
                        day_vars.append(x[(u["uid"], d_idx, p)] * sz)
            if day_vars:
                model.Add(sum(day_vars) <= tch_cap)
                teacher_day_sums.setdefault(t_id, []).append(sum(day_vars))

    consec_max = settings.tchConsecMax + 1 if fatigue_relaxed else settings.tchConsecMax
    for t_id in teacher_occupancy:
        for d in range(D):
            blocks = []
            current_block = []
            for p in range(P):
                current_block.append(p)
                p_num = p + 1
                if p_num in settings.breaks:
                    blocks.append(current_block)
                    current_block = []
            if current_block:
                blocks.append(current_block)
                
            for block in blocks:
                if len(block) > consec_max:
                    for i in range(len(block) - consec_max):
                        window_periods = block[i : i + consec_max + 1]
                        window_vars = []
                        for wp in window_periods:
                            if teacher_occupancy[t_id][d][wp]:
                                window_vars.extend(teacher_occupancy[t_id][d][wp])
                        if window_vars:
                            model.Add(sum(window_vars) <= consec_max)

    # Objectives
    obj_vars = []

    # Min teacher periods before/after tiffin on teaching days
    # (hard in phase 1, penalised shortfall in phase 2)
    for t_id in teacher_occupancy:
        t_obj = teachers_map[t_id]
        load = teacher_load_map.get(t_id, 0)
        if load == 0:
            continue
        for d_idx, day_val in enumerate(working_days):
            applied = (tiffin_plan or {}).get(t_id, {}).get("applied")
            eff_b, eff_a = effective_tiffin_mins(settings, t_obj, day_val, load, break_p, P, *(applied or (None, None)))
            if eff_b == 0 and eff_a == 0:
                continue
            before_vars, after_vars = [], []
            for p in range(P):
                (before_vars if p + 1 <= break_p else after_vars).extend(teacher_occupancy[t_id][d_idx][p])
            all_vars = before_vars + after_vars
            if not all_vars:
                continue
            teach = model.NewBoolVar(f"teach_{t_id}_{d_idx}")
            model.Add(sum(all_vars) >= 1).OnlyEnforceIf(teach)
            model.Add(sum(all_vars) == 0).OnlyEnforceIf(teach.Not())
            for side, side_vars, eff in (("b", before_vars, eff_b), ("a", after_vars, eff_a)):
                if eff == 0:
                    continue
                if tiffin_soft:
                    short = model.NewIntVar(0, eff, f"short_{side}_{t_id}_{d_idx}")
                    model.Add(sum(side_vars) + short >= eff).OnlyEnforceIf(teach)
                    obj_vars.append(short * 300)
                else:
                    model.Add(sum(side_vars) >= eff).OnlyEnforceIf(teach)

    # Every available weekday gets its minimum periods: hard until the last phase, then a heavy penalty.
    # A teacher whose load is smaller than their number of days cannot cover them all, so that
    # teacher is only nudged (penalty) to use as many different days as possible.
    for t_id, per_day in coverage_targets(request, units).items():
        n_units = sum(1 for u in units if t_id in u["tids"])
        # Counting limits: enough periods for every minimum, and at least one lesson per day to cover
        can_cover_all = sum(per_day.values()) <= teacher_load_map.get(t_id, 0) and n_units >= len(per_day)
        for d_idx, target in per_day.items():
            day_vars = [v for p in range(P) for v in teacher_occupancy[t_id][d_idx][p]]
            if not day_vars:
                continue
            if can_cover_all and not coverage_soft:
                model.Add(sum(day_vars) >= target)
            else:
                missing = model.NewIntVar(0, target, f"cover_{t_id}_{d_idx}")
                model.Add(sum(day_vars) + missing >= target)
                obj_vars.append(missing * COVERAGE_WEIGHT)

    # Even spread: keep each teacher's busiest day as light as possible
    for t_id, sums in teacher_day_sums.items():
        if len(sums) < 2:
            continue
        busiest = model.NewIntVar(0, P, f"busiest_{t_id}")
        for expr in sums:
            model.Add(busiest >= expr)
        obj_vars.append(busiest * 60)

    # Hard subjects preference (earlier)
    for u in units:
        if u["hard"]:
            for d in range(D):
                for p in range(P):
                    if (u["uid"], d, p) in x:
                        obj_vars.append(x[(u["uid"], d, p)] * p * 10)
                        
    # Spreading Heuristic: Penalize multiple periods of the same subject on the same day
    for c_id in class_occupancy:
        c_units = [u for u in units if c_id in u["cids"]]
        sid_groups = {}
        for u in c_units:
            sid_groups.setdefault(u["sid"], []).append(u)

        for sid, s_units in sid_groups.items():
            for d in range(D):
                day_vars = []
                for u in s_units:
                    for p in range(P):
                        if (u["uid"], d, p) in x:
                            day_vars.append(x[(u["uid"], d, p)] * u["sz"])
                if day_vars:
                    day_sum = sum(day_vars)
                    over_1 = model.NewIntVar(0, P, f"over_1_{c_id}_{sid}_{d}")
                    model.Add(over_1 >= day_sum - 1)
                    obj_vars.append(over_1 * 1000)

    # Class Teacher first-period minimum: hard until the last phase, then a reward only
    for key, group in class_teacher_groups(units).items():
        first_period_vars = [
            x[(u["uid"], d, 0)] for u in group["units"] for d in range(D) if (u["uid"], d, 0) in x
        ]
        if not first_period_vars:
            continue
        target = min(group["target"], len(first_period_vars))
        if ct_soft:
            bounded_sum = model.NewIntVar(0, target, f"ct_first_{key[0]}_{key[1]}")
            model.Add(bounded_sum <= sum(first_period_vars))
            obj_vars.append(bounded_sum * -800)
        else:
            model.Add(sum(first_period_vars) >= target)

    # Soft time preference penalties once the preference is relaxed
    if timepref_soft:
        for u in units:
            time_pref = u["timePref"]
            if time_pref in ("morning", "afternoon"):
                for d in range(D):
                    for p in range(P):
                        if (u["uid"], d, p) in x:
                            p_num = p + 1
                            if time_pref == "morning" and p_num > break_p:
                                obj_vars.append(x[(u["uid"], d, p)] * 100)
                            if time_pref == "afternoon" and p_num <= break_p:
                                obj_vars.append(x[(u["uid"], d, p)] * 100)
                            if u["sz"] == 2:
                                p_num2 = p_num + 1
                                if time_pref == "morning" and p_num2 > break_p:
                                    obj_vars.append(x[(u["uid"], d, p)] * 100)
                                if time_pref == "afternoon" and p_num2 <= break_p:
                                    obj_vars.append(x[(u["uid"], d, p)] * 100)
                                    
    if obj_vars:
        model.Minimize(sum(obj_vars))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = PHASE_TIME_LIMIT
    solver.parameters.num_search_workers = SOLVER_WORKERS
    solver.parameters.random_seed = SOLVER_SEED
    status = solver.Solve(model)
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return solver, x, solver.StatusName(status)
    # INFEASIBLE = proven impossible; UNKNOWN = ran out of time without proof
    return solver, None, solver.StatusName(status)


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


def _day_name(day_val):
    return DAY_LABELS[day_val] if 0 <= day_val < len(DAY_LABELS) else str(day_val)


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


def generate_schedule(request: GenerateRoutineRequest, diagnose_only: bool = False):
    # Generate schedule

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

    unit_counter = [0]  # list to mutate inside helper closure

    def _append_unit(units_list, *, cids, tids, rids, sid, sz, hard, multi, max_daily,
                     time_pref, is_ct, target_first_periods, gid=None, opts=None):
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

            auto_max_daily = math.ceil(class_subj_total / max(1, D))
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
            auto_max_daily = math.ceil(g.periodsPerWeek / max(1, D))
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

@app.post("/diagnose")
def diagnose(request: GenerateRoutineRequest):
    """Fast counting checks (no solving): which strict rules are provably impossible, and what the engine adapts."""
    try:
        return generate_schedule(request, diagnose_only=True)
    except Exception as e:
        return {"success": False, "reasons": [], "adjustments": [], "error": f"Backend Error: {str(e)}"}


@app.post("/generate-routine")
def generate_routine(request: GenerateRoutineRequest):
    try:
        result = generate_schedule(request)
        return result
    except Exception as e:
        return {
            "success": False,
            "diagnostics": [f"Backend Error: {str(e)}"]
        }
