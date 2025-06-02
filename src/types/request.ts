import type { ApiVersion } from "@shopify/shopify-api";

type GraphQLError = {
  message: string;
}

type RawResponse = {
  json(): Promise<GraphQLResponse>;
};

export type GraphQLResponse = {
  data?: any;
  errors?: GraphQLError[];
};

export type QueryAdminApi = <Variables extends Record<string, unknown> = Record<string, unknown>> (
  query: string,
  options?: {
    variables?: Variables;
    apiVersion?: ApiVersion;
  }
) => Promise<RawResponse>;