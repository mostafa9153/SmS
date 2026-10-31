"""Engine invariants. Run: python test_engine.py (from python-backend, with the venv)."""
import copy

import main
from main import (
    GenerateRoutineRequest,
    ct_matches,
    max_day_with_consec,
    generate_schedule,
    RoutineClass,
)

BASE_SETTINGS = dict(
    workingDays=[0, 1, 2, 3, 4, 5],
    periodsPerDay=7,
    halfDays=[5],
    halfDayPeriods=4,
    breaks=[4],
    tchDailyMax=5,
    tchConsecMax=3,
    tchMinBefore=0,
    tchMinAfter=0,
)


def make_request(n_classes=2, load_per_class=10, settings=None, pref="any", teachers=None):
    s = dict(BASE_SETTINGS)
    s.update(settings or {})
    classes = [{"id": f"c{i}", "className": "Class VII", "section": chr(65 + i)} for i in range(n_classes)]
    subjects = [{
        "id": "s1", "name": "Math", "className": "Class VII", "isHard": False, "isLab": False,
        "timePref": pref, "allowMultiplePerDay": False, "periodsPerWeek": load_per_class,
    }]
    teachers = teachers or [{
        "id": "t1", "name": "Teacher One", "shortName": "T1", "maxPeriods": 40,
        "availableSlots": {str(d): list(range(1, 8)) for d in range(6)},
    }]
    assignments = [
        {"id": f"a{i}", "classId": c["id"], "subjectId": "s1", "teacherId": teachers[0]["id"], "periodsPerWeek": load_per_class}
        for i, c in enumerate(classes)
    ]
    return GenerateRoutineRequest(settings=s, classes=classes, teachers=teachers, subjects=subjects, assignments=assignments)


def test_class_teacher_matching():
    cls = RoutineClass(id="x", className="Class VII", section="A")
    assert ct_matches("Class VII - Section A", cls)
    assert not ct_matches("Class VII - Section B", cls)
    assert not ct_matches("Class V - Section A", cls)  # old substring bug: 'class v' in 'class vii'
    assert not ct_matches("Class VIII - Section A", cls)
    hs = RoutineClass(id="y", className="Class XI", section="A (Arts)")
    assert ct_matches("Class XI - Section A", hs)
    assert not ct_matches("Class X - Section A", hs)


def test_consecutive_capacity():
    full = set(range(1, 8))
    # periods 1-4 | tiffin | 5-7, at most 1 in a row -> 2 + 2
    assert max_day_with_consec(full, 7, 1, [4]) == 4
    assert max_day_with_consec(full, 7, 2, [4]) == 5
    assert max_day_with_consec(full, 4, 1, [4]) == 2  # half day


def test_strict_when_possible():
    r = generate_schedule(make_request())
    assert r["success"] and r["metadata"]["phase"] == 1 and r["metadata"]["violations"] == 0


def test_impossible_consecutive_is_explained_not_hidden():
    # one teacher, 30 periods, but at most 1 in a row allows only 22 a week
    req = make_request(n_classes=3, load_per_class=10, settings={"tchConsecMax": 1})
    d = generate_schedule(req, diagnose_only=True)
    assert any(i["type"] == "consecutive_fatigue" for i in d["reasons"]), d


def test_time_pref_counting_proof():
    # 14 afternoon-only periods but only 3 afternoon periods x 5 full days = 15 slots minus nothing... use 20
    req = make_request(n_classes=2, load_per_class=10, pref="afternoon")
    d = generate_schedule(req, diagnose_only=True)
    assert any(i["type"] == "time_pref_saturation" for i in d["reasons"]), d


def test_tiffin_minimum_adapts_to_low_load():
    # load 10 = three classes of one subject at most 1 per day -> max 3 per day; 2 before + 1 after per day
    # cannot add up to 10, so the engine lowers that teacher's minimum instead of failing.
    teachers = [{
        "id": "t1", "name": "Low Load", "shortName": "LL", "maxPeriods": 40,
        "availableSlots": {str(d): list(range(1, 8)) for d in range(6)},
    }]
    req = make_request(n_classes=3, load_per_class=3, settings={"tchMinBefore": 2, "tchMinAfter": 1}, teachers=teachers)
    # 9 periods fit 3 days x 3; make it 10 by adding one extra period on the first class
    req.assignments[0].periodsPerWeek = 4
    req.subjects[0].periodsPerWeek = 4
    r = generate_schedule(req)
    assert r["success"], r
    assert r["metadata"]["phase"] == 1, r["metadata"]["attempts"]
    assert any("tiffin minimum lowered" in a for a in r["metadata"]["adjustments"]), r["metadata"]["adjustments"]


