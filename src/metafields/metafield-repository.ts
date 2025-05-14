import { AppInstallation, HasMetafields, MetafieldConnection, MetafieldDefinitionIdentifier, MetafieldIdentifierInput, MetafieldOwnerType, MetafieldsDeletePayload, MetafieldsSetInput, MetafieldsSetPayload } from "~/types/admin.types";
import { FieldBuilder, QueryBuilder } from "raku-ql";
import { FindOptions, PaginatedMetafields, PickedMetafield } from "~/types/metafield-repository";
import { MetafieldDefinition } from "~/types/metafield-definitions";
import { AllowRawEnum } from "~/types/utils";
import { populateShopifyResourceReference } from "~/utils/builder";
import { doRequest } from "~/utils/request";
import { SchemaProvider } from "~/provider/schema-provider";

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type OnPopulateWithDefinition = (fieldDefinition: MetafieldDefinition, fieldBuilder: FieldBuilder) => void;
type OnPopulateWithIdentifier = (identifier: MetafieldDefinitionIdentifier, fieldBuilder: FieldBuilder) => void;

/**
 * Provide a thin wrapper around metafields to easily manipulate them
 */
export class MetafieldRepository {
  private appInstallationIdPromise?: Promise<any>;

  /**
   * Get a single app metafield
   */
  async getAppMetafield(opts: { key: string, namespace?: string, populate?: boolean }): Promise<PickedMetafield | null> {
    const builder = QueryBuilder.query('GetAppMetafield')
      .variables({ key: 'String!', namespace: 'String' })
      .operation<AppInstallation>('currentAppInstallation', currentAppInstallation => {
        currentAppInstallation.object('metafield', { key: '$key', namespace: '$namespace' }, metafield => {
          metafield.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue');
          
          if (opts.populate) {
            this.setupReferenceQuery({ fieldBuilder: metafield, ownerType: MetafieldOwnerType.ApiPermission, key: opts.key, namespace: opts.namespace });
          }
        })
      })

    const variables = { key: opts.key, namespace: opts.namespace };

    return (await ((await doRequest({ builder, variables })).json())).data.currentAppInstallation.metafield;
  }

  /**
   * Get one or more app metafields
   */
  async getAppMetafields(opts: FindOptions): Promise<PaginatedMetafields> {
    const variables = {
      owner: opts.owner,
      first: ('after' in opts) ? (opts.first || 50) : undefined,
      last: ('before' in opts) ? (opts.last || 50) : undefined,
      after: opts.after,
      before: opts.before,
      namespace: opts.namespace,
      reverse: opts.reverse,
    }

    if (!variables.first && !variables.last) {
      variables.first = 50; // Provide a default value for first
    }

    const builder = QueryBuilder.query('GetAppMetafields')
      .variables({ keys: '[String!]', namespace: 'String', first: 'Int', after: 'String', last: 'Int', before: 'String', reverse: 'Boolean' })
      .operation<AppInstallation>('currentAppInstallation', currentAppInstallation => {
        currentAppInstallation.connection('metafields', { keys: '$keys', namespace: '$namespace', first: '$first', after: '$after', last: '$last', before: '$before', reverse: '$reverse' }, metafieldsConnection => {
          metafieldsConnection.nodes(node => {
            node.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue');
          })
        })
      })

    const { nodes: items, pageInfo } = (await ((await doRequest({ builder, variables })).json())).data.currentAppInstallation.metafields;

    return { pageInfo, items };
  }

  /**
   * Get a single metafield
   */
  async getMetafield(opts: { owner: string, key: string, namespace?: string, populate?: boolean }): Promise<PickedMetafield | null> {
    // Shopify currently does not have any kind of "find one" operation for metafield, so we parse the owner ID and perform an
    // optimized query to get the metafield
    const resourceType = opts.owner.split('/')[3]; // gid have the shape gid://shopify/ResourceType/123456789
    const operationName = resourceType[0].toLowerCase() + resourceType.slice(1); // convert thing like "Product" to "product"

    const builder = QueryBuilder.query('GetMetafield')
      .variables({ id: 'ID!', namespace: 'String!', key: 'String!' })
      .operation<HasMetafields>(operationName, { id: '$id' }, hasMetafield => {
        hasMetafield.object('metafield', { namespace: '$namespace', key: '$key' }, metafield => {
          metafield.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue');

          if (opts.populate) {
            const mapping: Record<string, MetafieldOwnerType> = {
              'Article': MetafieldOwnerType.Article,
              'Blog': MetafieldOwnerType.Blog,
              'Collection': MetafieldOwnerType.Collection,
              'Company': MetafieldOwnerType.Company,
              'CompanyLocation': MetafieldOwnerType.CompanyLocation,
              'Customer': MetafieldOwnerType.Customer,
              'DraftOrder': MetafieldOwnerType.Draftorder,
              'Location': MetafieldOwnerType.Location,
              'Market': MetafieldOwnerType.Market,
              'Page': MetafieldOwnerType.Page,
              'Product': MetafieldOwnerType.Product,
              'ProductVariant': MetafieldOwnerType.Productvariant,
              'Order': MetafieldOwnerType.Order,
            }

            this.setupReferenceQuery({ fieldBuilder: metafield, ownerType: mapping[resourceType], key: opts.key, namespace: opts.namespace });
          }
        })
      });

    const variables = { id: opts.owner, namespace: opts.namespace, key: opts.key };
    const { metafield } = (await ((await doRequest({ builder, variables })).json())).data[operationName];

    return metafield;
  }

