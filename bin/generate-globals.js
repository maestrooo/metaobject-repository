#!/usr/bin/env node
"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var toml_1 = require("@iarna/toml");
var lodash_1 = require("lodash");
var commander_1 = require("commander");
var program = new commander_1.Command()
    .requiredOption('-i, --input <file>', 'path to your definitions.toml')
    .requiredOption('-o, --output <file>', 'where to emit the runtime .ts')
    .option('-d, --dts    <file>', 'where to emit the ambient .d.ts', function (val, _) { return val; }, undefined)
    .parse(process.argv);
var _b = program.opts(), input = _b.input, output = _b.output, dts = _b.dts;
var tomlSrc = fs.readFileSync(path.resolve(input), 'utf8');
var data = (0, toml_1.parse)(tomlSrc);
var appDefs = (_a = data.metaobjects) === null || _a === void 0 ? void 0 : _a.app;
if (!appDefs) {
    console.error('❌  no [metaobjects.app] block found in', input);
    process.exit(1);
}
// build the metadata payload
var metadata = {};
for (var _i = 0, _c = Object.entries(appDefs); _i < _c.length; _i++) {
    var _d = _c[_i], typeKey = _d[0], def = _d[1];
    if (typeof def !== 'object' || !('fields' in def))
        continue;
    var fields = {};
    for (var _e = 0, _f = Object.entries(def.fields); _e < _f.length; _e++) {
        var _g = _f[_e], fk = _g[0], fd = _g[1];
        var t = fd.type;
        if (typeof t === 'string')
            fields[(0, lodash_1.camelCase)(fk)] = t;
    }
    metadata["$app:".concat(typeKey)] = { fields: fields };
}
// 1) emit the runtime file
var payload = JSON.stringify(metadata, null, 2);
var tsOut = "// generated \u2014 do not edit\nexport {}\ndeclare global {\n  var __METAOBJECTS_METADATA__: Record<string, { fields: Record<string,string> }>\n}\nglobalThis.__METAOBJECTS_METADATA__ = ".concat(payload, " as any\n");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, tsOut, 'utf8');
console.log('✔ wrote runtime to', output);
// 2) emit an ambient .d.ts (either your -d value or same basename)
var dtsPath = dts !== null && dts !== void 0 ? dts : output.replace(/\.tsx?$/, '') + '.d.ts';
var dtsOut = "// generated \u2014 do not edit\nexport {}\ndeclare global {\n  var __METAOBJECTS_METADATA__: Record<string, { fields: Record<string,string> }>\n}\n";
fs.writeFileSync(dtsPath, dtsOut, 'utf8');
console.log('✔ wrote types to', dtsPath);
