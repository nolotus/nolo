import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_LOCAL_API_PORT } from "../../packages/core/localOrigins";

const PLAYWRIGHT_BIN = "./node_modules/.bin/playwright";
const localBase =
  process.env.LOCAL_BASE ??
  `http://127.0.0.1:${process.env.HTTP_PORT ?? DEFAULT_LOCAL_API_PORT}`;

const run = async (cmd: string[], label: string, extraEnv?: Record<string, string>) => {
  console.log(`\n=== ${label} ===`);
  console.log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn({
    cmd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}`);
  }
};

const discoverSpecFiles = async (): Promise<string[]> => {
  const entries = await readdir("e2e", { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".spec.ts"))
    .map((entry) => join("e2e", entry.name))
    .sort();
};

const explicitSpecs = process.argv.slice(2).filter((arg) => arg.endsWith(".spec.ts"));

const specFiles = explicitSpecs.length > 0
  ? explicitSpecs
  : await discoverSpecFiles();

if (specFiles.length === 0) {
  throw new Error("No Playwright spec files found.");
}

await run(["bun", "./scripts/dev/devControl.ts", "restart", "web"], "restart web");
await run(["bun", "scripts/verify/verifyPlaywrightVersions.ts"], "verify Playwright versions");

for (let index = 0; index < specFiles.length; index += 1) {
  const specFile = specFiles[index];
  await run(["bun", "./scripts/dev/devControl.ts", "restart", "api"], `restart api before ${specFile}`);
  await run(["bun", "./scripts/dev/devControl.ts", "wait", "api", "20000"], `wait api for ${specFile}`);
  await run(
    [PLAYWRIGHT_BIN, "test", specFile],
    `playwright ${index + 1}/${specFiles.length}: ${specFile}`,
    { LOCAL_BASE: localBase }
  );
}
