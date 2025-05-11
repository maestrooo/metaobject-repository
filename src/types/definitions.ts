import { JSONSchema, FromSchema } from "json-schema-to-ts";
import { 
  MetaobjectCapabilitiesOnlineStore, MetaobjectCapabilitiesPublishable, MetaobjectCapabilitiesRenderable, MetaobjectCapabilitiesTranslatable, 
  GenericFile, MediaImage, Metaobject, MetaobjectAccessInput, Product, Video, Collection, Customer, Page, ProductVariant, TaxonomyValue, MetaobjectThumbnail,
  Company, MetaobjectCapabilityDataOnlineStore, MetaobjectCapabilityDataPublishable, File
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
type DefinitionCapabilityConfigMap = {
  onlineStore: MetaobjectCapabilitiesOnlineStore;
  renderable: MetaobjectCapabilitiesRenderable;
  translatable: MetaobjectCapabilitiesTranslatable;
  publishable: MetaobjectCapabilitiesPublishable;
}

// Infer the capabilities from the definition
export type DefinitionCapabilities<D extends DefinitionSchema, T extends D[number]["type"]> =
  DefinitionByType<D, T> extends { capabilities: infer C } ? C : never;

// Get all the keys of the enabled capabilities for a definition
type DefinitionEnabledCapabilityKeys<
  D extends DefinitionSchema,
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
  D extends DefinitionSchema,
  T extends D[number]["type"],
> = {
  [K in DefinitionEnabledCapabilityKeys<D, T> & keyof MetaobjectCapabilityDataMap]:
    MetaobjectCapabilityDataMap[K]
};

/**
 * --------------------------------------------------------------------------------------------
 * Fields
 * --------------------------------------------------------------------------------------------
 */

// The union of all your field‐type keys.
 
type BaseFieldType = 
  FieldTypeWithValidation | "boolean" | "color" | "link" | "money" | "rich_text_field" | 
  "collection_reference" | "customer_reference" | "company_reference" | "file_reference" | "metaobject_reference" | "mixed_reference" | 
  "page_reference" | "product_reference" | "product_taxonomy_value_reference" | "variant_reference";

type ListableFieldType = Exclude<BaseFieldType, 'boolean' | 'rich_text_field' | 'multi_line_text_field' | 'id' | 'money' | 'json'>;

type FieldType = BaseFieldType | `list.${ListableFieldType}`;

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
      ? { readonly metaobjectType?: string }
      : {})
  // only add `metaobjectTypes` on mixed_reference
  & (T extends "mixed_reference" | "list.mixed_reference"
    ? { readonly metaobjectTypes?: readonly string[] }
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
  capabilities?: Partial<DefinitionCapabilityConfigMap>;
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

type PickedFile = Pick<File, 'id' | 'fileStatus' | 'alt' | 'preview'>;
type PickedMediaImage = Pick<MediaImage, 'id' | 'fileStatus' | 'alt' | 'preview' | 'mimeType' | 'originalSource' | 'image'>;
type PickedVideo = Pick<Video, 'id' | 'fileStatus' | 'alt' | 'preview' | 'duration' | 'sources'>;
type PickedGenericFile = Pick<GenericFile, 'id' | 'fileStatus' | 'alt' | 'preview' | 'mimeType' | 'url'>;

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
  json:                             object;
  collection_reference:             string;
  customer_reference:               string;
  company_reference:                string;
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
  json:                             object;
  collection_reference:             Pick<Collection, 'id' | 'handle' | 'title' | 'description' | 'hasProduct' | 'sortOrder' | 'updatedAt' | 'templateSuffix' | 'image'>;
  customer_reference:               Pick<Customer, 'id' | 'displayName' | 'amountSpent' | 'numberOfOrders' | 'email' | 'verifiedEmail' | 'phone' | 'createdAt' | 'updatedAt' | 'locale' | 'image'>;
  company_reference:                Pick<Company, 'id' | 'externalId' | 'name' | 'lifetimeDuration' | 'ordersCount' | 'totalSpent' | 'createdAt' | 'updatedAt'>,
  file_reference:                   PickedFile | PickedMediaImage | PickedVideo | PickedGenericFile;
  metaobject_reference:             Metaobject;
  mixed_reference:                  Metaobject;
  page_reference:                   Pick<Page, 'id' | 'handle' | 'title' | 'body' | 'isPublished' | 'createdAt' | 'updatedAt' | 'templateSuffix'>;
  product_reference:                Pick<Product, 'id' | 'handle' | 'title' | 'productType' | 'status' | 'description' | 'vendor' | 'updatedAt' | 'createdAt' | 'publishedAt' | 'tags' | 'hasOnlyDefaultVariant' | 'variantsCount' | 'templateSuffix' | 'featuredImage'>;
  product_taxonomy_value_reference: Pick<TaxonomyValue, 'id' | 'name'>;
  variant_reference:                Pick<ProductVariant, 'id' | 'title' | 'displayName' | 'sku' | 'price' | 'compareAtPrice' | 'availableForSale' | 'inventoryQuantity' | 'barcode' | 'createdAt' | 'updatedAt' | 'image'>;
};

// 2) “fileTypes” → exact mapping (eg.: if we choose Image, only resolve as MediaImage)

type FileMapping<FT extends FileTypeVal> =
  // exactly IMAGE?
  [FT] extends ["Image"] ? PickedMediaImage :
  // exactly VIDEO?
  [FT] extends ["Video"] ? PickedVideo :
  // no FT declared → allow all
  FT extends never ? PickedMediaImage | PickedVideo | PickedGenericFile :
  // multiple → union of image|video
                     PickedMediaImage | PickedVideo;

/** 
 * If F["required"] is literally `true`, keep T as‐is, 
 * otherwise allow T | null (only for non-list fields)
 */
type MaybeNullableNonList<
  F extends { required?: boolean; type: string },
  T
> =
  // If it’s a list field, leave it alone
  F["type"] extends `list.${string}` ? T
  // Otherwise, if required===true keep T, else T|null
  : F["required"] extends true          ? T
  : T | null;

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
export type ValidPopulatePaths<D extends DefinitionSchema, T extends D[number]["type"]> = RefFieldKeys<D, T> | NestedPopulateKeys<D, T>;

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
  D extends DefinitionSchema,
  T extends D[number]["type"],
  P extends string = never
> = {
  [F in DefinitionByType<D, T>["fields"][number] as CamelCase<F["key"]>]:
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
  D extends DefinitionSchema,
  T extends D[number]["type"],
  P extends string = never
> = FromDefinition<D, T, P> & {
  readonly system: Readonly<{
    type: string;
    id: string;
    handle: string;
    displayName: string;
    capabilities: MetaobjectCapabilitiesFromDefinition<D, T>;
    createdAt: Date;
    updatedAt: Date;
    thumbnail: MetaobjectThumbnail | null;
  }>
}