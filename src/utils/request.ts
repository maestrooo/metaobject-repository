import { OperationBuilder } from "raku-ql";
import { apiVersion as defaultApiVersion } from "~/version";
import type { GraphQLResponse, QueryAdminApi } from "~/types/request";
import type { ApiVersion } from "@shopify/shopify-api";

type AdminConnection = {
  type: 'admin';
  client: QueryAdminApi;
  shopDomain?: never;
  storefrontAccessToken?: never;
};

type StorefrontConnection = {
  type: 'storefront';
  storefrontAccessToken: string;
  shopDomain: string;
  client?: never;
};

type DirectAccessConnection = {
  type: 'direct_access';
  client?: never;
  shopDomain?: never;
  storefrontAccessToken?: never;
};

export type ConnectionOptions = AdminConnection | StorefrontConnection | DirectAccessConnection;

type DoRequestOptions = {
  builder: OperationBuilder;
  connection: ConnectionOptions;
  variables?: Record<string, any>;
  apiVersion?: ApiVersion;
}

export async function doRequest({ connection, builder, variables, apiVersion }: DoRequestOptions): Promise<GraphQLResponse> {
  const apiVersionToUse = (apiVersion ?? defaultApiVersion);

  if (typeof window !== 'undefined') {
    if (connection.type === 'admin') {
      throw new Error('Admin access cannot be used in the browser. To use it in the browser, either use the `createDirectAccessContext` or `createStorefrontApiContext` functions.');
    }

    let response;

    if (connection.type === 'direct_access') {
      response = fetch(`shopify:admin/api/${apiVersionToUse}/graphql.json`, {
        method: 'POST',
        body: JSON.stringify({
          query: builder.build(),
          variables
        }),
      });
    } else if (connection.type === 'storefront') {
      let shopDomain = connection.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      shopDomain = shopDomain.endsWith('.myshopify.com') ? shopDomain : `${shopDomain}.myshopify.com`;

      response = fetch(`https://${shopDomain}/api/${apiVersionToUse}/graphql.json`, {
        method: 'POST',
        body: JSON.stringify({
          query: builder.build(),
          variables
        }),
      });
    }

    return (await (await response)?.json());
  }

  if (connection.type === 'admin') {
    return (await (await connection.client(builder.build(), { variables, apiVersion: apiVersionToUse })).json());
  }

  throw new Error('No valid connection found. Use the `createDirectAccessContext`, `createStorefrontApiContext` or `createAdminContext` functions to create a valid connection.');
}