import { Embeddable } from "./decorators/embeddable";
import { Field } from "./decorators/field";
import { Metaobject } from "./decorators/metaobject";

@Embeddable({ schema: { foo: 'baz' } })
export class Emb {

}

@Metaobject({
  type: 'bar',
  name: 'Instructor'
})
export class Instructor {
  @Field({ type: 'single_line_text_field', list: true, required: true, validations: { maxLength: 10 } })
  name?: string;
}

@Metaobject({
  type: '$app:example',
  name: 'Example',
  capabilities: { publishable: { enabled: false } },
  access: { storefront: 'NONE' }
})
export class Example {
  @Field({ type: 'single_line_text_field', list: true, required: true, validations: { maxLength: 10 } })
  allowProperty?: string;

  @Field({ type: 'single_line_text_field', list: true, required: true, validations: { maxLength: 10 } })
  system?: string;

  @Field({ embedded: Emb })
  example?: Emb;

  @Field({ type: 'metaobject_reference', metaobjectType: '123' })
  foo?: object;

  @Field({ metaobject: Instructor, list: true })
  instructors?: Instructor[];
}