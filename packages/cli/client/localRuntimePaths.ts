import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Published adapters live in split JS chunks; chunks are not CLI entrypoints. */
export function resolveLocalRuntimePaths(moduleUrl: string, compiled: boolean, execPath: string) {
  if (compiled) return { cliDir: dirname(execPath), cliEntrypoint: execPath };
  const modulePath = fileURLToPath(moduleUrl);
  const extension = extname(modulePath) === ".js" ? ".js" : ".ts";
  const cliDir = extension === ".js" ? dirname(modulePath) : dirname(dirname(modulePath));
  return { cliDir, cliEntrypoint: join(cliDir, `index${extension}`) };
}
