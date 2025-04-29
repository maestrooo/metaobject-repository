import { 
  MetaobjectCapabilitiesOnlineStore, MetaobjectCapabilitiesPublishable, MetaobjectCapabilitiesRenderable, MetaobjectCapabilitiesTranslatable, 
  MetaobjectCapabilityOnlineStoreInput, MetaobjectCapabilityPublishableInput, GenericFile, Image, Metaobject, MetaobjectAccessInput, 
  Product, Video, Collection, Customer, Page, ProductVariant, TaxonomyValue, MetaobjectCapabilityData, MetaobjectThumbnail
} from "~/types/admin.types";

/**
 * --------------------------------------------------------------------------------------------
 * Base type
 * --------------------------------------------------------------------------------------------
 */

type Weight = {
  unit: 'oz' | 'lb' | 'g' | 'kg';
  value: number;
}

type Volume = {
  unit: 'ml' | 'cl' | 'l' | 'm3' | 'us_fl_oz' | 'us_pt' | 'us_qt' | 'us_gal' | 'imp_fl_oz' | 'imp_pt' | 'impt_qt' | 'imp_gal';
  value: number;
}

type Dimension = {
  unit: 'in' | 'ft' | 'yd' | 'mm' | 'cm' | 'm';
  value: number;
}

type Link = {
  text: string;
  url: string;
}

type Money = {
  amount: string;
  currencyCode: string;
}

type Rating = {
  value: string;
  scaleMin: string;
  scaleMax: string;
}

/**
 * --------------------------------------------------------------------------------------------
 * Validations
 * --------------------------------------------------------------------------------------------
 */

type FileTypeVal = "Image" | "Video";

// Map each field‐`type` to the _shape_ of its possible validations.
type ValidationConfigMap = {
  single_line_text_field: {
    min?: number;
    max?: number;
    regex?: string;
    choices?: string[];
  };
  multi_line_text_field: {
    min?: number;
    max?: number;
    regex?: string;
  };
  id: {
    min?: number;
    max?: number;
    regex?: string;
  };
  url: {
    allowedDomains?: string[]
  };
  number_decimal: {
    maxPrecision?: number;
    min?: number;
    max?: number;
  };
  number_integer: {
    min?: number;
    max?: number;
  };
  date: {
    min?: string;
    max?: string;
  };
  date_time: {
    min?: string;
    max?: string;
  };
  weight: {
    min?: Weight;
    max?: Weight;
  };
  volume: {
    min?: Volume;
    max?: Volume;
  };
  dimension: {
    min?: Dimension;
    max?: Dimension;
  };
  rating: {
    min?: number;
    max?: number;
  }
  file_reference: {
    fileTypeOptions?: FileTypeVal[];
  };
  json: {
    schema?: object;
  }
}

type FieldTypeWithValidation = keyof ValidationConfigMap;

/**
 * --------------------------------------------------------------------------------------------
 * Capabilitities
 * --------------------------------------------------------------------------------------------
 */

// Definition‐level capability shapes
type CapabilityConfigMap = {
  onlineStore: MetaobjectCapabilitiesOnlineStore;
  renderable: MetaobjectCapabilitiesRenderable;
  translatable: MetaobjectCapabilitiesTranslatable;
  publishable: MetaobjectCapabilitiesPublishable;
}

// Create‐time input for each capability
export type CapabilityInputMap = {
  onlineStore: MetaobjectCapabilityOnlineStoreInput;
  publishable: MetaobjectCapabilityPublishableInput;
}

/**
 * --------------------------------------------------------------------------------------------
 * Fields
 * --------------------------------------------------------------------------------------------
 */

// The union of all your field‐type keys.
 
type BaseFieldType = 
  FieldTypeWithValidation | "boolean" | "color" | "link" | "money" | "rich_text_field" | 
  "collection_reference" | "customer_reference" | "file_reference" | "metaobject_reference" | "mixed_reference" | 
  "page_reference" | "product_reference" | "product_taxonomy_value_reference" | "variant_reference";
type FieldType = BaseFieldType | `list.${BaseFieldType}`;
type ListElement<T extends FieldType> = T extends `list.${infer U}` ? U : never;

