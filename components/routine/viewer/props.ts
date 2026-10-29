import { GeneratedRoutine, RoutineSettings, RoutineClass, RoutineTeacher, RoutineSubject, RoutineRoom } from "@/lib/routine/types";
import { ViewMode } from "@/components/routine/viewer/types";

export interface RoutineViewerTabProps {
  routine: GeneratedRoutine | null;
  settings: RoutineSettings;
  classes: RoutineClass[];
  teachers: RoutineTeacher[];
  subjects: RoutineSubject[];
  rooms: RoutineRoom[];
  initialViewMode?: ViewMode;
  initialTeacherId?: string;
  initialFullscreen?: boolean;
  onExitFullscreen?: () => void;
  hideViewModeSelector?: boolean;
}
