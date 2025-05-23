/**
 * Those types are used to create automatique input types for the object repository, based on the schema
 * provided. Specifically, it creates a `CreateInput`, `UpdateInput`, `UpsertInput`. It also inspects the
 * schema to auto-complete capabilities.
 */

import type { JSONSchema, FromSchema } from "json-schema-to-ts";
import type { MetaobjectCapabilityDataInput, PageInfo } from "./admin.types";
import type { MetaobjectDefinitionByType, DefinitionCapabilities, MetaobjectDefinitionSchema, FromDefinitionWithSystemData, ValidPopulatePaths } from "./metaobject-definitions";
import type { DefaultMap } from "./fields";
import { MetaobjectRepository } from "~/metaobjects/metaobject-repository";
import type { CamelCase, CamelCaseKeys, PaginationArgs } from "./utils";
import type { OnPopulateFunc } from "~/utils/builder";

/**
 * --------------------------------------------------------------------------------------------
 * Types for building the input types
 * --------------------------------------------------------------------------------------------
 */

type DefinitionEnabledCapabilityKeys<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> = {
  [K in keyof DefinitionCapabilities<D, T>]:
    DefinitionCapabilities<D, T>[K] extends { enabled: true } ? K : never
}[keyof DefinitionCapabilities<D, T>];

type FieldDef<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> = MetaobjectDefinitionByType<D, T>["fields"][number];

type FieldDefByKey<D extends MetaobjectDefinitionSchema, T extends D[number]["type"], P extends string> = Extract<
  MetaobjectDefinitionByType<D, T>["fields"][number],
  { key: P }
>;

type JsonFieldInput<D extends MetaobjectDefinitionSchema, T extends D[number]["type"], P extends string> =
  FieldDefByKey<D, T, P> extends { validations: { schema: infer S extends JSONSchema } }
    ? CamelCaseKeys<FromSchema<S>>
    : object;

type RequiredKeys<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> =
  Extract<FieldDef<D, T>, { required: true }>["key"];

type OptionalKeys<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> =
  Exclude<FieldDef<D, T>["key"], RequiredKeys<D, T>>;

type FieldTypeOf<D extends MetaobjectDefinitionSchema, T extends D[number]["type"], P extends string> =
  Extract<
    MetaobjectDefinitionByType<D, T>["fields"][number],
    { key: P }
  >["type"];

export type FieldsInput<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> = {
  // required fields
  [P in RequiredKeys<D, T> as CamelCase<P>]:
    FieldTypeOf<D, T, P> extends "json"
      ? JsonFieldInput<D, T, P>
    : FieldTypeOf<D, T, P> extends `list.${infer U}`
      ? Array<DefaultMap[U & keyof DefaultMap]>        // list → array
      : DefaultMap[FieldTypeOf<D, T, P> & keyof DefaultMap];  // scalar
} & {
  // optional fields
  [P in OptionalKeys<D, T> as CamelCase<P>]?: 
    FieldTypeOf<D, T, P> extends "json"
      ? JsonFieldInput<D, T, P>
    : FieldTypeOf<D, T, P> extends `list.${infer U}`
      ? Array<DefaultMap[U & keyof DefaultMap]>
      : DefaultMap[FieldTypeOf<D, T, P> & keyof DefaultMap];
};

// Build capabilities‐input for only those defined
type CapabilitiesInput<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> = Partial<{
  [C in DefinitionEnabledCapabilityKeys<D, T> & keyof MetaobjectCapabilityDataInput]: MetaobjectCapabilityDataInput[C];
}>

export type CreateInput<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> = {
  handle?: string;
  capabilities?: CapabilitiesInput<D, T>;
  fields: FieldsInput<D, T>;
}

export type UpdateInput<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> = {
  id: string;
  handle?: string;
  redirectNewHandle?: boolean;
  capabilities?: CapabilitiesInput<D, T>;
  fields: Partial<FieldsInput<D, T>>; // When updating everything is partial
}

export type UpsertInput<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> = {
  handle?: string;
  capabilities?: CapabilitiesInput<D, T>;
  fields: Partial<FieldsInput<D, T>>; // When upserting everything is partial
}

/**
 * --------------------------------------------------------------------------------------------
 * Types for pagination, find options
 * --------------------------------------------------------------------------------------------
 */

export type PopulateOptions<P, C extends boolean = false, Th extends boolean = false> = {
  includeCapabilities?: C;
  includeThumbnail?: Th;
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

// Union forces “at least one of first|last” and applies the mutual-exclusion rules
export type FindOptions = CommonFindOptions & (PaginationArgs<"forward"> | PaginationArgs<"backward">);

export type PaginatedMetaobjects<D extends MetaobjectDefinitionSchema, T extends D[number]["type"], P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false> = {
  pageInfo: PageInfo, 
  items: FromDefinitionWithSystemData<D, T, P, C, Th>[] 
}

/**
 * --------------------------------------------------------------------------------------------
 * Utility types
 * --------------------------------------------------------------------------------------------
 */

export type InferObjectType<A, B = never, C extends any[] = []> =
  // ————————————————————————————————————————————————————————————————————————
  // 1) if A is a MetaobjectRepository<D,T>, 
  //    then B is the array of populate-paths:
  A extends MetaobjectRepository<infer D, infer T>
    ? // "no B supplied" check:
      [B] extends [never]
        ? FromDefinitionWithSystemData<D, T, never>
        : // otherwise validate your array of paths:
        B extends ValidPopulatePaths<D, T>[]
          ? FromDefinitionWithSystemData<D, T, B[number]>
          : never
  // ————————————————————————————————————————————————————————————————————————
  // 2) otherwise if A is a raw DefinitionSchema, 
  //    B is the object-type string, C is the populate-paths array:
  : A extends MetaobjectDefinitionSchema
    ? B extends A[number]['type']
      ? C extends ValidPopulatePaths<A, B>[]
        ? FromDefinitionWithSystemData<A, B, C[number]>
        : never
      : never
  : never;