// Build a discriminated‐union of all possible field definitions
type FieldDefinitionMap = {
  [T in FieldType]: {
    name: string;
    type: T;
    key: string;
    required?: boolean;
    description?: string;
  }
  // only add `validations` if T is in our ValidationConfigMap, and add listMin and listMax to any list type
  & (T extends `list.${string}`
    ? {
        validations?: (
          ListElement<T> extends FieldTypeWithValidation
            ? ValidationConfigMap[ListElement<T>]
            : {}
        ) & {
          listMin?: number;
          listMax?: number;
        };
      }
    : T extends FieldTypeWithValidation
      ? { validations?: ValidationConfigMap[T] }
      : {})
  // only add `metaobjectType` on metaobject_reference
  & (T extends "metaobject_reference" | "list.metaobject_reference"
      ? { metaobjectType?: string }
      : {})
  // only add `metaobjectTypes` on mixed_reference
  & (T extends "mixed_reference" | "list.mixed_reference"
    ? { metaobjectTypes?: string[] }
    : {});
};

/** Union of all field shapes */
export type FieldDefinition = FieldDefinitionMap[keyof FieldDefinitionMap];

export type DefinitionSchemaEntry = {
  type: string;
  name: string;
  description?: string;
  displayNameKey?: string;
  access?: MetaobjectAccessInput;
  capabilities?: Partial<CapabilityConfigMap>;
  fields: readonly FieldDefinition[];
};

export type DefinitionSchema = DefinitionSchemaEntry[];

export type DefinitionByType<L extends DefinitionSchema, T extends L[number]["type"]> = Extract<L[number], { type: T }>;

/**
 * --------------------------------------------------------------------------------------------
 * Field mapping
 *
 * By default, all fields (including references) are returned as a string identifier. However,
 * thanks to GraphQL flexibility, we can populate dependencies. When a given key is populated,
 * the type is replaced by the actual resource type.
 * --------------------------------------------------------------------------------------------
 */

// 1) Scalar ↔ resource maps

export type DefaultMap = {
  boolean:                          boolean;
  color:                            string;
  date:                             string;
  date_time:                        string;
  dimension:                        Dimension;
  id:                               string;
  link:                             Link;
  money:                            Money;
  multi_line_text_field:            string;
  number_decimal:                   number;
  number_integer:                   number;
  rating:                           Rating;
  rich_text_field:                  string;
  single_line_text_field:           string;
  url:                              string;
  volume:                           Volume;
  weight:                           Weight;
  collection_reference:             string;
  customer_reference:               string;
  file_reference:                   string;
  metaobject_reference:             string;
  mixed_reference:                  string;
  page_reference:                   string;
  product_reference:                string;
  product_taxonomy_value_reference: string;
  variant_reference:                string;
};

export type PopulatedMap = {
  boolean:                          boolean;
  color:                            string;
  date:                             string;
  date_time:                        string;
  dimension:                        Dimension;
  id:                               string;
  link:                             Link;
  money:                            Money;
  multi_line_text_field:            string;
  number_decimal:                   number;
  number_integer:                   number;
  rating:                           Rating;
  rich_text_field:                  string;
  single_line_text_field:           string;
  url:                              string;
  volume:                           Volume;
  weight:                           Weight;
  collection_reference:             Collection;
  customer_reference:               Customer;
  file_reference:                   Image; // Fallback to image
  metaobject_reference:             Metaobject;
  mixed_reference:                  Metaobject;
  page_reference:                   Page;
  product_reference:                Product;
  product_taxonomy_value_reference: TaxonomyValue;
  variant_reference:                ProductVariant;
};

// 2) “fileTypes” → exact mapping (eg.: if we choose Image, only resolve as Image)

type FileMapping<FT extends FileTypeVal> =
  // exactly IMAGE?
  [FT] extends ["Image"] ? Image :
  // exactly VIDEO?
  [FT] extends ["Video"] ? Video :
  // no FT declared → allow all
  FT extends never ? Image | Video | GenericFile :
  // multiple → union of image|video
                     Image | Video;

/**
 * --------------------------------------------------------------------------------------------
 * Black magic
 *
 * Those types were generated mostly by ChatGPT. This is where the magic happens to make all
 * the autocompletion works.
 * --------------------------------------------------------------------------------------------
 */

