import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { MetafieldDefinitionValidation, MetafieldReference, MetaobjectAccess, MetaobjectCapabilityDataOnlineStore, MetaobjectCapabilityDataPublishable, MetaobjectField, MetaobjectThumbnail } from "~/types/admin.types";

export type PartialMetaobjectField = Pick<MetaobjectField, 'key' | 'type' | 'jsonValue'>;

export type ReferenceTypename = Extract<MetafieldReference['__typename'], string>;

export type ReferenceFragment = Record<ReferenceTypename, string>;

export type MappedProperty = {
  propertyName: string;
}

export type FieldProperty = MappedProperty & {
  name: string;
  key: string;
  type: string;
  list: boolean;
  required: boolean;
  description: string;
  reference?: boolean;
  referenceTypename?: ReferenceTypename;
  entity?: { new (...args: any[]): any };
  validations: Omit<MetafieldDefinitionValidation, 'type'>[];
}

export type EmbeddableFieldProperty = MappedProperty & {
  key: string;
}

export type DynamicFieldsProperty = MappedProperty & {
  keyPrefix: string;
}

export type MetafieldType = 'boolean' | 'list.boolean' | 'color' | 'list.color' | 'date' | 'list.date' | 'date_time' | 'list.date_time'
  | 'dimension' | 'list.dimension' | 'id' | 'list.id' | 'json' | 'link' | 'list.link' | 'money' | 'list.money' | 'multi_line_text_field' 
  | 'number_decimal' | 'list.number_decimal' | 'number_integer' | 'list.number_integer' | 'rating' | 'list.rating' | 'rich_text_field'
  | 'single_line_text_field' | 'list.single_line_text_field' | 'url' | 'list.url' | 'volume' | 'list.volume' | 'weight' | 'list.weight'
  | 'collection_reference' | 'list.collection_reference' | 'file_reference' | 'list.file_reference' | 'customer_reference' | 'list.customer_reference'
  | 'metaobject_reference' | 'list.metaobject_reference' | 'mixed_reference' | 'list.mixed_reference' | 'page_reference' | 'list.page_reference' 
  | 'product_reference' | 'list.product_reference' | 'variant_reference' | 'list.variant_reference' | 'product_taxonomy_value_reference'
  | 'list.product_taxonomy_value_reference';

export type MetaobjectDefinition = {
  type: string;
  name?: string;
  displayNameKey?: string;
  description?: string;
  capabilities: MetaobjectCapabilities;
  access: MetaobjectAccess;
}

export type ClassMetadataKind = 'metaobject' | 'embeddable';

export type ClassMetadata = {
  kind?: ClassMetadataKind
}

export type MetaobjectClassMetadata = ClassMetadata & {
  definition: MetaobjectDefinition;
  fieldDefinitions: FieldProperty[];
  dynamicFieldsDefinition: DynamicFieldsProperty;
}

export type EmbeddableClassMetadata = ClassMetadata & {
  schema?: object;
  fieldDefinitions: EmbeddableFieldProperty[];
};

export type MetaobjectSystem = {
  readonly id: string;
  readonly handle: string;
  readonly displayName: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly thumbnail?: MetaobjectThumbnail;
}

export type MetaobjectCapabilities = {
  publishable: MetaobjectCapabilityDataPublishable;
  onlineStore: MetaobjectCapabilityDataOnlineStore;
}

export type ManagedObject<T> = T & {
  readonly system: MetaobjectSystem;
  readonly capabilities: MetaobjectCapabilities;
}

/** Object manager specific types */

export type SortKey = 'id' | 'type' | 'updated_at' | 'display_name';
export type ForwardPagination = { first: number; after?: string };
export type BackwardPagination = { last: number; before?: string };

export type FindOneWhereOptions = { id: string; handle?: never } | { handle: string; id?: never };

export type FindOneOptions = {
  client: AdminGraphqlClient;
  where: FindOneWhereOptions,
}

export type FindOptions = {
  client: AdminGraphqlClient;
  pagination?: ForwardPagination | BackwardPagination;
  query?: string;
  sortKey?: SortKey;
  reverse?: boolean;
}

export type DeleteOptions =
  | { client: AdminGraphqlClient; id: string; metaobject?: never }
  | { client: AdminGraphqlClient; id?: never; metaobject: ManagedObject<any> };

export type DeleteManyOptions =
  | { client: AdminGraphqlClient; ids: string[]; metaobjects?: never }
  | { client: AdminGraphqlClient; ids?: never; metaobjects: ManagedObject<any>[] };

export type CreateOptions = { client: AdminGraphqlClient; metaobject: object; handle?: string };

export type CreateManyOptions = { client: AdminGraphqlClient; metaobjects: object[] };

export type UpsertOptions = { client: AdminGraphqlClient; metaobject: object; handle?: string };

export type UpdateOptions = { client: AdminGraphqlClient; id: string; metaobject: object };