from ortools.sat.python import cp_model
from routine_models import GenerateRoutineRequest
from routine_plan import COVERAGE_WEIGHT, PHASE_TIME_LIMIT, SOLVER_SEED, SOLVER_WORKERS, class_teacher_groups, coverage_targets, effective_tiffin_mins, teacher_day_caps

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
