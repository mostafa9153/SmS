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


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"{t.__name__}: OK")
    print("\nAll engine tests passed.")
