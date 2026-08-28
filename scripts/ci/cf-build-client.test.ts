import { describe, expect, it, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 行为测试：bun.serve 起 mock CF builder（模拟 /build 立即回 ok、/status 若干次
// working 后返回 head、/artifact 返回固定字节），跑独立客户端脚本 cf-build-client.sh，
// 断言四类路径的退出码与产物：
//   成功    → 下载文件存在 + 校验通过 + 退出码 0
//   报错    → status 报错路径 → 退出码非零
//   超时    → status 一直 working → 退出码非零
//   sha 不匹配 → head 与期望 sha 不一致 → 退出码非零

const CLIENT = join(import.meta.dir, "cf-build-client.sh");
const SHA = "0123456789abcdef0123456789abcdef01234567";

interface MockSpec {
  // 每个元素依次作为一次 /status 响应；undefined 代表不匹配成功条件（继续 working）。
  statuses: (Record<string, unknown> | undefined)[];
  // 是否让 /status 报错（返回非 2xx/错误字面）
  statusErrorOn?: number; // 第几次 status 触发错误响应
  head?: string; // /status 返回的 head（默认 SHA）
  artifactBody?: Uint8Array; // /artifact 返回的固定字节
  buildOk?: boolean;
}

function mockBody(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ok: true,
    head: SHA,
    artifactsReady: true,
    artifactTarReady: true,
    ...over,
  });
}

function startMock(spec: MockSpec) {
  let statusCalls = 0;
  const body = spec.artifactBody ?? new TextEncoder().encode("MOCK-CF-ARTIFACT-BYTES");
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/build") {
        return Response.json({ ok: spec.buildOk ?? true });
      }
      if (url.pathname === "/status") {
        statusCalls += 1;
        if (spec.statusErrorOn === statusCalls) {
          return Response.json({ error: "boom", failed: true }, { status: 500 });
        }
        const idx = statusCalls - 1;
        const entry = spec.statuses[idx];
        if (entry === undefined) {
          // 一直 working
          return Response.json({ ok: true, head: spec.head ?? SHA, artifactsReady: false });
        }
        return Response.json({
          ok: true,
          head: entry.head ?? spec.head ?? SHA,
          artifactsReady: entry.artifactsReady ?? true,
        });
      }
      if (url.pathname === "/artifact") {
        return new Response(body, {
          headers: { "Content-Type": "application/gzip", "Content-Length": String(body.length) },
        });
      }
      return Response.json({ notfound: true }, { status: 404 });
    },
  });
  return { port: server.port, server, stop: () => server.stop(true) };
}

async function runClient(base: string, workDir: string, sha: string, interval: string, timeout: string) {
  // token 经 env 传（不占 argv），与生产调用点一致。
  const proc = Bun.spawn(["bash", CLIENT, base, workDir, sha, interval, timeout], {
    env: { ...Bun.env, NOLO_CF_BUILDER_TOKEN: "s3cret-token" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

const liveServers: (() => void)[] = [];
function track(stop: () => void) {
  liveServers.push(stop);
}
afterEach(() => {
  while (liveServers.length) liveServers.pop()!();
});

describe("cf-build-client behavior against mock CF builder", () => {
  it("success path: downloads artifact + passes sha identity + exit 0", async () => {
    const { port, stop } = startMock({ statuses: [{}, {}] });
    track(stop);
    const workDir = await mkdtemp(join(tmpdir(), "cf-client-ok-"));
    try {
      const res = await runClient(`http://127.0.0.1:${port}`, workDir, SHA, "0.1", "5");
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain("artifact ready");
      const artifact = await readFile(join(workDir, "web-build.tar.gz"));
      expect(artifact).toEqual(new TextEncoder().encode("MOCK-CF-ARTIFACT-BYTES"));
      expect(res.stdout).toContain(`head=${SHA}`);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });

  it("status error path: /status reports failure → non-zero exit", async () => {
    const { port, stop } = startMock({ statuses: [{}, {}], statusErrorOn: 1 });
    track(stop);
    const workDir = await mkdtemp(join(tmpdir(), "cf-client-err-"));
    try {
      const res = await runClient(`http://127.0.0.1:${port}`, workDir, SHA, "0.1", "5");
      expect(res.exitCode).not.toBe(0);
      expect(res.stderr).toContain("failed");
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });

  it("timeout path: /status never becomes ready → non-zero exit", async () => {
    const { port, stop } = startMock({ statuses: [] }); // 一直 working
    track(stop);
    const workDir = await mkdtemp(join(tmpdir(), "cf-client-timeout-"));
    try {
      const res = await runClient(`http://127.0.0.1:${port}`, workDir, SHA, "0.1", "1");
      expect(res.exitCode).not.toBe(0);
      expect(res.stderr).toContain("timeout");
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });

  it("sha mismatch path: /status head != EXPECT_SHA → non-zero exit", async () => {
    const { port, stop } = startMock({ statuses: [{}, {}], head: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" });
    track(stop);
    const workDir = await mkdtemp(join(tmpdir(), "cf-client-sha-"));
    try {
      const res = await runClient(`http://127.0.0.1:${port}`, workDir, SHA, "0.1", "5");
      expect(res.exitCode).not.toBe(0);
      expect(res.stderr).toContain("head mismatch");
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });

  it("invalid poll interval/timeout → non-zero exit (MEDIUM-1)", async () => {
    const { port, stop } = startMock({ statuses: [{}] });
    track(stop);
    const workDir = await mkdtemp(join(tmpdir(), "cf-client-invalid-"));
    try {
      const res = await runClient(`http://127.0.0.1:${port}`, workDir, SHA, "abc", "5");
      expect(res.exitCode).not.toBe(0);
      expect(res.stderr).toContain("invalid poll interval/timeout");
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });
});
