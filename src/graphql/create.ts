export const CreateMetaobjectMutation = `#graphql
  mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
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