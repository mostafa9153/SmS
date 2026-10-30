import { Student } from "@/lib/types";


export interface StudentAddEditFormProps {
  aiExtractedData?: Record<string, any>;
  initialData?: Record<string, any>;
  onSuccess?: (student: Student) => void;
  onSubmitData?: (formData: any) => void;
  submitButtonText?: string;
  isEmbedded?: boolean;
}
