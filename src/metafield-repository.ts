import { GraphQLClient } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types";
import { AdminOperations } from "@shopify/admin-api-client";
import { Metafield, MetafieldIdentifierInput, MetafieldsSetInput, PageInfo } from "~/types/admin.types";
import { FindOptions } from "./types/metafield-repository";

type PickedMetafield = Pick<Metafield, 'id' | 'compareDigest' | 'type' | 'namespace' | 'key' | 'jsonValue'>;
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Provide a thin wrapper around metafields to easily manipulate them
 */
export class MetafieldRepository {
  private client!: GraphQLClient<AdminOperations>;
  private appInstallationIdPromise?: Promise<any>;

  /**
   * Set the GraphQL client to interact with Shopify API
   */
  withClient(client: GraphQLClient<AdminOperations>): this {
    this.client = client;
    return this;
  }

  /**
   * Get a single app metafield
   */
  async getAppMetafield(options: { key: string, namespace?: string }): Promise<PickedMetafield | null> {
    const response = await this.client(
      `#graphql
      query GetAppMetafield($key: String!, $namespace: String) {
        currentAppInstallation {
          metafield(key: $key, namespace: $namespace) {
            id
            compareDigest
            type
            namespace
            key
            jsonValue
          }
        }
      }`, {
        variables: {
          key: options.key,
          namespace: options.namespace
        }
      }
    );

    return (await response.json()).data.currentAppInstallation.metafield;
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

    const response = await this.client(
      `#graphql
      query GetMetafields($owner: String!, $namespace: String, $first: Int, $after: String, $last: Int, $before: String, $reverse: Boolean) {
        metafields(owner: $owner, namespace: $namespace, first: $first, after: $after, last: $last, before: $before, reverse: $reverse) {
          nodes {
            id
            compareDigest
            type
            namespace
            key
            jsonValue
          }

          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }`, {
        variables
      }
    );

    const { nodes: items, pageInfo } = (await response.json()).data.metafields;

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
    const response = await this.client(
      `#graphql
      mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            namespace
            jsonValue
          }
          
          userErrors {
            code
            field
            message
          }
        }
      }`, {
        variables: { metafields: input }
      }
    );

    const { metafields, userErrors } = (await response.json()).data.metafieldsSet;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot set metafields. Reason: ${userErrors[0].message}`);
    }

    return metafields;
  }

  /**
   * Delete one or more metafields
   */
  async deleteMetafields(identifiers: MetafieldIdentifierInput[]): Promise<void> {
    const response = await this.client(
      `#graphql
      mutation DeleteMetafields($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) {
          userErrors {
            field
            message
          }
        }
      }`, {
        variables: {
          metafields: identifiers
        }
      }
    );

    const { userErrors } = (await response.json()).data.metafieldsDelete;

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
        const response = await this.client(
          `#graphql
           query GetAppInstallationId {
             currentAppInstallation {
               id
             }
           }`
        );
        
        return (await response.json()).data.currentAppInstallation.id;
      })();
    }

    return this.appInstallationIdPromise;
  }
}

export const metafieldRepository = new MetafieldRepository();