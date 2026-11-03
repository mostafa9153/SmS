import type { ColumnMapping, Student } from "@/lib/types";
import { TARGET_FIELDS, type FieldDefinition } from "./fields";
import { UDISE_SDMS_HEADERS } from "./presets";

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

  // A UDISE+ SDMS export is recognised by its headers and mapped column by column
  const sdms = new Map(Object.entries(UDISE_SDMS_HEADERS).map(([h, k]) => [clean(h), k]));
  const SDMS_ONLY = ["initialised at sdms", "student state code", "apaar status", "aadhaar validation status", "is repeater", "entry status"];
  const cleanHeaders = new Set(headers.map(clean));
  const isSdms = SDMS_ONLY.filter((h) => cleanHeaders.has(h)).length >= 3;

  // How sure each match is (0 = known export, 1 = exact, 2 = word edge, 3 = partial); one column per field
  const strength: Record<string, number> = {};

  for (const rawHeader of headers) {
    const cleanHeader = clean(rawHeader);
    let bestMatch: keyof Student | "ignore" = "ignore";

    if (isSdms && sdms.has(cleanHeader)) {
      mapping[rawHeader] = sdms.get(cleanHeader)!;
      strength[rawHeader] = 0;
      continue;
    }

    // Pass 1: Direct EXACT match across all fields (highest confidence)
    strength[rawHeader] = 1;
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
      strength[rawHeader] = 2;
      for (const key of orderedKeys) {
        const field = fieldMap.get(key);
        if (!field) continue;

        // Skip prefix match if it would misclassify specific fields
        if (key === "motherName" && cleanHeader.includes("tongue")) continue;
        if (key === "fatherName" && cleanHeader.includes("income")) continue;
        if (key === "studentContact" && cleanHeader.includes("email")) continue;
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
      strength[rawHeader] = 3;
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
        if (key === "studentContact" && cleanHeader.includes("email")) continue;
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

  // Two columns on one field would overwrite each other ("Class" then "...Previous Class..."):
  // the surest match keeps it (the leftmost on a tie), the rest are ignored
  const owner = new Map<string, string>();
  for (const h of headers) {
    const key = mapping[h];
    if (!key || key === "ignore") continue;
    const cur = owner.get(key);
    if (cur === undefined || strength[h] < strength[cur]) {
      if (cur !== undefined) mapping[cur] = "ignore";
      owner.set(key, h);
    } else {
      mapping[h] = "ignore";
    }
  }

  return mapping;
}