def _teaching_days(r, tid):
    days = set()
    for row in r["grid"].values():
        for d, day in enumerate(row):
            for cell in day:
                if cell and cell.get("tid") == tid:
                    days.add(d)
    return days


def test_available_weekdays_all_get_classes():
    # load 20 -> minimum 3 per available weekday (20 // 6); Saturday may stay empty
    r = generate_schedule(make_request(n_classes=2, load_per_class=10))
    assert r["success"] and r["metadata"]["violations"] == 0, r["metadata"]
    assert {0, 1, 2, 3, 4} <= _teaching_days(r, "t1")


def test_low_load_spreads_over_distinct_days():
    # load 3 cannot cover 5 weekdays; it must at least use 3 different days
    r = generate_schedule(make_request(n_classes=1, load_per_class=3))
    assert r["success"], r
    assert len(_teaching_days(r, "t1")) == 3


def test_unavailable_day_is_not_forced():
    teachers = [{
        "id": "t1", "name": "Teacher One", "shortName": "T1", "maxPeriods": 40,
        "availableSlots": {str(d): ([] if d == 2 else list(range(1, 8))) for d in range(6)},
    }]
    r = generate_schedule(make_request(n_classes=2, load_per_class=10, teachers=teachers))
    assert r["success"], r
    assert 2 not in _teaching_days(r, "t1")
    assert not any("Wed" in d for rel in r["metadata"]["relaxations"] for d in rel["details"])


def test_class_teacher_first_period_is_hard():
    # CT of Class VII-A wants 3 first periods a week; the strict phase must deliver them
    req = make_request(n_classes=1, load_per_class=6)
    req.teachers[0].classTeacherOf = "Class VII - Section A"
    req.teachers[0].classTeacherFirstPeriods = 3
    r = generate_schedule(req)
    assert r["success"] and r["metadata"]["phase"] == 1, r["metadata"]
    firsts = sum(1 for d in r["grid"]["c0"] if d[0] and d[0].get("tid") == "t1")
    assert firsts >= 3, firsts


def test_custom_subject_slots_are_hard():
    # Math may use only Mon/Wed/Fri periods 1-3; 6 periods fit exactly at 2 per day
    allowed = {"0": [1, 2, 3], "2": [1, 2, 3], "4": [1, 2, 3], "1": [], "3": [], "5": []}
    req = make_request(n_classes=1, load_per_class=6)
    req.subjects[0].allowedSlots = allowed
    r = generate_schedule(req)
    assert r["success"], r
    for d, day in enumerate(r["grid"]["c0"]):
        for p, cell in enumerate(day):
            if cell:
                assert (p + 1) in allowed[str(d)], (d, p)


def test_custom_subject_slots_too_small_is_explained():
    req = make_request(n_classes=1, load_per_class=6)
    req.subjects[0].allowedSlots = {"0": [1], "1": [1], "2": [], "3": [], "4": [], "5": []}
    d = generate_schedule(req, diagnose_only=True)
    assert any(i["type"] == "subject_slot_restriction" for i in d["reasons"]), d


def test_custom_slots_shared_by_two_sections_of_one_teacher():
    # each section fits on its own, but one teacher cannot teach both in the same 4 slots
    req = make_request(n_classes=2, load_per_class=3)
    req.subjects[0].allowedSlots = {"0": [1, 2], "1": [1, 2], "2": [], "3": [], "4": [], "5": []}
    d = generate_schedule(req, diagnose_only=True)
    assert any(i["type"] == "subject_slot_restriction" and i.get("teacherName") for i in d["reasons"]), d


def test_custom_slots_split_teachers_are_not_intersected():
    # Two teachers share one subject in one class on different days: no false impossibility
    days = lambda ds: {str(d): (list(range(1, 8)) if d in ds else []) for d in range(6)}
    teachers = [
        {"id": "t1", "name": "Teacher One", "shortName": "T1", "maxPeriods": 40, "availableSlots": days({0, 1})},
        {"id": "t2", "name": "Teacher Two", "shortName": "T2", "maxPeriods": 40, "availableSlots": days({2, 3})},
    ]
    req = make_request(n_classes=1, load_per_class=3, teachers=teachers)
    req.assignments.append(req.assignments[0].model_copy(update={"id": "a1", "teacherId": "t2"}))
    req.subjects[0].allowedSlots = {str(d): [1, 2, 3] for d in range(4)}
    req.subjects[0].allowMultiplePerDay = True
    req.subjects[0].maxPerDay = 2
    d = generate_schedule(req, diagnose_only=True)
    assert not any(i["type"] == "subject_slot_restriction" for i in d["reasons"]), d


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"{t.__name__}: OK")
    print("\nAll engine tests passed.")