type Head<S extends string> =
  S extends `${infer H}.${string}` ? H : S;

type Tail<S extends string, H extends string> =
  S extends `${H}.${infer R}` ? R : never;

export type CamelCase<S extends string> =
    S extends `${infer Head}_${infer Tail}`     ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : S extends `${infer Head} ${infer Tail}`     ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : S extends `${infer Head}-${infer Tail}`     ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : Lowercase<S>;

// Build union of all reference‐field keys in D[K]
type RefFieldKeys<D extends DefinitionSchema, T extends D[number]["type"]> =
  // pick the one entry whose `type` is T
  DefinitionByType<D, T>["fields"][number] extends infer F
    ? F extends { key: infer K extends string; type: infer Ty extends string }
      ? Ty extends `${string}_reference` | `list.${string}_reference`
        // camel-case the key  
        ? CamelCase<K>
        : never
      : never
    : never;

// Build union of nested reference-paths for fields with `metaobjectType`
type NestedPopulateKeys<D extends DefinitionSchema, T extends D[number]["type"]> =
  DefinitionByType<D, T>["fields"][number] extends infer F
    ? F extends {
        key: infer K extends string;
        type: infer Ty extends string;
        metaobjectType: infer MT extends D[number]["type"];
      }
      ? Ty extends `${string}_reference` | `list.${string}_reference`
        ? `${CamelCase<K>}.${ValidPopulatePaths<D, MT>}`
        : never
      : never
    : never;

// Combine into the full union of valid populate paths
export type ValidPopulatePaths<D extends DefinitionSchema, T extends D[number]["type"]> = RefFieldKeys<D, T> | NestedPopulateKeys<D, T>;

// ──────────────────────────────────────────────────────────────────────
// Core builder
//
// FromDefinition<D,K,P> = “take definition K in D,
//  make each field F.key either:
//   • default scalar
//   • populated scalar (Image, Metaobject)
//   • nested FromDefinition recurse if metaobject_reference + metaobjectType
//   • special FileMapping if file_reference + validations.fileTypeOptions
// ──────────────────────────────────────────────────────────────────────

export type FromDefinition<
  D extends DefinitionSchema,
  T extends D[number]["type"],
  P extends string = never
> = {
  [F in DefinitionByType<D, T>["fields"][number] as CamelCase<F["key"]>]:
    // a) LIST variant?
    F["type"] extends `list.${infer U extends BaseFieldType}`
      ? Array<
          U extends "metaobject_reference"
            ? F extends { metaobjectType: infer MT extends string }
              ? FromDefinition<D, MT, Tail<P, CamelCase<F["key"]>>>
              : PopulatedMap["metaobject_reference"]
          : U extends "file_reference"
            ? F extends { validations: { fileTypeOptions: infer FT extends readonly FileTypeVal[] } }
              ? FileMapping<FT[number]>
              : FileMapping<never>
          : PopulatedMap[U & keyof PopulatedMap]
        >

    // b) Non-list but populated?
    : CamelCase<F["key"]> extends Head<P>
      ? (
          F["type"] extends "metaobject_reference"
            ? F extends { metaobjectType: infer MT extends string }
              ? FromDefinition<D, MT, Tail<P, CamelCase<F["key"]>>>
              : PopulatedMap["metaobject_reference"]
          : F["type"] extends "file_reference"
            ? F extends { validations: { fileTypeOptions: infer FT extends readonly FileTypeVal[] } }
              ? FileMapping<FT[number]>
              : FileMapping<never>
          : PopulatedMap[F["type"] & keyof PopulatedMap]
        )

    // c) Fallback to default scalar (which is always a string)
    : DefaultMap[F["type"] & keyof DefaultMap];
};

// Extra type adding system information when the object is populated from Shopify
export type FromDefinitionWithSystemData<
  D extends DefinitionSchema,
  T extends D[number]["type"],
  P extends string = never
> = FromDefinition<D, T, P> & {
  system: {
    id: string;
    handle: string;
    displayName: string;
    capabilities: MetaobjectCapabilityData;
    createdAt: Date;
    updatedAt: Date;
    thumbnail: MetaobjectThumbnail | null;
  }
}