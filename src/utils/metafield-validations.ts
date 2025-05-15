// In the library, metafield and metaobject field validations have a slightly different structure than Shopify
// validations, to make it easier to use. This method is used to convert our own internal validation structure to Shopify one

import { snake } from "snake-camel";
import type { MetafieldDefinitionValidationInput } from "~/types/admin.types";
import type { FieldType, FieldValidations } from "~/types/fields";

export function convertValidations<T extends FieldType>(fieldValidations: FieldValidations<T>): MetafieldDefinitionValidationInput[] {
  const out: MetafieldDefinitionValidationInput[] = [];
  
  // 1) We convert the "metaobjectType(s)" into a temporary validation. This is non-standard, but will be resolved by managers to an actual ID
  if ('metaobjectType' in fieldValidations && fieldValidations.metaobjectType) {
    out.push({
      name: 'metaobject_definition_type',
      value: fieldValidations.metaobjectType,
    });
  }
  if ('metaobjectTypes' in fieldValidations && fieldValidations.metaobjectTypes) {
    out.push({
      name: 'metaobject_definition_types',
      value: JSON.stringify(fieldValidations.metaobjectTypes),
    });
  }

  // 2) turn each validation‐prop into {name,value:string}
  if ('validations' in fieldValidations && fieldValidations.validations) {
    for (const [name, raw] of Object.entries(fieldValidations.validations)) {
      if (raw == null) {
        continue;
      }

      const validationName = (name === 'listMax') ? 'list.max' : ((name === 'listMin') ? 'list.min' : snake(name));
      const value = typeof raw === "string" || typeof raw === "number" ? String(raw) : JSON.stringify(raw);

      out.push({ name: validationName, value });
    }
  }

  return out;
}