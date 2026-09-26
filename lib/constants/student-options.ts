export interface OptionItem {
  label: string;
  value: string;
}

export const OCCUPATION_OPTIONS: OptionItem[] = [
  { label: "Cultivator / Farmer", value: "Cultivator / Farmer" },
  { label: "Agricultural Labourer", value: "Agricultural Labourer" },
  { label: "Daily Wage Labourer", value: "Daily Wage Labourer" },
  { label: "Business / Self Employed", value: "Business / Self Employed" },
  { label: "Shopkeeper / Retailer", value: "Shopkeeper / Retailer" },
  { label: "Private Service", value: "Private Service" },
  { label: "Government Service", value: "Government Service" },
  { label: "Teacher / Educationist", value: "Teacher / Educationist" },
  { label: "Driver / Transport Worker", value: "Driver / Transport Worker" },
  { label: "Mason / Construction", value: "Mason / Construction" },
  { label: "Carpenter / Craftsman", value: "Carpenter / Craftsman" },
  { label: "Tailor / Garment Worker", value: "Tailor / Garment Worker" },
  { label: "Electrician / Plumber / Technician", value: "Electrician / Plumber / Technician" },
  { label: "Healthcare / Medical Worker", value: "Healthcare / Medical Worker" },
  { label: "Homemaker / Housewife", value: "Homemaker / Housewife" },
  { label: "Doctor / Engineer / Lawyer", value: "Doctor / Engineer / Lawyer" },
  { label: "Retired / Pensioner", value: "Retired / Pensioner" },
  { label: "Other", value: "Other" },
];

export const GUARDIAN_RELATIONSHIP_OPTIONS: OptionItem[] = [
  { label: "Father", value: "Father" },
  { label: "Mother", value: "Mother" },
  { label: "Uncle", value: "Uncle" },
  { label: "Grandfather", value: "Grandfather" },
  { label: "Grandmother", value: "Grandmother" },
  { label: "Other / Custom", value: "Custom" },
];

export const GUARDIAN_DEFAULT_PRESET_OPTIONS: OptionItem[] = [
  { label: "Father", value: "Father" },
  { label: "Mother", value: "Mother" },
  { label: "Uncle", value: "Uncle" },
  { label: "Grandfather", value: "Grandfather" },
  { label: "Grandmother", value: "Grandmother" },
  { label: "None (No Default)", value: "None" },
];

export const RELIGION_OPTIONS: OptionItem[] = [
  { label: "Islam", value: "Islam" },
  { label: "Hinduism", value: "Hinduism" },
  { label: "Christianity", value: "Christianity" },
  { label: "Sikhism", value: "Sikhism" },
  { label: "Buddhism", value: "Buddhism" },
  { label: "Jainism", value: "Jainism" },
  { label: "Other", value: "Other" },
];

export const RELIGION_DEFAULT_PRESET_OPTIONS: OptionItem[] = [
  { label: "Hinduism", value: "Hinduism" },
  { label: "Islam", value: "Islam" },
  { label: "Christianity", value: "Christianity" },
  { label: "Sikhism", value: "Sikhism" },
  { label: "Buddhism", value: "Buddhism" },
  { label: "Jainism", value: "Jainism" },
  { label: "None (No Default)", value: "None" },
];

export const MEDIUM_OF_INSTRUCTION_OPTIONS: OptionItem[] = [
  { label: "Bengali", value: "Bengali" },
  { label: "English", value: "English" },
  { label: "Hindi", value: "Hindi" },
  { label: "Urdu", value: "Urdu" },
  { label: "Nepali", value: "Nepali" },
  { label: "Other", value: "Other" },
];

export const MEDIUM_OF_INSTRUCTION_DEFAULT_PRESET_OPTIONS: OptionItem[] = [
  { label: "Bengali", value: "Bengali" },
  { label: "English", value: "English" },
  { label: "Hindi", value: "Hindi" },
  { label: "Urdu", value: "Urdu" },
  { label: "Nepali", value: "Nepali" },
  { label: "None (No Default)", value: "None" },
];

export const STUDENT_STATUS_OPTIONS: OptionItem[] = [
  { label: "Active", value: "Continuing" },
  { label: "New Admission", value: "New Admission" },
  { label: "Promoted (Pending)", value: "Promoted But Not Admitted" },
  { label: "Detained (Pending)", value: "Detained" },
  { label: "Supplementary", value: "Supplementary" },
  { label: "Compartmental", value: "Compartmental" },
  { label: "Not Admitted", value: "Not Admitted" },
  { label: "Sent Up MP", value: "Sent Up M.P." },
  { label: "10th Test Fail", value: "10th test fail" },
  { label: "Board Fail (C.C)", value: "exam fail - C.C" },
  { label: "Passed Out", value: "Passed Out" },
  { label: "Board Fail (CCHS)", value: "C.C.H.S." },
  { label: "TC Out", value: "TC Out" },
  { label: "Suspended", value: "Suspended" },
  { label: "Drop Out", value: "Drop Out" },
];

export const SEMESTER_OPTIONS: OptionItem[] = [
  { label: "Semester 1", value: "Sem 1" },
  { label: "Semester 2", value: "Sem 2" },
  { label: "Semester 3", value: "Sem 3" },
  { label: "Semester 4", value: "Sem 4" },
];
