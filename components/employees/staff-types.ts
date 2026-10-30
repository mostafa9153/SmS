export interface StaffProfile {
  id: string;
  unique_id: string;
  full_name: string;
  employee_type: "TEACHING" | "NON_TEACHING";
  designation: string;
  caste?: string;
  mobile?: string;
  dob?: string;
  profile_picture_url?: string | null;
  status: "ACTIVE" | "INACTIVE" | "RETIRED" | "SUSPENDED";
}
