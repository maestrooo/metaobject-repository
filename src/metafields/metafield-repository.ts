import type { MetafieldOwnerType, AppInstallation, HasMetafields, Metafield, MetafieldConnection, MetafieldIdentifierInput, MetafieldsDeletePayload, MetafieldsSetInput, MetafieldsSetPayload } from "~/types/admin.types";
import { FieldBuilder, QueryBuilder } from "raku-ql";
import type { FindOptions, LooseMetafieldsSetInput, PaginatedMetafields, PaginatedMetafieldsWithReference, PickedMetafield, PickedMetafieldWithReference } from "~/types/metafield-repository";
import { type OnPopulateFunc, type OnPopulateWithoutDefinitionFunc, populateReferenceQuery } from "~/utils/builder";
import { type ConnectionOptions, doRequest } from "~/utils/request";
import type { MetafieldDefinitionSchema, MetafieldDefinitionSchemaEntry } from "~/types/metafield-definitions";
import type { MetaobjectDefinitionSchema } from "~/types/metaobject-definitions";
import { serializeValue } from "~/transformer/serializer";
import { deserializeMetafield } from "~/transformer/deserializer";

type ConstructorOptions = {
  connection: ConnectionOptions;
  metafieldDefinitions: MetafieldDefinitionSchema;
  metaobjectDefinitions?: MetaobjectDefinitionSchema;
}

/**
 * Provide a thin wrapper around metafields to easily manipulate them
 */
export class MetafieldRepository {
  private readonly connection: ConnectionOptions;
  private readonly metafieldDefinitions: MetafieldDefinitionSchema;
  private readonly metaobjectDefinitions?: MetaobjectDefinitionSchema;
  private appInstallationIdPromise?: Promise<any>;

  constructor({ connection, metafieldDefinitions, metaobjectDefinitions }: ConstructorOptions) {
    this.connection = connection;
    this.metafieldDefinitions = metafieldDefinitions;
    this.metaobjectDefinitions = metaobjectDefinitions;
  }

  /**
   * Get a single app metafield
   */
  async getAppMetafield(opts: { key: string, namespace?: string, populate?: false, onPopulate?: undefined }): Promise<PickedMetafield | null>;
  async getAppMetafield<T>(opts: { key: string, namespace?: string, populate?: boolean | string[], onPopulate?: OnPopulateFunc }): Promise<PickedMetafieldWithReference<T> | null>;
  async getAppMetafield<T>(opts: { key: string, namespace?: string, populate?: boolean | string[], onPopulate?: OnPopulateFunc }): Promise<PickedMetafield | PickedMetafieldWithReference<T> | null> {
    const builder = QueryBuilder.query('GetAppMetafield')
      .variables({ key: 'String!', namespace: 'String' })
      .operation<AppInstallation>('currentAppInstallation', currentAppInstallation => {
        currentAppInstallation.object('metafield', { key: '$key', namespace: '$namespace' }, metafieldBuilder => {
          metafieldBuilder.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue');
          
          if (opts.populate || opts.onPopulate) {
            this.setupReferenceQuery({ 
              fieldBuilder: metafieldBuilder, 
              ownerType: 'API_PERMISSION', 
              key: opts.key, 
              namespace: opts.namespace, 
              populate: opts.populate, 
              onPopulate: opts.onPopulate 
            });
          }
        })
      })

    const variables = { key: opts.key, namespace: opts.namespace };

    const metafield = (await ((await doRequest({ connection: this.connection, builder, variables })).json())).data.currentAppInstallation.metafield;

    return metafield ? deserializeMetafield(metafield) : null;
  }

