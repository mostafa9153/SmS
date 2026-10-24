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

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

def effective_tiffin_mins(settings, teacher, day_val, load, break_p, P):
    """Min periods before/after tiffin for a teacher on a teaching day, capped by
    the teacher's availability on each side and by their weekly load."""
    min_b = max(0, settings.tchMinBefore)
    min_a = max(0, settings.tchMinAfter)
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


def run_solver_phase(request: GenerateRoutineRequest, units, phase: int):
    settings = request.settings
    working_days = sorted(settings.workingDays)
    P = settings.periodsPerDay
    D = len(working_days)
    half_days = settings.halfDays
    full_days_count = len([d for d in working_days if d not in half_days])
    break_p = min(settings.breaks) if settings.breaks else P // 2
    is_relaxed = phase == 2

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

                    if not is_relaxed:
                        if u["timePref"] == "morning" and p_num2 > break_p:
                            continue
                        if u["timePref"] == "afternoon" and p_num <= break_p:
                            continue
                else:
                    if p_num not in t_avail_set:
                        continue

                    if not is_relaxed:
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
            return None, None
            
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

    half_days_count = len(half_days)
    full_days_count_total = len(working_days) - half_days_count
    for t_id in teacher_occupancy:
        t_units = [u for u in units if t_id in u["tids"]]
        if not t_units: continue
        
        load = teacher_load_map.get(t_id, 0)
        half_day_contrib = half_days_count * min(settings.tchDailyMax, settings.halfDayPeriods)
        full_day_req = math.ceil(max(0, load - half_day_contrib) / max(1, full_days_count_total)) if full_days_count_total > 0 else 0
        base_cap_full = max(settings.tchDailyMax, full_day_req)
        base_cap_half = min(settings.tchDailyMax, settings.halfDayPeriods)
        
        for d_idx, day_val in enumerate(working_days):
            tch_cap = base_cap_half if day_val in half_days else base_cap_full
            if is_relaxed:
                tch_cap += 1
            day_vars = []
            for u in t_units:
                sz = u["sz"]
                for p in range(P):
                    if (u["uid"], d_idx, p) in x:
                        day_vars.append(x[(u["uid"], d_idx, p)] * sz)
            if day_vars:
                model.Add(sum(day_vars) <= tch_cap)

    consec_max = settings.tchConsecMax + 1 if is_relaxed else settings.tchConsecMax
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
            eff_b, eff_a = effective_tiffin_mins(settings, t_obj, day_val, load, break_p, P)
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
                if is_relaxed:
                    short = model.NewIntVar(0, eff, f"short_{side}_{t_id}_{d_idx}")
                    model.Add(sum(side_vars) + short >= eff).OnlyEnforceIf(teach)
                    obj_vars.append(short * 300)
                else:
                    model.Add(sum(side_vars) >= eff).OnlyEnforceIf(teach)

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

    # Class Teacher preference for 1st period
    # Group units never set isClassTeacherUnit, so cids[0]/tids[0] is safe here.
    ct_groups = {}
    for u in units:
        if u.get("isClassTeacherUnit") and u.get("targetFirstPeriods", 0) > 0:
            key = (u["cids"][0], u["tids"][0])
            if key not in ct_groups:
                ct_groups[key] = {"target": u["targetFirstPeriods"], "units": []}
            ct_groups[key]["units"].append(u)
            
    for key, group in ct_groups.items():
        target = group["target"]
        group_units = group["units"]
        first_period_vars = []
        for u in group_units:
            for d in range(D):
                if (u["uid"], d, 0) in x:
                    first_period_vars.append(x[(u["uid"], d, 0)])
                    
        if first_period_vars:
            bounded_sum = model.NewIntVar(0, target, f"ct_first_{key[0]}_{key[1]}")
            model.Add(bounded_sum <= sum(first_period_vars))
            obj_vars.append(bounded_sum * -800)
                        
    # Soft Time Preference penalties in Phase 2
    if is_relaxed:
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
    solver.parameters.max_time_in_seconds = 15.0
    status = solver.Solve(model)
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return solver, x
    return None, None


