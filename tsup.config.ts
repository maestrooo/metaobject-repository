import { defineConfig } from "tsup";

export default defineConfig([
  // library entry
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true
  },
  // CLI entry
  {
    entry: { "cli/generate-metaobject-types": "src/cli/generate-metaobject-types.ts" },
    format: ["esm"],
    dts: false,           // no need for types for the CLI
    splitting: false,     // produce a single file
    sourcemap: true,
    clean: false
  }
]);