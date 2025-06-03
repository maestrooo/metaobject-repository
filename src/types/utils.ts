export type Simplify<T> = { [K in keyof T]: T[K] } extends infer O
  ? { [K in keyof O]: O[K] }
  : never;

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Head<S extends string> =
  S extends `${infer H}.${string}` ? H : S;

export type Tail<S extends string, H extends string> =
  S extends `${H}.${infer R}` ? R : never;

export type CamelCase<S extends string> =
    S extends `${infer Head}_${infer Tail}` ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : S extends `${infer Head} ${infer Tail}` ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : S extends `${infer Head}-${infer Tail}` ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
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

export type PaginationArgs<Dir extends "forward" | "backward"> =
  Dir extends "forward"
    ? { first: number; after?: string; last?: never; before?: never }
    : { last: number; before?: string; first?: never; after?: never };