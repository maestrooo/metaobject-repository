## 0.8.0

- [BC] The `getEmptyObject` will now have a `system` with all the possible keys set to null.
- The `getEmptyObject` now accepts an optional `defaultPublishableStatus`.
- Ensure that JSON fields are returned as an object when using the `createFormState` method, and are not serialized as a string.

## 0.7.0

- [BC] The `createFormState` method has been changed: id and handle now returns an empty string instead of null, to ensure it aligns with other properties, and make it easier to use for forms.
- Typing has been improved for capabilities. The `system.capabilities` in the returned objects will now match the definition. For instance, if a definition does not contain the `publishable` capability, it won't appear in the metaobject generated type anymore.

## 0.6.0

- The `createDefinition` method is now public on the definitions manager, to allow developers to create custom definition that are not baked by a schema.
- The `getDefinitionByType` method has been added to the definitions manager.

## 0.5.1

- Ensure the typing for JSON also works for arrays.

## 0.5.0

- JSON fields are now also converted to camelCase, to make the experience most consistent in JavaScript (and then converted back to snake_case when saved to Shopify).
- Improved the typing to add support for JSON fields.

## 0.4.1/0.4.2

- Improve the typing system on definition to ensure that `list.boolean`, `list.rich_text_field`, `list.money`, `list.id`, `list.json` and `list.multi_line_text_field` are not accepted.

## 0.4.0

- Added a new `extractFindParams` utility function that can be used to automatically extract search params to be used with the `find` method.

## 0.3.5/0.3.6

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