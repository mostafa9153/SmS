import { z } from "zod";

// Shared by the admission form (client) and the public admission API (server).
export const admissionFormSchema = z.object({
  // A. Student Demographics
  studentName: z.string().min(1, "Student Name is required"),
  studentNameBengali: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required").refine((v) => {
    if (!v || v.trim() === "") return false;
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s)) return true;
    const d = new Date(s);
    return !isNaN(d.getTime());
  }, "Valid date of birth required"),
  gender: z.string().min(1, "Gender is required"),
  motherTongue: z.string().min(1, "Mother tongue is required"),
  religion: z.string().min(1, "Religion is required"),
  indianNationality: z.coerce.boolean().optional(),
  bloodGroup: z.string().min(1, "Blood group is required"),
  heightCm: z.coerce.number().optional().nullable(),
  weightKg: z.coerce.number().optional().nullable(),
  birthRegistrationNo: z.string().optional(),
  identificationMark: z.string().optional(),

  // B. Social & Eligibility Categories
  socialCategory: z.string().min(1, "Social Category is required"),
  casteCertificateNo: z.string().optional(),
  minorityGroup: z.string().min(1, "Minority status is required"),
  isAay: z.coerce.boolean().optional(),

  // C. CWSN Profile
  isCwsn: z.coerce.boolean().optional(),
  impairmentType: z.string().optional(),
  hasDisabilityCertificate: z.coerce.boolean().optional(),
  disabilityCertificateNo: z.string().optional(),
  disabilityPercentage: z.coerce.number().optional().nullable(),
  sldType: z.string().optional(),

  // D. Family & Contacts
  fatherName: z.string().min(1, "Father's Name is required"),
  fatherNameBengali: z.string().optional(),
  fatherOccupation: z.string().min(1, "Father's occupation is required"),
  motherName: z.string().min(1, "Mother's Name is required"),
  motherNameBengali: z.string().optional(),
  motherOccupation: z.string().min(1, "Mother's occupation is required"),
  guardianName: z.string().min(1, "Guardian's Name is required"),
  relationshipWithGuardian: z.string().min(1, "Relationship with guardian is required"),
  guardianOccupation: z.string().min(1, "Guardian's occupation is required"),
  guardianQualification: z.string().min(1, "Guardian's qualification is required"),
  annualFamilyIncome: z.coerce.number().optional().nullable(),

  // Contact Details
  studentContact: z.string().min(1, "Mobile Number is required").refine((v) => {
    const digits = (v || "").replace(/\D/g, "");
    return digits.length === 10;
  }, "10-digit mobile number required"),
  altMobile: z.string().optional().refine((v) => {
    if (!v || v.trim() === "") return true;
    const digits = v.replace(/\D/g, "");
    return digits.length === 10;
  }, "10-digit mobile number required"),
  email: z.string().optional().refine((v) => !v || v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Invalid email address"),

  // Present Address
  presentVillage: z.string().min(1, "Village / Street is required"),
  presentPanchayat: z.string().min(1, "Gram Panchayat is required"),
  presentBlock: z.string().min(1, "Block / Municipality is required"),
  presentPostOffice: z.string().min(1, "Post Office is required"),
  presentPoliceStation: z.string().min(1, "Police Station is required"),
  presentDistrict: z.string().min(1, "District is required"),
  presentPincode: z.string().min(1, "PIN Code is required").refine((v) => {
    const digits = (v || "").replace(/\D/g, "");
    return digits.length === 6;
  }, "6-digit PIN required"),

  // Permanent Address
  sameAsPresentAddress: z.coerce.boolean().optional(),
  permVillage: z.string().optional(),
  permPanchayat: z.string().optional(),
  permBlock: z.string().optional(),
  permPostOffice: z.string().optional(),
  permPoliceStation: z.string().optional(),
  permDistrict: z.string().optional(),
  permPincode: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{6}$/.test(v.trim()), "6-digit PIN required"),

  // E. Enrolment & Academic Details
  presentClass: z.string().min(1, "Present Class is required"),
  presentSection: z.string().optional(),
  presentRoll: z.coerce.number().optional().nullable(),
  admissionType: z.string().min(1, "Admission Type is required"),
  mediumOfInstruction: z.string().min(1, "Medium of Instruction is required"),

  // Class XI Specific Fields
  academicStream: z.string().optional(),
  mandatorySubjects: z.string().optional(),
  additionalSubjects: z.string().optional(),
  class10BoardRegNo: z.string().optional(),
  class10BoardRollNo: z.string().optional(),
  bengaliMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  englishMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  mathMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  lifeSciMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  phySciMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  historyMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  geoMarks: z.coerce.number().min(0).max(100).optional().nullable(),

  // F. Previous Schooling
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  previousSection: z.string().optional(),
  previousRollNo: z.coerce.number().optional().nullable(),
  previousResult: z.string().optional(),
  previousMarksPercent: z.coerce.number().optional().nullable(),
  previousDaysAttended: z.coerce.number().optional().nullable(),

  // G. Other Information
  distanceToSchool: z.coerce.number().optional().nullable(),
  competitionsOlympiads: z.string().optional(),
  bplStatus: z.string().optional(),
  bplNo: z.string().optional(),

  // H. Bank Details
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankAccountNo: z.string().optional(),

  // I. Government Identifiers
  pen: z.string().optional(),
  healthId: z.string().optional(),
  studentUniqueCode: z.string().optional(),
  hasAadhaar: z.string().optional(),
  aadhaar: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === "" || /^\d{12}$/.test(v.replace(/\s+/g, "")),
      "12-digit Aadhaar number required"
    ),
  nameAsPerAadhaar: z.string().optional(),
});

export type AdmissionFormData = z.infer<typeof admissionFormSchema>;
