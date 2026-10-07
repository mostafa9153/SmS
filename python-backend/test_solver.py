import json

payload = {
    "settings": {
        "workingDays": [1, 2, 3, 4, 5],
        "periodsPerDay": 8,
        "halfDays": [5],
        "halfDayPeriods": 3,
        "breaks": [4],
        "tchDailyMax": 6,
        "tchConsecMax": 2
    },
    "classes": [
        {"id": "c1", "className": "Class 10", "section": "A", "dailyPeriods": 8}
    ],
    "teachers": [
        {"id": "t1", "name": "Teacher A", "shortName": "TA", "maxPeriods": 30, "availableSlots": {}},
        {"id": "t2", "name": "Teacher B", "shortName": "TB", "maxPeriods": 30, "availableSlots": {}}
    ],
    "subjects": [
        {"id": "s1", "name": "Math", "isHard": True, "isLab": False, "timePref": "morning", "allowMultiplePerDay": False},
        {"id": "s2", "name": "Physics", "isHard": False, "isLab": True, "timePref": "any", "allowMultiplePerDay": False}
    ],
    "assignments": [
        {"id": "a1", "classId": "c1", "subjectId": "s1", "teacherId": "t1", "periodsPerWeek": 5},
        {"id": "a2", "classId": "c1", "subjectId": "s2", "teacherId": "t2", "periodsPerWeek": 4}
    ],
    "rooms": []
}

from main import generate_schedule, GenerateRoutineRequest

request = GenerateRoutineRequest(**payload)
response = generate_schedule(request)
print(json.dumps(response, indent=2))

