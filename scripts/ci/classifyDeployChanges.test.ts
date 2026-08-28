import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const classifier = join(import.meta.dir, "classifyDeployChanges.sh");
const temporaryDirectories: string[] = [];

async function run(cwd: string, command: string[]) {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed: ${stderr}`);
  return stdout.trim();
}

async function commit(repo: string, path: string, content: string) {
  const target = join(repo, path);
  await mkdir(join(target, ".."), { recursive: true });
  await Bun.write(target, content);
  await run(repo, ["git", "add", path]);
  await run(repo, ["git", "commit", "-m", `update ${path}`]);
  return run(repo, ["git", "rev-parse", "HEAD"]);
}

async function makeRepo() {
  const repo = await mkdtemp(join(tmpdir(), "nolo-deploy-classifier-"));
  temporaryDirectories.push(repo);
  await run(repo, ["git", "init", "-q"]);
  await run(repo, ["git", "config", "user.email", "test@nolo.local"]);
  await run(repo, ["git", "config", "user.name", "Nolo Test"]);
  const base = await commit(repo, "docs/README.md", "base\n");
  return { repo, base };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("classifyDeployChanges", () => {
  it("skips an exclusively docs/ change set", async () => {
    const { repo, base } = await makeRepo();
    const target = await commit(repo, "docs/handoff.md", "handoff\n");
    expect(await run(repo, ["bash", classifier, base, target])).toBe("skip");
  });

  it("deploys when any runtime or CI path changed", async () => {
    const { repo, base } = await makeRepo();
    await commit(repo, "docs/handoff.md", "handoff\n");
    const target = await commit(repo, "scripts/ci/example.sh", "echo deploy\n");
    expect(await run(repo, ["bash", classifier, base, target])).toBe("deploy");
  });

  it("deploys when a runtime path was renamed into docs", async () => {
    const { repo } = await makeRepo();
    const base = await commit(repo, "scripts/runtime.ts", "export const runtime = true;\n");
    await mkdir(join(repo, "docs"), { recursive: true });
    await run(repo, ["git", "mv", "scripts/runtime.ts", "docs/runtime.md"]);
    await run(repo, ["git", "commit", "-m", "move runtime into docs"]);
    const target = await run(repo, ["git", "rev-parse", "HEAD"]);
    expect(await run(repo, ["bash", classifier, base, target])).toBe("deploy");
  });

  it("deploys conservatively for a missing base or an empty diff", async () => {
    const { repo, base } = await makeRepo();
    expect(await run(repo, ["bash", classifier, "missing", base])).toBe("deploy");
    expect(await run(repo, ["bash", classifier, base, base])).toBe("deploy");
  });
});
