import { AdminOperations } from "@shopify/admin-api-client";
import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";

/**
 * Expose the Shopify GraphQL client provider
 */
export class ClientProvider {
  static client?: AdminGraphqlClient<AdminOperations>;
}