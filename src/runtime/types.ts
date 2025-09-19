/**
 * ---------------------------------------------------------------------------------------------------------------
 * Some common types for representing Shopify resources and references
 * ---------------------------------------------------------------------------------------------------------------
 */

import type { Article, Collection, Customer, Image, Maybe, MetaobjectCapabilityData, Product, File, ProductTaxonomyNode, ProductVariant, Page } from "../types/admin.types";

export type Reference<T, Required extends boolean = true> = {
  value: Required extends false ? string | null : string;
  reference: Required extends false ? T | null : T;
};

export type ReferenceList<T> = {
  value: string[];
  references: T[];
}

export type JsonObject = unknown;

export type Dimension = { value: number; unit: 'in' | 'ft' | 'yd' | 'mm' | 'cm' | 'm' };
export type Volume = { value: number; unit: 'ml' | 'cl' | 'l' | 'm3' | 'us_fl_oz' | 'us_pt' | 'us_qt' | 'us_gal' | 'imp_fl_oz' | 'imp_pt' | 'imp_qt' | 'imp_gal' };
export type Weight = { value: number; unit: 'oz' | 'lb' | 'g' | 'kg' };
export type Money = { amount: string; currencyCode: string };
export type Link = { text: string; url: string };
export type Rating = { value: string; scaleMax: string; scaleMin: string };

export type ArticleReference = Article;
export type CollectionReference = Collection;
export type CustomerReference = Customer;
export type FileReference = File;
export type PageReference = Page;
export type ProductReference = Product;
export type ProductTaxonomyValueReference = ProductTaxonomyNode;
export type ProductVariantReference = ProductVariant;

/**
 * ---------------------------------------------------------------------------------------------------------------
 * Query helpers
 * ---------------------------------------------------------------------------------------------------------------
 */

export type BaseMetaobject = {
  id: string;
  type: string;
  handle: string;
  displayName: string;
  updatedAt: Date;
  fields: Record<string, unknown>; // List of fields, depending on the actual queried metaobjects
  capabilities?: Maybe<MetaobjectCapabilityData>; // Optional depending on query
  thumbnail?: Maybe<{ // Optional depending on query
    hex: Maybe<string>;
    image: Maybe<Pick<Image, 'id' | 'altText' | 'height' | 'width' | 'url'>>
  }>
}