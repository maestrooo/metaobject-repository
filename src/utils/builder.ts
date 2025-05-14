import { FieldBuilder } from "raku-ql";
import { Collection, Company, Customer, File, GenericFile, Metaobject, Page, Product, ProductVariant, TaxonomyValue, Video, MediaImage } from "~/types/admin.types";
import { MetafieldDefinition } from "~/types/metafield-definitions";
import { MetaobjectFieldDefinition } from "~/types/metaobject-definitions";

export type OnPopulateFunc = (fieldDefinition: MetafieldDefinition | MetaobjectFieldDefinition, fieldBuilder: FieldBuilder) => void;

export type SetupResourceReferenceOptions = {
  fieldBuilder: FieldBuilder;
  fieldDefinition: MetafieldDefinition | MetaobjectFieldDefinition;
  onPopulate?: OnPopulateFunc;
}

/**
 * Add the specific fields of a Shopify owned-resource
 */
export function populateShopifyResourceReference({ fieldBuilder, fieldDefinition, onPopulate }: SetupResourceReferenceOptions): FieldBuilder { 
    // We first call the onPopulate method to let author populate their own fields
    if (onPopulate) {
      onPopulate(fieldDefinition, fieldBuilder);
    }

    const baseResourceName = fieldDefinition.type.replace('list.', '');

    // If nothing has been specified, we use some default fields
    const hasFieldsExcludingTypename = fieldBuilder.getFields().some((field) => (field.kind === 'field' && field.name !== '__typename'));

    if (!hasFieldsExcludingTypename) {
      switch (baseResourceName) {
        case 'product_reference':
          return fieldBuilder.inlineFragment<Product>('Product', (fragment) => {
            fragment
              .fields('id', 'handle', 'title', 'productType', 'status', 'description', 'vendor', 'tags', 'hasOnlyDefaultVariant', 'createdAt', 'updatedAt', 'publishedAt', 'templateSuffix')
              .object('variantsCount', (variantsCount) => {
                variantsCount.fields('count', 'precision')
              })
              .object('featuredImage', (featuredImage) => {
                featuredImage.fields('id', 'altText', 'height', 'width', 'url')
              })
          });

        case 'collection_reference':
          return fieldBuilder.inlineFragment<Collection>('Collection', (fragment) => {
            fragment
              .fields('id', 'handle', 'title', 'description', 'hasProduct', 'sortOrder', 'updatedAt', 'templateSuffix')
              .object('image', (image) => {
                image.fields('altText', 'height', 'width', 'url')
              })
          });
        
        case 'customer_reference':
          return fieldBuilder.inlineFragment<Customer>('Customer', (fragment) => {
            fragment
              .fields('id', 'displayName', 'numberOfOrders', 'email', 'verifiedEmail', 'phone', 'locale', 'createdAt', 'updatedAt')
              .object('amountSpent', (amountSpent) => {
                amountSpent.fields('amount', 'currencyCode')
              })
              .object('image', (image => {
                image.fields('id', 'altText', 'height', 'width', 'url');
              }))
          });

        case 'company_reference':
          return fieldBuilder.inlineFragment<Company>('Company', (fragment) => {
            fragment.fields('id', 'externalId', 'name', 'lifetimeDuration', 'createdAt', 'updatedAt')
              .object('totalSpent', totalSpent => {
                totalSpent.fields('amount', 'currencyCode')
              })
              .object('ordersCount', ordersCount => {
                ordersCount.fields('count', 'precision')
              })
          });

        case 'metaobject_reference':
        case 'mixed_reference':
          return fieldBuilder.inlineFragment<Metaobject>('Metaobject', (fragment) => {
            fragment
              .fields('id', 'type', 'handle', /*'createdAt',*/ 'updatedAt', 'displayName')
              .object('fields', (fields) => {
                fields.fields('key', 'jsonValue', 'type')
              })
          });

        case 'page_reference':
          return fieldBuilder.inlineFragment<Page>('Page', (fragment) => {
            fragment.fields('id', 'handle', 'title', 'body', 'isPublished', 'createdAt', 'updatedAt', 'templateSuffix');
          });

        case 'product_taxonomy_value_reference':
          return fieldBuilder.inlineFragment<TaxonomyValue>('TaxonomyValue', (fragment) => {
            fragment.fields('id', 'name');
          });

        case 'variant_reference':
          return fieldBuilder.inlineFragment<ProductVariant>('ProductVariant', (fragment) => {
            fragment
              .fields('id', 'title', 'displayName', 'sku', 'price', 'compareAtPrice', 'availableForSale', 'inventoryQuantity', 'barcode', 'createdAt', 'updatedAt')
              .object('image', (image) => {
                image.fields('id', 'altText', 'height', 'width', 'url');
              })
          });

        case 'file_reference':
          if (fieldDefinition.type === 'file_reference' || fieldDefinition.type === 'list.file_reference') {
            fieldBuilder.inlineFragment<File>('File', (fragment) => {
              fragment
                .fields('id', 'fileStatus', 'alt')
                .object('preview', (preview) => {
                  preview
                    .fields('status')
                    .object('image', (image) => {
                      image.fields('id', 'altText', 'height', 'width', 'url');
                    })
                })
            });

            if (fieldDefinition.validations?.fileTypeOptions?.includes('Image')) {
              fieldBuilder.inlineFragment<MediaImage>('MediaImage', (fragment) => {
                fragment
                  .fields('__typename', 'mimeType')
                  .object('originalSource', (originalSource) => {
                    originalSource.fields('fileSize')
                  })
                  .object('image', (image) => {
                    image.fields('id', 'altText', 'height', 'width', 'url');
                  })
              });
            }

            if (fieldDefinition.validations?.fileTypeOptions?.includes('Video')) {
              fieldBuilder.inlineFragment<Video>('Video', (fragment) => {
                fragment
                  .fields('__typename', 'duration')
                  .object('sources', (sources) => {
                    sources.fields('format', 'fileSize', 'height', 'width', 'mimeType', 'url')
                  })
              });
            }

            if (!fieldDefinition.validations?.fileTypeOptions) {
              fieldBuilder.inlineFragment<GenericFile>('GenericFile', (fragment) => {
                fragment.fields('__typename', 'mimeType', 'originalFileSize', 'url')
              });
            }
          }

          return fieldBuilder;
      }
    }

    return fieldBuilder;
}