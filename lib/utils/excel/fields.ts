export type { FieldDefinition } from "./field-tables/types";
import type { FieldDefinition } from "./field-tables/types";
import { CORE_FIELDS } from "./field-tables/core";
import { PEOPLE_FIELDS } from "./field-tables/people";
import { ACADEMIC_FIELDS } from "./field-tables/academic";

export const TARGET_FIELDS: FieldDefinition[] = [...CORE_FIELDS, ...PEOPLE_FIELDS, ...ACADEMIC_FIELDS];
