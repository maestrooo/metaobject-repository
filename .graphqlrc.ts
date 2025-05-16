export default {
  projects: {
    default: {
      // For type extraction
      schema: 'https://shopify.dev/admin-graphql-direct-proxy/unstable',
      extensions: {
        codegen: {
          generates: {
            './src/types/admin.types.d.ts': {
              plugins: ['typescript'],
              config: { enumsAsTypes: true }
            }
          },
        },
      },
    },
  },
};