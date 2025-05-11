# Managing Metafields

While the primary purpose of `metaobject-repository` is to simplify access to Shopify metaobjects, it also provides a thin, type-safe wrapper around metafield operations.

---

## Setup

Before using metafield operations, always connect the GraphQL client:

```ts
import { metafieldRepository } from "metaobject-repository";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
 
  metafieldRepository.withClient(admin.graphql);
}
```

---

## Getting an app metafield

App metafields are metafields stored on the app installation itself rather than a resource. The library offers a convenience method that transparently retrieve (and cache) the cache installation ID:

```ts
const metafield = await metafieldRepository.getAppMetafield({
  key: "foo",
  namespace: "bar"
});
```

---

## Getting multiple metafields for a resource

Use `getMetafields()` and specify the `ownerId`, which is a GID to the target resource (e.g. product, customer).

```ts
const { items, pageInfo } = await metafieldRepository.getMetafields({
  owner: "gid://shopify/Product/123",
  first: 50
});
```

---

## Setting metafields

### Resource

```ts
await metafieldRepository.setMetafields([
  {
    type: "single_line_text_field",
    key: "foo",
    namespace: "bar",
    value: "123",
    ownerId: "gid://shopify/Product/123"
  }
]);
```

### App-owned metafields:

When writing metafields on the app itself, the `ownerId` is retrieved transparently:

```ts
await metafieldRepository.setAppMetafields([
  {
    type: "single_line_text_field",
    key: "foo",
    namespace: "bar",
    value: "123"
  }
]);
```

---

## Deleting metafields

To delete one or more metafields from a resource:

```ts
await metafieldRepository.deleteMetafields([
  {
    key: "foo",
    namespace: "bar",
    ownerId: "gid://shopify/Product/123"
  }
]);
```

> Deletion is based on `key`, `namespace`, and `ownerId`. All must be provided.

---

## Summary

| Action                    | Method                     |
|---------------------------|------------------------------|
| Get app metafield         | `getAppMetafield()`          |
| Get resource metafields   | `getMetafields()`            |
| Set metafields (resource) | `setMetafields()`            |
| Set app metafields        | `setAppMetafields()`         |
| Delete metafields         | `deleteMetafields()`         |

Use these methods when your app needs to persist configuration or supplemental data without relying on metaobject instances.