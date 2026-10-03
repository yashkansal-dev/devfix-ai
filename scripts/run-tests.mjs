import { build } from "esbuild";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const directory = await mkdtemp(join(tmpdir(), "devfix-tests-"));
try {
  const names = (await readdir("tests")).filter((name) => name.endsWith(".test.ts"));
  await build({
    entryPoints: names.map((name) => join("tests", name)),
    outdir: directory,
    outExtension: { ".js": ".cjs" },
    platform: "node",
    target: "node22",
    format: "cjs",
    bundle: true,
  });
  const child = spawn(process.execPath, ["--test", ...names.map((name) => join(directory, name.replace(/\.ts$/, ".cjs")))], {
    stdio: "inherit",
  });
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  await rm(directory, { recursive: true, force: true });
}
