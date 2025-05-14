import { JSONSchema, FromSchema } from "json-schema-to-ts";
import { MetaobjectAccessInput, MetaobjectThumbnail, MetaobjectCapabilityDataOnlineStore, MetaobjectCapabilityDataPublishable, MetaobjectCapabilityCreateInput } from "~/types/admin.types";
import { BaseFieldType, DefaultMap, FileMapping, FileTypeVal, MaybeNullableNonList, PopulatedMap } from "./fields";
import { AllowRawEnum, CamelCase, CamelCaseKeys, Head, Tail } from "./utils";
import { MetafieldBaseDefinition } from "./metafield-definitions";

/**
 * --------------------------------------------------------------------------------------------
 * Capabilitities
 * --------------------------------------------------------------------------------------------
 */

// Infer the capabilities from the definition
export type DefinitionCapabilities<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> =
  MetaobjectDefinitionByType<D, T> extends { capabilities: infer C } ? C : never;

// Get all the keys of the enabled capabilities for a definition
type DefinitionEnabledCapabilityKeys<
  D extends MetaobjectDefinitionSchema,
  T extends D[number]["type"],
> = {
  [K in keyof DefinitionCapabilities<D, T>]:
  DefinitionCapabilities<D, T>[K] extends { enabled: true } ? K : never
}[keyof DefinitionCapabilities<D, T>];

// Metaobject-level capability shapes
type MetaobjectCapabilityDataMap = {
  onlineStore: Omit<MetaobjectCapabilityDataOnlineStore, '__typename'>;
  publishable: Omit<MetaobjectCapabilityDataPublishable, '__typename'>;
};

// Extract the capabilities data for metaobject given the definition capabilities
type MetaobjectCapabilitiesFromDefinition<
  D extends MetaobjectDefinitionSchema,
  T extends D[number]["type"],
> = {
  [K in DefinitionEnabledCapabilityKeys<D, T> & keyof MetaobjectCapabilityDataMap]:
    MetaobjectCapabilityDataMap[K]
};

/**
 * --------------------------------------------------------------------------------------------
 * Field definitions
 * --------------------------------------------------------------------------------------------
 */

/** Union of all field shapes */
export type MetaobjectFieldDefinition = MetafieldBaseDefinition & {
  required?: boolean;
}

export type MetaobjectDefinitionSchemaEntry = {
  type: string;
  name: string;
  description?: string;
  displayNameKey?: string;
  access?: AllowRawEnum<MetaobjectAccessInput>;
  capabilities?: MetaobjectCapabilityCreateInput;
  fields: readonly MetaobjectFieldDefinition[];
};

export type MetaobjectDefinitionSchema = MetaobjectDefinitionSchemaEntry[];

export type MetaobjectDefinitionByType<L extends MetaobjectDefinitionSchema, T extends L[number]["type"]> = Extract<L[number], { type: T }>;

/**
 * --------------------------------------------------------------------------------------------
 * Black magic
 *
 * Those types were generated mostly by ChatGPT. This is where the magic happens to make all
 * the autocompletion works.
 * --------------------------------------------------------------------------------------------
 */

// Build union of all reference‐field keys in D[K]
type RefFieldKeys<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> =
  // pick the one entry whose `type` is T
  MetaobjectDefinitionByType<D, T>["fields"][number] extends infer F
    ? F extends { key: infer K extends string; type: infer Ty extends string }
      ? Ty extends `${string}_reference` | `list.${string}_reference`
        // camel-case the key  
        ? CamelCase<K>
        : never
      : never
    : never;

// Build union of nested reference-paths for fields with `metaobjectType`
type NestedPopulateKeys<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> =
  MetaobjectDefinitionByType<D, T>["fields"][number] extends infer F
  ? F extends { key: infer K extends string; type: infer Ty extends string }
      ? Ty extends `${string}_reference` | `list.${string}_reference`
          ? // single‐type case:
            F extends { metaobjectType: infer MT extends D[number]["type"] }
              ? `${CamelCase<K>}.${ValidPopulatePaths<D, MT>}`
            // mixed‐type case:
              : F extends { metaobjectTypes: infer MTs extends readonly D[number]["type"][] }
                ? `${CamelCase<K>}.${ValidPopulatePaths<D, MTs[number]>}`
              : never
          : never
      : never
  : never;

