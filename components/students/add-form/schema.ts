import { z } from "zod";


export const studentSchema = z.object({
  // Identity
  name: z.string().min(2, "Name is required"),
  schoolId: z.string().optional(),
  currentStatus: z.string().optional(),
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
  isOutOfSchool: z.coerce.boolean().optional(),
  mainstreamedDate: z.string().optional(),

  // CWSN
  isCwsn: z.coerce.boolean().optional(),
  impairmentType: z.string().optional(),
  hasDisabilityCertificate: z.coerce.boolean().optional(),
  disabilityPercentage: z.coerce.number().optional().nullable(),
  sldType: z.string().optional(),

  // Family Info
  fatherName: z.string().min(2, "Father's name is required"),
  fatherOccupation: z.string().optional(),
  motherName: z.string().min(2, "Mother's name is required"),
  motherOccupation: z.string().optional(),
  guardianName: z.string().optional(),
  relationshipWithGuardian: z.string().optional(),
  guardianOccupation: z.string().optional(),
  guardianQualification: z.string().optional(),
  annualFamilyIncome: z.coerce.number().optional().nullable(),

  // Contact
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
  presentSemester: z.enum(["Sem 1", "Sem 2", "Sem 3", "Sem 4"]).optional().nullable(),
  detentionCount: z.coerce.number().int().nonnegative().optional().nullable(),
  admissionNo: z.string().optional(),
  admissionDate: z.string().optional(),
  admissionType: z.string().optional(),
  academicYear: z.string().optional(),
  mediumOfInstruction: z.string().optional(),
  presentClassAdmissionDate: z.string().optional(),
  admissionYear: z.coerce.number().int().min(2000).max(new Date().getFullYear()),
  academicStream: z.string().optional(),
  boardRegistrationNo: z.string().optional().nullable(),
  boardRollNo: z.string().optional().nullable(),

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

  // Facilities Profile
  facilitiesProvidedInput: z.string().optional(),
  cwsnFacilitiesInput: z.string().optional(),
  freeUniforms: z.coerce.boolean().optional(),
  freeTransport: z.coerce.boolean().optional(),
  freeBicycle: z.coerce.boolean().optional(),
  freeHostel: z.coerce.boolean().optional(),
  freeShoes: z.coerce.boolean().optional(),
  hasComputerAccess: z.coerce.boolean().optional(),

  // Extra Profile Fields
  ncc: z.coerce.boolean().optional(),
  nss: z.coerce.boolean().optional(),
  scoutsGuides: z.coerce.boolean().optional(),
  distanceToSchool: z.coerce.number().optional().nullable(),
  highestEducationParents: z.string().optional(),
  competitionsOlympiadsInput: z.string().optional(),

  // Bank
  bankIfsc: z.string().optional(),
  bankAccountNo: z.string().optional(),

  // Govt IDs
  pen: z.string().optional(),
  diseCode: z.string().optional(),
  healthId: z.string().optional(),
  studentUniqueCode: z.string().optional(),
  kanyashreeId: z.string().optional(),
  aadhaar: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{12}$/.test(v.trim()), "Aadhaar must be 12 digits"),
  nameAsPerAadhaar: z.string().optional(),
});

export type FormData = z.infer<typeof studentSchema>;
