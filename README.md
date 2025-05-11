# Metaobject Repository Documentation

Welcome to the documentation for **Metaobject Repository**, a fully-typed abstraction layer for working with [Shopify metaobjects](https://shopify.dev/docs/custom-data/metaobjects). The library helps you managing definitions, metaobjects, metafields and storefront access tokens.

---

## 📦 Installation

```bash
npm install metaobject-repository
```

---

## 🚀 Quick Start

A minimal example to define a schema, create a metaobject, and delete it.

```ts
// definitions.ts
import { DefinitionSchema, MetaobjectRepository } from "metaobject-repository";

export const definitions = [
  {
    type: "$app:event",
    name: "Event",
    displayNameKey: "label",
    access: { storefront: "NONE" },
    capabilities: {
      translatable: { enabled: true },
      publishable: { enabled: true }
    },
    fields: [
      { name: "Label", key: "label", type: "single_line_text_field", validations: { max: 255 } },
      { name: "Banner", key: "banner", type: "file_reference", validations: { fileTypes: ["Image"] } }
    ]
  }
] as const satisfies DefinitionSchema;

export const eventRepository = new MetaobjectRepository(definitions, "$app:event");
```

```ts
// loader.ts
import { eventRepository, definitions } from "./definitions";
import { definitionManager } from "metaobject-repository";

export async function setup(client: any) {
  definitionManager.withClient(client);
  eventRepository.withClient(client);

  // Create the schema on Shopify (dependencies between schemas are automatically resolved)
  await definitionManager.createFromSchema(definitions);

  // Create an object, and populate the banner to fill references
  const event = await eventRepository.create({
    handle: "hello-world",
    fields: { label: "Hello World", banner: "gid://shopify/MediaImage/123" }
  }, { populate: ["banner" ]});

  // Delete the object
  await eventRepository.delete(event.system.id);
}
```

---

## 📚 Documentation

- [Typing System](./docs/1-typing.md)
- [Managing Metaobjects](./docs/2-metaobjects.md)
- [Managing Definitions](./docs/3-definitions.md)
- [Metafield Management](./docs/4-metafields.md)
- [Storefront Tokens](./docs/5-storefront-tokens.md)
- [Recipes](./docs/6-recipes.md)

---

## Roadmap

* Adding a translation repository to make it easier to translate metaobjects.
* Adding a `bulkUpsert` method to upsert a high number of objects using a long standing job.
* Adding an `export` method to the repository to export up to 250 metaobjects.
* Adding a `bulkExport` method to export any number of metaobjects, using the bulk API.
* Adding a `syncFromSchema` method on the definition manager to sync definitions.
* Find a way to add a `useDirectAccess` method. Right now, it seems that due to some exports done in the repository, this does not work.