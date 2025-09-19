export const MetaobjectFragment = `#graphql
  fragment Metaobject on Metaobject {
    id
    type
    handle
    displayName
    updatedAt
    capabilities @include(if: $includeCapabilities) {
      onlineStore { 
        templateSuffix
      }
      publishable { 
        status
      }
    }
    thumbnailField @include(if: $includeThumbnail) {
      thumbnail {
        hex
        file {
          preview {
            status
            image {
              id
              altText
              width
              height
              url
            }
          }
        }
      }
    }
    fields {
      key
      jsonValue
      type
      reference @include(if: $populateReference) {
        __typename

        ...on Node {
          id
        }
      }
      references (first: 25) @include(if: $populateReferenceList) {
        nodes {
          __typename
          
          ...on Node {
            id
          }
        }
      }
    }
  }
`;