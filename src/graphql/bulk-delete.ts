export const BulkDeleteMetaobjectMutation = `#graphql
  mutation BulkDeleteMetaobject($where: MetaobjectBulkDeleteWhereCondition!) {
    metaobjectBulkDelete(where: $where) {
      job {
        id
      }

      userErrors {
        field
        message
      }
    }
  }
`;