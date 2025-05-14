import { FindOptions, SortKey } from '~/types/metaobject-repository'

/**
 * Extract a find object to be used with the `find` method.
 */
export function extractFindParams(searchParams: URLSearchParams): FindOptions {

  const sortKey = searchParams.has(`sortKey`) ? searchParams.get('sortKey') as SortKey : undefined;
  const query = searchParams.get('query') || undefined;
  const reverse = searchParams.get('reverse') === 'true' ? true : false;

  if (searchParams.has('last')) {
    const last = parseInt(searchParams.get('last') as string);
    const before = searchParams.get('before') || undefined;

    return { last, before, sortKey, query, reverse };
  } else {
    const first = searchParams.has('first') ? parseInt(searchParams.get('first') as string) : 50;
    const after = searchParams.get('after') || undefined;

    return { first, after, sortKey, query, reverse };
  }
}