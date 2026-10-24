"""Smoke test for Subject Groups (parallel elective blocks).

Scenarios:
  1. Three sections of IX share a 3rd-language group (Arabic | Sanskrit),
     pooled across sections, 2 periods/week. Expect: every member section
     has Arabic & Sanskrit on the SAME (day, period) cells, and the two
     teachers are never double-booked.
  2. A double-period group variant: consecutive-slot placement.
  3. A group with no common free slot across its teachers' availability
     must fail with a structured diagnostic BEFORE the solver runs.
"""

import sys
import json

from main import generate_schedule, GenerateRoutineRequest


def _base_settings():
    return {
        "workingDays": [1, 2, 3, 4, 5],
        "periodsPerDay": 8,
        "halfDays": [5],
        "halfDayPeriods": 4,
        "breaks": [4],
        "tchDailyMax": 6,
        "tchConsecMax": 3,
    }


def _teacher(tid, name, short, avail=None):
    return {
        "id": tid,
        "name": name,
        "shortName": short,
        "maxPeriods": 30,
        "availableSlots": avail or {},
    }


def _run(payload):
    req = GenerateRoutineRequest(**payload)
    return generate_schedule(req)


def test_pooled_group_single_period():
    payload = {
        "settings": _base_settings(),
        "classes": [
            {"id": "c_A", "className": "Class IX", "section": "A", "dailyPeriods": 8},
            {"id": "c_B", "className": "Class IX", "section": "B", "dailyPeriods": 8},
            {"id": "c_C", "className": "Class IX", "section": "C", "dailyPeriods": 8},
        ],
        "teachers": [
            _teacher("t_ara", "Arabic Sir", "AR"),
            _teacher("t_san", "Sanskrit Sir", "SA"),
            _teacher("t_mat", "Math Sir", "MA"),
        ],
        "subjects": [
            {"id": "s_ara", "name": "Arabic", "isHard": False, "isLab": False,
             "timePref": "any", "allowMultiplePerDay": False},
            {"id": "s_san", "name": "Sanskrit", "isHard": False, "isLab": False,
             "timePref": "any", "allowMultiplePerDay": False},
            {"id": "s_mat", "name": "Math", "isHard": True, "isLab": False,
             "timePref": "morning", "allowMultiplePerDay": False},
        ],
        # One ordinary subject per section so the solver has non-group work too.
        "assignments": [
            {"id": "aA", "classId": "c_A", "subjectId": "s_mat", "teacherId": "t_mat", "periodsPerWeek": 2},
            {"id": "aB", "classId": "c_B", "subjectId": "s_mat", "teacherId": "t_mat", "periodsPerWeek": 2},
            {"id": "aC", "classId": "c_C", "subjectId": "s_mat", "teacherId": "t_mat", "periodsPerWeek": 2},
        ],
        "rooms": [],
        "groups": [
            {
                "gid": "g_lang",
                "name": "3rd Language",
                "classIds": ["c_A", "c_B", "c_C"],
                "periodsPerWeek": 2,
                "periodSize": 1,
                "timePref": "any",
                "maxPerDay": 1,
                "options": [
                    {"subjectId": "s_ara", "teacherId": "t_ara"},
                    {"subjectId": "s_san", "teacherId": "t_san"},
                ],
            }
        ],
    }

    res = _run(payload)
    assert res.get("success"), f"solver failed: {res.get('diagnostics')}"
    assert res["metadata"]["groupsHonored"] is True

    grid = res["grid"]
    # Find all group cells and verify same (d, p) across all 3 sections.
    def group_slots(cid):
        slots = []
        for d_i, row in enumerate(grid[cid]):
            for p_i, cell in enumerate(row):
                if cell and cell.get("gid") == "g_lang":
                    slots.append((d_i, p_i))
        return sorted(slots)

    sA = group_slots("c_A")
    sB = group_slots("c_B")
    sC = group_slots("c_C")
    assert len(sA) == 2, f"c_A: {sA}"
    assert sA == sB == sC, f"group slots mismatch: A={sA} B={sB} C={sC}"

    # Each group cell has >=2 options.
    for d_i, p_i in sA:
        cell_a = grid["c_A"][d_i][p_i]
        assert cell_a and cell_a.get("opts") and len(cell_a["opts"]) == 2
        tids_in_cell = {o["tid"] for o in cell_a["opts"]}
        assert tids_in_cell == {"t_ara", "t_san"}

    # Neither teacher appears in any OTHER slot of these sections at the
    # same (d, p). (AddAtMostOne for teacher occupancy guards this, but
    # assert too.)
    for cid in ["c_A", "c_B", "c_C"]:
        for d_i, row in enumerate(grid[cid]):
            for p_i, cell in enumerate(row):
                if not cell:
                    continue
                if cell.get("gid") == "g_lang":
                    continue
                assert cell.get("tid") not in {"t_ara", "t_san"}, \
                    f"non-group cell at {cid} {d_i},{p_i} uses an option teacher"
    print("test_pooled_group_single_period: OK")


