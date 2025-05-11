
import { AdminOperations } from "@shopify/admin-api-client";
import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { OperationBuilder } from "raku-ql";

export abstract class ClientAware {
  private client!: AdminGraphqlClient<AdminOperations>;

  /**
   * Set the GraphQL client to interact with Shopify API
   */
  withClient(client: AdminGraphqlClient<AdminOperations>): this {
    this.client = client;
    return this;
  }

  /**
   * Perform the actual request to the Shopify API
   */
  protected doRequest(opts: { builder: OperationBuilder, variables?: Record<string, any> }): ReturnType<typeof this.client> {
    if (!this.client) {
      throw new Error('GraphQL client is not set. Call withClient() on the repository before using this method.');
    }

    return this.client(opts.builder.build(), { variables: opts.variables });
  }
}