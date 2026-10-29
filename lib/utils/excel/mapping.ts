import type { ColumnMapping, Student } from "@/lib/types";
import { TARGET_FIELDS, type FieldDefinition } from "./fields";

/**
 * Auto-suggests column mappings based on prioritized fuzzy matching.
 */
export function autoSuggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Explicit priority order for matching to prevent generic collisions (like "name" eating "father name")
  const PRIORITY_KEYS: (keyof Student)[] = [
    "fatherOccupation",
    "motherOccupation",
    "guardianOccupation",
    "guardianQualification",
    "relationshipWithGuardian",
    "fatherName",
    "motherName",
    "guardianName",
    "altMobile",
    "studentContact",
    "nameAsPerAadhaar",
    "studentUniqueCode",
    "kanyashreeId",
    "casteCertificateNo",
    "bankAccountNo",
    "bankIfsc",
    "wbbseRegNo",
    "wbchseRegNo",
    "boardRegistrationNo",
    "birthRegistrationNo",
    "diseCode",
    "healthId",
    "identificationMark",
    "admissionNo",
    "presentClassAdmissionDate",
    "admissionDate",
    "academicYear",
    "admissionYear",
    "admissionType",
    "academicStream",
    "mediumOfInstruction",
    "dob",
    "wbbseRollNo",
    "wbchseRollNo",
    "boardRollNo",
    "presentRoll",
    "presentClass",
    "presentSection",
    "pen",
    "hasAadhaar",
    "aadhaar",
    "socialCategory",
    "religion",
    "motherTongue",
    "minorityGroup",
    "annualFamilyIncome",
    "hasDisabilityCertificate",
    "disabilityPercentage",
    "sldType",
    "isCwsn",
    "impairmentType",
    "isAay",
    "isEws",
    "indianNationality",
    "isOutOfSchool",
    "mainstreamedDate",
    "bloodGroup",
    "heightCm",
    "weightKg",
    "previousMarksPercent",
    "previousSchool",
    "previousClass",
    "previousSection",
    "previousStream",
    "previousRollNo",
    "previousStatus",
    "previousAppearedForExams",
    "previousResult",
    "previousDaysAttended",
    "rteSection12C",
    "rteAmountClaimed",
    "facilitiesProvided",
    "cwsnFacilities",
    "competitionsOlympiads",
    "ncc",
    "nss",
    "scoutsGuides",
    "distanceToSchool",
    "highestEducationParents",
    "languageGroup",
    "foreignLanguage",
    "mandatorySubjects",
    "additionalSubjects",
    "coCurricularSubjects",
    "email",
    "address",
    "pincode",
    "currentStatus",
    "schoolId",
    "gender",
    "name",
  ];

  const fieldMap = new Map<keyof Student, FieldDefinition>();
  for (const f of TARGET_FIELDS) {
    fieldMap.set(f.key, f);
  }

  // Ensure all defined target fields are checked
  const allTargetKeys = TARGET_FIELDS.map((f) => f.key);
  const orderedKeys: (keyof Student)[] = [
    ...PRIORITY_KEYS,
    ...allTargetKeys.filter((k) => !PRIORITY_KEYS.includes(k)),
  ];

  for (const rawHeader of headers) {
    const cleanHeader = clean(rawHeader);
    let bestMatch: keyof Student | "ignore" = "ignore";

    // Pass 1: Direct EXACT match across all fields (highest confidence)
    for (const key of orderedKeys) {
      const field = fieldMap.get(key);
      if (!field) continue;

      const matched = field.aliases.some((alias) => {
        const cleanAlias = clean(alias);
        return (
          cleanHeader === cleanAlias ||
          cleanHeader === cleanAlias.replace(/\s+/g, "")
        );
      });

      if (matched) {
        bestMatch = key;
        break;
      }
    }

    // Pass 2: Word-boundary start/end match (prioritize specific multi-word fields)
    if (bestMatch === "ignore") {
      for (const key of orderedKeys) {
        const field = fieldMap.get(key);
        if (!field) continue;

        // Skip prefix match if it would misclassify specific fields
        if (key === "motherName" && cleanHeader.includes("tongue")) continue;
        if (key === "fatherName" && cleanHeader.includes("income")) continue;
        if (key === "isCwsn" && (cleanHeader.includes("type") || cleanHeader.includes("nature") || cleanHeader.includes("impairment"))) continue;
        if (key === "admissionNo" && cleanHeader.includes("date")) continue;

        const matched = field.aliases.some((alias) => {
          const cleanAlias = clean(alias);
          if (cleanAlias.length < 3) return false;
          return (
            cleanHeader.startsWith(cleanAlias + " ") ||
            cleanHeader.endsWith(" " + cleanAlias)
          );
        });

        if (matched) {
          bestMatch = key;
          break;
        }
      }
    }

    // Pass 3: Fallback partial contains check in priority order
    if (bestMatch === "ignore") {
      for (const key of orderedKeys) {
        const field = fieldMap.get(key);
        if (!field) continue;

        // Skip generic 'name' in partial match if 'father', 'mother', or 'guardian' is present
        if (
          key === "name" &&
          (cleanHeader.includes("father") ||
            cleanHeader.includes("mother") ||
            cleanHeader.includes("guardian"))
        ) {
          continue;
        }
        if (key === "motherName" && cleanHeader.includes("tongue")) continue;
        if (key === "isCwsn" && (cleanHeader.includes("type") || cleanHeader.includes("nature") || cleanHeader.includes("impairment"))) continue;
        if (key === "admissionNo" && cleanHeader.includes("date")) continue;

        const matched = field.aliases.some((alias) => {
          const cleanAlias = clean(alias);
          if (cleanAlias.length < 3) return false;
          return cleanHeader.includes(cleanAlias);
        });

        if (matched) {
          bestMatch = key;
          break;
        }
      }
    }

    mapping[rawHeader] = bestMatch;
  }

  return mapping;
}