def generate_schedule(request: GenerateRoutineRequest):
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

            is_ct = False
            if tch and cls and tch.classTeacherOf:
                tch_ct_lower = tch.classTeacherOf.lower()
                cls_name_lower = cls.className.lower() if cls.className else ""
                cls_sec = cls.section if cls.section and cls.section != "ALL" else ""
                full_class_label = f"{cls_name_lower} - {cls_sec.lower()}" if cls_sec else cls_name_lower
                if (tch_ct_lower == full_class_label
                        or tch_ct_lower == cls_name_lower
                        or (cls_name_lower and cls_name_lower in tch_ct_lower)):
                    is_ct = True

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

    # Phase 1
    solver, x = run_solver_phase(request, units, 1)
    phase = 1

    # Phase 2 if Phase 1 fails
    if not x:
        solver, x = run_solver_phase(request, units, 2)
        phase = 2
        
    if x:
        grid = {}
        for c in request.classes:
            grid[c.id] = [[None for _ in range(P)] for _ in range(D)]
            
        for u in units:
            u_id = u["uid"]
            for d in range(D):
                for p in range(P):
                    if (u_id, d, p) in x and solver.Value(x[(u_id, d, p)]):
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

        active_relaxations = ["Soft time preferences", "Fatigue bounds relaxed"] if phase == 2 else []

        # Report teacher-days that fall short of the min before/after tiffin rule
        tiffin_warnings = []
        break_p = min(settings.breaks) if settings.breaks else P // 2
        if settings.tchMinBefore > 0 or settings.tchMinAfter > 0:
            counts = {}
            load_map = {}
            for u in units:
                for tid in u["tids"]:
                    load_map[tid] = load_map.get(tid, 0) + u["sz"]
                for d in range(D):
                    for p in range(P):
                        if (u["uid"], d, p) in x and solver.Value(x[(u["uid"], d, p)]):
                            for k in range(u["sz"]):
                                for tid in u["tids"]:
                                    c = counts.setdefault((tid, d), [0, 0])
                                    c[0 if p + k + 1 <= break_p else 1] += 1
            for (tid, d), (nb, na) in sorted(counts.items()):
                t_obj = teachers_map[tid]
                eff_b, eff_a = effective_tiffin_mins(settings, t_obj, working_days[d], load_map[tid], break_p, P)
                if nb < eff_b or na < eff_a:
                    tiffin_warnings.append(
                        f"{t_obj.name} - {DAY_LABELS[working_days[d]]}: {nb} before / {na} after tiffin (min {eff_b}/{eff_a})"
                    )
            if tiffin_warnings:
                active_relaxations.append("Min tiffin periods not met for some teachers")
        return {
            "success": True,
            "grid": grid,
            "days": working_days,
            "teachingPeriods": list(range(1, P+1)),
            "breaks": settings.breaks,
            "iterations": int(solver.NumBranches()) if solver else 0,
            "executionTimeMs": int(solver.WallTime() * 1000) if solver else 0,
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "metadata": {
                "phase": phase,
                "relaxedConstraints": active_relaxations,
                "tiffinWarnings": tiffin_warnings,
                "groupsHonored": True,
            },
            "stats": {
                "totalUnits": len(units),
                "placedUnits": len(units),
                "iterations": int(solver.NumBranches()) if solver else 0,
                "executionTimeMs": int(solver.WallTime() * 1000) if solver else 0,
                "phase": phase,
                "relaxedConstraints": active_relaxations,
            }
        }
    else:
        return {
            "success": False,
            "diagnostics": ["CP-SAT Solver could not find a feasible schedule even with relaxed constraints."],
            "diagnosticItems": [],
            "metadata": {"groupsHonored": True},
            "stats": {
                "totalUnits": len(units),
                "placedUnits": 0,
                "iterations": int(solver.NumBranches()) if solver else 0,
                "executionTimeMs": int(solver.WallTime() * 1000) if solver else 0,
                "phase": phase
            }
        }

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
