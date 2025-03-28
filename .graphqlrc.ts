import {shopifyApiProject, ApiType} from '@shopify/api-codegen-preset';

export default {
  // For syntax highlighting / auto-complete when writing operations
  schema: 'https://shopify.dev/admin-graphql-direct-proxy/unstable',
  projects: {
    // To produce variable / return types for Admin API operations
    default: shopifyApiProject({
      apiType: ApiType.Admin,
      apiVersion: 'unstable',
      documents: ['query GetMetaobject($id: ID!) { metaobject(id: $id) { id } }'],
      outputDir: './src/types',
    }),
  },
};