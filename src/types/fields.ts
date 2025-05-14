/**
 * --------------------------------------------------------------------------------------------
 * Base type
 * --------------------------------------------------------------------------------------------
 */

import { Collection, Company, Customer, File, GenericFile, MediaImage, Metaobject, Page, Product, ProductVariant, TaxonomyValue, Video } from "./admin.types";

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

export type FileTypeVal = "Image" | "Video";

// Map each field‐`type` to the _shape_ of its possible validations.
export type ValidationConfigMap = {
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

export type FieldTypeWithValidation = keyof ValidationConfigMap;

export type BaseFieldType = 
  FieldTypeWithValidation | "boolean" | "color" | "link" | "money" | "rich_text_field" | 
  "collection_reference" | "customer_reference" | "company_reference" | "file_reference" | "metaobject_reference" | "mixed_reference" | 
  "page_reference" | "product_reference" | "product_taxonomy_value_reference" | "variant_reference";

export type ListableFieldType = Exclude<BaseFieldType, 'boolean' | 'rich_text_field' | 'multi_line_text_field' | 'id' | 'money' | 'json'>;

export type FieldType = BaseFieldType | `list.${ListableFieldType}`;

export type ListElement<T extends FieldType> = T extends `list.${infer U}` ? U : never;

export type FieldValidations<T extends FieldType> =
  // List fields with validation
  (T extends `list.${string}`
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
  // Metaobject reference
  & (T extends "metaobject_reference" | "list.metaobject_reference"
      ? { readonly metaobjectType?: string }
      : {})
  // Mixed reference
  & (T extends "mixed_reference" | "list.mixed_reference"
      ? { readonly metaobjectTypes?: readonly string[] }
      : {});

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
type PickedMediaImage = Pick<MediaImage, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'mimeType' | 'originalSource' | 'image'>;
type PickedVideo = Pick<Video, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'duration' | 'sources'>;
type PickedGenericFile = Pick<GenericFile, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'mimeType' | 'url'>;

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

export type FileMapping<FT extends FileTypeVal> =
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
export type MaybeNullableNonList<F extends { required?: boolean; type: string }, T> =
  // If it’s a list field, leave it alone
  F["type"] extends `list.${string}` ? T
  // Otherwise, if required===true keep T, else T|null
  : F["required"] extends true          ? T
  : T | null;