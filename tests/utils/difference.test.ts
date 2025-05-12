// diffOneLevel.test.ts
import { describe, it, expect } from 'vitest';
import { fieldsDifference } from '../../src/utils/difference';

interface Example {
  event: { name: string; address: { street1: string } }
  title: string
}

describe('diffOneLevel', () => {
  it('returns an empty object when both are strictly identical', () => {
    const a = { x: 1, y: 'a', z: [1, 2, 3] }
    const b = { x: 1, y: 'a', z: [1, 2, 3] }
    expect(fieldsDifference(a, b)).toEqual({})
  })

  it('detects primitive changes', () => {
    const a = { x: 1, y: 2 }
    const b = { x: 1, y: 3 }
    expect(fieldsDifference(a, b)).toEqual({ y: 3 })
  })

  it('flags whole nested object when one of its direct props differs', () => {
    const obj1: Example = {
      event: { name: 'baz', address: { street1: 'baz' } },
      title: 'bam',
    }
    const obj2: Example = {
      event: { name: 'baz', address: { street1: 'bim' } },
      title: 'bam',
    }
    expect(fieldsDifference(obj1, obj2)).toEqual({
      event: { name: 'baz', address: { street1: 'bim' } },
    })
  })

  it('detects array differences', () => {
    const a = { arr: [0, 1], other: 'ok' }
    const b = { arr: [0, 2], other: 'ok' }
    expect(fieldsDifference(a, b)).toEqual({ arr: [0, 2] })
  })

  it('considers objects vs. arrays as changed', () => {
    const a = { foo: { a: 1 }, bar: 'x' };
    const b = { foo: [{ a: 1 }], bar: 'x' }

    const diff = fieldsDifference(a as any, b as any)
    expect(diff).toEqual({ foo: [{ a: 1 }] })
  })

  it('includes keys present in obj2 that are missing in obj1', () => {
    const a = { a: 1 }
    const b = { a: 1, b: 2 }
    expect(fieldsDifference(a, b)).toEqual({ b: 2 })
  })

  it('ignores extra keys in obj1 not in obj2', () => {
    const a = { a: 1, extra: 42 }
    const b = { a: 1 }
    expect(fieldsDifference(a as any, b as any)).toEqual({})
  }),

  it('get extra keys in obj1 not in obj2 if empty', () => {
    const a = { a: 1, extra: 42 }
    const b = { a: 1, extra: '' }
    expect(fieldsDifference(a as any, b as any)).toEqual({ extra: '' })
  })
})
