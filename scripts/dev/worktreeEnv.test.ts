import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readWorktreeRootEnvFallback } from "./worktreeEnv";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("readWorktreeRootEnvFallback", () => {
  test("loads .env from the given cwd", async () => {
    const dir = await mkdtemp(join(tmpdir(), "worktree-env-"));
    tempDirs.push(dir);

    await writeFile(
      join(dir, ".env"),
      "SECRET_KEY=root-secret\nFIREWORKS_API_KEY=root-fireworks\n",
      "utf8"
    );

    expect(readWorktreeRootEnvFallback(dir)).toEqual({
      SECRET_KEY: "root-secret",
      FIREWORKS_API_KEY: "root-fireworks",
    });
  });

  test("returns empty object when no .env exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "worktree-env-"));
    tempDirs.push(dir);

    expect(readWorktreeRootEnvFallback(dir)).toEqual({});
  });
});
