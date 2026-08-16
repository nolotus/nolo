import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import {
  acquireChatgptWebImageLock,
  readChatgptWebImageLocalJobMeta,
  runChatgptWebImageLocalJob,
} from "./chatgptWebImageLocalJob";
import type { SpawnFn, SpawnedProcess } from "./processSpawn";

function makeTempRoot() {
  return mkdtempSync(join(tmpdir(), "chatgpt-web-image-job-"));
}

function fakeJwt(userId: string) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  return `${header}.${payload}.sig`;
}

function spawnOkWritingFile(outPathFromCmd: (cmd: string[]) => string): SpawnFn {
  return (options) => {
    const outPath = outPathFromCmd(options.cmd);
    mkdirSync(join(outPath, ".."), { recursive: true });
    writeFileSync(outPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
    const proc: SpawnedProcess = {
      exited: Promise.resolve(0),
      stdin: null,
      stdout: Readable.from(["oracle ok\n"]),
      stderr: Readable.from([""]),
    };
    return proc;
  };
}

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

describe("chatgptWebImageLocalJob", () => {
  test("readChatgptWebImageLocalJobMeta detects localJob and prompt", () => {
    expect(
      readChatgptWebImageLocalJobMeta({
        meta: {
          localJob: "chatgptWebImageGenerate",
          prompt: "  a cat  ",
          userAuthToken: "tok",
          serverBase: "https://example.test",
        },
      }),
    ).toEqual({
      prompt: "a cat",
      userAuthToken: "tok",
      serverBase: "https://example.test",
    });
    expect(readChatgptWebImageLocalJobMeta({ meta: { localJob: "other" } })).toBeNull();
    expect(readChatgptWebImageLocalJobMeta({})).toBeNull();
  });

  test("missing prompt → error", async () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    await expect(
      runChatgptWebImageLocalJob(
        { prompt: "   " },
        {
          lockPath: join(root, "lock"),
          outDir: join(root, "out"),
          spawn: () => {
            throw new Error("spawn should not run");
          },
        },
      ),
    ).rejects.toThrow(/prompt/);
  });

  test("lock busy → error", async () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    const lockPath = join(root, "chatgpt-web-image.lock");
    const release = acquireChatgptWebImageLock(lockPath);
    try {
      await expect(
        runChatgptWebImageLocalJob(
          { prompt: "busy" },
          {
            lockPath,
            outDir: join(root, "out"),
            spawn: () => {
              throw new Error("spawn should not run");
            },
          },
        ),
      ).rejects.toThrow(/锁|进行中/);
    } finally {
      release();
    }
  });

  test("happy path: mocked spawn + mocked upload fetch", async () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    const outDir = join(root, "out");
    const lockPath = join(root, "lock");
    const token = fakeJwt("user-xyz");
    let uploadUrl = "";
    let authHeader = "";
    let formSawFile = false;

    const spawn = spawnOkWritingFile((cmd) => {
      const idx = cmd.indexOf("--generate-image");
      expect(idx).toBeGreaterThanOrEqual(0);
      return cmd[idx + 1]!;
    });

    const result = await runChatgptWebImageLocalJob(
      {
        prompt: "唐代长安夜色",
        userAuthToken: token,
        serverBase: "https://nolo.test",
      },
      {
        lockPath,
        outDir,
        now: () => 1700000000000,
        spawn,
        fetchImpl: async (input, init) => {
          uploadUrl = String(input);
          authHeader = String(
            (init?.headers as Record<string, string> | undefined)?.Authorization ?? "",
          );
          const body = init?.body;
          if (body instanceof FormData) {
            formSawFile = body.get("file") != null;
          }
          return new Response(
            JSON.stringify({
              message: "File uploaded successfully",
              fileId: "01FILEIDULIDTEST000",
              metadata: {
                id: "01FILEIDULIDTEST000",
                mimeType: "image/png",
                originalName: "chatgpt-web-1700000000000.png",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        },
      },
    );

    expect(uploadUrl).toBe("https://nolo.test/api/v1/db/upload");
    expect(authHeader).toBe(`Bearer ${token}`);
    expect(formSawFile).toBe(true);
    expect(result.fileId).toBe("01FILEIDULIDTEST000");
    expect(result.rawData).toMatchObject({
      text: "已生成 1 张图片。",
      imageCount: 1,
      files: [
        {
          fileId: "01FILEIDULIDTEST000",
          metadata: {
            prompt: "唐代长安夜色",
            model: "chatgpt-web",
          },
        },
      ],
    });
    // bare fileId — not file-user-xxx
    expect(result.rawData.files[0]!.fileId).not.toMatch(/^file-/);
    expect(existsSync(result.outPath)).toBe(true);
    expect(readFileSync(result.outPath).length).toBeGreaterThan(0);
    // lock released
    expect(existsSync(lockPath)).toBe(false);
  });

  test("oracle non-zero exit → error", async () => {
    const root = makeTempRoot();
    tempRoots.push(root);
    await expect(
      runChatgptWebImageLocalJob(
        { prompt: "fail me" },
        {
          lockPath: join(root, "lock"),
          outDir: join(root, "out"),
          spawn: () => ({
            exited: Promise.resolve(1),
            stdin: null,
            stdout: Readable.from([""]),
            stderr: Readable.from(["browser login failed"]),
          }),
        },
      ),
    ).rejects.toThrow(/oracle exit 1|browser login failed/);
  });
});
