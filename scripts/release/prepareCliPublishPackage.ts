import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPublishArtifactBundled } from "../../packages/cli/buildPublish";

export async function prepareCliPublishPackage(input: {
  repoRoot: string;
  outDir: string;
  version?: string;
}) {
  const { repoRoot, outDir, version } = input;
  const sourceDir = join(repoRoot, "packages/cli");

  await buildPublishArtifactBundled(sourceDir, outDir);

  if (version) {
    const packagePath = join(outDir, "package.json");
    const publishPackage = JSON.parse(readFileSync(packagePath, "utf8"));
    publishPackage.version = version;
    writeFileSync(packagePath, JSON.stringify(publishPackage, null, 2) + "\n");
  }
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const outDirIndex = args.indexOf("--out-dir");
  const outDir = outDirIndex >= 0 && outDirIndex + 1 < args.length
    ? args[outDirIndex + 1]
    : ".tmp/nolo-cli-publish";

  const versionIndex = args.indexOf("--version");
  const version = versionIndex >= 0 && versionIndex + 1 < args.length
    ? args[versionIndex + 1]
    : undefined;

  const repoRoot = join(import.meta.dir, "../..");

  await prepareCliPublishPackage({ repoRoot, outDir, version });
  console.log(`Staged CLI package prepared at ${outDir}`);
}
