// ─────────────────────────────────────────────────────────────────────────────
// 1) Helper Types

// ─────────────────────────────────────────────────────────────────────────────
type SpecialKey = 'id' | 'handle' | 'capabilities';
type AllowedKeys<T> = Exclude<keyof T, 'system'> | SpecialKey;

type ExtractFormValue<V> =
  [V] extends [null | undefined]               ? '' :
  V extends readonly (infer U)[]               ? ExtractFormValue<U>[] :
  V extends string | number | boolean          ? V :
  V extends { id?: any; __typename?: any }     ? string :
  V extends { system: { id: any } }            ? string :
  V;

// derive which keys go into `fields`
type FieldKeys<T,K extends readonly AllowedKeys<T>[]> =
  Extract<keyof Omit<T, 'system'>, K[number]>;

// the final shape
type FormState<
  T extends { system?: { id?: any; handle?: any; capabilities?: any } | null },
  K extends readonly AllowedKeys<T>[]
> = {
  id:           T extends { system: { id: infer ID } }           ? ID : "";
  handle:       T extends { system: { handle: infer H } }       ? H  : "";
  capabilities: T extends { system: { capabilities: infer C } }  ? C  : never;
  fields: {
    [P in FieldKeys<T, K>]: ExtractFormValue<T[P]>;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) Defaults & Helpers
// ─────────────────────────────────────────────────────────────────────────────
const specialKeysSet = new Set<SpecialKey>(['id', 'handle', 'capabilities']);

const defaultCapabilities = {
  onlineStore: { templateSuffix: '' },
  publishable: { enabled: 'ACTIVE' }
};

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
  
  if (typeof value === 'object') {
    const v = value as Record<string, any>;

    if ('id' in v && '__typename' in v) {
      return v.id;
    }

    if (v.system && typeof v.system.id !== 'undefined') {
      return v.system.id;
    }

    return v;
  }

  return String(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Overloads
// ─────────────────────────────────────────────────────────────────────────────
export function createFormState<
  T extends { system?: Record<string, any> | null }
>(obj: T): FormState<T, AllowedKeys<T>[]>;

export function createFormState<
  T extends { system?: Record<string, any> | null },
  const K extends readonly AllowedKeys<T>[]
>(obj: T, keys: K): FormState<T, K>;

// ─────────────────────────────────────────────────────────────────────────────
// 4) Implementation
// ─────────────────────────────────────────────────────────────────────────────
export function createFormState(obj: any, keys?: readonly string[]) {
  const { system = {}, ...rest } = obj;

  const id           = system.id           ?? '';
  const handle       = system.handle       ?? '';
  const capabilities = system.capabilities ?? defaultCapabilities;

  // determine which keys to include in `fields`
  const candidateKeys = keys && keys.length > 0
    ? keys
    : Object.keys(rest);

  const fieldsEntries = candidateKeys
    .filter(k => !specialKeysSet.has(k as SpecialKey))
    .map(k => [k, formatValue(rest[k as keyof typeof rest])]);

  const fields = Object.fromEntries(fieldsEntries);

  return {
    id,
    handle,
    capabilities,
    fields
  } as any;
}