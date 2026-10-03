import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isBuiltin } from "node:module";

const directory = "build/backend";
const outfile = `${directory}/index.cjs`;
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const result = await build({
  entryPoints: ["backend/analyze.ts"],
  outfile,
  platform: "node",
  target: "node22",
  format: "cjs",
  bundle: true,
  packages: "bundle",
  minify: true,
  metafile: true,
  write: false,
  logLevel: "info",
});

const output = result.metafile.outputs[outfile];
const externalPackages = output.imports.filter(({ path, external }) => external && !isBuiltin(path));
if (externalPackages.length)
  throw new Error(`Lambda dependencies must be bundled: ${externalPackages.map(({ path }) => path).join(", ")}`);
if (!Object.entries(output.inputs).some(([path, { bytesInOutput }]) =>
  path.includes("node_modules/@aws-sdk/client-bedrock-runtime/") && bytesInOutput > 0))
  throw new Error("The Lambda bundle does not contain the Bedrock runtime SDK.");

await mkdir(directory, { recursive: true });
await writeFile(outfile, result.outputFiles[0].contents);
// SAM's npm builder needs a manifest. All production dependencies are in index.cjs.
await writeFile(`${directory}/package.json`, `${JSON.stringify({
  name: "devfix-ai-lambda",
  version,
  private: true,
  description: "Self-contained Lambda bundle with production dependencies included in index.cjs.",
  type: "commonjs",
  main: "index.cjs",
  files: ["index.cjs"],
  dependencies: {},
}, null, 2)}\n`);
// Keep build evidence outside CodeUri so it is not shipped with the function.
await writeFile("build/backend-metafile.json", `${JSON.stringify(result.metafile, null, 2)}\n`);
console.log(`Built ${outfile}: Bedrock SDK bundled; no external production packages.`);
