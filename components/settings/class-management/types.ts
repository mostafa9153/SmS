


export interface ClassItem {
  id: string;
  name: string;
  code: string;
  sections: string[];
  stream?: string;
  streamSections?: Record<string, string[]>;
  classTeacher?: string;
  sectionTeachers?: Record<string, string>;
  roomNo?: string;
  capacity?: number;
  isAutoPass: boolean;
  status: "Active" | "Inactive";
}
