import { describe, it, expect } from 'vitest';
import { extractFindParams } from '../../src/utils/params';
import type { FindOptions, SortKey } from '../../src/types/metaobject-repository';

describe('extractFindParams()', () => {
  it('defaults to first=50 when neither first nor last provided', () => {
    const params = new URLSearchParams()
    const result = extractFindParams(params)
    expect(result).toEqual<FindOptions>({
      first: 50,
      after: undefined,
      sortKey: undefined,
      query: undefined,
      reverse: false,
    })
  })

  it('defaults to custom page size', () => {
    const params = new URLSearchParams()
    const result = extractFindParams(params, 25)
    expect(result).toEqual<FindOptions>({
      first: 25,
      after: undefined,
      sortKey: undefined,
      query: undefined,
      reverse: false,
    })
  })

  it('parses first and after correctly', () => {
    const params = new URLSearchParams({
      first: '20',
      after: 'CURSOR123',
    })
    const result = extractFindParams(params)
    expect(result).toEqual<FindOptions>({
      first: 20,
      after: 'CURSOR123',
      sortKey: undefined,
      query: undefined,
      reverse: false,
    })
  })

  it('parses last and before correctly', () => {
    const params = new URLSearchParams({
      last: '15',
      before: 'CURSOR_BEFORE',
    })
    const result = extractFindParams(params)
    expect(result).toEqual<FindOptions>({
      last: 15,
      before: 'CURSOR_BEFORE',
      sortKey: undefined,
      query: undefined,
      reverse: false,
    })
  })

  it('set default last when only before is visible', () => {
    const params = new URLSearchParams({
      before: 'CURSOR_BEFORE',
    })
    const result = extractFindParams(params)
    expect(result).toEqual<FindOptions>({
      last: 50,
      before: 'CURSOR_BEFORE',
      sortKey: undefined,
      query: undefined,
      reverse: false,
    })
  })

  it('reads sortKey when present', () => {
    const params = new URLSearchParams()
    params.set('sortKey', 'UPDATED_AT' as SortKey)
    const result = extractFindParams(params)
    expect(result.sortKey).toBe('UPDATED_AT')
  })

  it('reads query when present', () => {
    const params = new URLSearchParams({ query: 'search term' })
    const result = extractFindParams(params)
    expect(result.query).toBe('search term')
  })

  it('parses reverse=true as boolean', () => {
    const trueParams = new URLSearchParams({ reverse: 'true' })
    expect(extractFindParams(trueParams).reverse).toBe(true)

    const falseParams = new URLSearchParams({ reverse: 'false' })
    expect(extractFindParams(falseParams).reverse).toBe(false)

    const missing = new URLSearchParams()
    expect(extractFindParams(missing).reverse).toBe(false)
  })

  it('combines multiple parameters in last-branch priority', () => {
    const params = new URLSearchParams({
      last: '5',
      before: 'B',
      sortKey: 'CREATED_AT' as SortKey,
      query: 'foo',
      reverse: 'true',
      // even if first/after are set, last should take precedence
      first: '100',
      after: 'A',
    })
    const result = extractFindParams(params)
    expect(result).toEqual<FindOptions>({
      last: 5,
      before: 'B',
      sortKey: 'CREATED_AT',
      query: 'foo',
      reverse: true,
    })
  })

  it('falls back to default first=50 when first is missing but after is present', () => {
    const params = new URLSearchParams({ after: 'X' })
    const result = extractFindParams(params)
    expect(result.first).toBe(50)
    expect(result.after).toBe('X')
  })
})
