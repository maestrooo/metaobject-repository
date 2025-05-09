/*
 * 1) Keep ExtractFormValue for value transformation
 */

type ExtractFormValue<V> =
  [V] extends [null | undefined]               ? '' :
  V extends readonly (infer U)[]               ? ExtractFormValue<U>[] :
  V extends string | number | boolean          ? V :
  V extends { id?: any; __typename?: any }     ? string :
  V extends { system: { id: any } }            ? string :
  V;

/*
 * 2) Derive a flattened "fields" type by dropping `system`
 */

type FlattenedFields<T extends { system?: any }> = {
  [P in keyof T]: ExtractFormValue<T[P]>;
};

/*
 * 3) Runtime mapper matching ExtractFormValue logic
 */

function formatValue(value: unknown): unknown {
  if (value == null) {
    return '';
  }   

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(formatValue);
  }

  if (typeof value === 'object' && value !== null) {
    if ('id' in value && '__typename' in value) {
      return value.id;
    }

    if ('system' in value && value.system && typeof value.system === 'object' && 'id' in value.system) {
      return value.system.id;
    }

    return value;
  }

  return String(value);
}

/*
 * 4) flattenFields implementation
 */

export function flattenFields<T extends { system?: any }>(obj: T): FlattenedFields<T> {
  const { system, ...fields } = obj;
  const result = {} as Record<string, unknown>;

  for (const [key, val] of Object.entries(fields)) {
    result[key] = formatValue(val);
  }

  return result as FlattenedFields<T>;
}