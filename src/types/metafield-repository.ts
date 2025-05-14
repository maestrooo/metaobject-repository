import { FieldBuilder } from "raku-ql";
import { Metafield, PageInfo } from "./admin.types";
import { MetafieldDefinition } from "./metafield-definitions";
import { PaginationArgs } from "./utils";

export type PickedMetafield = Pick<Metafield, 'id' | 'compareDigest' | 'type' | 'namespace' | 'key' | 'jsonValue'>;

export type OnPopulateFunc = (fieldDefinition: MetafieldDefinition, fieldBuilder: FieldBuilder) => void;

type CommonFindOptions = {
  owner: string;
  namespace?: string;
  reverse?: boolean;
};

// Union forces “at least one of first|last” and applies the mutual-exclusion rules
export type FindOptions = CommonFindOptions & (PaginationArgs<"forward"> | PaginationArgs<"backward">);

export type PaginatedMetafields = {
  pageInfo: PageInfo, 
  items: PickedMetafield[]
}