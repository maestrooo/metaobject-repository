import { ApiVersion } from "@shopify/shopify-app-remix/server";
import { AdminOperations } from "@shopify/admin-api-client";
import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { OperationBuilder } from "raku-ql";
import { ClientProvider } from "~/provider/client-provider";

type FuncReturnType = ReturnType<AdminGraphqlClient<AdminOperations>>;

export function doRequest(opts: { builder: OperationBuilder, variables?: Record<string, any>, apiVersion?: ApiVersion }): FuncReturnType {
  const client = ClientProvider.client;

  if (!client) {
    throw new Error('GraphQL client is not set. Call ClientProvider.setClient() before interacting with repositories and managers.');
  }

  return client(opts.builder.build(), { variables: opts.variables, apiVersion: opts.apiVersion });
}