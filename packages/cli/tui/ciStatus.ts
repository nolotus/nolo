// packages/cli/tui/ciStatus.ts
//
// 部署状态取数：CLI 命令与 TUI 状态栏共用这一份真值。
//
// 为什么需要它：nolo-ci 的状态只在 CI 宿主的 http://127.0.0.1:3900/status 上。
// 公网入口 https://ci.nolo.chat 经 Cloudflare 隧道转发，适合给 GitHub webhook 用，
// 不适合 TUI 首屏取数（多一跳边缘网络）；已有的 TUI deployWake 只在实时 SSE 到达时
// 响一次铃，事后查不到。用户「推了代码但看不到部署」的准确原因就是这个。
//
// 设计约束（三条都不是可选项）：
//  1. **失败一律静默**：没有 ssh、超时、DNS 错、JSON 坏，全部返回 undefined，
//     不抛、不写 stderr、不改变退出码。它是可观测性附庸，不能自己变成故障源。
//  2. **默认地址来自可覆盖常量**：DEFAULT_SSH_HOST 是 CI 宿主
//     `nolotus@136.67.147.177`（nolo-ci 常驻的 GCP 实例，与 alpha 测试服已完全隔离）。
//     可用 NOLO_CI_SSH_HOST（整条 ssh 目标）/ NOLO_CI_RAW_HOST + NOLO_CI_SSH_USER 覆盖；
//     旧的 NOLO_ALPHA_SSH_CONFIG_HOST / NOLO_ALPHA_RAW_HOST 仍被识别，保证老脚本不突然失效。
//     需要绑定网卡（如透明代理 Fake-IP 环境）时用 NOLO_CI_SSH_HOST 指定 ~/.ssh/config 别名。
//     IP 变化时只改这一个常量，不要把运维拓扑散落到发布产物里。
//  3. **超时要短**：TUI 首屏不能被一个远端查询拖住，默认 4s，取不到就不显示。

import { execFile } from "node:child_process";

export type CiJob = {
  jobId: string;
  kind: string;
  status: string;
  shortSha: string;
  startedAt?: string;
  durationMs?: number;
  /** phaseTimings 里第一个 status !== 0 的相位名；全绿则 undefined。 */
  failedPhase?: string;
};

// CI 宿主：nolo-ci 常驻的 GCP 实例（与 alpha 测试服已完全隔离，只保留 CI→alpha 的
// SSH 部署一跳）。旧机 45.77.5.10 与 alpha 上的 127.0.0.1:3900 都已不再是 CI 入口。
// 仍可被 NOLO_CI_SSH_HOST / NOLO_CI_RAW_HOST / NOLO_CI_SSH_USER 覆盖。
const DEFAULT_SSH_HOST = "nolotus@136.67.147.177";
const DEFAULT_CI_PORT = "3900";

function resolveSshTarget(): string {
  const override = process.env.NOLO_CI_SSH_HOST?.trim();
  if (override) return override;
  const raw =
    process.env.NOLO_CI_RAW_HOST?.trim() ?? process.env.NOLO_ALPHA_RAW_HOST?.trim();
  if (raw) {
    const user =
      process.env.NOLO_CI_SSH_USER?.trim() ??
      process.env.NOLO_ALPHA_SSH_USER?.trim() ??
      "nolotus";
    return `${user}@${raw}`;
  }
  // 旧名保留：老脚本/老文档里仍可能设置它，别名指向哪台就仍按它走。
  const legacyAlias = process.env.NOLO_ALPHA_SSH_CONFIG_HOST?.trim();
  if (legacyAlias) return legacyAlias;
  return DEFAULT_SSH_HOST;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** 从 phaseTimings 里取第一个非零相位的名字——失败时最有用的一条信息。 */
function extractFailedPhase(raw: unknown): string | undefined {
  if (!Array.isArray(raw)) return undefined;
  for (const entry of raw) {
    const timing = asRecord(entry);
    if (!timing) continue;
    const status = timing.status;
    const phase = asString(timing.phase);
    if (phase && typeof status === "number" && status !== 0) return phase;
  }
  return undefined;
}

function toCiJob(value: unknown): CiJob | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const jobId = asString(record.jobId);
  const status = asString(record.status);
  if (!jobId || !status) return undefined;
  const durationMs = typeof record.durationMs === "number" ? record.durationMs : undefined;
  return {
    jobId,
    kind: asString(record.kind) ?? "unknown",
    status,
    shortSha: asString(record.shortSha) ?? asString(record.sha) ?? "",
    startedAt: asString(record.startedAt),
    durationMs,
    failedPhase: extractFailedPhase(record.phaseTimings),
  };
}

/**
 * 解析 /status 的响应体。坏 JSON / 形状不符一律返回 undefined（不是空数组——
 * 空数组会被上层当成「查到了但没有任务」，与「查不到」是两件事）。
 */
