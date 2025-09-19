export const GetByHandleQuery = `#graphql
  query GetMetaobjectByHandle($handle: MetaobjectHandleInput!, $includeCapabilities: Boolean!, $includeThumbnail: Boolean!, $populateReference: Boolean!, $populateReferenceList: Boolean!) {
    metaobjectByHandle(handle: $handle) {
      ...Metaobject
    }
  }
`;