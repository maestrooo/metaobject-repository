import { FieldBuilder } from 'raku-ql';
import { classMetadataFactory } from './class-metadata-factory';
import { Example } from './example';
import { objectManager } from './persistence/object-manager';

export { Metaobject, Embeddable, Field } from './decorators';
export { classMetadataFactory } from './class-metadata-factory';

export { Example } from './example';

class Another {

}

/*const { promise } = classMetadataFactory.getMetadataFor(Example);

promise.then((metadata) => {
  console.log(metadata);
});*/

//const classMetadata = classMetadataFactory.getMetadataFor(Example);
//console.log(new Example());
//console.log(new Example());
//console.log(new Example());
const metadata = classMetadataFactory.getMetadataFor(Example);

//console.log(metadata);


objectManager.findOne(Example, 'foo');

let u = new Example();
let v = new Example();
let w = new Example();


//console.log(v.system);