
import { GraphQLClient } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types";
import { AdminOperations } from "@shopify/admin-api-client";
import { StorefrontAccessToken } from "./types/admin.types";

type PickedStorefrontAccessToken = Pick<StorefrontAccessToken, 'id' | 'accessToken' | 'title'>;

/**
 * Manage storefront access tokens
 */
export class StorefrontTokenRepository {
  private client!: GraphQLClient<AdminOperations>;

  /**
   * Set the client context
   */
  withClient(client: GraphQLClient<AdminOperations>): this {
    this.client = client;
    return this;
  }

  /**
   * Get a list of existing tokens
   */
  async getExistingTokens(): Promise<PickedStorefrontAccessToken[]> {
    const existingTokensResponse = await this.client(
      `#graphql
      {
        shop {
          storefrontAccessTokens(first: 50) {
            nodes {
              id
              title
              accessToken
            }
          }
        }
      }
      `
    );

    return (await existingTokensResponse.json()).data.shop.storefrontAccessTokens.nodes;
  }

  /**
   * Create a new storefront access token
   */
  async createToken(options: { title: string }): Promise<PickedStorefrontAccessToken> {
    const response = await this.client(
      `#graphql
      mutation CreateStorefrontToken($input: StorefrontAccessTokenInput!) {
        storefrontAccessTokenCreate(input: $input) {
          storefrontAccessToken {
            id
            title
            accessToken
          }
  
          userErrors {
            field
            message
          }
        }
      }`, {
        variables: {
          input: {
            title: options.title
          }
        }
      }
    );

    const responseJson = await response.json();
    const { storefrontAccessToken, userErrors } = responseJson.data.storefrontAccessTokenCreate;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot create storefront access token. Reason: ${userErrors[0].message}`);
    }

    return storefrontAccessToken
  }

  /**
   * Upsert a token. It uses the title to check if a token already. If it does it is returned, otherwise
   * a new one is created
   */
  async upsertToken(options: { title: string }): Promise<PickedStorefrontAccessToken> {
    const existingTokens = await this.getExistingTokens();
    const existingToken = existingTokens.find((token: PickedStorefrontAccessToken) => token.title === options.title);

    if (existingToken) {
      return existingToken;
    }

    return this.createToken(options);
  }

  /**
   * Delete a token by its title
   */
  async deleteToken(options: { title: string }) {
    const existingTokens = await this.getExistingTokens();
    const tokenToDelete = existingTokens.find((token: PickedStorefrontAccessToken) => token.title === options.title);

    if (tokenToDelete) {
      await this.client(
        `#graphql
        mutation DeleteStorefrontToken($input: StorefrontAccessTokenDeleteInput!) {
          storefrontAccessTokenDelete(input: $input) {
            deletedStorefrontAccessTokenId
          }
        }`, {
          variables: {
            input: {
              id: tokenToDelete.id
            }
          }
        }
      );
    }
  }
}

export const storefrontTokenRepository = new StorefrontTokenRepository();