import { describe, it, expect } from 'vitest';
import { deserializeMetafield, deserializeMetaobject } from '../../src/transformer/deserializer';
import { MetaobjectStatus, type Metafield, type Metaobject } from '../../src//types/admin.types';

describe('deserializeMetafield()', () => {
  it('camel-cases an object jsonValue', () => {
    const mf: Pick<Metafield, 'id' | 'jsonValue'> = {
      id: '1',
      jsonValue: { foo_bar: 123, nested_val: { inner_key: 'v' } },
    }

    const out = deserializeMetafield({ ...mf })
    expect(out.jsonValue).toEqual({ fooBar: 123, nestedVal: { innerKey: 'v' } })
  })

  it('camel-cases each element of an array jsonValue', () => {
    const mf: Pick<Metafield, 'id' | 'jsonValue'> = {
      id: '2',
      jsonValue: [
        { first_key: 'a' },
        { second_key: 'b' },
      ]
    }

    const out = deserializeMetafield({ ...mf })
    expect(out.jsonValue).toEqual([
      { firstKey: 'a' },
      { secondKey: 'b' },
    ])
  })

  it('leaves non-object/array jsonValue unchanged', () => {
    const mf: Pick<Metafield, 'id' | 'jsonValue'> = {
      id: '3',
      jsonValue: 'plain'
    }

    const out = deserializeMetafield({ ...mf })
    expect(out.jsonValue).toBe('plain')
  })

  it('resolves single reference via deserializeReference', () => {
    const refObj = { __typename: 'Metaobject', id: 'X', type: 'T', handle: 'h', displayName: 'd', updatedAt: new Date().toISOString(), fields: [] }
    const mf: Pick<Metafield, 'id' | 'type' | 'reference'> = {
      id: '4',
      type: 'metaobject_reference',
      reference: refObj as any,
    }

    const out = deserializeMetafield({ ...mf })
    // should have picked up a system block from deserializeMetaobject:
    expect(out.reference).toHaveProperty('system');
    expect(out.reference.system.id).toBe('X');
  })
})

/*
describe('deserializeMetaobject()', () => {
  const base: Omit<Metaobject, '__typename'> = {
    id: 'OBJ1',
    type: 'MyType',
    handle: 'hndl',
    displayName: 'Display',
    updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    capabilities: { publishable: { status: MetaobjectStatus.Active } },
    thumbnailField: { thumbnail: { hex: '#000000' } },
    fields: [],
  }

  it('builds system metadata correctly', () => {
    const mo = { ...base }
    const out = deserializeMetaobject(mo)
    expect(out.system).toEqual({
      id: 'OBJ1',
      type: 'MyType',
      handle: 'hndl',
      displayName: 'Display',
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      capabilities: { publishable: true },
      thumbnailField: { url: 'x' },
    })
  })

  it('camel-cases json fields correctly', () => {
    const mo: Metaobject = {
      ...base,
      fields: [
        { key: 'some_field', type: 'json', jsonValue: { inner_key: 'v' } },
      ],
      __typename: 'Metaobject',
    }

    const out = deserializeMetaobject(mo)
    expect(out.someField).toEqual({ innerKey: 'v' })
  })

  it('parses list fields as array', () => {
    const mo: Metaobject = {
      ...base,
      fields: [
        { key: 'items', type: 'list.string', jsonValue: ['a','b'] },
      ],
      __typename: 'Metaobject',
    }

    const out = deserializeMetaobject(mo)
    expect(out.items).toEqual(['a','b'])
  })

  it('converts boolean strings to booleans', () => {
    const mo: Metaobject = {
      ...base,
      fields: [
        { key: 'flag', type: 'boolean', jsonValue: 'true' },
        { key: 'flag2', type: 'boolean', jsonValue: false },
      ],
      __typename: 'Metaobject',
    }

    const out = deserializeMetaobject(mo)
    expect(out.flag).toBe(true)
    expect(out.flag2).toBe(false)
  })

  it('copies primitive fields unchanged', () => {
    const mo: Metaobject = {
      ...base,
      fields: [
        { key: 'title', type: 'string', jsonValue: 'Hello' },
      ],
      __typename: 'Metaobject',
    }

    const out = deserializeMetaobject(mo)
    expect(out.title).toBe('Hello')
  })

  it('resolves top-level reference properties', () => {
    const childMO = {
      __typename: 'Metaobject',
      id: 'C1',
      type: 'Child',
      handle: 'c',
      displayName: 'Child',
      updatedAt: new Date().toISOString(),
      fields: [],
    }
    const mo: any = {
      ...base,
      __typename: 'Metaobject',
      fields: [],
      _childRef: { reference: childMO },
      _manyRefs: { references: { nodes: [ childMO ] } },
    }

    const out = deserializeMetaobject(mo)
    expect(out.childRef).toHaveProperty('system')
    expect(Array.isArray(out.manyRefs)).toBe(true)
    expect(out.manyRefs[0]).toHaveProperty('system')
  })
})*/