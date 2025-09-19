/**
 * Normalize a Shopify metaobject ID to ensure it is in the correct GID format.
 */
export default function normalizeMetaobjectGid(id: string): string {
  if (id.startsWith('gid://shopify/Metaobject/')) {
    return id;
  }

  return `gid://shopify/Metaobject/${id}`;
}