/**
* THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
* Source: ./shopify.app.dev.toml
*/
import { MetaobjectRepository } from "metaobject-persistence";
    import type { 
      BaseMetaobject, Reference, ReferenceList, JsonObject, Dimension, Volume, Weight, Money, Link, Rating,
      ArticleReference as Article, CollectionReference as Collection, CustomerReference as Customer, FileReference as File,
      PageReference as Page, ProductReference as Product, ProductTaxonomyValueReference as ProductTaxonomyValue,
      ProductVariantReference as ProductVariant
    } from "metaobject-persistence";

export type StoreCategory = BaseMetaobject & {
  fields: {
    name: string;
    markerColor: string;
    hasWifi: boolean;
    markerImage: Reference<File, false>;
    product: Reference<Product, false>;
  };
};

export type CustomField = BaseMetaobject & {
  fields: {
    name: string;
    storeFieldKey: string;
    type: string;
    icon: Reference<File, false>;
    values: string[];
  };
};

export type Filter = BaseMetaobject & {
  fields: {
    name: string;
    customField: Reference<CustomField, true>;
    customFields: ReferenceList<CustomField>;
  };
};

export interface MetaobjectTypeMap {
  "$app:store-category": StoreCategory;
  "$app:custom-field": CustomField;
  "$app:filter": Filter;
}

export type AnyMetaobjectType = keyof MetaobjectTypeMap;

export type AnyMetaobject = MetaobjectTypeMap[AnyMetaobjectType];

// Narrowed overload (literal or K extends keys) + safe fallback
export function repositoryFor<const K extends AnyMetaobjectType>(
  type: K
): MetaobjectRepository<MetaobjectTypeMap[K]>;
export function repositoryFor(type: string): MetaobjectRepository<BaseMetaobject>;
export function repositoryFor(type: string) {
  return new MetaobjectRepository(type);
}
