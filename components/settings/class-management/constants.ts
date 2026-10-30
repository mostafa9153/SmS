
import { ClassItem } from "@/components/settings/class-management/types";

export const DEFAULT_CLASSES: ClassItem[] = [
  { id: "c-5", name: "Class V", code: "V", sections: ["A", "B"], classTeacher: "S. Roy", sectionTeachers: { "A": "S. Roy", "Section A": "S. Roy" }, roomNo: "Room 101", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-6", name: "Class VI", code: "VI", sections: ["A", "B"], classTeacher: "P. Mondal", sectionTeachers: { "A": "P. Mondal", "Section A": "P. Mondal" }, roomNo: "Room 102", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-7", name: "Class VII", code: "VII", sections: ["A", "B"], classTeacher: "R. Mukherjee", sectionTeachers: { "A": "R. Mukherjee", "Section A": "R. Mukherjee" }, roomNo: "Room 103", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-8", name: "Class VIII", code: "VIII", sections: ["A", "B"], classTeacher: "K. Das", sectionTeachers: { "A": "K. Das", "Section A": "K. Das" }, roomNo: "Room 104", capacity: 120, isAutoPass: true, status: "Active" },
  { id: "c-9", name: "Class IX", code: "IX", sections: ["A", "B"], classTeacher: "T. Banerjee", sectionTeachers: { "A": "T. Banerjee", "Section A": "T. Banerjee" }, roomNo: "Room 201", capacity: 130, isAutoPass: false, status: "Active" },
  { id: "c-10", name: "Class X", code: "X", sections: ["A", "B"], classTeacher: "A. Halder", sectionTeachers: { "A": "A. Halder", "Section A": "A. Halder" }, roomNo: "Room 202", capacity: 130, isAutoPass: false, status: "Active" },
  { id: "c-11", name: "Class XI", code: "XI", sections: ["A", "B"], stream: "Arts", streamSections: { "Arts": ["A", "B"] }, classTeacher: "B. Naskar", sectionTeachers: { "Arts - A": "B. Naskar", "A": "B. Naskar" }, roomNo: "Room 301", capacity: 140, isAutoPass: false, status: "Active" },
  { id: "c-12", name: "Class XII", code: "XII", sections: ["A", "B"], stream: "Arts", streamSections: { "Arts": ["A", "B"] }, classTeacher: "S. Bhattacharya", sectionTeachers: { "Arts - A": "S. Bhattacharya", "A": "S. Bhattacharya" }, roomNo: "Room 302", capacity: 140, isAutoPass: false, status: "Active" },
];
