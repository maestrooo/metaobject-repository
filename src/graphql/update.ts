export const UpdateMetaobjectMutation = `#graphql
  mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
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