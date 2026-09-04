import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const syncScript = join(import.meta.dir, "syncNoloOpenSourceMirror.sh");
const temporaryDirectories: string[] = [];

async function run(cwd: string, command: string[], env: Record<string, string> = {}) {
  const child = Bun.spawn(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}

async function git(repo: string, args: string[]) {
  const { stdout, stderr, exitCode } = await run(repo, ["git", ...args]);
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  return stdout.trim();
}

async function commit(repo: string, path: string, content: string, message: string) {
  const target = join(repo, path);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, content);
  await git(repo, ["add", path]);
  await git(repo, ["commit", "-m", message]);
  return git(repo, ["rev-parse", "HEAD"]);
}

async function makeRepo() {
  const repo = await mkdtemp(join(tmpdir(), "nolo-sync-"));
  temporaryDirectories.push(repo);
  await git(repo, ["init", "-q", "-b", "main"]);
  await git(repo, ["config", "user.email", "test@nolo.local"]);
  await git(repo, ["config", "user.name", "Nolo Test"]);
  return repo;
}

// 构造一个"私有仓"：含 packages/cli/package.json + 一个 cli tag
async function makePrivateRepo() {
  const repo = await makeRepo();
  await commit(repo, "packages/cli/package.json", '{"version":"0.33.0-alpha.33"}\n', "chore(release): cli-v0.33.0-alpha.33");
  await git(repo, ["tag", "cli-v0.33.0-alpha.33"]);
  return repo;
}

// 构造一个"公开仓"：含 packages/cli/package.json + 一个 sync commit。
// 用 bare 仓库模拟真实 GitHub 远端（非 bare 会拒绝 push 到已 checkout 分支）。
async function makePublicRepo(cliVersion: string) {
  const work = await makeRepo();
  await commit(work, "packages/cli/package.json", `{"version":"${cliVersion}"}\n`, "chore: sync open-source public projection 2026-08-28\n\nSource-Commit: abc123");
  const bare = await mkdtemp(join(tmpdir(), "nolo-sync-pub-bare-"));
  temporaryDirectories.push(bare);
  await git(work, ["clone", "--bare", "-q", ".", bare]);
  return bare;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("syncNoloOpenSourceMirror.sh", () => {
  it("--check reports consistent when public matches private", async () => {
    const privateRepo = await makePrivateRepo();
    const publicRepo = await makePublicRepo("0.33.0-alpha.33");
    const { stdout, exitCode } = await run(privateRepo, ["bash", syncScript, "--check"], {
      SYNC_REPO_ROOT: privateRepo,
      SYNC_PUBLIC_REPO: publicRepo,
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("投影一致");
  });

  it("--check reports behind when public lags private", async () => {
    const privateRepo = await makePrivateRepo();
    const publicRepo = await makePublicRepo("0.33.0-alpha.31");
    const { stdout, exitCode } = await run(privateRepo, ["bash", syncScript, "--check"], {
      SYNC_REPO_ROOT: privateRepo,
      SYNC_PUBLIC_REPO: publicRepo,
    });
    expect(exitCode).toBe(2);
    expect(stdout).toContain("投影落后");
  });

  it("appends a single commit on top of public main HEAD (no force-push)", async () => {
    const privateRepo = await makePrivateRepo();
    const publicRepo = await makePublicRepo("0.33.0-alpha.31");
    const publicHeadBefore = await git(publicRepo, ["rev-parse", "HEAD"]);

    // 用测试钩子生成投影树（离线，不跑真实 prepare）
    const stageDir = join(tmpdir(), "nolo-sync-stage-test");
    const prepareCmd = `mkdir -p "${stageDir}/packages/cli" && printf '{"version":"0.33.0-alpha.33"}\\n' > "${stageDir}/packages/cli/package.json"`;

    const { stdout, stderr, exitCode } = await run(privateRepo, ["bash", syncScript], {
      SYNC_REPO_ROOT: privateRepo,
      SYNC_PUBLIC_REPO: publicRepo,
      SYNC_STAGE_DIR: stageDir,
      SYNC_MIRROR_DIR: join(tmpdir(), "nolo-sync-mirror-test"),
      SYNC_PREPARE_CMD: prepareCmd,
    });
    expect(exitCode).toBe(0, stderr);

    // 公开仓 main 前进了一个 commit，且是 fast-forward（历史保留）
    const publicHeadAfter = await git(publicRepo, ["rev-parse", "HEAD"]);
    expect(publicHeadAfter).not.toBe(publicHeadBefore);
    const parent = await git(publicRepo, ["rev-parse", `${publicHeadAfter}^`]);
    expect(parent).toBe(publicHeadBefore);

    // commit message 首行 + trailer
    const message = await git(publicRepo, ["log", "-1", "--format=%B"]);
    expect(message).toContain("chore: sync open-source public projection");
    expect(message).toContain("Source-Commit:");
    expect(message).not.toContain("Source-Release-Tag:");

    // 投影内容已更新
    const cliVersion = await git(publicRepo, ["show", `${publicHeadAfter}:packages/cli/package.json`]);
    expect(cliVersion).toContain("0.33.0-alpha.33");
  });

  it("succeeds without a commit or push when the public projection is unchanged", async () => {
    const privateRepo = await makePrivateRepo();
    const publicRepo = await makePublicRepo("0.33.0-alpha.33");
    const publicHeadBefore = await git(publicRepo, ["rev-parse", "HEAD"]);
    const stageDir = await mkdtemp(join(tmpdir(), "nolo-sync-stage-noop-"));
    const mirrorDir = await mkdtemp(join(tmpdir(), "nolo-sync-mirror-noop-"));
    temporaryDirectories.push(stageDir, mirrorDir);
    const prepareCmd = `mkdir -p "${stageDir}/packages/cli" && printf '{"version":"0.33.0-alpha.33"}\\n' > "${stageDir}/packages/cli/package.json"`;

    const { stdout, stderr, exitCode } = await run(privateRepo, ["bash", syncScript], {
      SYNC_REPO_ROOT: privateRepo,
      SYNC_PUBLIC_REPO: publicRepo,
      SYNC_STAGE_DIR: stageDir,
      SYNC_MIRROR_DIR: mirrorDir,
      SYNC_PREPARE_CMD: prepareCmd,
    });

    expect(exitCode).toBe(0, stderr);
    expect(stdout).toContain("投影无变化（no-op）");
    expect(stdout).toContain("Source-Commit:");
    expect(stdout).not.toContain("Source-Release-Tag:");
    expect(await git(publicRepo, ["rev-parse", "HEAD"])).toBe(publicHeadBefore);
  });
});
