import { z } from "zod";

export const studentCreateSchema = z.object({
  // Identity
  name: z.string().min(1, "Name is required").trim(),
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
  motherTongue: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  indianNationality: z.coerce.boolean().optional().default(true),
  bloodGroup: z.string().optional().nullable(),
  heightCm: z.coerce.number().optional().nullable(),
  weightKg: z.coerce.number().optional().nullable(),
  birthRegistrationNo: z.string().optional().nullable(),
  identificationMark: z.string().optional().nullable(),

  // Social & Categories
  socialCategory: z.string().optional().nullable(),
  minorityGroup: z.string().optional().nullable(),
  isBpl: z.coerce.boolean().optional().default(false),
  isAay: z.coerce.boolean().optional().default(false),
  isEws: z.coerce.boolean().optional().default(false),
  isOutOfSchool: z.coerce.boolean().optional().default(false),
  mainstreamedDate: z.string().optional().nullable(),

  // CWSN
  isCwsn: z.coerce.boolean().optional().default(false),
  impairmentType: z.string().optional().nullable(),
  hasDisabilityCertificate: z.coerce.boolean().optional().default(false),
  disabilityPercentage: z.coerce.number().optional().nullable(),
  sldType: z.string().optional().nullable(),

  // Family Info
  fatherName: z.string().min(1, "Father's name is required").trim(),
  motherName: z.string().min(1, "Mother's name is required").trim(),
  guardianName: z.string().optional().nullable(),
  relationshipWithGuardian: z.string().optional().nullable(),
  guardianQualification: z.string().optional().nullable(),
  annualFamilyIncome: z.coerce.number().optional().nullable(),

  // Contact
  studentContact: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^\d{10}$/.test(v.trim()), "Contact must be 10 digits"),
  altMobile: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^\d{10}$/.test(v.trim()), "Alt mobile must be 10 digits"),
  email: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Invalid email format"),
  address: z.string().optional().nullable(),
  pincode: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^\d{6}$/.test(v.trim()), "Pincode must be 6 digits"),

  // Academic Enrolment
  presentClass: z.string().min(1, "Class is required").trim(),
  presentSection: z.string().min(1, "Section is required").trim(),
  presentRoll: z.coerce.number().int().positive("Roll must be a positive number"),
  admissionNo: z.string().optional().nullable(),
  admissionDate: z.string().optional().nullable(),
  admissionType: z.string().optional().nullable(),
  academicYear: z.string().optional().nullable(),
  mediumOfInstruction: z.string().optional().nullable(),
  presentClassAdmissionDate: z.string().optional().nullable(),
  admissionYear: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1),
  academicStream: z.string().optional().nullable(),
  currentStatus: z.enum(["Continuing", "Drop Out", "Passed Out", "Sent Up M.P.", "C.C.H.S."]).optional().default("Continuing"),
  previousSchool: z.string().optional().nullable(),

  // Subjects / Groups
  languageGroup: z.array(z.string()).optional().nullable(),
  foreignLanguage: z.string().optional().nullable(),
  mandatorySubjects: z.array(z.string()).optional().nullable(),
  additionalSubjects: z.array(z.string()).optional().nullable(),
  coCurricularSubjects: z.array(z.string()).optional().nullable(),

  // Form String Inputs (converted on client)
  languageGroupInput: z.string().optional(),
  mandatorySubjectsInput: z.string().optional(),
  additionalSubjectsInput: z.string().optional(),
  coCurricularSubjectsInput: z.string().optional(),
  facilitiesProvidedInput: z.string().optional(),
  cwsnFacilitiesInput: z.string().optional(),
  competitionsOlympiadsInput: z.string().optional(),

  // Previous Academic Year Info
  previousStatus: z.string().optional().nullable(),
  previousClass: z.string().optional().nullable(),
  previousSection: z.string().optional().nullable(),
  previousStream: z.string().optional().nullable(),
  previousRollNo: z.coerce.number().optional().nullable(),
  previousAppearedForExams: z.coerce.boolean().optional().default(false),
  previousResult: z.string().optional().nullable(),
  previousMarksPercent: z.coerce.number().optional().nullable(),
  previousDaysAttended: z.coerce.number().optional().nullable(),

  // RTE & Facilities
  rteSection12C: z.coerce.boolean().optional().default(false),
  rteAmountClaimed: z.coerce.number().optional().nullable(),
  facilitiesProvided: z.array(z.string()).optional().nullable(),
  cwsnFacilities: z.array(z.string()).optional().nullable(),
  freeUniforms: z.coerce.boolean().optional().default(false),
  freeTransport: z.coerce.boolean().optional().default(false),
  freeBicycle: z.coerce.boolean().optional().default(false),
  freeHostel: z.coerce.boolean().optional().default(false),
  freeShoes: z.coerce.boolean().optional().default(false),
  hasComputerAccess: z.coerce.boolean().optional().default(false),

  // Extra Profile Fields
  ncc: z.coerce.boolean().optional().default(false),
  nss: z.coerce.boolean().optional().default(false),
  scoutsGuides: z.coerce.boolean().optional().default(false),
  distanceToSchool: z.coerce.number().optional().nullable(),
  highestEducationParents: z.string().optional().nullable(),
  competitionsOlympiads: z.array(z.string()).optional().nullable(),

  // Bank
  bankIfsc: z.string().optional().nullable(),
  bankAccountNo: z.string().optional().nullable(),

  // Govt IDs
  pen: z.string().optional().nullable(),
  diseCode: z.string().optional().nullable(),
  healthId: z.string().optional().nullable(),
  studentUniqueCode: z.string().optional().nullable(),
  aadhaar: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^\d{12}$/.test(v.trim()), "Aadhaar must be 12 digits"),
  nameAsPerAadhaar: z.string().optional().nullable(),
});

export const studentUpdateSchema = studentCreateSchema.partial();

export const studentBulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid("Invalid student UUID"),
      changes: studentUpdateSchema,
    })
  ).min(1, "Updates array must contain at least one student"),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
export type StudentBulkUpdateInput = z.infer<typeof studentBulkUpdateSchema>;