  /**
   * Get one or more app metafields
   */
  async getAppMetafields(opts: FindOptions & { onPopulate?: undefined }): Promise<PaginatedMetafields>;
  async getAppMetafields<T>(opts: FindOptions & { onPopulate: OnPopulateWithoutDefinitionFunc }): Promise<PaginatedMetafieldsWithReference<T>>;
  async getAppMetafields<T>(opts: FindOptions & { onPopulate?: OnPopulateWithoutDefinitionFunc }): Promise<PaginatedMetafields | PaginatedMetafieldsWithReference<T>> {
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
          metafieldsConnection.nodes(nodesBuilder => {
            nodesBuilder.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue');

            // When retrieving a list of metafields, their type can be completely heterogeneous, so we can't make any assumptions on how
            // to populate references. As a consequence, the most we can do is passing the builder to a function and let the user decide
            // how to populate the references.
            opts.onPopulate?.({ fieldBuilder: nodesBuilder });
          })
        })
      })

    const { nodes: items, pageInfo } = (await ((await doRequest({ connection: this.connection, builder, variables })).json())).data.currentAppInstallation.metafields;

    return {
      pageInfo,
      items: items.map((metafield: Metafield) => deserializeMetafield(metafield))
    }
  }

  /**
   * Get a single metafield
   */
  async getMetafield(opts: { owner: string, key: string, namespace?: string, populate?: false, onPopulate?: undefined }): Promise<PickedMetafield | null>;
  async getMetafield<T>(opts: { owner: string, key: string, namespace?: string, populate?: boolean | string[], onPopulate?: OnPopulateFunc }): Promise<PickedMetafieldWithReference<T> | null>;
  async getMetafield<T>(opts: { owner: string, key: string, namespace?: string, populate?: boolean | string[], onPopulate?: OnPopulateFunc }): Promise<PickedMetafield | PickedMetafieldWithReference<T> | null> {
    // Shopify currently does not have any kind of "find one" operation for metafield, so we parse the owner ID and perform an
    // optimized query to get the metafield
    const resourceType = opts.owner.split('/')[3]; // gid have the shape gid://shopify/ResourceType/123456789
    const operationName = resourceType[0].toLowerCase() + resourceType.slice(1); // convert thing like "Product" to "product"

    const builder = QueryBuilder.query('GetMetafield')
      .variables({ id: 'ID!', namespace: 'String!', key: 'String!' })
      .operation<HasMetafields>(operationName, { id: '$id' }, hasMetafield => {
        hasMetafield.object('metafield', { namespace: '$namespace', key: '$key' }, metafieldBuilder => {
          metafieldBuilder.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue');

          if (opts.populate || opts.onPopulate) {
            const mapping: Record<string, MetafieldOwnerType> = {
              'Article': 'ARTICLE',
              'Blog': 'BLOG',
              'Collection': 'COLLECTION',
              'Company': 'COMPANY',
              'CompanyLocation': 'COMPANY_LOCATION',
              'Customer': 'CUSTOMER',
              'DraftOrder': 'DRAFTORDER',
              'Location': 'LOCATION',
              'Market': 'MARKET',
              'Page': 'PAGE',
              'Product': 'PRODUCT',
              'ProductVariant': 'PRODUCTVARIANT',
              'Order': 'ORDER',
            }

            this.setupReferenceQuery({ 
              fieldBuilder: metafieldBuilder, 
              ownerType: mapping[resourceType], 
              key: opts.key, 
              namespace: opts.namespace, 
              populate: opts.populate, 
              onPopulate: opts.onPopulate 
            });
          }
        })
      });

    const variables = { id: opts.owner, namespace: opts.namespace, key: opts.key };
    const { metafield } = (await ((await doRequest({ connection: this.connection, builder, variables })).json())).data[operationName];

    return metafield ? deserializeMetafield(metafield) : null;
  }

  /**
   * Get one or more metafields
   */
  async getMetafields(opts: FindOptions & { onPopulate?: undefined }): Promise<PaginatedMetafields>;
  async getMetafields<T>(opts: FindOptions & { onPopulate: OnPopulateWithoutDefinitionFunc }): Promise<PaginatedMetafieldsWithReference<T>>;
  async getMetafields<T>(opts: FindOptions & { onPopulate?: OnPopulateWithoutDefinitionFunc }): Promise<PaginatedMetafields | PaginatedMetafieldsWithReference<T>> {
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
        metafields.nodes(nodesBuilder => {
          nodesBuilder.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue');

          // When retrieving a list of metafields, their type can be completely heterogeneous, so we can't make any assumptions on how
          // to populate references. As a consequence, the most we can do is passing the builder to a function and let the user decide
          // how to populate the references.
          opts.onPopulate?.({ fieldBuilder: nodesBuilder });
        })
      })

    const { nodes: items, pageInfo } = (await ((await doRequest({ connection: this.connection, builder, variables })).json())).data.metafields;

    return {
      pageInfo,
      items: items.map((metafield: Metafield) => deserializeMetafield(metafield))
    }
  }

  /**
   * Helper to create app metafields. You don't need to explicitly pass the owner ID, as it is retrieved
   * automatically from the current app installation.
   */
  async setAppMetafields(input: Omit<LooseMetafieldsSetInput, 'ownerId'>[]): Promise<void> {
    const appInstallationId = await this.getAppInstallationId();
    const metafieldsSet: LooseMetafieldsSetInput[] = input.map(metafield => ({ ...metafield, ownerId: appInstallationId }));

    await this.setMetafields(metafieldsSet);
  }

  /**
   * Upsert one or multiple metafields
   */
  async setMetafields(input: LooseMetafieldsSetInput[]): Promise<void> {
    // Our loose metafields don't have the value serialized as JSON, so we do that. We also snake_case the keys
    const metafieldsSet: MetafieldsSetInput[] = input.map(metafield => ({ ...metafield, value: serializeValue(metafield.value) }));

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

    const { userErrors } = (await (await doRequest({ connection: this.connection, builder, variables: { metafields: metafieldsSet } })).json()).data.metafieldsSet;

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

    const { userErrors } = (await (await doRequest({ connection: this.connection, builder, variables: { metafields: identifiers } })).json()).data.metafieldsDelete;

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

        return (await (await doRequest({ connection: this.connection, builder })).json()).data.currentAppInstallation.id;
      })();
    }

    return this.appInstallationIdPromise;
  }

  /**
   * Find a metafield definition
   */
  private findDefinition(opts: { ownerType: MetafieldOwnerType, key: string, namespace?: string }): MetafieldDefinitionSchemaEntry | undefined {
    return this.metafieldDefinitions.find(def => def.key === opts.key && def.namespace === opts.namespace && def.ownerType === opts.ownerType);
  }

  /**
   * For reference metafields, set up the query to fetch the reference or references objects
   */
  private setupReferenceQuery(opts: { fieldBuilder: FieldBuilder, ownerType: MetafieldOwnerType, key: string, namespace?: string, populate?: boolean | string[], onPopulate?: OnPopulateFunc }): void {
    const definition = this.findDefinition(opts);

    if (definition && !definition.type.includes('_reference')) {
      return; // We have a definition but it's not a reference metafield, nothing to complete
    }

    if (!definition) {
      // If we don't have a definition, we can't infer the type to populate, so we just call the onPopulate function
      // and let the user decide what to do
      return opts.onPopulate?.({ fieldBuilder: opts.fieldBuilder });
    }

    const populate = Array.isArray(opts.populate) ? opts.populate : [];

    populateReferenceQuery({ metaobjectDefinitions: this.metaobjectDefinitions, fieldBuilder: opts.fieldBuilder, fieldDefinition: definition, populate, onPopulate: opts.onPopulate });
  }
}