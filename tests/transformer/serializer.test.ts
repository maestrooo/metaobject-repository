import { describe, it, expect } from 'vitest'
import { serializeValue, serializeFields } from '../../src/transformer/serializer';

describe('serializeValue', () => {
  it('returns empty string for null, undefined or empty array', () => {
    expect(serializeValue(null)).toBe('');
    expect(serializeValue(undefined)).toBe('');
    expect(serializeValue([])).toBe('');
  })

  it('leaves plain strings untouched', () => {
    expect(serializeValue('hello')).toBe('hello');
    expect(serializeValue('')).toBe(''); // empty string stays empty
  })

  it('JSON-stringifies an array of primitives', () => {
    const arr = [1, 2, 'three'];
    expect(serializeValue(arr)).toBe(JSON.stringify(arr));
  })

  it('JSON-stringifies an array of objects, snake-casing their keys', () => {
    const arr = [
      { fooBar: 'bazBar' },
      { anotherKey: 123 },
    ]
    const result = serializeValue(arr);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual([
      { foo_bar: 'bazBar' },
      { another_key: 123 },
    ])
  })

  it('JSON-stringifies a single object, snake-casing its keys', () => {
    const obj = { someField: 'value', innerMost: { deepKey: true } }
    const result = serializeValue(obj)
    const parsed = JSON.parse(result)
    expect(parsed).toEqual({
      some_field: 'value',
      inner_most: { deep_key: true },
    })
  })

  it('does not snake case rich text fields', () => {
    const obj = { type: 'root', children: [{ listType: 'unordered' }] }
    const result = serializeValue(obj)
    const parsed = JSON.parse(result)
    expect(parsed).toEqual({
      type: 'root',
      children: [{ listType: 'unordered' }],
    })
  })
})

describe('serializeFields', () => {
  it('maps each entry to { key: snake(key), value: serializeValue(value) }', () => {
    const data = {
      fooBar: 1,
      someField: null,
      nestedField: { innerKey: 'v' },
    }

    const fields = serializeFields(data)
    expect(fields).toEqual([
      { key: 'foo_bar',   value: '1' },
      { key: 'some_field', value: '' },
      { key: 'nested_field', value: JSON.stringify({ inner_key: 'v' }) },
    ])
  })

  it('handles empty object', () => {
    expect(serializeFields({})).toEqual([])
  })

  it('snake-cases complex keys', () => {
    const data = { 'already_snake': 'x', 'MixedCASEKey': 'y' }
    const fields = serializeFields(data)
    expect(fields).toEqual([
      { key: 'already_snake', value: 'x' },
      { key: 'mixed_casekey', value: 'y' },
    ])
  })
})
