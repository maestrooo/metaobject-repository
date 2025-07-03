import { QueryBuilder } from "raku-ql";
import type { Shop, StorefrontAccessToken, StorefrontAccessTokenCreatePayload, StorefrontAccessTokenDeletePayload } from "~/types/admin.types";
import { type ConnectionOptions, doRequest } from "~/utils/request";

type PickedStorefrontAccessToken = Pick<StorefrontAccessToken, 'id' | 'accessToken' | 'title'>;

/**
 * Manage storefront access tokens
 */
export class StorefrontTokenRepository {
  constructor(private connectionOptions: ConnectionOptions) {}

  /**
   * Get a list of existing tokens
   */
  async findExistingTokens(): Promise<PickedStorefrontAccessToken[]> {
    const builder = QueryBuilder.query('GetShopStorefrontTokens')
      .operation<Shop>('shop', shop => {
        shop.connection('storefrontAccessTokens', { first: 50 }, tokensConnection => {
          tokensConnection.nodes(token => {
            token.fields('id', 'title', 'accessToken')
          })
        })
      })

    return (await doRequest({ connection: this.connectionOptions, builder })).data.shop.storefrontAccessTokens.nodes;
  }

  /**
   * Create a new storefront access token
   */
  async createToken(options: { title: string }): Promise<PickedStorefrontAccessToken> {
    const builder = QueryBuilder.mutation('CreateStorefrontToken')
      .variables({ input: 'StorefrontAccessTokenInput!' })
      .operation<StorefrontAccessTokenCreatePayload>('storefrontAccessTokenCreate', { input: '$input' }, payload => {
        payload
          .object('storefrontAccessToken', token => {
            token.fields('id', 'title', 'accessToken')
          })
          .object('userErrors', error => {
            error.fields('field', 'message')
          })
      });

    const input = { title: options.title };
    const { storefrontAccessToken, userErrors } = (await doRequest({ connection: this.connectionOptions, builder, variables: { input } })).data.storefrontAccessTokenCreate;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot create storefront access token. Reason: ${userErrors[0].message}`);
    }

    return storefrontAccessToken;
  }

  /**
   * Upsert a token. It uses the title to check if a token already. If it does it is returned, otherwise
   * a new one is created
   */
  async upsertToken(options: { title: string }): Promise<PickedStorefrontAccessToken> {
    const existingTokens = await this.findExistingTokens();
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
    const existingTokens = await this.findExistingTokens();
    const tokenToDelete = existingTokens.find((token: PickedStorefrontAccessToken) => token.title === options.title);

    if (tokenToDelete) {
      const builder = QueryBuilder.mutation('DeleteStorefrontToken')
        .variables({ input: 'StorefrontAccessTokenDeleteInput!' })
        .operation<StorefrontAccessTokenDeletePayload>('storefrontAccessTokenDelete', { input: '$input' }, payload => {
          payload
            .fields('deletedStorefrontAccessTokenId')
            .object('userErrors', error => {
              error.fields('field', 'message')
            })
        });

      const { userErrors } = (await doRequest({ connection: this.connectionOptions, builder, variables: { input: { id: tokenToDelete.id } } })).data.storefrontAccessTokenDelete;

      if (userErrors.length > 0) {
        console.warn(userErrors);
        throw new Error(`Cannot delete storefront access token. Reason: ${userErrors[0].message}`);
      }
    }
  }
}