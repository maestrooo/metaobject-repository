# Managing Metaobjects

This section explains how to interact with metaobjects using the repository API. It covers querying, mutations, population of references, and access to system metadata.

---

## Setup

Before performing any operations, make sure to set a GraphQL client, coming from a loader or action:

```ts
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
 
  eventRepository.withClient(admin.graphql);
}
```

> Shopify apps are currently using Remix 2.0, which does not support middlewares. Each loaders are run in parallel,
so you must ensure that you set the client on each loader. When Shopify will add support for middleware, this process will be simplified.

---

## Querying metaobjects

### Find by ID

```ts
const event = await eventRepository.findById("gid://shopify/Metaobject/123");
```

- Also accepts legacy numeric IDs (auto-converted).
- Use `findByIdOrFail` to throw if not found.

### Find by handle

```ts
const event = await eventRepository.findByHandle("my-handle");
```

- Use `findByHandleOrFail` to throw if not found.

### Find all

```ts
const events = await eventRepository.findAll();
```

- Retrieves up to 250 objects (you can change the default using the `limit` option).
- This method is a shortcut when you know that the number of objects are small. For more advanced needs, use the `find` method instead.

### Find with filters

```ts
const result = await eventRepository.find({
  first: 100,
  sortKey: "updated_at",
  query: "label:*foo*"
});
```

Supported options:
- `first`, `last`, `before`, `after`, `reverse`, `sortKey`
- `query` (Shopify search syntax)
- `populate`, `onPopulate`

To make it easier to use in Remix apps, use the `extractFindParams` utility:

```ts
import { extractFindParams } from 'metaobject-repository';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  let { searchParams } = new URL(request.url);

  eventRepository.withClient(admin.graphql);

  return { 
    events: await eventRepository.findAll({ ...extractFindParams(searchParams) }) 
  };
}
```

> It expects query params to be called `first`, `last`, `before`, `after`, `query`, `reverse` and `sortKey`. Supports for custom param names is not currently supported.

---

## Creating metaobjects

```ts
const event = await eventRepository.create({
  handle: "my-event",
  fields: {
    label: "Launch Day",
    tags: ["Marketing", "Product"]
  },
  capabilities: {
    publishable: { status: "ACTIVE" }
  }
}, { populate: ["host"] });
```

Supported options:
- `populate`, `onPopulate`

- Fully typed from schema.
- Required fields are enforced by the TypeScript type, meaning that TypeScript will raise an error if you don't pass required fields.

---

## Updating metaobjects

```ts
await eventRepository.update({
  id: "gid://shopify/Metaobject/123",
  fields: {
    label: "Updated name"
  }
});
```

Supported options:
- `populate`, `onPopulate`

- Fields are optional even if marked required in the schema.

---

## Upserting metaobjects

```ts
await eventRepository.upsert({
  handle: "unique-handle",
  fields: { label: "Created or Updated" }
});
```

Supported options:
- `populate`, `onPopulate`

- Requires `handle` to be set.
- This method is useful when syncing or importing data, as it avoids duplicating objects.

---

## Creating many metaobjects

```ts
await eventRepository.createMany([
  {
    handle: "event-1",
    fields: { label: "Event 1" }
  },
  {
    handle: "event-2",
    fields: { label: "Event 2" }
  }
]);
```

Supported options:
- `populate`, `onPopulate`

> Only supported on the `unstable` Shopify GraphQL API. You can only pass up to 25 objects.

---

## Deleting metaobjects

### Delete one

```ts
const deletedId = await eventRepository.delete("gid://shopify/Metaobject/123");
```

### Bulk delete

```ts
await eventRepository.bulkDelete([
  "gid://shopify/Metaobject/123",
  "gid://shopify/Metaobject/456"
]);
```

This operation is asynchronous, and returns a `Job` object.

---

## Populating references

One of the benefit of this library is to easily manage references, and get a fully-typed experience. To load references, use the `populate` array with keys to load references:

```ts
const event = await eventRepository.findByHandle("launch", {
  populate: ["host"]
});
```

Nested references are supported:

```ts
populate: ["host.anotherReference"]
```

### Customizing Population

By default, references to metaobjects that you own are fully populated. For other resources (such as products or collections), the library retrieves a list of pre-defined fields, which offer a good balance between API cost and flexibility:

* Product reference: 'id', 'handle', 'title', 'productType', 'status', 'description', 'vendor', 'updatedAt', 'createdAt', 'publishedAt', 'tags','hasOnlyDefaultVariant', 'variantsCount', 'templateSuffix', 'featuredImage'.
* Collection reference: 'id', 'handle', 'title', 'description', 'hasProduct', 'sortOrder', 'updatedAt', 'templateSuffix', 'image'
* Customer reference: 'id', 'displayName', 'amountSpent', 'numberOfOrders', 'email', 'verifiedEmail', 'phone', 'createdAt', 'updatedAt', 'locale', 'image'
* Company reference: 'id', 'externalId', 'name', 'lifetimeDuration', 'ordersCount', 'totalSpent', 'createdAt', 'updatedAt'
* Metaobject reference / mixed reference (that are not owned by your app): 'id', 'type', 'handle', 'displayName', 'createdAt', 'updatedAt', 'fields'
* Page reference: 'id', 'handle', 'title', 'body', 'isPublished', 'createdAt', 'updatedAt', 'templateSuffix'
* Product taxonomy value: 'id', 'name'
* Variant reference: 'id', 'title', 'displayName', 'sku', 'price', 'compareAtPrice', 'availableForSale', 'inventoryQuantity', 'barcode', 'createdAt', 'updatedAt', 'image'
* File reference:
  * For all types: 'id', 'fileStatus', 'alt', 'preview.status', 'preview.image.{id, altText, height, width, url}'.
  * If "Image", also has: 'mimeType', 'image.{id, altText, height, width, url}', 'originalSource.fileSize'.
  * If "Video", also has: 'duration', 'sources.{format, fileSize, height, width, mimeType, url}'.
    'preview.image.id', 'preview.image.altText', 'preview.image.height', 'preview.image.width', 'preview.image.url'
  * If "Generic", also has: 'mimeType', 'originalFileSize', 'url'.

For more advanced use-cases, you can use `onPopulate` to fine-tune the GraphQL query for built-in or external references:

```ts
const event = await eventRepository.findByHandle("launch", {
  populate: ["product"],
  onPopulate(field, builder) {
    if (field.key === "product") {
      return builder.inlineFragment("Product", (p) => {
        p.fields("id", "title", "vendor");
      });
    }
  }
});
```

> The builder uses [Raku-QL](https://github.com/maestrooo/raku-ql), a library that we have created for this project to programmatically create GraphQL queries.

---

## System fields

All returned objects include a `.system` key with metadata:

```ts
event.system.id;
event.system.handle;
event.system.type;
event.system.displayName;
event.system.createdAt;
event.system.updatedAt;
event.system.capabilities;
event.system.thumbnail;
```

> These fields are fetched only when necessary to optimize performance. For instance, a metaobject definition that do not have any color or file field can't have a thumbnail, so the thumbnail won't be retrieved at all and will be set to null.

---

## Summary

| Operation       | Method                    |
|------------------|-----------------------------|
| Get by ID        | `findById` / `findByIdOrFail` |
| Get by handle    | `findByHandle` / `findByHandleOrFail` |
| Get many         | `find`, `findAll`           |
| Create           | `create`, `createMany`      |
| Update           | `update`                    |
| Upsert           | `upsert`                    |
| Delete           | `delete`, `bulkDelete`      |

All methods support optional `populate` and `onPopulate` for deep, optimized fetching.