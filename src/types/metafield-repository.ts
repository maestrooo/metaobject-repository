import { FieldBuilder } from "raku-ql";
import { Metafield, PageInfo } from "./admin.types";
import { MetafieldDefinition } from "./metafield-definitions";

export type PickedMetafield = Pick<Metafield, 'id' | 'compareDigest' | 'type' | 'namespace' | 'key' | 'jsonValue'>;

export type OnPopulateFunc = (fieldDefinition: MetafieldDefinition, fieldBuilder: FieldBuilder) => void;

type CommonFindOptions = {
  owner: string;
  namespace?: string;
  reverse?: boolean;
};

// 1) forward pagination: “first” is required, you may pass “after”,
//    and you must NOT pass “last” or “before”
type ForwardFindOptions = CommonFindOptions & {
  first:  number;
  after?: string;

  // explicitly ban these:
  last?:   never;
  before?: never;
};

// 2) backward pagination: “last” is required, you may pass “before”,
//    and you must NOT pass “first” or “after”
type BackwardFindOptions = CommonFindOptions & {
  last:   number;
  before?: string;

  // explicitly ban these:
  first?: never;
  after?: never;
};

// Union forces “at least one of first|last” and applies the mutual-exclusion rules
export type FindOptions = ForwardFindOptions | BackwardFindOptions;

export type PaginatedMetafields = {
  pageInfo: PageInfo, 
  items: PickedMetafield[]
}