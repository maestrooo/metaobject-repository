import { FieldBuilder } from "raku-ql";
import { camel } from "snake-camel";
import { Collection, Company, Customer, File, GenericFile, Metaobject, Page, Product, ProductVariant, TaxonomyValue, Video, MediaImage } from "~/types/admin.types";
import { MetafieldBaseDefinition } from "~/types/metafield-definitions";
import { MetaobjectDefinitionSchema, MetaobjectDefinitionSchemaEntry } from "~/types/metaobject-definitions";

export type OnPopulateFunc = ({ fieldDefinition, fieldBuilder }: { fieldDefinition?: MetafieldBaseDefinition, fieldBuilder: FieldBuilder}) => void;
export type OnPopulateWithoutDefinitionFunc = ({ fieldBuilder }: { fieldBuilder: FieldBuilder}) => void;

type PopulateMetaobjectQueryOptions = {
  metaobjectDefinitions: MetaobjectDefinitionSchema;
  metaobjectType: string;
  fieldBuilder: FieldBuilder;
  includeCapabilities?: boolean;
  includeThumbnail?: boolean;
  populate: readonly string[];
  onPopulate?: OnPopulateFunc;
}

type PopulateReferenceQueryOptions = {
  metaobjectDefinitions?: MetaobjectDefinitionSchema;
  fieldDefinition: MetafieldBaseDefinition;
  fieldBuilder: FieldBuilder;
  populate: readonly string[];
  onPopulate?: OnPopulateFunc;
}

type PopulateResourceReference = {
  fieldBuilder: FieldBuilder;
  fieldDefinition: MetafieldBaseDefinition;
  onPopulate?: OnPopulateFunc;
}

/**
 * Get the definition for a given metaobject type
 */
function getMetaobjectDefinitionEntry(definitions: MetaobjectDefinitionSchema, type: string): MetaobjectDefinitionSchemaEntry {
  const definition = definitions.find((entry) => entry.type === type);

  if (!definition) {
    throw new Error(`Metaobject definition for type "${type}" not found`);
  }

  return definition;
}

/**
 * Populate a reference query
 */
export function populateReferenceQuery({ metaobjectDefinitions, fieldDefinition, fieldBuilder, populate, onPopulate }: PopulateReferenceQueryOptions): FieldBuilder {
  const setupReference = (reference: FieldBuilder): FieldBuilder => {
    // We can only populate owned metaobjects if we have a schema
    if (metaobjectDefinitions) {
      if ((fieldDefinition.type === 'metaobject_reference' || fieldDefinition.type === 'list.metaobject_reference') && fieldDefinition.metaobjectType) {
        return reference.inlineFragment<Metaobject>('Metaobject', (fragment) => {
          populateMetaobjectQuery({ metaobjectDefinitions, metaobjectType: fieldDefinition.metaobjectType!, fieldBuilder: fragment, populate, onPopulate });
        });
      }

      if ((fieldDefinition.type === 'mixed_reference' || fieldDefinition.type === 'list.mixed_reference') && fieldDefinition.metaobjectTypes) {
        fieldDefinition.metaobjectTypes?.forEach((metaobjectType) => {
          reference.inlineFragment<Metaobject>('Metaobject', (fragment) => {
            populateMetaobjectQuery({ metaobjectDefinitions, metaobjectType, fieldBuilder: fragment, populate, onPopulate });
          })
        });

        return reference;
      }
    }

    return populateResourceReference({ fieldBuilder: reference, fieldDefinition, onPopulate });
  }

  if (fieldDefinition.type.startsWith('list.')) {
    fieldBuilder.connection('references', { first: 50 }, (connection) => {
      connection.nodes(nodes => {
        nodes.fields('__typename');
        setupReference(nodes);
      });
    });
  } else {
    fieldBuilder.object('reference', (reference) => {
      reference.fields('__typename');
      setupReference(reference);
    });
  }

  return fieldBuilder;
}

/**
 * Populate a metaobject query (this is used to populate metaobject owned by the app itself), whose type is metaobjectType
 */
export function populateMetaobjectQuery({ metaobjectDefinitions, metaobjectType, fieldBuilder, includeCapabilities, includeThumbnail, populate, onPopulate }: PopulateMetaobjectQueryOptions): FieldBuilder {
  const schema = getMetaobjectDefinitionEntry(metaobjectDefinitions, metaobjectType);

  // We setup the base fields
  fieldBuilder
    .fields('id', 'type', 'handle', /*'createdAt',*/ 'updatedAt', 'displayName')
    .object('fields', (fields) => {
      fields.fields('key', 'jsonValue', 'type')
    });

  // We get the capabilities only if the definition contains some
  if (includeCapabilities && (schema.capabilities?.publishable || schema.capabilities?.onlineStore)) {
    fieldBuilder.object('capabilities', (capabilities) => {
      if (schema.capabilities?.publishable) {
        capabilities.object('publishable', (publishable) => {
          publishable.fields('status');
        })
      }

      if (schema.capabilities?.onlineStore) {
        capabilities.object('onlineStore', (onlineStore) => {
          onlineStore.fields('templateSuffix')
        })
      }
    })
  }

  // We only include the thumbnail field if the schema contains one file reference or one color field
  const hasThumbnailField = schema.fields.some(field => field.type.includes('file_reference') || field.type.includes('color'));

  if (includeThumbnail && hasThumbnailField) {
    fieldBuilder.object('thumbnailField', (thumbnailField) => {
      thumbnailField.object('thumbnail', (thumbnail) => {
        thumbnail
          .fields('hex')
          .object('file', (file) => {
            file.object('preview', (preview) => {
              preview.object('image', (image) => {
                image.fields('id', 'altText', 'url', 'width', 'height');
              })
            });
          });
      });
    });
  }
  
  schema.fields.forEach((field) => {
    const cameledKey = camel(field.key);

    if (field.type.endsWith('_reference') && populate.some(key => key === cameledKey || key.startsWith(`${cameledKey}.`))) {
      // This resolve the populate recursively. For instance if we have ['foo.bar', 'baz'] and that this property is 'foo',
      // this will generate a new array that will be just ['bar]
      const nestedPopulate = populate
        .filter(key => key === cameledKey || key.startsWith(`${cameledKey}.`))
        .map(key => key === cameledKey ? '' : key.slice(cameledKey.length + 1))
        .filter(Boolean); // Remove empty strings

      // We prefix all references by a _ character to avoid clashes and to easily identify them when deserializing
      fieldBuilder.object({ field: `_${camel(field.key)}` }, { key: field.key }, (fieldBuilder) => {
        populateReferenceQuery({ metaobjectDefinitions, fieldDefinition: field, fieldBuilder, populate: nestedPopulate, onPopulate });
      });
    }
  });

  return fieldBuilder;
}

/**
 * Add the specific fields of a Shopify owned-resource
 */
export function populateResourceReference({ fieldBuilder, fieldDefinition, onPopulate }: PopulateResourceReference): FieldBuilder { 
  // We first call the onPopulate method to let author populate their own fields
  if (onPopulate) {
    onPopulate({ fieldDefinition, fieldBuilder });
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