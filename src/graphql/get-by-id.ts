export const GetByIdQuery = `#graphql
  query GetMetaobjectById($id: ID!, $includeCapabilities: Boolean!, $includeThumbnail: Boolean!, $populateReference: Boolean!, $populateReferenceList: Boolean!) {
    metaobject(id: $id) {
      ...Metaobject
    }
  }
`;