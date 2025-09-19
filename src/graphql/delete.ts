export const DeleteMetaobjectMutation = `#graphql
  mutation DeleteMetaobject($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      
      userErrors {
        field
        message
      }
    }
  }
`;