def test_group_double_period_consecutive():
    payload = {
        "settings": _base_settings(),
        "classes": [
            {"id": "c_A", "className": "Class XI", "section": "A (Science)", "dailyPeriods": 8},
        ],
        "teachers": [
            _teacher("t_phy", "Physics Sir", "PH"),
            _teacher("t_bio", "Bio Sir", "BI"),
        ],
        "subjects": [
            {"id": "s_phy", "name": "Physics", "isHard": True, "isLab": True,
             "timePref": "any", "allowMultiplePerDay": False},
            {"id": "s_bio", "name": "Biology", "isHard": False, "isLab": True,
             "timePref": "any", "allowMultiplePerDay": False},
        ],
        "assignments": [],
        "rooms": [],
        "groups": [
            {
                "gid": "g_lab",
                "name": "XI Lab",
                "classIds": ["c_A"],
                "periodsPerWeek": 2,
                "periodSize": 2,
                "timePref": "any",
                "options": [
                    {"subjectId": "s_phy", "teacherId": "t_phy"},
                    {"subjectId": "s_bio", "teacherId": "t_bio"},
                ],
            }
        ],
    }
    res = _run(payload)
    assert res.get("success"), f"solver failed: {res.get('diagnostics')}"
    grid = res["grid"]["c_A"]
    starts = []
    for d_i, row in enumerate(grid):
        for p_i, cell in enumerate(row):
            if cell and cell.get("gid") == "g_lab" and cell.get("half") == "start":
                starts.append((d_i, p_i))
                nxt = grid[d_i][p_i + 1]
                assert nxt and nxt.get("gid") == "g_lab" and nxt.get("half") == "end", \
                    f"double period not consecutive at {d_i},{p_i}"
    assert len(starts) == 1, f"expected one double-period block, got {len(starts)}"
    print("test_group_double_period_consecutive: OK")


def test_group_no_common_free_slot_fails_cleanly():
    # Two teachers whose availability does not intersect at all.
    payload = {
        "settings": _base_settings(),
        "classes": [
            {"id": "c_A", "className": "Class IX", "section": "A", "dailyPeriods": 8},
        ],
        "teachers": [
            _teacher("t_x", "X", "X", avail={"1": [1, 2, 3], "2": [1, 2, 3], "3": [1, 2, 3], "4": [1, 2, 3], "5": [1, 2]}),
            _teacher("t_y", "Y", "Y", avail={"1": [5, 6, 7], "2": [5, 6, 7], "3": [5, 6, 7], "4": [5, 6, 7], "5": [3, 4]}),
        ],
        "subjects": [
            {"id": "s_x", "name": "X Lang", "isHard": False, "isLab": False,
             "timePref": "any", "allowMultiplePerDay": False},
            {"id": "s_y", "name": "Y Lang", "isHard": False, "isLab": False,
             "timePref": "any", "allowMultiplePerDay": False},
        ],
        "assignments": [],
        "rooms": [],
        "groups": [
            {
                "gid": "g_bad",
                "name": "Impossible",
                "classIds": ["c_A"],
                "periodsPerWeek": 2,
                "periodSize": 1,
                "timePref": "any",
                "options": [
                    {"subjectId": "s_x", "teacherId": "t_x"},
                    {"subjectId": "s_y", "teacherId": "t_y"},
                ],
            }
        ],
    }
    res = _run(payload)
    assert res.get("success") is False
    items = res.get("diagnosticItems") or []
    assert len(items) >= 1, f"expected a pre-flight diagnostic, got {res}"
    assert any("Impossible" in d.get("title", "") for d in items), items
    print("test_group_no_common_free_slot_fails_cleanly: OK")


def main():
    test_pooled_group_single_period()
    test_group_double_period_consecutive()
    test_group_no_common_free_slot_fails_cleanly()
    print("\nAll group tests passed.")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print(f"FAIL: {e}", file=sys.stderr)
        sys.exit(1)
