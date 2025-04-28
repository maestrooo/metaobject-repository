// ────────────────────────────────────────────────────────────────────────
// File: object-repository.ts
// ────────────────────────────────────────────────────────────────────────

import { GenericFile, Image, Metaobject, Video } from "../src/types/admin.types";
import { FieldType, FieldTypeWithValidation, ValidationConfigMap } from "./validations";

type FileTypeVal = "Image" | "Video";

/** Build a discriminated‐union of all possible field definitions */
type FieldDefinitionMap = {
  [T in FieldType]: {
    name: string;
    type: T;
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

// ─────────────────────────────────────────────────────────────────────────────
// Reverse–map from a `type` string back to its definition key
// ─────────────────────────────────────────────────────────────────────────────
type KeyByType<
D extends DefinitionsSchema,
T extends string
> = { [K in keyof D]: D[K]['type'] extends T ? K : never }[keyof D];


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