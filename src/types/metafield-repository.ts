import { OnPopulateWithoutDefinitionFunc } from "~/utils/builder";
import { Metafield, MetafieldsSetInput, PageInfo } from "./admin.types";
import { PaginationArgs } from "./utils";

export type PickedMetafield = Pick<Metafield, 'id' | 'compareDigest' | 'type' | 'namespace' | 'key' | 'jsonValue'>;
export type PickedMetafieldWithReference<T> = PickedMetafield & { reference?: T; references?: T[] };

// To make it easier to work with metafields, we allow passign any kind of value for the `value`, and then we serialize
// it to the correct type
export type LooseMetafieldsSetInput = Omit<MetafieldsSetInput, 'value'> & {
  value: any
}

type CommonFindOptions = {
  owner: string;
  namespace?: string;
  reverse?: boolean;
  onPopulate?: OnPopulateWithoutDefinitionFunc;
};

// Union forces “at least one of first|last” and applies the mutual-exclusion rules
export type FindOptions = CommonFindOptions & (PaginationArgs<"forward"> | PaginationArgs<"backward">);

export type PaginatedMetafields = {
  pageInfo: PageInfo, 
  items: PickedMetafield[]
}

export type PaginatedMetafieldsWithReference<T> = {
  pageInfo: PageInfo;
  items: PickedMetafieldWithReference<T>[];
};