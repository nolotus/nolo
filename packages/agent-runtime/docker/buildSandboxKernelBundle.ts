import { join } from "node:path";

export type SandboxEmbeddedKernelSources = {
  searchKernelJs: string;
  scrubberJs: string;
};

async function bundleSingleEntry(entryPath: string): Promise<string> {
  const result = await Bun.build({
    entrypoints: [entryPath],
    format: "esm",
    target: "node",
    external: ["node:*"],
  });
  if (!result.success || result.outputs.length === 0) {
    const messages = result.logs.map((l) => l.message).join("; ");
    throw new Error(`Failed to bundle ${entryPath}: ${messages || "unknown error"}`);
  }
  return await result.outputs[0]!.text();
}

export async function buildSandboxEmbeddedKernelSources(): Promise<SandboxEmbeddedKernelSources> {
  const runtimeDir = join(import.meta.dir, "..");
  const [searchKernelJs, scrubberJs] = await Promise.all([
    bundleSingleEntry(join(runtimeDir, "fileTextSearch.ts")),
    bundleSingleEntry(join(runtimeDir, "secretScrubber.ts")),
  ]);
  return { searchKernelJs, scrubberJs };
}
