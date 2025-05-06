/**
 * Those types are used to create automatique input types for the object repository, based on the schema
 * provided. Specifically, it creates a `CreateInput`, `UpdateInput`, `UpsertInput`. It also inspects the
 * schema to auto-complete capabilities.
 */

import { FieldBuilder } from "raku-ql";
import { CamelCase, DefaultMap, DefinitionByType, DefinitionSchema, FieldDefinition } from "./definitions";
import { MetaobjectCapabilityDataOnlineStoreInput, MetaobjectCapabilityDataPublishableInput, MetaobjectStatus } from "./admin.types";

/**
 * --------------------------------------------------------------------------------------------
 * Types for building the input types
 * --------------------------------------------------------------------------------------------
 */

// Create‐time input for each capability
type MetaobjectDefinitionCapabilityInputMap = {
  onlineStore: MetaobjectCapabilityDataOnlineStoreInput;
  publishable: MetaobjectCapabilityDataPublishableInput;
}

type DefinitionCapabilityKeys<D extends DefinitionSchema, T extends D[number]["type"]> =
  DefinitionByType<D, T> extends { capabilities: infer C } ? keyof C : never;

type FieldDef<D extends DefinitionSchema, T extends D[number]["type"]> = DefinitionByType<D, T>["fields"][number];

type RequiredKeys<D extends DefinitionSchema, T extends D[number]["type"]> =
  Extract<FieldDef<D, T>, { required: true }>["key"];

type OptionalKeys<D extends DefinitionSchema, T extends D[number]["type"]> =
  Exclude<FieldDef<D, T>["key"], RequiredKeys<D, T>>;

type FieldTypeOf<D extends DefinitionSchema, T extends D[number]["type"], P extends string> =
  Extract<
    DefinitionByType<D, T>["fields"][number],
    { key: P }
  >["type"];

  type FieldsInput<D extends DefinitionSchema, T extends D[number]["type"]> = {
    // required fields
    [P in RequiredKeys<D, T> as CamelCase<P>]:
      FieldTypeOf<D, T, P> extends `list.${infer U}`
        ? Array<DefaultMap[U & keyof DefaultMap]>        // list → array
        : DefaultMap[FieldTypeOf<D, T, P> & keyof DefaultMap];  // scalar
  } & {
    // optional fields
    [P in OptionalKeys<D, T> as CamelCase<P>]?: 
      FieldTypeOf<D, T, P> extends `list.${infer U}`
        ? Array<DefaultMap[U & keyof DefaultMap]>
        : DefaultMap[FieldTypeOf<D, T, P> & keyof DefaultMap];
  };

// Build capabilities‐input for only those defined
type CapabilitiesInput<D extends DefinitionSchema, T extends D[number]["type"]> = Partial<{
  [C in DefinitionCapabilityKeys<D, T> & keyof MetaobjectDefinitionCapabilityInputMap]: MetaobjectDefinitionCapabilityInputMap[C];
}>

export type CreateInput<D extends DefinitionSchema, T extends D[number]["type"]> = {
  handle?: string;
  capabilities?: CapabilitiesInput<D, T>;
  fields: FieldsInput<D, T>;
}

export type UpdateInput<D extends DefinitionSchema, T extends D[number]["type"]> = {
  id: string;
  handle?: string;
  redirectNewHandle?: boolean;
  capabilities?: CapabilitiesInput<D, T>;
  fields: Partial<FieldsInput<D, T>>; // When updating everything is partial
}

export type UpsertInput<D extends DefinitionSchema, T extends D[number]["type"]> = {
  handle?: string;
  capabilities?: CapabilitiesInput<D, T>;
  fields: Partial<FieldsInput<D, T>>; // When upserting everything is partial
}

/**
 * --------------------------------------------------------------------------------------------
 * Types for pagination, find options and empty options
 * --------------------------------------------------------------------------------------------
 */

export type EmptyObjectOptions = {
  defaultPublishableStatus?: MetaobjectStatus;
  defaultValues: Record<string, any>;
}

export type OnPopulateFunc = (fieldDefinition: FieldDefinition, fieldBuilder: FieldBuilder) => void;

export type PopulateOptions<P> = {
  populate?: readonly P[];
  onPopulate?: OnPopulateFunc;
}

// the extra query/sort params you always allow
export type SortKey = 'id' | 'type' | 'display_name' | 'updated_at';

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