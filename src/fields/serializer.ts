import type { MetaobjectFieldInput } from "~/types/admin.types";
import { isPlainObject } from "~/utils/is-plain-object";
import { snakeKeysDeep, toSnakeCaseKey } from "~/utils/snake";

type SerializeFieldsOptions = {
  toSnakeCase?: boolean;
}

export function serializeFields(fields: Record<string, unknown>, { toSnakeCase = true }: SerializeFieldsOptions = {}): MetaobjectFieldInput[] {
  return Object.entries(fields).map(([key, value]) => {
    let serializedValue: string;

    if (value === null || value === undefined) {
      serializedValue = '';
    } else if (typeof value === 'string') {
      serializedValue = value;
    } else if (Array.isArray(value) && value.length === 0) {
      serializedValue = '';
    } else if (isPlainObject(value) && Object.keys(value).length === 0) {
      serializedValue = '';
    } else {
      const toSerialize =
        toSnakeCase && (Array.isArray(value) || isPlainObject(value))
          ? snakeKeysDeep(value)
          : (value);
      serializedValue = JSON.stringify(toSerialize);
    }

    const fieldKey = toSnakeCase ? toSnakeCaseKey(key) : key;

    return {
      key: fieldKey,
      value: serializedValue,
    };
  });
}