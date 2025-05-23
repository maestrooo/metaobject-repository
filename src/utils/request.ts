import { ApiVersion } from "@shopify/shopify-app-remix/server";
import type { AdminOperations } from "@shopify/admin-api-client";
import type { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { OperationBuilder } from "raku-ql";
import { apiVersion as defaultApiVersion } from "~/version";

type AdminConnection = {
  type: 'admin';
  client: AdminGraphqlClient<AdminOperations>;
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

type FuncReturnType = ReturnType<AdminGraphqlClient<AdminOperations>>;

type DoRequestOptions = {
  builder: OperationBuilder;
  connection: ConnectionOptions;
  variables?: Record<string, any>;
  apiVersion?: ApiVersion;
}

export function doRequest({ connection, builder, variables, apiVersion }: DoRequestOptions): FuncReturnType {
  const apiVersionToUse = (apiVersion ?? defaultApiVersion) as ApiVersion;

  if (typeof window !== 'undefined') {
    if (connection.type === 'admin') {
      throw new Error('Admin access cannot be used in the browser. To use it in the browser, either use the `createDirectAccessContext` or `createStorefrontApiContext` functions.');
    }

    if (connection.type === 'direct_access') {
      return fetch(`shopify:admin/api/${apiVersionToUse}/graphql.json`, {
        method: 'POST',
        body: JSON.stringify({
          query: builder.build(),
          variables
        }),
      });
    } else if (connection.type === 'storefront') {
      let shopDomain = connection.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      shopDomain = shopDomain.endsWith('.myshopify.com') ? shopDomain : `${shopDomain}.myshopify.com`;

      return fetch(`https://${shopDomain}/api/${apiVersionToUse}/graphql.json`, {
        method: 'POST',
        body: JSON.stringify({
          query: builder.build(),
          variables
        }),
      });
    }
  }

  if (connection.type === 'admin') {
    return connection.client(builder.build(), { variables, apiVersion: apiVersionToUse });
  }

  throw new Error('No valid connection found. Use the `createDirectAccessContext`, `createStorefrontApiContext` or `createAdminContext` functions to create a valid connection.');
}