// Combine into the full union of valid populate paths
export type ValidPopulatePaths<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> = RefFieldKeys<D, T> | NestedPopulateKeys<D, T>;

// ──────────────────────────────────────────────────────────────────────
// Core builder
//
// FromDefinition<D,K,P> = “take definition K in D,
//  make each field F.key either:
//   • default scalar
//   • populated scalar (Image, Metaobject)
//   • nested FromDefinition recurse if metaobject_reference + metaobjectType
//   • nested FromDefinition recurse if mixed_reference + metaobjectTypes
//   • special FileMapping if file_reference + validations.fileTypeOptions
// ──────────────────────────────────────────────────────────────────────

export type FromDefinition<
  D extends MetaobjectDefinitionSchema,
  T extends D[number]["type"],
  P extends string = never
> = {
  [F in MetaobjectDefinitionByType<D, T>["fields"][number] as CamelCase<F["key"]>]:
    MaybeNullableNonList<F, 
      F["type"] extends "json"
        ? (
          F extends { validations: { schema: infer S extends JSONSchema } }
            ? CamelCaseKeys<FromSchema<S>>
            : object
        )
      // a) LIST fields
      : F["type"] extends `list.${infer U extends BaseFieldType}`
        ? CamelCase<F["key"]> extends Head<P>
          // populated
          ? (
              // mixed_reference → array of union
              U extends "mixed_reference"
                ? F extends { metaobjectTypes: infer MTE extends readonly D[number]["type"][] }
                  ? Array<FromDefinitionWithSystemData<D, MTE[number], Tail<P, CamelCase<F["key"]>>>>
                  : Array<PopulatedMap["mixed_reference"]>
              // metaobject_reference → array of object
              : U extends "metaobject_reference"
                ? F extends { metaobjectType: infer MT extends string }
                  ? Array<FromDefinitionWithSystemData<D, MT, Tail<P, CamelCase<F["key"]>>>>
                  : Array<PopulatedMap["metaobject_reference"]>
              // file_reference → array of FileMapping
              : U extends "file_reference"
                ? F extends { validations: { fileTypeOptions: infer FT extends readonly FileTypeVal[] } }
                  ? Array<FileMapping<FT[number]>>
                  : Array<FileMapping<never>>
              // fallback → array of default/populated scalar
              : Array<PopulatedMap[U & keyof PopulatedMap]>
            )
          // — **not** populated → fall back to the scalar/string form
          : Array<DefaultMap[U & keyof DefaultMap]>
        // b) NON-list & populated
        : CamelCase<F["key"]> extends Head<P>
          ? (
              // mixed_reference → union
              F["type"] extends "mixed_reference"
                ? F extends { metaobjectTypes: infer MTE extends readonly D[number]["type"][] }
                  ? FromDefinitionWithSystemData<D, MTE[number], Tail<P, CamelCase<F["key"]>>>
                  : PopulatedMap["mixed_reference"]
              // metaobject_reference → object
              : F["type"] extends "metaobject_reference"
                ? F extends { metaobjectType: infer MT extends string }
                  ? FromDefinitionWithSystemData<D, MT, Tail<P, CamelCase<F["key"]>>>
                  : PopulatedMap["metaobject_reference"]
              // file_reference → FileMapping
              : F["type"] extends "file_reference"
                ? F extends { validations: { fileTypeOptions: infer FT extends readonly FileTypeVal[] } }
                  ? FileMapping<FT[number]>
                  : FileMapping<never>
              // fallback → populated scalar
              : PopulatedMap[F["type"] & keyof PopulatedMap]
            )
        // c) fallback → default scalar
        : DefaultMap[F["type"] & keyof DefaultMap]
    >;
}

// Extra type adding system information when the object is populated from Shopify
export type FromDefinitionWithSystemData<
  D extends MetaobjectDefinitionSchema,
  T extends D[number]["type"],
  P extends string = never
> = FromDefinition<D, T, P> & {
  readonly system: Readonly<{
    type: string;
    id: string;
    handle: string;
    displayName: string;
    capabilities: MetaobjectCapabilitiesFromDefinition<D, T>;
    /*createdAt: Date;*/
    updatedAt: Date;
    thumbnail: MetaobjectThumbnail | null;
  }>
}