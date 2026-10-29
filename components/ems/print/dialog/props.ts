import { ExamAllocation, PrintDocType } from "@/lib/ems/types";


export interface EmsPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ExamAllocation;
  defaultRoomId?: string;
  defaultDoc?: PrintDocType;
}
