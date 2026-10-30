import { ExamAllocation, PrintDocType } from "@/lib/ems/types";


export interface EmsPrintStudioProps {
  allocation: ExamAllocation;
  defaultRoomId?: string;
  defaultDoc?: PrintDocType;
  onBackToStep4?: () => void;
  onViewBlueprint?: () => void;
  onClose?: () => void;
  isDialog?: boolean;
}
