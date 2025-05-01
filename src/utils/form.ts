// ─────────────────────────────────────────────────────────────────────────────
// 1) (Re-use your existing helper types…)
type SpecialKey = "id" | "handle";
type AllowedKey<T> = Exclude<keyof T, "system"> | SpecialKey;
type AllAllowedKeys<T> = Exclude<keyof T, "system"> | SpecialKey;

type ExtractFormValue<V> =
  V extends Array<infer U>      ? Array<ExtractFormValue<U>> :
  V extends string|number|boolean ? V :
  string;

type FormState<
  T extends { system?: { id?: any; handle?: any } | null },
  K extends readonly AllowedKey<T>[]
> = {
  [P in K[number]]:
    P extends keyof T   ? ExtractFormValue<T[P]> :
    P extends "id"      ? string | null :
    P extends "handle"  ? string | null :
    never;
};


// ─────────────────────────────────────────────────────────────────────────────
// 2) Overloads
// ─────────────────────────────────────────────────────────────────────────────
export function createFormState<
  T extends { system?: { id?: any; handle?: any } | null }
>(obj: T): FormState<T, AllAllowedKeys<T>[]>;

export function createFormState<
  T extends { system?: { id?: any; handle?: any } | null },
  const K extends readonly AllowedKey<T>[]
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
        ];

  const result: any = {};

  for (const key of actualKeys) {
    if (key === "id") {
      result[key] = obj.system?.id ?? null;
    }
    else if (key === "handle") {
      result[key] = obj.system?.handle ?? null;
    }
    else {
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
        result[key] = (val as any).id;
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