# Metaobject Repository Documentation

Welcome to the documentation for **Metaobject Repository**, a fully-typed abstraction layer for working with [Shopify metaobjects](https://shopify.dev/docs/custom-data/metaobjects). The library helps you managing definitions (both metaobjects and metafields), metaobjects, metafields and storefront access tokens.

---

## 📦 Installation

```bash
npm install metaobject-repository
```

---

## 🚀 Quick Start

### Metaobjects

A minimal example to define a schema, create a metaobject, and delete it.

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

```ts
// loader.ts
import { metaobjectDefinitions } from "./definitions";
import { createContext } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const { eventRepository, metaobjectDefinitionManager } = createContext({ connection: { client: admin.graphql }, metaobjectDefinitions });

  // Create the schema on Shopify (dependencies between schemas are automatically resolved)
  await metaobjectDefinitionManager.createFromSchema();

  // Create an object, and populate the banner to fill references
  const event = await eventRepository.create({
    handle: "hello-world",
    fields: { label: "Hello World", banner: "gid://shopify/MediaImage/123" }
  }, { populate: ["banner" ]});

  // Delete the object
  await eventRepository.delete(event.system.id);
}
```

### Metafields

A minimal example to define a schema, create a metafield, and delete it.

```ts
// definitions.ts
import { MetafieldDefinitionSchema } from "metaobject-repository";

export const definitions = [
  {
    type: "single_line_text_field",
    name: "Event",
    key: "event",
    namespace: "test"
  }
] as const satisfies MetafieldDefinitionSchema;
```

```ts
// loader.ts
import { metafieldDefinitions } from "./definitions";
import { createContext } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const { metafieldRepository, metafieldDefinitionManager } = createContext({ connection: { client: admin.graphql }, metafieldDefinitions });

  // Create the schema on Shopify (dependencies between schemas are automatically resolved)
  await metafieldDefinitionManager.createFromSchema();

  // Create a metafield
  await metafieldRepository.setMetafields([
    { key: 'event', namespace: 'test', ownerId: 'gid://shopify/Product/123', value: 'something' }
  ])
  
  await metafieldRepository.delete({ key: 'event', namespace: 'test', ownerId: 'gid://shopify/Product/123' });
}
```

---

## 📚 Documentation

- [Typing system](./docs/1-typing.md)
- [Authentication](./docs/2-authentication.md)
- [Managing metaobject definitions](./docs/3-metaobject-definitions.md)
- [Managing metaobjects](./docs/4-metaobjects.md)
- [Managing metafield definitions](./docs/5-metafield-definitions.md)
- [Managing metafields](./docs/6-metafields.md)
- [Storefront tokens](./docs/7-storefront-tokens.md)
- [Recipes](./docs/8-recipes.md)

---

## Roadmap

* Adding a `bulkUpsert` method to upsert a high number of objects using a long standing job.
* Adding an `export` method to the repository to export up to 250 metaobjects.
* Adding a `bulkExport` method to export any number of metaobjects, using the bulk API.
* Adding a `syncFromSchema` method on the definition manager to sync definitions.
* Find a way to add a `useDirectAccess` method. Right now, it seems that due to some exports done in the repository, this does not work.
* Adding a translation repository to make it easier to translate metaobjects.