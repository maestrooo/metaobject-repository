import { Image } from "../types/admin.types";

export type Job = {
  done: boolean;
  id: string;
}

export type MetaobjectGid = `gid://shopify/Metaobject/${string}`;

export type MetaobjectThumbnail = {
  hex?: string | null;
  image?: Pick<Image, 'id' | 'altText' | 'url' | 'width' | 'height'> | null;
}

export type MetaobjectSystemData = {
  id: MetaobjectGid;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
  displayName: string;
  thumbnail: MetaobjectThumbnail;
}

export type ManagedMetaobject<T> = T & {
  readonly system: MetaobjectSystemData;
}

export type Reference<T> = string | T | null;

export type ForwardPagination = {
  after?: string;
  first?: number;
  before?: never;
  last?: never;
}

export type BackwardPagination = {
  before?: string;
  last?: number;
  after?: never;
  first?: never;
}

export type FindOneOptions = {
  populate?: string[];
};

export type FindOptions = {
  query?: string;
  sortBy?: 'id' | 'type' | 'updated_at' | 'display_name';
  reverse?: boolean;
  populate?: string[];
} & (ForwardPagination | BackwardPagination);

export type MetaobjectCreateInput<T> = {
  object: T;
  handle: string;
}

export type MetaobjectUpsertInput<T> = {
  object: T;
  handle: string;
}