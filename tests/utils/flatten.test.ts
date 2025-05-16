import { describe, it, expect } from 'vitest'
import { flattenFields } from '../../src/utils/flatten';

describe('flattenFields()', () => {
  it('drops `system` and formats each field with ExtractFormValue logic', () => {
    const input = {
      system: { id: 'IGNORED' },
      str: 'abc',
      num: 10,
      bool: true,
      nil: null,
      arr: ['a', null, 2, false],
      ref: { id: 'R1', __typename: 'RefType', meta: 'x' },
      mo: { system: { id: 'M2' }, other: 1 },
      obj: { foo: 'bar' }
    }

    const out = flattenFields(input)

    expect(out).toEqual({
      str: 'abc',            // string
      num: '10',             // number → string
      bool: true,            // boolean
      nil: '',               // null → ''
      arr: ['a', '', '2', false], // array
      ref: 'R1',             // id/__typename → id
      mo: 'M2',              // system.id → id
      obj: input.obj         // other object unchanged
    })
  })

  it('works on an object with no “system” key', () => {
    const plain = { a: 1, b: null }
    expect(flattenFields(plain)).toEqual({ a: '1', b: '' })
  })
})
