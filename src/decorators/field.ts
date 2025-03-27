import { snake } from "snake-camel";
import { classMetadataFactory } from "../class-metadata-factory";
import { EmbeddableClassMetadata, FieldDefinition, FileMediaType, MetaobjectClassMetadata } from "../types";
import { wordify } from "../utils/strings";

type DecoratorBaseFieldOptions<T extends string, V = undefined> = {
  type: T;
  name?: string;
  key?: string;
  description?: string;
  required?: boolean;
  list?: boolean;
} & (V extends undefined ? {} : { validations?: V });

type DecoratorFieldMetaobjectReferenceOptions<T extends { new (...args: any[]): any }> = Omit<
  DecoratorBaseFieldOptions<'metaobject_reference'>,
  'type' | 'metaobjectType'
> & {
  metaobject: T;
  type?: never;
  metaobjectType?: never;
};

type DecoratorFieldEmbeddedOptions<T extends { new (...args: any[]): any }> = Omit<
  DecoratorBaseFieldOptions<'json', { schema: object }>, 'type' | 'list'
> & {
  embedded: T;
  type?: never;
  list?: never;
};

type DecoratorFieldOptions =
  | DecoratorBaseFieldOptions<'boolean'>
  | DecoratorBaseFieldOptions<'color'>
  | DecoratorBaseFieldOptions<'link'>
  | DecoratorBaseFieldOptions<'money'>
  | Omit<DecoratorBaseFieldOptions<'rich_text_field'>, 'list'> // explicitly no list support
  | DecoratorBaseFieldOptions<'date', { min?: string; max?: string }>
  | DecoratorBaseFieldOptions<'date_time', { min?: string; max?: string }>
  | DecoratorBaseFieldOptions<'dimension', { min?: number; max?: number; unit: 'in' | 'ft' | 'yd' | 'mm' | 'cm' | 'm' }>
  | DecoratorBaseFieldOptions<'id', { minLength?: number; maxLength?: number; regex?: string }>
  | DecoratorBaseFieldOptions<'json', { schema: object }>
  | DecoratorBaseFieldOptions<'multi_line_text_field', { minLength?: number; maxLength?: number }>
  | DecoratorBaseFieldOptions<'number_decimal', { min?: number; max?: number; maxPrecision?: number }>
  | DecoratorBaseFieldOptions<'number_integer', { min?: number; max?: number }>
  | DecoratorBaseFieldOptions<'rating', { min: number; max: number }>
  | DecoratorBaseFieldOptions<'single_line_text_field', { minLength?: number; maxLength?: number; regex?: string; choices?: string[] }> & {
      useAsDisplayName?: boolean;
    }
  | DecoratorBaseFieldOptions<'url', { allowedDomains: string[] }>
  | DecoratorBaseFieldOptions<'volume', { min?: number; max?: number; unit: 'ml' | 'cl' | 'l' | 'm3' | 'us_fl_oz' | 'us_pt' | 'us_qt' | 'us_gal' | 'imp_fl_oz' | 'imp_pt' | 'imp_qt' | 'imp_gal' }>
  | DecoratorBaseFieldOptions<'weight', { min?: number; max?: number; unit: 'oz' | 'lb' | 'g' | 'kg' }>
  | DecoratorBaseFieldOptions<'collection_reference'>
  | DecoratorBaseFieldOptions<'customer_reference'>
  | DecoratorBaseFieldOptions<'file_reference', { fileTypeOptions: FileMediaType | FileMediaType[] }>
  | DecoratorBaseFieldOptions<'metaobject_reference'> & {
      metaobjectType: string;
    }
  | DecoratorBaseFieldOptions<'page_reference'>
  | DecoratorBaseFieldOptions<'product_reference'>
  | DecoratorBaseFieldOptions<'product_taxonomy_value_reference'>
  | DecoratorBaseFieldOptions<'variant_reference'>
  | DecoratorFieldMetaobjectReferenceOptions<{ new (...args: any[]): any }>
  | DecoratorFieldEmbeddedOptions<{ new (...args: any[]): any }>;

export function Field(options: DecoratorFieldOptions) {
  return (target: undefined, context: ClassFieldDecoratorContext) => {
    if (context.kind !== 'field') {
      throw new Error('@Field() can only be used as a field decorator');
    }
    
    const execute = async () => {
      const { promise } = classMetadataFactory.getMetadataFor(context.metadata);
      const classMetadata = await promise as MetaobjectClassMetadata;
  
      let field: FieldDefinition = {
        propertyName: context.name as string,
        type: '', // will be filled later based on options
        key: options.key ?? snake(context.name as string),
        name: options.name ?? wordify(context.name as string),
        description: options.description ?? '',
        list: 'list' in options ? (options.list ?? false) : false,
        required: options.required ?? false,
        validations: 'validations' in options ? (options.validations ?? undefined) : undefined
      }

      if (field.key === 'system') {
        throw new Error(`Field key "system" in the metaobject "${classMetadata.name}" is reserved and cannot be used. Use a different property or override the key.`);
      }
  
      if (isEmbeddedOptions(options)) {
        // When embedded, we have to check the embedded class and check if it has a schema
        const { promise } = classMetadataFactory.getMetadataFor(options.embedded); 
        const embeddableClassMetadata = await promise as EmbeddableClassMetadata;
  
        if (embeddableClassMetadata.schema) {
          field = { ...field, type: 'json', embedded: options.embedded, validations: { schema: embeddableClassMetadata.schema } };
        } else {
          field = { ...field, type: 'json', embedded: options.embedded };
        }
      } else if (isMetaobjectOptions(options)) {
        field = { ...field, type: 'metaobject_reference', metaobject: options.metaobject };
      } else if (options.type === 'metaobject_reference') {
        field = { ...field, type: 'metaobject_reference', metaobjectType: options.metaobjectType };
      } else {
        field = { ...field, type: options.type };
      }
  
      classMetadata.fields.push(field);
    }

    execute();
  }
}

function isEmbeddedOptions(options: DecoratorFieldOptions): options is DecoratorFieldEmbeddedOptions<{ new (...args: any[]): any }> {
  return 'embedded' in options;
}

function isMetaobjectOptions(options: DecoratorFieldOptions): options is DecoratorFieldMetaobjectReferenceOptions<{ new (...args: any[]): any }> {
  return 'metaobject' in options;
}