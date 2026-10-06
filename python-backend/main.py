import time
import math
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal, Any
from ortools.sat.python import cp_model
from concurrent.futures import ThreadPoolExecutor

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

class GenerateRoutineRequest(BaseModel):
    settings: RoutineSettings
    classes: List[RoutineClass]
    teachers: List[RoutineTeacher]
    subjects: List[RoutineSubject]
    assignments: List[RoutineAssignment]
    rooms: Optional[List[RoutineRoom]] = []

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
    for a in request.assignments:
        teacher_load_map[a.teacherId] = teacher_load_map.get(a.teacherId, 0) + a.periodsPerWeek
        
    model = cp_model.CpModel()
    x = {}
    
    class_occupancy = {c.id: [[[] for _ in range(P)] for _ in range(D)] for c in request.classes}
    teacher_occupancy = {t.id: [[[] for _ in range(P)] for _ in range(D)] for t in request.teachers}
    room_occupancy = {r.id: [[[] for _ in range(P)] for _ in range(D)] for r in (request.rooms or [])}
    
    for u in units:
        u_id = u["uid"]
        cid = u["cid"]
        tid = u["tid"]
        rid = u["rid"]
        sz = u["sz"]
        
        c_obj = classes_map[cid]
        c_daily = c_obj.dailyPeriods if c_obj.dailyPeriods else P
        t_obj = teachers_map[tid]
        
        possible_placements = []
        
        for d_idx, day_val in enumerate(working_days):
            is_half = day_val in half_days
            day_max_p = min(settings.halfDayPeriods, c_daily) if is_half else c_daily
            
            t_avail_list = t_obj.availableSlots.get(str(day_val), list(range(1, P+1)))
            
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
                    if p_num not in t_avail_list or p_num2 not in t_avail_list:
                        continue
                        
                    if not is_relaxed:
                        if u["timePref"] == "morning" and p_num2 > break_p:
                            continue
                        if u["timePref"] == "afternoon" and p_num <= break_p:
                            continue
                else:
                    if p_num not in t_avail_list:
                        continue
                        
                    if not is_relaxed:
                        if u["timePref"] == "morning" and p_num > break_p:
                            continue
                        if u["timePref"] == "afternoon" and p_num <= break_p:
                            continue
                        
                var = model.NewBoolVar(f"x_{u_id}_{d_idx}_{p_idx}")
                x[(u_id, d_idx, p_idx)] = var
                possible_placements.append(var)
                
                class_occupancy[cid][d_idx][p_idx].append(var)
                teacher_occupancy[tid][d_idx][p_idx].append(var)
                if rid: room_occupancy[rid][d_idx][p_idx].append(var)
                
                if sz == 2:
                    class_occupancy[cid][d_idx][p_idx+1].append(var)
                    teacher_occupancy[tid][d_idx][p_idx+1].append(var)
                    if rid: room_occupancy[rid][d_idx][p_idx+1].append(var)
                    
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
        c_units = [u for u in units if u["cid"] == c_id]
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
        t_units = [u for u in units if u["tid"] == t_id]
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
    
    # Hard subjects preference (earlier)
    for u in units:
        if u["hard"]:
            for d in range(D):
                for p in range(P):
                    if (u["uid"], d, p) in x:
                        obj_vars.append(x[(u["uid"], d, p)] * p * 10)
                        
    # Spreading Heuristic: Penalize multiple periods of the same subject on the same day
    for c_id in class_occupancy:
        c_units = [u for u in units if u["cid"] == c_id]
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
    ct_groups = {}
    for u in units:
        if u.get("isClassTeacherUnit") and u.get("targetFirstPeriods", 0) > 0:
            key = (u["cid"], u["tid"])
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
    solver.parameters.max_time_in_seconds = 10.0
    status = solver.Solve(model)
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return solver, x
    return None, None


