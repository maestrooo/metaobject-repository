export type Head<S extends string> =
  S extends `${infer H}.${string}` ? H : S;

export type Tail<S extends string, H extends string> =
  S extends `${H}.${infer R}` ? R : never;

export type CamelCase<S extends string> =
    S extends `${infer Head}_${infer Tail}`     ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : S extends `${infer Head} ${infer Tail}`     ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : S extends `${infer Head}-${infer Tail}`     ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : Lowercase<S>;

// Recursively camel case all keys
export type CamelCaseKeys<T> =
  // if it’s an array or tuple, recurse on its element type
  T extends readonly (infer U)[]
    ? Array<CamelCaseKeys<U>>

  // if it’s a plain object, map over its props
  : T extends object
    ? { [K in keyof T as CamelCase<Extract<K, string>>]: CamelCaseKeys<T[K]> }

  // otherwise leave it alone
  : T;

export type AllowRawEnum<T> =
  T extends string
    ? T | `${T}`
    : T extends object
      ? { [K in keyof T]?: AllowRawEnum<T[K]> }
      : T;