  /**
   * Get one or more metafields
   */
  async getMetafields(opts: FindOptions): Promise<PaginatedMetafields> {
    const variables = {
      owner: opts.owner,
      first: ('after' in opts) ? (opts.first || 50) : undefined,
      last: ('before' in opts) ? (opts.last || 50) : undefined,
      after: opts.after,
      before: opts.before,
      namespace: opts.namespace,
      reverse: opts.reverse,
    }

    if (!variables.first && !variables.last) {
      variables.first = 50; // Provide a default value for first
    }

    const builder = QueryBuilder.query('GetMetafields')
      .variables({ owner: 'String!', namespace: 'String', first: 'Int', after: 'String', last: 'Int', before: 'String', reverse: 'Boolean' })
      .connection<MetafieldConnection>('metafields', { owner: '$owner', namespace: '$namespace', first: '$first', after: '$after', last: '$last', before: '$before', reverse: '$reverse' }, metafields => {
        metafields.nodes(node => {
          node.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue')
        })
      })

    const { nodes: items, pageInfo } = (await ((await doRequest({ builder, variables })).json())).data.metafields;

    return { pageInfo, items };
  }

  /**
   * Helper to create app metafields. You don't need to explicitly pass the owner ID, as it is retrieved
   * automatically from the current app installation.
   */
  async setAppMetafields(input: MakeOptional<MetafieldsSetInput, 'ownerId'>[]): Promise<void> {
    const appInstallationId = await this.getAppInstallationId();

    input.forEach((item) => {
      item.ownerId = appInstallationId;
    });

    await this.setMetafields(input as MetafieldsSetInput[]);
  }

  /**
   * Upsert one or multiple metafields
   */
  async setMetafields(input: MetafieldsSetInput[]): Promise<void> {
    const builder = QueryBuilder.mutation('SetMetafields')
      .variables({ metafields: '[MetafieldsSetInput!]!' })
      .operation<MetafieldsSetPayload>('metafieldsSet', { metafields: '$metafields' }, metafieldsSet => {
        metafieldsSet
          .object('metafields', metafields => {
            metafields.fields('id', 'key', 'namespace', 'jsonValue');
          })
          .object('userErrors', userErrors => {
            userErrors.fields('code', 'field', 'message');
          });
      })

    const { userErrors } = (await (await doRequest({ builder, variables: { metafields: input } })).json()).data.metafieldsSet;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot set metafields. Reason: ${userErrors[0].message}`);
    }
  }

  /**
   * Delete one or more metafields
   */
  async deleteMetafields(identifiers: MetafieldIdentifierInput[]): Promise<void> {
    const builder = QueryBuilder.mutation('DeleteMetafields')
      .variables({ metafields: '[MetafieldIdentifierInput!]!' })
      .operation<MetafieldsDeletePayload>('metafieldsDelete', { metafields: '$metafields' }, metafieldsDelete => {
        metafieldsDelete
          .object('userErrors', userErrors => {
            userErrors.fields('field', 'message');
          });
      });

    const { userErrors } = (await (await doRequest({ builder, variables: { metafields: identifiers } })).json()).data.metafieldsDelete;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot delete metafields. Reason: ${userErrors[0].message}`);
    }
  }

  /**
   * Helper to get the app installation ID
   */
  private getAppInstallationId(): Promise<string> {
    if (!this.appInstallationIdPromise) {
      this.appInstallationIdPromise = (async () => {
        const builder = QueryBuilder.query('GetAppInstallationId')
          .operation<AppInstallation>('currentAppInstallation', currentAppInstallation => {
            currentAppInstallation.fields('id');
          });

        return (await (await doRequest({ builder })).json()).data.currentAppInstallation.id;
      })();
    }

    return this.appInstallationIdPromise;
  }

  /**
   * For reference metafields, set up the query to fetch the reference or references objects
   */
  private setupReferenceQuery(opts: { fieldBuilder: FieldBuilder, ownerType: AllowRawEnum<MetafieldOwnerType>, key: string, namespace?: string, onPopulate?: OnPopulateWithDefinition }): void {
    if (!SchemaProvider.hasMetafieldDefinition({ ownerType: opts.ownerType, key: opts.key, namespace: opts.namespace })) {
      // If we don't have a definition, we can't know the type, so we just use the populate method
      
    } else {
      const metafieldDefinition = SchemaProvider.getMetafieldDefinitionEntry({ ownerType: opts.ownerType, key: opts.key, namespace: opts.namespace });

      // If we have a definition for this metafield, we know exactly the reference type so we can do an optimized query
      if (!metafieldDefinition.type.includes('_reference')) {
        return; // Not a reference metafield
      }

      if (metafieldDefinition.type.startsWith('list.')) {
        opts.fieldBuilder.connection('references', { first: 50 }, references => {
          references.nodes(nodeBuilder => {
            populateShopifyResourceReference({ fieldBuilder: nodeBuilder, fieldDefinition: metafieldDefinition, onPopulate: opts.onPopulate });
          });
        });
      } else {
        opts.fieldBuilder.object('reference', nodeBuilder => {
          populateShopifyResourceReference({ fieldBuilder: nodeBuilder, fieldDefinition: metafieldDefinition, onPopulate: opts.onPopulate });
        })
      }
    }
  }
}

export const metafieldRepository = new MetafieldRepository();