def generate_schedule(request: GenerateRoutineRequest):
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
    
    units = []
    unit_counter = 0
    
    for a in request.assignments:
        subj = subjects_map.get(a.subjectId)
        if not subj: continue
        
        tch = teachers_map.get(a.teacherId)
        cls = classes_map.get(a.classId)
        
        is_ct = False
        target_first_periods = 0
        if tch and cls and tch.classTeacherOf:
            tch_ct_lower = tch.classTeacherOf.lower()
            cls_name_lower = cls.className.lower() if cls.className else ""
            cls_sec = cls.section if cls.section and cls.section != "ALL" else ""
            full_class_label = f"{cls_name_lower} - {cls_sec.lower()}" if cls_sec else cls_name_lower
            
            if tch_ct_lower == full_class_label or tch_ct_lower == cls_name_lower or (cls_name_lower and cls_name_lower in tch_ct_lower):
                is_ct = True
                
        target_first_periods = tch.classTeacherFirstPeriods if is_ct and tch.classTeacherFirstPeriods is not None else (3 if is_ct else 0)
        
        class_subj_total = sum(
            ass.periodsPerWeek for ass in request.assignments 
            if ass.classId == a.classId and ass.subjectId == a.subjectId
        )
        
        auto_max_daily = math.ceil(class_subj_total / max(1, D))
        if len(half_days) > 0 and class_subj_total > full_days_count:
            auto_max_daily = max(2, auto_max_daily)
            
        max_daily = max(auto_max_daily, (subj.maxPerDay or 2) if subj.allowMultiplePerDay else auto_max_daily)
        allow_multiple = subj.allowMultiplePerDay or auto_max_daily > 1
        
        rem = a.periodsPerWeek
        if subj.isLab:
            while rem >= 2:
                units.append({
                    "uid": unit_counter,
                    "cid": a.classId,
                    "sid": a.subjectId,
                    "tid": a.teacherId,
                    "rid": a.roomId,
                    "sz": 2,
                    "hard": subj.isHard,
                    "multi": allow_multiple,
                    "maxPerDay": max_daily,
                    "timePref": subj.timePref,
                    "isClassTeacherUnit": is_ct,
                    "targetFirstPeriods": target_first_periods,
                })
                unit_counter += 1
                rem -= 2
            if rem == 1:
                units.append({
                    "uid": unit_counter,
                    "cid": a.classId,
                    "sid": a.subjectId,
                    "tid": a.teacherId,
                    "rid": a.roomId,
                    "sz": 1,
                    "hard": subj.isHard,
                    "multi": allow_multiple,
                    "maxPerDay": max_daily,
                    "timePref": subj.timePref,
                    "isClassTeacherUnit": is_ct,
                    "targetFirstPeriods": target_first_periods,
                })
                unit_counter += 1
        else:
            for _ in range(rem):
                units.append({
                    "uid": unit_counter,
                    "cid": a.classId,
                    "sid": a.subjectId,
                    "tid": a.teacherId,
                    "rid": a.roomId,
                    "sz": 1,
                    "hard": subj.isHard,
                    "multi": allow_multiple,
                    "maxPerDay": max_daily,
                    "timePref": subj.timePref,
                    "isClassTeacherUnit": is_ct,
                    "targetFirstPeriods": target_first_periods,
                })
                unit_counter += 1
                
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
                        cid = u["cid"]
                        is_lab = u["sz"] == 2
                        cell = {
                            "sid": u["sid"],
                            "tid": u["tid"],
                            "rid": u["rid"],
                            "sz": u["sz"],
                            "lab": is_lab,
                            "uid": u_id,
                        }
                        if is_lab:
                            cell["half"] = "start"
                            grid[cid][d][p] = cell
                            cell2 = dict(cell)
                            cell2["half"] = "end"
                            grid[cid][d][p+1] = cell2
                        else:
                            grid[cid][d][p] = cell
                        break
                        
        active_relaxations = ["Soft time preferences", "Fatigue bounds relaxed"] if phase == 2 else []
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
