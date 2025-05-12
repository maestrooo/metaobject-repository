# Recipes

This section includes common patterns, utility techniques, and best practices for working with the `metaobject-repository` library in real-world applications.

---

## 🔁 Flattening fields for forms

The data returned by repositories includes nested references and a `system` key, which is often inconvenient for form inputs. Use `flattenFields()` to get a flat, ID-based version of your object:

```ts
import { flattenFields } from "metaobject-repository";

const flat = flattenFields(myMetaobject);
```

This flattens fields like:

```ts
{
  title: "Hello",
  icon: { id: "gid://shopify/File/123", ... },
  products: [{ id: "gid://shopify/Product/456", title: "My product", ... }]
}
```

into:

```ts
{
  title: "Hello",
  icon: "gid://shopify/File/123",
  products: ["gid://shopify/Product/456"]
}
```

---

## 🔁 Optimizing updates

For large metaobjects, updating only the fields that have changed can be beneficial for performance. To make this easier, you can use the `fieldsDifference`, which accept two objects (the original object and the new object), and return a new object containing only the fields that have changed.

```ts
import { fieldsDifference } from "metaobject-repository";

const defaultValues = { title: 'Foo', author: 'John' };
const newState = { title: 'Foo', author: 'Mark' };
const difference = fieldsDifference(defaultValues, newState);

// { author: 'Mark' }
```

---

## 🔍 Extracting query parameters

When using `find()` to paginate/search metaobjects from URL query params, use the `extractFindParams` utility:

```ts
import { extractFindParams } from "metaobject-repository";

const searchParams = new URL(request.url).searchParams;
const result = await eventRepository.find({
  ...extractFindParams(searchParams),
  populate: ["icon"]
});
```

Supports keys: `first`, `last`, `before`, `after`, `query`, `reverse`, `sortKey`.

---

## 🧠 Typing Loader Data in Remix

Use `useLoaderData<typeof loader>()` for automatic typing inside your route.

To retain types in a child component:

```ts
// index.tsx
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  eventRepository.withClient(admin.graphql);

  const events = await eventRepository.findAll();

  return { events };
}

export type EventsList = ReturnType<typeof useLoaderData<typeof loader>>['events'];

// list.tsx
type Props = { 
  events: EventsList 
};

export default function List({ events }: Props) { 
  // Your component
}
```

---

## 🧩 Inferring metaobject types

To derive the type of a metaobject (with optional `populate`) from your schema:

```ts
import { InferObjectType } from "metaobject-repository";

type Event = InferObjectType<typeof definitions, "$app:event", ["host"]>;
// OR
type Event = InferObjectType<typeof eventRepository, ["host"]>;
```

---

## ✅ Upserting and populating

```ts
const event = await eventRepository.upsert({
  handle: "launch-2024",
  fields: {
    label: "Launch 2024",
    host: "gid://shopify/Metaobject/123"
  }
}, {
  populate: ["host"]
});
```

This ensures the object exists and is returned fully populated in a single request. This works for all mutations, and can help improving performance.