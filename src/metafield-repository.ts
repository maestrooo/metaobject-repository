import { AppInstallation, Metafield, MetafieldConnection, MetafieldIdentifierInput, MetafieldsDeletePayload, MetafieldsSetInput, MetafieldsSetPayload, PageInfo } from "~/types/admin.types";
import { FindOptions } from "./types/metafield-repository";
import { ClientAware } from "./client-aware";
import { QueryBuilder } from "raku-ql";

type PickedMetafield = Pick<Metafield, 'id' | 'compareDigest' | 'type' | 'namespace' | 'key' | 'jsonValue'>;
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Provide a thin wrapper around metafields to easily manipulate them
 */
export class MetafieldRepository extends ClientAware {
  private appInstallationIdPromise?: Promise<any>;

  /**
   * Get a single app metafield
   */
  async getAppMetafield(opts: { key: string, namespace?: string }): Promise<PickedMetafield | null> {
    const builder = QueryBuilder.query('GetAppMetafield')
      .variables({ key: 'String!', namespace: 'String' })
      .operation<AppInstallation>('currentAppInstallation', currentAppInstallation => {
        currentAppInstallation.object('metafield', { key: '$key', namespace: '$namespace' }, metafield => {
          metafield.fields('id', 'compareDigest', 'type', 'namespace', 'key', 'jsonValue');
        })
      })

    const variables = { key: opts.key, namespace: opts.namespace };

    return (await ((await this.doRequest({ builder, variables })).json())).data.currentAppInstallation.metafield;
  }

  /**
   * Get one or more app metafields
   */
  async getAppMetafields(opts: FindOptions): Promise<{ pageInfo: PageInfo, items: PickedMetafield | null }> {
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

    const { nodes: items, pageInfo } = (await ((await this.doRequest({ builder, variables })).json())).data.currentAppInstallation.metafields;

    return { pageInfo, items };
  }

  /**
   * Get one or more metafields
   */
  async getMetafields(opts: FindOptions): Promise<{ pageInfo: PageInfo, items: PickedMetafield | null }> {
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

    const { nodes: items, pageInfo } = (await ((await this.doRequest({ builder, variables })).json())).data.metafields;

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

    const { userErrors } = (await (await this.doRequest({ builder, variables: { metafields: input } })).json()).data.metafieldsSet;

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

    const { userErrors } = (await (await this.doRequest({ builder, variables: { metafields: identifiers } })).json()).data.metafieldsDelete;

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

        return (await (await this.doRequest({ builder })).json()).data.currentAppInstallation.id;
      })();
    }

    return this.appInstallationIdPromise;
  }
}

export const metafieldRepository = new MetafieldRepository();