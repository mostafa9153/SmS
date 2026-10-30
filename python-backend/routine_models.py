from pydantic import BaseModel
from typing import List, Dict, Optional, Literal

DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

def _day_name(day_val):
    return DAY_LABELS[day_val] if 0 <= day_val < len(DAY_LABELS) else str(day_val)

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
