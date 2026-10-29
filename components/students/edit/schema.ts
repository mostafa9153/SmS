import { z } from "zod";


export const studentSchema = z.object({
  // Identity
  name: z.string().min(2, "Name is required"),
  studentNameBengali: z.string().optional(),
  schoolId: z
    .string()
    .min(1, "School ID is required")
    .regex(
      /^[A-Z0-9/_-]+$/i,
      "School ID contains invalid characters"
    ),
  dob: z.string().refine((v) => {
    if (!v) return false;
    const d = new Date(v);
    return !isNaN(d.getTime()) && d < new Date();
  }, "Date of birth must be a valid past date"),
  gender: z.enum(["Male", "Female", "Other"]),
  motherTongue: z.string().optional(),
  religion: z.string().optional(),
  indianNationality: z.coerce.boolean().optional(),
  bloodGroup: z.string().optional(),
  heightCm: z.coerce.number().optional().nullable(),
  weightKg: z.coerce.number().optional().nullable(),
  birthRegistrationNo: z.string().optional(),
  identificationMark: z.string().optional(),

  // Social & Categories
  socialCategory: z.string().optional(),
  casteCertificateNo: z.string().optional(),
  minorityGroup: z.string().optional(),
  isAay: z.coerce.boolean().optional(),
  isEws: z.coerce.boolean().optional(),
  bplStatus: z.string().optional(),
  bplNo: z.string().optional(),
  isOutOfSchool: z.coerce.boolean().optional(),
  mainstreamedDate: z.string().optional(),

  // CWSN
  isCwsn: z.coerce.boolean().optional(),
  impairmentType: z.string().optional(),
  hasDisabilityCertificate: z.coerce.boolean().optional(),
  disabilityCertificateNo: z.string().optional(),
  disabilityPercentage: z.coerce.number().optional().nullable(),
  sldType: z.string().optional(),

  // Family Info
  fatherName: z.string().min(2, "Father's name is required"),
  fatherNameBengali: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherName: z.string().min(2, "Mother's name is required"),
  motherNameBengali: z.string().optional(),
  motherOccupation: z.string().optional(),
  guardianName: z.string().optional(),
  relationshipWithGuardian: z.string().optional(),
  guardianOccupation: z.string().optional(),
  guardianQualification: z.string().optional(),
  annualFamilyIncome: z.coerce.number().optional().nullable(),

  // Contact & Address
  studentContact: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{10}$/.test(v.trim()), "Contact must be 10 digits"),
  altMobile: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{10}$/.test(v.trim()), "Contact must be 10 digits"),
  email: z.string().optional().refine((v) => !v || v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Invalid email"),
  address: z.string().optional(),
  gramPanchayat: z.string().optional(),
  block: z.string().optional(),
  pincode: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{6}$/.test(v.trim()), "Pincode must be 6 digits"),

  // Academic Enrolment
  presentClass: z.string().min(1, "Class is required"),
  presentSection: z.string().min(1, "Section is required"),
  presentRoll: z.coerce.number().int().positive("Roll must be positive"),
  admissionNo: z.string().optional(),
  admissionDate: z.string().optional(),
  admissionType: z.string().optional(),
  academicYear: z.string().optional(),
  mediumOfInstruction: z.string().optional(),
  presentClassAdmissionDate: z.string().optional(),
  admissionYear: z.coerce.number().int().min(1900).max(2100),
  academicStream: z.string().optional(),
  boardRegistrationNo: z.string().optional().nullable(),
  boardRollNo: z.string().optional().nullable(),
  bengaliMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  englishMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  mathMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  lifeSciMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  phySciMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  historyMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  geoMarks: z.coerce.number().min(0).max(100).optional().nullable(),

  // Language studied (comma separated)
  languageGroupInput: z.string().optional(),
  mandatorySubjectsInput: z.string().optional(),
  additionalSubjectsInput: z.string().optional(),
  coCurricularSubjectsInput: z.string().optional(),

  // Previous Academic Year Info
  previousSchool: z.string().optional().nullable(),
  previousStatus: z.string().optional(),
  previousClass: z.string().optional(),
  previousSection: z.string().optional(),
  previousStream: z.string().optional(),
  previousRollNo: z.coerce.number().optional().nullable(),
  previousAppearedForExams: z.coerce.boolean().optional(),
  previousResult: z.string().optional(),
  previousMarksPercent: z.coerce.number().optional().nullable(),
  previousDaysAttended: z.coerce.number().optional().nullable(),

  // RTE
  rteSection12C: z.coerce.boolean().optional(),
  rteAmountClaimed: z.coerce.number().optional().nullable(),

  // Facilities & Co-curricular
  facilitiesProvidedInput: z.string().optional(),
  cwsnFacilitiesInput: z.string().optional(),
  competitionsOlympiadsInput: z.string().optional(),
  ncc: z.coerce.boolean().optional(),
  nss: z.coerce.boolean().optional(),
  scoutsGuides: z.coerce.boolean().optional(),
  distanceToSchool: z.coerce.number().optional().nullable(),
  highestEducationParents: z.string().optional(),

  // Bank
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankAccountNo: z.string().optional(),

  // Identifiers
  pen: z.string().optional(),
  diseCode: z.string().optional(),
  healthId: z.string().optional(),
  studentUniqueCode: z.string().optional(),
  kanyashreeId: z.string().optional(),
  aadhaar: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        v.trim() === "" ||
        v.includes("•") ||
        v === "PENDING_RECORD" ||
        v === "Not Available" ||
        /^\d{12}$/.test(v.trim()),
      "Aadhaar must be 12 digits"
    ),
  nameAsPerAadhaar: z.string().optional(),
});

export type FormData = z.infer<typeof studentSchema>;
