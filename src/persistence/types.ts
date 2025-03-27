export type Job = {
  done: boolean;
  id: string;
}

export type MetaobjectGid = `gid://shopify/Metaobject/${string}`;

export type MetaobjectSystemData = {
  id: MetaobjectGid;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
  displayName: string;
}

export type ManagedMetaobject<T> = T & {
  system: MetaobjectSystemData;
}

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

export type FindOptions = {
  query?: string;
  sortBy?: 'id' | 'type' | 'updated_at' | 'display_name';
  reverse?: boolean;
} & (ForwardPagination | BackwardPagination);

export type MetaobjectCreateInput<T> = {
  object: T;
  handle: string;
}

export type MetaobjectUpsertInput<T> = {
  object: T;
  handle: string;
}