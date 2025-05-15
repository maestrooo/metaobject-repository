import { ApiVersion } from "@shopify/shopify-app-remix/server";
import { AdminOperations } from "@shopify/admin-api-client";
import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { OperationBuilder } from "raku-ql";

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
  if (typeof window !== 'undefined' && connection.allowDirectAccess) {
    // If we are in the browser and that we allow direct access we can use that instead as it is faster
    return fetch('shopify:admin/api/graphql.json', {
      method: 'POST',
      body: JSON.stringify({
        query: builder.build(),
        variables
      }),
    });
  }

  if (connection.client) {
    return connection.client(builder.build(), { variables, apiVersion: apiVersion });
  }

  throw new Error('GraphQL client is not set in the server. Use `createContext` with the client, or if you are in browser context, set the `allowDirectAccess` option to true.');
}


/**
//import { ApiVersion } from "@shopify/shopify-app-remix/server";
//import { AdminOperations } from "@shopify/admin-api-client";
//import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { OperationBuilder } from "raku-ql";

interface TypedResponse<T> extends Response {
  json(): Promise<T>;
}

export type ConnectionOptions = {
  client?: Client;
  allowDirectAccess?: boolean;
}

type Client = (
  query: string,
  options: {
    variables?: Record<string, any>;
    apiVersion?: string;
  }
) => Promise<TypedResponse<{ data: any }>>;;

type FuncReturnType = ReturnType<Client>;

type DoRequestOptions = {
  builder: OperationBuilder;
  connection: ConnectionOptions;
  variables?: Record<string, any>;
  apiVersion?: string;
}

export function doRequest({ connection, builder, variables, apiVersion }: DoRequestOptions): FuncReturnType {
  if (typeof window !== 'undefined' && connection.allowDirectAccess) {
    // If we are in the browser and that we allow direct access we can use that instead as it is faster
    return fetch('shopify:admin/api/graphql.json', {
      method: 'POST',
      body: JSON.stringify({
        query: builder.build(),
        variables
      }),
    });
  }

  if (connection.client) {
    return connection.client(builder.build(), { variables, apiVersion });
  }

  throw new Error('GraphQL client is not set in the server. Use `createContext` with the client, or if you are in browser context, set the `allowDirectAccess` option to true.');
}
*/