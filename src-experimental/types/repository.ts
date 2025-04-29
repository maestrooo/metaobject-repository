/**
 * Those types are used to create automatique input types for the object repository, based on the schema
 * provided. Specifically, it creates a `CreateInput`, `UpdateInput`, `UpsertInput`. It also inspects the
 * schema to auto-complete capabilities.
 */

import { CapabilityInputMap, DefaultMap, DefinitionsSchema } from "./definitions";

/**
 * --------------------------------------------------------------------------------------------
 * Types for building the input types
 * --------------------------------------------------------------------------------------------
 */

type DefCaps<D extends DefinitionsSchema, K extends keyof D> =
  D[K] extends { capabilities: infer C } ? keyof C : never;

type FieldDef<D extends DefinitionsSchema, K extends keyof D> = D[K]["fields"][number];

type RequiredNames<D extends DefinitionsSchema, K extends keyof D> =
  Extract<FieldDef<D,K>, { required: true }>["name"];

type OptionalNames<D extends DefinitionsSchema, K extends keyof D> =
  Exclude<FieldDef<D,K>["name"], RequiredNames<D,K>>;

type FieldsInput<
  D extends DefinitionsSchema,
  K extends keyof D
> =
  // required props
  { [P in RequiredNames<D,K>]:
      DefaultMap[
        Extract<FieldDef<D,K>, { name: P }>["type"] & keyof DefaultMap
      ]
  }
  // optional props
  & { [P in OptionalNames<D,K>]?: 
      DefaultMap[
        Extract<FieldDef<D,K>, { name: P }>["type"] & keyof DefaultMap
      ]
  };

// Build capabilities‐input for only those defined
type CapabilitiesInput<
  D extends DefinitionsSchema,
  K extends keyof D
> = Partial<{
  [C in DefCaps<D,K>]: CapabilityInputMap[C]
}>;

export type CreateInput<
  D extends DefinitionsSchema,
  K extends keyof D
> = {
  handle?: string;
  capabilities?: CapabilitiesInput<D, K>;
  fields: FieldsInput<D, K>;
}

export type UpdateInput<
  D extends DefinitionsSchema,
  K extends keyof D
> = {
  id: string;
  handle?: string;
  redirectNewHandle?: boolean;
  capabilities?: CapabilitiesInput<D, K>;
  fields: FieldsInput<D, K>;
}

export type UpsertInput<
  D extends DefinitionsSchema,
  K extends keyof D
> = {
  handle?: string;
  capabilities?: CapabilitiesInput<D, K>;
  fields: FieldsInput<D, K>;
}

/**
 * --------------------------------------------------------------------------------------------
 * Types for pagination and find options
 * --------------------------------------------------------------------------------------------
 */

// the extra query/sort params you always allow
type SortKey = 'id' | 'type' | 'display_name' | 'updated_at';

type CommonFindOptions = {
  query?:   string;
  reverse?: boolean;
  sortKey?: SortKey;
};

// 1) forward pagination: “first” is required, you may pass “after”,
//    and you must NOT pass “last” or “before”
type ForwardFindOptions = CommonFindOptions & {
  first:  number;
  after?: string;

  // explicitly ban these:
  last?:   never;
  before?: never;
};

// 2) backward pagination: “last” is required, you may pass “before”,
//    and you must NOT pass “first” or “after”
type BackwardFindOptions = CommonFindOptions & {
  last:   number;
  before?: string;

  // explicitly ban these:
  first?: never;
  after?: never;
};

// Union forces “at least one of first|last” and applies the mutual-exclusion rules
export type FindOptions = ForwardFindOptions | BackwardFindOptions;