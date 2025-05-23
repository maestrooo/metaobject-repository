# Authentication

Before interacting with the library, you must call one of the `create*Context` method. Those methods accept connection parameters, and your metaobjects and/or metafield definitions, which allow full-typing.

The library can be used server-side (in loader and action) and in the browser, through the [direct access API mode](https://shopify.dev/docs/api/app-bridge-library#direct-api-access).

The `createAdminContext` will create managers and repositories automatically, based on your definitions. For instance, let's assume that we have created this definitiion:

```ts
// definitions.ts
import { MetaobjectDefinitionSchema } from "metaobject-repository";

export const definitions = [
  {
    type: "$app:event",
    name: "Event",
    displayNameKey: "label",
    access: { storefront: "PUBLIC_READ" },
    capabilities: {
      translatable: { enabled: true },
      publishable: { enabled: true }
    },
    fields: [
      { name: "Label", key: "label", type: "single_line_text_field", validations: { max: 255 } },
      { name: "Banner", key: "banner", type: "file_reference", validations: { fileTypes: ["Image"] } }
    ]
  }
] as const satisfies MetaobjectDefinitionSchema;
```

To authenticate:

```ts
// loader.ts
import { metaobjectDefinitions } from "./definitions";
import { createAdminContext } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const { eventRepository, metaobjectDefinitionManager, metafieldDefinitionManager, metafieldRepository } = createAdminContext({ 
    client: admin.graphql,
    metaobjectDefinitions 
  });
}
```

The following objects are created transparently:

* `metaobjectDefinitionManager`: this object allows you to interact with metaobject definitions, and to create them automatically based on your schema.
* `metafieldDefinitionManager`: this object allows you to interact with metafield definitions, and to create them automatically based on your schema.
* `metafieldRepository`: this object allows you to get, write and delete metafields.
* `xxxRepository`: the other repositories are based on your metaobject definitions. The library uses the following convention: the app prefix is removed, the remaining is camelCased, and Repository is appended. For instance, the `$app:event_author` metaobject type would create a `EventAuthorRepository`, allowing you to interact with objects of this type.

## Using the direct access API

In your `loader` and `action`, you must explicitly pass an authentified client. However, in your components or in client loaders, you can use the `createDirectAccessContext`. This allows to directly hit the API and reduce latency:

```ts
// loader.ts
import { metaobjectDefinitions } from "./definitions";
import { createDirectAccessContext } from "metaobject-repository";

export const clientLoader = async ({ request }: ClientLoaderFunctionArgs) => {
  const { eventRepository } = createDirectAccessContext({ metaobjectDefinitions });
}
```

> This only works in the context of App Bridge apps or in admin UI extensions.

## Using the storefront API

> This feature is not yet supported but is on the roadmap.

## Creating a utility context

Manually creating the context and passing the metaobject and/or metafield definitions all the time can be tedious. To make it easier to use, we recommend you to create your own function:

```ts
// utils/create-custom-context.ts
import { ConnectionOptions, createAdminContext } from "metaobject-repository";
import { metaobjectDefinitions, metafieldDefinitions } from "~/metaobjects/definitions";

export default function createCustomAdminContext(client: any) {
  return createAdminContext({ client, metaobjectDefinitions, metafieldDefinitions });
}

// in your loaders/actions, you no longer need to pass the definitions all the time:
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const { eventRepository } = createCustomAdminContext(admin.graphql);
}