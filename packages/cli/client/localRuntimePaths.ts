import { getHostRuntimeExecutable } from "../agentRunProtocol";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, realpathSync } from "node:fs";

/** Published adapters live in split JS chunks; chunks are not CLI entrypoints. */
export function resolveLocalRuntimePaths(moduleUrl: string, compiled: boolean, execPath: string) {
  if (compiled) {
    const entry = execPath === process.execPath ? getHostRuntimeExecutable() : realpathSync(execPath);
    return { cliDir: dirname(entry), cliEntrypoint: entry };
  }
  const path = fileURLToPath(moduleUrl);
  const modulePath = existsSync(path) ? realpathSync(path) : path;
  const extension = extname(modulePath) === ".js" ? ".js" : ".ts";
  const cliDir = extension === ".js" ? dirname(modulePath) : dirname(dirname(modulePath));
  return { cliDir, cliEntrypoint: join(cliDir, `index${extension}`) };
}
