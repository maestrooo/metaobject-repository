import type { FindOptions, SortKey } from '~/types/metaobject-repository';

/**
 * Extract a find object to be used with the `find` method.
 */
export function extractFindParams(searchParams: URLSearchParams, defaultPageSize: number = 50): FindOptions {
  const sortKey = searchParams.has(`sortKey`) ? searchParams.get('sortKey') as SortKey : undefined;
  const query = searchParams.get('query') || undefined;
  const reverse = searchParams.get('reverse') === 'true' ? true : false;

  const hasLast = searchParams.has('last');
  const before = searchParams.get('before') || undefined;
  const after = searchParams.get('after') || undefined;

  // Case 1: explicit "last"
  if (hasLast) {
    const last = parseInt(searchParams.get('last') as string);
    return { last, before, sortKey, query, reverse };
  }

  // Case 2: "before" exists without "after" (and no explicit "last")
  if (before !== undefined && after === undefined) {
    return { last: defaultPageSize, before, sortKey, query, reverse };
  }

  // Case 3: default to "first" (or user‐provided first) + optional after
  const first = searchParams.has('first') ? parseInt(searchParams.get('first') as string) : defaultPageSize;

  return { first, after, sortKey, query, reverse };
}