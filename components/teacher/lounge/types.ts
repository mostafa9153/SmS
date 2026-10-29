


export interface TeacherChatMessage {
  id: string;
  user_id: string;
  teacher_id?: string | null;
  sender_name: string;
  message: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FacultyMember {
  id: string;
  name: string;
  designation?: string;
}

export interface TeacherLoungeDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  currentUser: any;
  currentProfile?: any;
  currentStaff?: any;
  onUnreadChange?: (count: number) => void;
}
