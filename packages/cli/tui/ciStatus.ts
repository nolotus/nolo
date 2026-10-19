// packages/cli/tui/ciStatus.ts
//
// 部署状态取数：CLI 命令与 TUI 状态栏共用这一份真值。
//
// 为什么需要它：nolo-ci 的状态只存在 alpha 的 http://127.0.0.1:3900/status，
// 本机没有通道；已有的 TUI deployWake 只在实时 SSE 到达时响一次铃，事后查不到。
// 用户「推了代码但看不到部署」的准确原因就是这个——不是没部署，是状态没有出口。
//
// 设计约束（三条都不是可选项）：
//  1. **失败一律静默**：没有 ssh、超时、DNS 错、JSON 坏，全部返回 undefined，
//     不抛、不写 stderr、不改变退出码。它是可观测性附庸，不能自己变成故障源。
//  2. **不硬编码内网地址**：默认走 ~/.ssh/config 的 `alpha-raw` 别名，
//     可用 NOLO_ALPHA_SSH_CONFIG_HOST / NOLO_ALPHA_RAW_HOST 覆盖。
//     把 IP 写进发布产物等于把运维拓扑带给每个使用者。
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

const DEFAULT_SSH_HOST = "alpha-raw";
const DEFAULT_CI_PORT = "3900";

function resolveSshTarget(): string {
  const alias = process.env.NOLO_ALPHA_SSH_CONFIG_HOST?.trim();
  if (alias) return alias;
  const raw = process.env.NOLO_ALPHA_RAW_HOST?.trim();
  if (raw) {
    const user = process.env.NOLO_ALPHA_SSH_USER?.trim() || "root";
    return `${user}@${raw}`;
  }
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

export function buildRemoteCommand(limit: number): string {
  // port 来自 env，直接拼进「在 alpha 上执行的 shell 命令」等于把注入面交给环境变量。
  // 只接受纯数字且落在合法端口区间；其余一律回退默认值。
  const rawPort = process.env.NOLO_CI_PORT?.trim() ?? "";
  const port = /^\d{1,5}$/.test(rawPort) && Number(rawPort) > 0 && Number(rawPort) <= 65535
    ? rawPort
    : DEFAULT_CI_PORT;
  const safeLimit = Math.max(1, Math.min(20, Math.trunc(limit) || 5));
  return `curl -s -m 3 "http://127.0.0.1:${port}/status?limit=${safeLimit}"`;
}

/**
 * 取最近 N 条 job。任何失败都返回 undefined。
 *
 * @param timeoutMs 整体超时。远小于调用方（TUI 首屏）能容忍的等待。
 */
export function fetchCiStatus(limit = 5, timeoutMs = 4000): Promise<CiJob[] | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    let guard: ReturnType<typeof setTimeout> | undefined;
    const finish = (value: CiJob[] | undefined) => {
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
        ["-o", "BatchMode=yes", "-o", `ConnectTimeout=3`, resolveSshTarget(), buildRemoteCommand(limit)],
        { timeout: timeoutMs, encoding: "utf8", maxBuffer: 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            finish(undefined);
            return;
          }
          finish(parseCiStatusPayload(stdout ?? ""));
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
