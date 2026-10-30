/** Columns a teacher may change on their own profile. Pay, designation, status and IDs stay with admins. */
const SELF_EDITABLE = new Set([
  "full_name", "profile_picture_url", "caste", "mobile", "landline", "email", "dob", "gender",
  "father_name", "mother_name", "marital_status", "blood_group", "aadhaar_no", "pan_no", "differently_abled",
  "bank_details", "personal_meta", "present_address", "permanent_address",
]);

export function pickSelfEditable(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([key]) => SELF_EDITABLE.has(key)));
}
