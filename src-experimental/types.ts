// ────────────────────────────────────────────────────────────────────────
// File: object-repository.ts
// ────────────────────────────────────────────────────────────────────────

import { GenericFile, Image, Metaobject, MetaobjectAccessInput, Video } from "../src/types/admin.types";
import { FieldType, FieldTypeWithValidation, ValidationConfigMap } from "./validations";
import { CapabilityConfigMap, CapabilityInputMap } from "./capabilities";

type FileTypeVal = "Image" | "Video";

/** Build a discriminated‐union of all possible field definitions */
type FieldDefinitionMap = {
  [T in FieldType]: {
    name: string;
    type: T;
    required?: boolean;
  }
  // only add `validations` if T is in our ValidationConfigMap
  & (T extends FieldTypeWithValidation
      ? { validations?: ValidationConfigMap[T] }
      : {})
  // only add `metaobjectType` on metaobject_reference
  & (T extends "metaobject_reference"
      ? { metaobjectType?: string }
      : {});
};

/** Union of all field shapes */
export type FieldDefinition = FieldDefinitionMap[keyof FieldDefinitionMap];

export type DefinitionsSchema = {
  [K: string]: {
    type: string;
    access?: MetaobjectAccessInput,
    capabilities?: Partial<CapabilityConfigMap>;
    fields: readonly FieldDefinition[];
  };
};

/// ──────────────────────────────────────────────────────────────────────
/// 1) Scalar ↔ resource maps
/// ──────────────────────────────────────────────────────────────────────
type DefaultMap = {
  single_line_text_field: string;
  file_reference:         string;
  metaobject_reference:   string;
};

type PopulatedMap = {
  single_line_text_field: string;
  file_reference:         Image;          // fallback for file_reference
  metaobject_reference:   Metaobject;
};

/// ──────────────────────────────────────────────────────────────────────
/// 2) “fileTypes” → exact mapping
/// ──────────────────────────────────────────────────────────────────────

type FileMapping<FT extends FileTypeVal> =
  // exactly IMAGE?
  [FT] extends ["Image"] ? Image :
  // exactly VIDEO?
  [FT] extends ["Video"] ? Video :
  // no FT declared → allow all
  FT extends never ? Image | Video | GenericFile :
  // multiple → union of image|video
                     Image | Video;

/// ──────────────────────────────────────────────────────────────────────
/// 3) Dot‐path helpers
/// ──────────────────────────────────────────────────────────────────────
type Head<S extends string> =
  S extends `${infer H}.${string}` ? H : S;

type Tail<S extends string, H extends string> =
  S extends `${H}.${infer R}` ? R : never;

/// ──────────────────────────────────────────────────────────────────────
/// 4) Core type builder
///
/// FromDefinition<D,K,P> = “take definition K in D,
///  make each field F.name either:
///   • default scalar
///   • populated scalar (Image, Metaobject)
///   • nested FromDefinition recurse if metaobject_reference + metaobjectType
///   • special FileMapping if file_reference + validations.fileTypes
/// ”
/// ──────────────────────────────────────────────────────────────────────
export type FromDefinition<
  D extends DefinitionsSchema,
  K extends keyof D,
  P extends string = never
> = { type: string } & {
  [F in D[K]["fields"][number] as F["name"]]:
    F["name"] extends Head<P>
      ? (
          F["type"] extends "metaobject_reference"
            ? F extends { metaobjectType: infer MT extends string }
              ? // find the key in D whose `.type === MT`
                FromDefinition<
                  D,
                  { [K2 in keyof D]: D[K2]["type"] extends MT ? K2 : never }[keyof D],
                  Tail<P, F["name"]>
                >
              : PopulatedMap["metaobject_reference"]

          : F["type"] extends "file_reference"
            ? F extends { validations: { fileTypes: infer FT extends readonly FileTypeVal[] } }
              ? FileMapping<FT[number]>
              : FileMapping<never>

          : PopulatedMap[F["type"] & keyof PopulatedMap]
        )
      : DefaultMap[F["type"] & keyof DefaultMap];
};

type DefCaps<D extends DefinitionsSchema, K extends keyof D> =
  D[K] extends { capabilities: infer C } ? keyof C : never;

/**
 * **NEW**: Build the **input** type for `.create()` automatically,
 * using the DefaultMap for each field’s type.
 */
type FieldDef<D extends DefinitionsSchema, K extends keyof D> = D[K]["fields"][number];

type RequiredNames<D extends DefinitionsSchema, K extends keyof D> =
  Extract<FieldDef<D,K>, { required: true }>["name"];

type OptionalNames<D extends DefinitionsSchema, K extends keyof D> =
  Exclude<FieldDef<D,K>["name"], RequiredNames<D,K>>;

export type FieldsInput<
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

/** 7. Build capabilities‐input for only those defined */
export type CapabilitiesInput<
  D extends DefinitionsSchema,
  K extends keyof D
> = Partial<{
  [C in DefCaps<D,K>]: CapabilityInputMap[C]
}>;

export type CreateInput<
  D extends DefinitionsSchema,
  K extends keyof D
> = {
  /** Optional handle override */
  handle?: string;

  /** Capabilites */
  capabilities?: CapabilitiesInput<D, K>;

  /** The actual fields payload */
  fields: FieldsInput<D, K>;
}

export type UpdateInput<
  D extends DefinitionsSchema,
  K extends keyof D
> = {
  id: string;
  
  /** Optional handle override */
  handle?: string;

  /** Optionally redirect */
  redirectNewHandle?: boolean;

  /** Capabilites */
  capabilities?: CapabilitiesInput<D, K>;

  /** The actual fields payload */
  fields: FieldsInput<D, K>;
}

export type UpsertInput<
  D extends DefinitionsSchema,
  K extends keyof D
> = {
  /** Optional handle override */
  handle?: string;

  /** Capabilites */
  capabilities?: CapabilitiesInput<D, K>;

  /** The actual fields payload */
  fields: FieldsInput<D, K>;
}

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