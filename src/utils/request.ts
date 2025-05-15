import { ApiVersion } from "@shopify/shopify-app-remix/server";
import { AdminOperations } from "@shopify/admin-api-client";
import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { OperationBuilder } from "raku-ql";
import { apiVersion as defaultApiVersion } from "~/version";

export type ConnectionOptions = {
  client?: AdminGraphqlClient<AdminOperations>;
  allowDirectAccess?: boolean;
}

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
    if (!connection.allowDirectAccess) {
      throw new Error('In the browser, only direct access is allowed. Set `allowDirectAccess` to true in the connection options.');
    }

    // If we are in the browser and that we allow direct access we can use that instead as it is faster
    return fetch(`shopify:admin/api/${apiVersionToUse}/graphql.json`, {
      method: 'POST',
      body: JSON.stringify({
        query: builder.build(),
        variables
      }),
    });
  }

  if (connection.client) {
    return connection.client(builder.build(), { variables, apiVersion: apiVersionToUse });
  }

  throw new Error('GraphQL client is not set in the server.');
}