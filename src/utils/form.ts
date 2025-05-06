// ─────────────────────────────────────────────────────────────────────────────

// 1) (Re-use your existing helper types…)
type SpecialKey = "id" | "handle" | "capabilities";
type AllowedKeys<T> = Exclude<keyof T, "system"> | SpecialKey;

type ExtractFormValue<V> =
  V extends Array<infer U>      ? Array<ExtractFormValue<U>> :
  V extends string|number|boolean ? V :
  string;

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
      }
      // 2) array? 
      else if (Array.isArray(val)) {
        result[key] = val.map(item => {
          // array of { id }?
          if (item != null && typeof item === "object" && "id" in item) {
            return (item as any).id;
          }
          // primitive?
          if (["string", "number", "boolean"].includes(typeof item)) {
            return item;
          }
          // fallback
          return String(item);
        });
      }
      // 3) single object with id?
      else if (val != null && typeof val === "object" && "id" in val) {
        if ("id" in val && "__typename" in val) {
          result[key] = (val as any).id;
        } else {
          result[key] = val; // Otherwise we return the object (this will be the case for JSON fields)
        }
      }
      // 4) primitive
      else if (["string", "number", "boolean"].includes(typeof val)) {
        result[key] = val;
      }
      // 5) anything else → string
      else {
        result[key] = String(val);
      }
    }
  }

  return result;
}