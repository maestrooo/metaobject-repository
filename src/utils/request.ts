import { ApiVersion } from "@shopify/shopify-app-remix/server";
import { AdminOperations } from "@shopify/admin-api-client";
import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { OperationBuilder } from "raku-ql";
import { ClientProvider } from "~/provider/client-provider";

type FuncReturnType = ReturnType<AdminGraphqlClient<AdminOperations>>;

type DoRequestOptions = {
  builder: OperationBuilder;
  variables?: Record<string, any>;
  apiVersion?: ApiVersion;
}

export function doRequest({ builder, variables, apiVersion }: DoRequestOptions): FuncReturnType {
  const client = ClientProvider.client;

  if (!client) {
    throw new Error('GraphQL client is not set. Call ClientProvider.setClient() before interacting with repositories and managers.');
  }

  return client(builder.build(), { variables: variables, apiVersion: apiVersion });
}