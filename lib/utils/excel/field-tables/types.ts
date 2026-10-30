import type { Student } from "@/lib/types";

export interface FieldDefinition {
  key: keyof Student;
  label: string;
  category: string;
  icon?: string;
  aliases: string[];
  required?: boolean;
}
