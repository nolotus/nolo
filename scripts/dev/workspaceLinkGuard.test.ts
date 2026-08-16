import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { existsSync, readlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import {
  ensureWorkspacePackageLinks,
  validateWorkspacePackageLinks,
} from "./workspaceLinkGuard";

const linkType = process.platform === "win32" ? "junction" : "dir";

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function createPackage(root: string, relativeDir: string, name: string) {
  const dir = join(root, relativeDir);
  await mkdir(dir, { recursive: true });
  await writeJson(join(dir, "package.json"), { name });
  return dir;
}

async function createRepo(options?: { includeExactWorkspace?: boolean }) {
  const root = await mkdtemp(join(tmpdir(), "nolo-workspace-link-"));
  const workspaces = ["packages/*"];
  if (options?.includeExactWorkspace) {
    workspaces.push("packages/game/stylized-scene");
  }
  await writeJson(join(root, "package.json"), { workspaces });
  await createPackage(root, "packages/app", "app");
  await createPackage(root, "packages/create", "create");
  if (options?.includeExactWorkspace) {
    await createPackage(root, "packages/game/stylized-scene", "@nolo/game-stylized-scene");
  }
  await mkdir(join(root, "node_modules"), { recursive: true });
  return root;
}

describe("workspaceLinkGuard", () => {
  test("accepts workspace package links that resolve inside the current repo", async () => {
    const repoRoot = await createRepo();
    await symlink(join(repoRoot, "packages/app"), join(repoRoot, "node_modules/app"), linkType);
    await symlink(
      join(repoRoot, "packages/create"),
      join(repoRoot, "node_modules/create"),
      linkType,
    );

    expect(await validateWorkspacePackageLinks(repoRoot)).toEqual([]);
  });

  test("rejects workspace package links that point at another checkout", async () => {
    const repoRoot = await createRepo();
    const otherRoot = await createRepo();
    await symlink(join(otherRoot, "packages/app"), join(repoRoot, "node_modules/app"), linkType);
    await symlink(
      join(repoRoot, "packages/create"),
      join(repoRoot, "node_modules/create"),
      linkType,
    );

    const errors = await validateWorkspacePackageLinks(repoRoot);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`node_modules${sep}app`);
    expect(errors[0]).toContain("points outside this checkout");
  });

  test("uses path.isAbsolute instead of resolving relative paths against cwd", async () => {
    const source = await Bun.file(join(import.meta.dir, "workspaceLinkGuard.ts")).text();

    expect(source).toContain("isAbsolute(relativePath)");
    expect(source).not.toContain("resolve(relativePath).startsWith");
  });

  test("CLI validates the caller checkout rather than the script checkout", async () => {
    const repoRoot = await createRepo();
    const otherRoot = await createRepo();
    await symlink(join(otherRoot, "packages/app"), join(repoRoot, "node_modules/app"), linkType);
    await symlink(
      join(repoRoot, "packages/create"),
      join(repoRoot, "node_modules/create"),
      linkType,
    );

    const result = spawnSync(
      "bun",
      [join(import.meta.dir, "workspaceLinkGuard.ts"), "--check"],
      {
        cwd: repoRoot,
        encoding: "utf-8",
      },
    );

    expect(result.status).not.toBe(0);
  });

  test("ensures missing workspace package links inside the current checkout", async () => {
    const repoRoot = await createRepo({ includeExactWorkspace: true });

    const result = await ensureWorkspacePackageLinks(repoRoot);

    expect(result.linked.sort()).toEqual(["@nolo/game-stylized-scene", "app", "create"]);
    expect(await validateWorkspacePackageLinks(repoRoot)).toEqual([]);
    expect(readlinkSync(join(repoRoot, "node_modules/app"))).toBe(
      relative(join(repoRoot, "node_modules"), join(repoRoot, "packages/app")),
    );
    expect(existsSync(join(repoRoot, "node_modules/@nolo/game-stylized-scene"))).toBe(true);
  });

  test("repairs workspace package links that point at another checkout", async () => {
    const repoRoot = await createRepo();
    const otherRoot = await createRepo();
    await symlink(join(otherRoot, "packages/app"), join(repoRoot, "node_modules/app"), linkType);
    await symlink(
      join(repoRoot, "packages/create"),
      join(repoRoot, "node_modules/create"),
      linkType,
    );

    const result = await ensureWorkspacePackageLinks(repoRoot);

    expect(result.repaired).toContain("app");
    expect(await validateWorkspacePackageLinks(repoRoot)).toEqual([]);
  });

  test("CLI --ensure materializes links before validating", async () => {
    const repoRoot = await createRepo();

    const result = spawnSync(
      "bun",
      [join(import.meta.dir, "workspaceLinkGuard.ts"), "--ensure"],
      {
        cwd: repoRoot,
        encoding: "utf-8",
      },
    );

    expect(result.status).toBe(0);
    expect(existsSync(join(repoRoot, "node_modules/app"))).toBe(true);
    expect(existsSync(join(repoRoot, "node_modules/create"))).toBe(true);
  });
});
