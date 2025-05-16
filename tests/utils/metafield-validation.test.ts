import { describe, it, expect } from 'vitest';
import { convertValidations } from '../../src/utils/metafield-validations';

describe('convertValidations', () => {
  it('converts metaobjectType into validation', () => {
    const input = { metaobjectType: 'Foo' } as any;
    expect(convertValidations(input)).toEqual([
      { name: 'metaobject_definition_type', value: 'Foo' }
    ]);
  });

  it('converts metaobjectTypes into validation', () => {
    const input = { metaobjectTypes: ['Foo', 'Bar'] } as any;
    expect(convertValidations(input)).toEqual([
      { name: 'metaobject_definition_types', value: JSON.stringify(['Foo', 'Bar']) }
    ]);
  });

  it('converts simple validations', () => {
    const input = { validations: { max: 5, regex: '\\d+' } } as any;
    expect(convertValidations(input)).toEqual([
      { name: 'max', value: '5' },
      { name: 'regex', value: '\\d+' }
    ]);
  });

  it('maps listMin and listMax to list.min and list.max', () => {
    const input = { validations: { listMin: 1, listMax: 10 } } as any;
    expect(convertValidations(input)).toEqual([
      { name: 'list.min', value: '1' },
      { name: 'list.max', value: '10' }
    ]);
  });

  it('stringifies object and array values', () => {
    const input = { validations: { choices: ['one', 'two'] } } as any;
    expect(convertValidations(input)).toEqual([
      { name: 'choices', value: JSON.stringify(['one', 'two']) },
    ]);
  });

  it('skips null and undefined validations', () => {
    const input = { validations: { foo: null, bar: undefined, baz: 0 } } as any;
    expect(convertValidations(input)).toEqual([
      { name: 'baz', value: '0' }
    ]);
  });
});
