export const UpsertMetaobjectMutation = `#graphql
  mutation UpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject {
        id
      }
      
      userErrors {
        field
        message
      }
    }
  }
`;