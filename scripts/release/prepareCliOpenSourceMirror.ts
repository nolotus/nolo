import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPublishArtifact } from "../../packages/cli/buildPublish";
import { applyOpenSourcePackageOverlay } from "./openSourcePackageOverlay";

export async function prepareCliOpenSourceMirror(input: {
  repoRoot: string;
  outDir: string;
}) {
  const { repoRoot, outDir } = input;
  const sourceDir = join(repoRoot, "packages/cli");

  await buildPublishArtifact(sourceDir, outDir);

  const packagePath = join(outDir, "package.json");
  const publishPackage = JSON.parse(readFileSync(packagePath, "utf8"));
  const mirroredPackage = applyOpenSourcePackageOverlay(publishPackage);
  writeFileSync(packagePath, JSON.stringify(mirroredPackage, null, 2) + "\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const outDirIndex = args.indexOf("--out-dir");
  const outDir = outDirIndex >= 0 && outDirIndex + 1 < args.length
    ? args[outDirIndex + 1]
    : ".tmp/nolo-cli-mirror";

  const repoRoot = join(import.meta.dir, "../..");

  await prepareCliOpenSourceMirror({ repoRoot, outDir });
  console.log(`Open-source CLI mirror prepared at ${outDir}`);
}