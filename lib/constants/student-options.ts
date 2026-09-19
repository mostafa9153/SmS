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
