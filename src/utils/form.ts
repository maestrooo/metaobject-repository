// ─────────────────────────────────────────────────────────────────────────────

// 1) (Re-use your existing helper types…)
type SpecialKey = "id" | "handle" | "capabilities";
type AllowedKeys<T> = Exclude<keyof T, "system"> | SpecialKey;

type BaseExtract<V> =
  // arrays recurse
  V extends readonly (infer U)[] 
    ? Array<BaseExtract<U>>
  // primitives passthrough
  : V extends string | number | boolean 
    ? V
  // “node” objects become string
  : V extends { id?: any; __typename?: any } 
    ? string
  // the system.id case
  : V extends { system: { id: any } } 
    ? string
  // any other object stays as the object
  : V extends object 
    ? V
  // fallback
  : string;

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// 2) Helper: if V includes `string` *and* at least one other non-nullish type, then
//    drop the `string` branch and add `null`.  Otherwise leave V untouched.
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
type Adjust<V> =
  // Do we even have `string` in V?
  string extends V
    ? // If you remove both `string` and `null` from V, 
      // is there *anything* left?
      Exclude<V, string | null> extends never
        ? V                       // only `string` (or `string|null`) → leave it
        : Exclude<V, string> | null  // there was some other type → drop `string`, add `null`
    : V;                        // no `string` at all → leave it

// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// 3) Glue them together into your final ExtractFormValue
// –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
type ExtractFormValue<V> = Adjust<BaseExtract<V>>;

type FormState<
  T extends { system?: { id?: any; handle?: any, capabilities?: any } | null },
  K extends readonly AllowedKeys<T>[]
> = {
  [P in K[number]]:
    P extends keyof T   ? ExtractFormValue<T[P]> :
    P extends "id"      ? string | null :
    P extends "handle"  ? string | null :
    P extends "capabilities" ? (T extends { system?: { capabilities: infer C } } ? C : null) :
    never;
};


// ─────────────────────────────────────────────────────────────────────────────
// 2) Overloads
// ─────────────────────────────────────────────────────────────────────────────
export function createFormState<
  T extends { system?: { id?: any; handle?: any } | null }
>(obj: T): FormState<T, AllowedKeys<T>[]>;

export function createFormState<
  T extends { system?: { id?: any; handle?: any } | null },
  const K extends readonly AllowedKeys<T>[]
>(obj: T, keys: K): FormState<T, K>;


// ─────────────────────────────────────────────────────────────────────────────
// 3) Implementation with correct `id`‐extraction
// ─────────────────────────────────────────────────────────────────────────────
export function createFormState(obj: any, keys?: string[]) {
  const actualKeys: string[] =
    keys && keys.length > 0
      ? keys
      : [
          ...Object.keys(obj).filter((k) => k !== "system"),
          "id",
          "handle",
          "capabilities"
        ];

  const result: any = {};

  const convertValue = (value: any): any => {
    if (value === null || value === undefined) {
      return '';
    } else if (Array.isArray(value)) {
      return value.map(convertValue);
    } else if (typeof value === 'object') {
      if ('id' in value && '__typename' in value) {
        return value.id;
      } else if ('system' in value && 'id' in value.system) {
        return value.system.id;
      }
      return value; // Otherwise we return the object (this will be the case for JSON fields)
    }

    return String(value);
  }

  for (const key of actualKeys) {
    if (key === "id") {
      result[key] = obj.system?.id ?? '';
    } else if (key === "handle") {
      result[key] = obj.system?.handle ?? '';
    } else if (key === "capabilities") {
      result[key] = obj.system?.capabilities ?? {
        onlineStore: { templateSuffix: '' },
        publishable: { enabled: 'ACTIVE' }
      };
    } else {
      const val = obj[key];

      // 1) null or undefined?
      if (val === null || val === undefined) {
        result[key] = ''; // We treat those as empty strings to make it easier to use in forms
      } else if (Array.isArray(val)) {
        result[key] = val.map(item => {
          return convertValue(item);
        });
      } else {
        result[key] = convertValue(val);
      }
    }
  }

  return result;
}