export function parseCiStatusPayload(raw: string): CiJob[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const root = asRecord(parsed);
  if (!root) return undefined;
  const jobs = root.jobs;
  if (Array.isArray(jobs)) {
    return jobs.map(toCiJob).filter((job): job is CiJob => job !== undefined);
  }
  // 单查形态（?jobId=）返回的是裸 job 对象
  const single = toCiJob(parsed);
  return single ? [single] : undefined;
}

function resolveCiPort(): string {
  // port 来自 env，直接拼进「在 CI 宿主上执行的 shell 命令」等于把注入面交给环境变量。
  // 只接受纯数字且落在合法端口区间；其余一律回退默认值。
  const rawPort = process.env.NOLO_CI_PORT?.trim() ?? "";
  return /^\d{1,5}$/.test(rawPort) && Number(rawPort) > 0 && Number(rawPort) <= 65535
    ? rawPort
    : DEFAULT_CI_PORT;
}

export function buildRemoteCommand(limit: number): string {
  const port = resolveCiPort();
  const safeLimit = Math.max(1, Math.min(20, Math.trunc(limit) || 5));
  return `curl -s -m 3 "http://127.0.0.1:${port}/status?limit=${safeLimit}"`;
}

/**
 * 取最近 N 条 job。任何失败都返回 undefined。
 *
 * @param timeoutMs 整体超时。远小于调用方（TUI 首屏）能容忍的等待。
 */
export function fetchCiStatus(limit = 5, timeoutMs = 4000): Promise<CiJob[] | undefined> {
  return fetchCiPayload(buildRemoteCommand(limit), parseCiStatusPayload, timeoutMs);
}

function fetchCiPayload<T>(command: string, parse: (stdout: string) => T | undefined, timeoutMs: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    let guard: ReturnType<typeof setTimeout> | undefined;
    const finish = (value: T | undefined) => {
      if (settled) return;
      settled = true;
      if (guard) clearTimeout(guard);
      resolve(value);
    };
    // execFile 的 timeout 依赖 SIGTERM；远端会话可能不响应 TERM，这里再加一层
    // Promise 层的硬兜底，保证调用方（TUI 首屏）永远不会被拖住。
    guard = setTimeout(() => finish(undefined), timeoutMs + 500);
    guard.unref?.();
    try {
      execFile(
        "ssh",
        ["-o", "BatchMode=yes", "-o", `ConnectTimeout=3`, resolveSshTarget(), command],
        { timeout: timeoutMs, encoding: "utf8", maxBuffer: 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            finish(undefined);
            return;
          }
          try {
            finish(parse(stdout ?? ""));
          } catch {
            finish(undefined);
          }
        }
      );
    } catch {
      // execFile 同步抛出（ssh 不存在等）也不能冒泡
      finish(undefined);
    }
  });
}

/** 状态行用的极简摘要；没有可取数据时返回 undefined（调用方据此不显示）。 */
export function summarizeLatest(jobs: CiJob[] | undefined): string | undefined {
  const latest = jobs?.[0];
  if (!latest) return undefined;
  const sha = latest.shortSha ? latest.shortSha.slice(0, 7) : "???????";
  if (latest.status === "running") return `ci:${sha} …`;
  if (latest.status === "succeeded") return `ci:${sha} ✓`;
  if (latest.status === "failed" || latest.status === "orphaned") {
    return `ci:${sha} ✗${latest.failedPhase ? ` ${latest.failedPhase}` : ""}`;
  }
  return `ci:${sha} ${latest.status}`;
}

/** Same SSH channel as status; failures stay silent and never alter process exitCode. */
export function buildCancelCommand(jobId: string): string {
  const port = resolveCiPort();
  const body = JSON.stringify({ jobId }).replace(/'/g, "'\\''");
  const endpoint = `http://127.0.0.1:${port}/cancel`;
  // admin token 只在 CI 宿主上读取并直接注入请求头：它不进本机环境、不进 ssh argv、
  // 也不出现在本机进程列表里（旧写法把 token 当本地凭据处理，但本机根本没有它）。
  const tokenRef = `$(grep -m1 '^NOLO_CI_ADMIN_TOKEN=' "$HOME/.config/nolo-ci.env" 2>/dev/null | cut -d= -f2-)`;
  return `curl -s -m 110 -H "Authorization: Bearer ${tokenRef}" -H 'Content-Type: application/json' -X POST --data '${body}' "${endpoint}"`;
}

// 取消曾是「远端 cancel + 最多 10 次终态查询」的有界过程（alphaRemote.cancelAlphaRemote，已随
// 2026-11-02 旧 alpha 机销毁退役）。服务端现在没有远端进程可撤销，blocked alpha job 的取消会
// 立刻返回 false；保留这个宽松的 CLI 超时只作为网络/服务端抖动的安全余量，不表示服务端还会慢。
export function fetchCiCancel(jobId: string, timeoutMs = 120000): Promise<boolean | undefined> {
  return fetchCiPayload(
    buildCancelCommand(jobId),
    stdout => {
      const response = JSON.parse(stdout);
      return response?.ok === true && response?.cancelled === true && response?.jobId === jobId ? true : false;
    },
    timeoutMs,
  );
}
