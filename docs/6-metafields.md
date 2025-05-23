# Managing Metafields

This section explains how to interact with metafields using the repository API. It covers querying, mutations, population of references, and access to system metadata.

---

## Setup

Before using metafield operations, make sure that you create a repository with the `create*Context`:

```ts
import { createAdminContext } from "metaobject-repository";
import { metafieldDefinitions } from "your-definitions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { metafieldRepository } = createAdminContext({ client: admin.graphql, metafieldDefinitions });
}
```

The definitions are optional. If you are interacting with unstructured metafields or metafields that you don't own, simply don't pass the definitions. Passing a definition schema primarily allows to automatically populate references based on the reference type.

As for metaobject repositories, you can also use the metafield repository directly in the browser (for App Bridge apps only) by omitting the client with the `createDirectAccessContext`:

```ts
import { createDirectAccessContext } from "metaobject-repository";
import { metafieldDefinitions } from "your-definitions";

export const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  const { metafieldRepository } = createDirectAccessContext({ metafieldDefinitions });
}
```

---

## Queries

### Naming convention

Values that are JSON are automatically converted to camelCase to make it easier to work with in JS. This applies to JSON fields or fields requiring a JSON (such as `weight` or `money`)

```ts
const metafield = await metafieldRepository.getAppMetafield({ key: "foo", namespace: "bar" });

// If metafield is of type "money":
metafield.jsonValue.currencyCode;
```

---

### Getting an app metafield

App metafields are metafields stored on the app installation itself rather than a resource. The library offers a convenience method that transparently retrieve (and cache) the cache installation ID:

```ts
const metafield = await metafieldRepository.getAppMetafield({ key: "foo", namespace: "bar" });
```

### Getting multiple app metafields

Use `getAppMetafields` to get multiple app-owned metafields:

```ts
const { items, pageInfo } = await metafieldRepository.getAppMetafields({ first: 50, namespace: 'settings' });
```

---

### Getting a resource metafield

Use `getMetafield` with an `ownerId`, `namespace` and `key`. Under the hood, an optimized request on the resource type
will be performed:

```ts
const metafield = await metafieldRepository.getMetafield({
  ownerId: "gid://shopify/Product/123",
  key: "foo",
  namespace: "bar"
});
```

> To get an app-owned metafield, use the `getAppMetafield` instead.

---

### Getting multiple metafields for a resource

Use `getMetafields()` and specify the `ownerId`, which is a GID to the target resource (e.g. product, customer).

```ts
const { items, pageInfo } = await metafieldRepository.getMetafields({
  owner: "gid://shopify/Product/123",
  namespace: "foo", // optional
  first: 50
});
```

> To get app-owned metafields, use the `getAppMetafields` instead.

---

### Populating reference(s)

Similar to the metaobject repository, reference metafields can be automatically populated. There are, however, a few caveats to be aware of.

#### For one methods (`getAppMetafield` and `getMetafield`)

When retrieving a single metafield that is backed by a definition, the library can automatically infers the reference type, and transparently issue an optimized GraphQL query to retrieve the reference. For instance, let's say you have this schema:

```ts
import { MetafieldDefinitionSchema } from "metaobject-repository";

export const metafieldDefinitions = [
  {
    type: "product_reference",
    ownerType: "PRODUCT",
    name: "Featured product",
    key: "featured_product"
  },
] as const satisfies MetafieldDefinitionSchema;
```

Because the library knows the reference type (a product), you just need to pass the `populate` option to true:

```ts
const metafield = await metafieldRepository.getMetafield({ ownerId: "gid://shopify/Product/123", key: "featured_product", populate: true });

if (metafield.reference) {
  metafield.reference.title; // Get access to the product title
}
```

For list of references, use the `references` array instead.

If the key/namespace/ownerType combination is not a metafield definition that you have defined in the schema, then the library won't be able to automatically infer the reference type and won't know which fields to fetch. To work-around that, you must use the `onPopulate` callback, which gives you a field builder to build your request:

```ts
const metafield = await metafieldRepository.getMetafield({ 
  ownerId: "gid://shopify/Product/123", 
  key: "non_managed",
  onPopulate: ({ fieldBuilder }) => {
    fieldBuilder.object('reference', reference => {
      reference.fragment('Product', product => {
        product.fields('id', 'title', 'description')
      })
    })
  }
});
```

#### For list methods (`getAppMetafields` and `getMetafields`)

When retrieving a list of metafields, their type can be completely heterogeneous. The library therefore cannot make any assumption about the type of data to fetch. Similar to unmanaged metafields, you can use the `onPopulate` method to decide by yourself the data to retrieve:

```ts
const { items, pageInfo } = await metafieldRepository.getMetafields({ 
  ownerId: "gid://shopify/Product/123", 
  first: 50,
  namespace: "foo",
  onPopulate: ({ fieldBuilder }) => {
    fieldBuilder.object('reference', reference => {
      // Retrieve those fields for product reference metafields
      reference.fragment('Product', product => {
        product.fields('id', 'title', 'description')
      })

      // Retrieve those fields for page reference metafields
      reference.fragment('Page', page => {
        page.fields('id', 'title')
      })
    })
  }
});
```

### Typing reference type

The reference type are not automatically inferred. To get typing, you can use the first generic parameter of each `get` method:

```ts
type PickedProduct = Pick<Product, 'id' | 'title' | 'description'>

const metafield = await metafieldRepository.getMetafield<PickedProduct>({ 
  ownerId: "gid://shopify/Product/123", 
  key: "non_managed",
  onPopulate: ({ fieldBuilder }) => {
    fieldBuilder.object('reference', reference => {
      reference.fragment('Product', product => {
        product.fields('id', 'title', 'description')
      })
    })
  }
});

// metafield.reference is of type PickedProduct
```

---

## Mutations

### Naming convention

To make it easier to work in different environments and make it consistent with metaobjects, the `value` does not have to be stringified. Similarily, you must use camelCase when sending data. It will be automatically converted to snake_case. For instance, if the `money` metafield is saved as { amount, currency_code } in Shopify. However, to save the data using the library, use camelCase:

```ts
await metafieldRepository.setMetafields([
  {
    type: "money",
    key: "foo",
    namespace: "bar",
    value: { amount: "123.00", currencyCode: "EUR" },
    ownerId: "gid://shopify/Product/123"
  }
]);
```

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