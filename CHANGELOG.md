## 0.3.5

- Fix a bug where the id was not properly converted to GID when using legacy ID in the `update` method.

## 0.3.3/0.3.4

- I'm not 100% sure on what would be the best way to handle that, but actually I am changing the null values again: list fields will actually default to [] when returned, while scalar value will resolve to null (as per the change introduced in 0.3.2).

## 0.3.2

- Change the logic of how null values are treated to match Shopify structure, and improve the typing so that non required fields might resolve to null in the generated type.

## 0.3.1

- Fix an issue during deserialization for an empty reference.

## 0.3.0

- A new `getEmptyObject` method has been added on repositories, which allows creating an empty object for creating forms, while preserving all the typing system.
- A new `createFormState` method has been added to make it easier to work with forms.
- [BC] Null values are now deserialized as string (for non-list fields) and as empty array for list fields. This makes it easier to work with forms.
- [BC] The `system` is now marked as read-only, as it should not be edited.

## 0.2.5

- Fix an inference data for the `CreateInput`, `UpsertInput` and `UpdateInput` on list fields.

## 0.2.4

- Fix an issue in the definition manager dependency creation.

## 0.2.3

- Fix invalid build.

## 0.2.2

- Fix serialization of fields for `createMany`.

## 0.2.1

- Fix serialization of fields.

## 0.2.0

- Add a store access token repositories.

## 0.1.2

- Add a new `setAppMetafields` function to the metafield repository to make it easier to save app metafields without manually retrieving the current app installation ID.

## 0.1.1

- Add the missing `withClient` in metafield repository.

## 0.1.0

- Initial release