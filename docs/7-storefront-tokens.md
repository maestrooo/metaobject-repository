# Storefront Tokens

The `metaobject-repository` library includes a lightweight wrapper to manage Shopify **storefront access tokens**, which are commonly used when interacting with Liquid themes or the Storefront API.

---

## Setup

Before calling any method, connect the authenticated GraphQL client:

```ts
import { storefrontTokenRepository } from "metaobject-repository";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { storefrontTokenRepository } = createContext({ connection: { client: admin.graphql }});
}
```

---

## Creating a token

Create a new storefront access token for your app:

```ts
const token = await storefrontTokenRepository.createToken({
  title: "Main Storefront Token"
});
```

This will create a new token unless one with the same title already exists.

---

## Upserting a token

Ensure a token exists — if it already does, return it instead of creating a new one:

```ts
const token = await storefrontTokenRepository.upsertToken({
  title: "Main Storefront Token"
});
```

This is the preferred method for provisioning tokens in production apps.

---

## Deleting a token

Remove a token by its title:

```ts
await storefrontTokenRepository.deleteToken({
  title: "Main Storefront Token"
});
```

Useful for cleanup operations or when rotating tokens.

---

## Finding all tokens

Retrieve all active tokens created by your app:

```ts
const tokens = await storefrontTokenRepository.findExistingTokens();
```

Returns an array of tokens with their `id`, `title`, `accessToken`, and `createdAt`.

---

## Notes

- Token titles must be unique within the app.
- These tokens can be used for storefront API queries.

---

## Summary

| Action          | Method                      |
|-----------------|-----------------------------|
| Create token     | `createToken({ title })`    |
| Upsert token     | `upsertToken({ title })`    |
| Delete token     | `deleteToken({ title })`    |
| List all tokens  | `findExistingTokens()`      |