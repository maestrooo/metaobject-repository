#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { parse as parseToml } from '@iarna/toml';
import { camelCase } from 'lodash';
import { Command } from 'commander'

const program = new Command()
  .requiredOption('-i, --input <file>',  'path to your definitions.toml')
  .requiredOption('-o, --output <file>', 'where to emit the runtime .ts')
  .option   ('-d, --dts    <file>', 'where to emit the ambient .d.ts',
             (val, _) => val,
             undefined)
  .parse(process.argv)

const { input, output, dts } = program.opts()
const tomlSrc = fs.readFileSync(path.resolve(input), 'utf8')
const data    = parseToml(tomlSrc) as any

const appDefs = data.metaobjects?.app
if (!appDefs) {
  console.error('❌  no [metaobjects.app] block found in', input)
  process.exit(1)
}

// build the metadata payload
const metadata: Record<string, { fields: Record<string,string> }> = {}
for (const [typeKey, def] of Object.entries(appDefs)) {
  if (typeof def !== 'object' || !('fields' in def)) continue
  const fields: Record<string,string> = {}
  for (const [fk, fd] of Object.entries((def as any).fields)) {
    const t = (fd as any).type
    if (typeof t === 'string') fields[camelCase(fk)] = t
  }
  metadata[`$app:${typeKey}`] = { fields }
}

// 1) emit the runtime file
const payload = JSON.stringify(metadata, null, 2)
const tsOut = `// generated — do not edit
export {}
declare global {
  var __METAOBJECTS_METADATA__: Record<string, { fields: Record<string,string> }>
}
globalThis.__METAOBJECTS_METADATA__ = ${payload} as any
`
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, tsOut, 'utf8')
console.log('✔ wrote runtime to', output)

// 2) emit an ambient .d.ts (either your -d value or same basename)
const dtsPath = dts
  ?? output.replace(/\.tsx?$/,'') + '.d.ts'

const dtsOut = `// generated — do not edit
export {}
declare global {
  var __METAOBJECTS_METADATA__: Record<string, { fields: Record<string,string> }>
}
`
fs.writeFileSync(dtsPath, dtsOut, 'utf8')
console.log('✔ wrote types to', dtsPath)
