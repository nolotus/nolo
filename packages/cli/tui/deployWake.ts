// packages/cli/tui/deployWake.ts
//
// 「部署完成」在终端里唤醒用户 —— 方案 B 的 TUI 侧。
//
// 数据来路（服务端已定，本文件只消费）：
//   通知记录 / SSE 事件带 kind="ci-deploy"、target（alpha|main）、sha、
//   status（success|failed）、title，服务端经
//   `pushEvent(\`user-${userId}\`)`（server/handlers/notificationEmitter.ts:106）
//   推成一条 `notification.upsert` SSE 帧。CLI/TUI 此前**没有**订阅用户 SSE
//   频道，本文件补的正是这条最小订阅（只在交互式 TUI 里建立）。
//
// 行为契约（三条硬要求，改动请一并改测试）：
//  1. 响铃复用 terminalNotification.ts 的 emitTerminalBell，不另写转义序列；
//  2. 只加**一行**提示（不换行刷屏、不弹窗、不阻塞输入），成功 ✔ / 失败 ✖；
//  3. 同一 `target+sha` 在一次会话里只响一次（服务端已有幂等，客户端自保）。
//
// 纪律：
//  - 非交互（管道 / --json / 脚本）零副作用：本模块的 notifier 自己按
//    `interactive` 闸门早退，且订阅本身由调用方只在交互分支建立；两层都做了，
//    因为「谁忘了传 interactive」比「谁忘了 if」更容易发生。
//  - 订阅失败（401/403/断线/DNS 错）一律静默降级：不抛、不写 stderr、不刷
//    错误墙；调用方可选给一次 onGiveUp 提示，由调用方决定怎么显示。

import { emitTerminalBell } from "./terminalNotification";

/** 事件契约里的 status 只有两态。 */
export type CiDeployStatus = "success" | "failed";

export type CiDeployEvent = {
  kind: "ci-deploy";
  /** 部署目标（alpha / main，未来可能有别的，故不写死联合类型）。 */
  target: string;
  sha: string;
  status: CiDeployStatus;
  title?: string;
};

export const CI_DEPLOY_KIND = "ci-deploy";

/** 环境开关：只有显式 "0"/"false" 才关；缺省开启（与 NOLO_CLI_GIT_STATUS 同款语义）。 */
export const DEPLOY_WAKE_ENV = "NOLO_CLI_DEPLOY_WAKE";

export function isDeployWakeDisabled(env: NodeJS.ProcessEnv | undefined): boolean {
  const raw = (env?.[DEPLOY_WAKE_ENV] ?? "").trim().toLowerCase();
  return raw === "0" || raw === "false";
}

const readString = (source: unknown, key: string): string => {
  if (!source || typeof source !== "object") return "";
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
};

/**
 * 把一条 SSE 帧/通知记录解析成 CiDeployEvent；不是部署事件就返回 null。
 *
 * 容忍两种外形（服务端实现演进中，两种都真实存在）：
 *  - 平铺事件：`{ kind: "ci-deploy", target, sha, status, title }`
 *  - 通知记录：`{ type: "notification.upsert", notification: { kind, payload } }`
 *    —— target/sha/status/title 落在 payload（NotificationRecord 的顶层字段是
 *    固定的 dbKey/userId/... 那套，不承载业务字段）。
 */
export function parseCiDeployEvent(raw: unknown): CiDeployEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const outer = raw as Record<string, unknown>;
  const notification =
    outer.notification && typeof outer.notification === "object"
      ? (outer.notification as Record<string, unknown>)
      : null;
  const record = notification ?? outer;
  if (readString(record, "kind") !== CI_DEPLOY_KIND) return null;

  // 业务字段优先读 payload，其次读顶层（平铺事件没有 payload）。
  const payload =
    record.payload && typeof record.payload === "object"
      ? (record.payload as Record<string, unknown>)
      : outer;
  const target = readString(payload, "target") || readString(record, "target");
  const sha = readString(payload, "sha") || readString(record, "sha");
  const rawStatus =
    readString(payload, "status") || readString(record, "status");
  const title = readString(payload, "title") || readString(record, "title");

  if (!target || !sha) return null;
  if (rawStatus !== "success" && rawStatus !== "failed") return null;
  return {
    kind: CI_DEPLOY_KIND,
    target,
    sha,
    status: rawStatus,
    ...(title ? { title } : {}),
  };
}

/** 单行化：所有空白压成单个空格、去掉控制字符，按需截断（绝不让提示行换行）。 */
export function toSingleLine(text: string, maxLength = 120): string {
  const collapsed = text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export const DEPLOY_WAKE_SHA_LENGTH = 7;

/**
 * 提示行文案。固定带 target / sha7 / 结果，title 作为补充信息追加
 * （服务端 title 文案可能变，target+sha 是稳定锚点）。
 */
export function formatDeployWakeLine(event: CiDeployEvent): string {
  const sha7 = event.sha.slice(0, DEPLOY_WAKE_SHA_LENGTH);
  const icon = event.status === "failed" ? "✖" : "✔";
  const verb = event.status === "failed" ? "部署失败" : "部署完成";
  const base = `${icon} ${event.target} ${verb} ${sha7}`;
  const title = event.title ? toSingleLine(event.title, 80) : "";
  return toSingleLine(title ? `${base} · ${title}` : base);
}

export function ciDeployDedupeKey(event: CiDeployEvent): string {
  // 刻意只按 target+sha 去重（同一 sha 一次响铃）：
  // CI 对同一个 commit 可能先失败、重跑后成功——两次都响铃会把「同一次部署的
  // 反复」放大成噪音，故 failed→success 同 sha 不会二次响铃。要看重跑结果看
  // 通知列表/状态行即可，终端唤醒只负责「这次 push 的部署有结论了」。
  // 换 sha 才会重新响铃。
  return `${event.target}:${event.sha}`;
}

export type DeployWakeNotifierDeps = {
  /** 事件最终写给谁（BEL 写这里；非 TTY 流也不可能被调用，见 interactive 闸门）。 */
  output: NodeJS.WritableStream;
  /**
   * 是否允许唤醒。false → 所有 handle() 都是纯 no-op（不写 BEL、不调 printLine）。
   * 调用方传「交互式 TUI 且 stdout 是 TTY」。
   */
  interactive: boolean;
  /** 单行提示的落点（TUI 传 transcript 安全插入，测试传 spy）。 */
  printLine: (line: string) => void;
  /** 可注入以复用既有 BEL 能力（默认 emitTerminalBell）。 */
  emitBell?: (output: NodeJS.WritableStream) => void;
  /** 本会话已响过的 target+sha（测试可注入预置集合）。 */
  seen?: Set<string>;
};

export type DeployWakeNotifier = {
  /** 收到一条原始事件；真正响了才返回 true。 */
  handle(raw: unknown): boolean;
  /** 已响过的 key 集合（诊断/测试用）。 */
  readonly seen: Set<string>;
};

/**
 * 去重 + 响铃 + 单行提示的唯一装配点。
 *
 * 不做副作用检测以外的任何事：不排程重绘（提示落点自己负责），不持有定时器，
 * 因此会话结束不需要 dispose（订阅那边有）。
 */
export function createDeployWakeNotifier(
  deps: DeployWakeNotifierDeps,
): DeployWakeNotifier {
  const seen = deps.seen ?? new Set<string>();
  const emitBell = deps.emitBell ?? emitTerminalBell;
  return {
    seen,
    handle(raw: unknown): boolean {
      // 第一道闸门：非交互模式连解析都不做，保证零输出。
      if (!deps.interactive) return false;
      const event = parseCiDeployEvent(raw);
      if (!event) return false;
      const key = ciDeployDedupeKey(event);
      if (seen.has(key)) return false;
      seen.add(key);
      emitBell(deps.output);
      deps.printLine(formatDeployWakeLine(event));
      return true;
    },
  };
}

// ── SSE 订阅（最小实现，静默降级） ───────────────────────────────────────────

export type SseFrameParseResult = { data: string[]; rest: string };

/**
 * 从缓冲区里切出完整的 SSE 帧，返回每帧的 `data:` 拼接结果 + 剩余不完整尾巴。
 * 只认 `data:` 行（`id:` / `retry:` / 注释行与心跳直接丢弃）：本模块只需要事件体。
 */
export function parseSseFrames(buffer: string): SseFrameParseResult {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const chunks = normalized.split("\n\n");
  const rest = chunks.pop() ?? "";
  const data: string[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const payload = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).replace(/^ /, ""));
    if (payload.length > 0) data.push(payload.join("\n"));
  }
  return { data, rest };
}

export type CiDeployStreamArgs = {
  /** 例如 https://nolo.chat（不带尾斜杠也 OK）。 */
  serverUrl: string;
  authToken: string;
  /** 必须是服务端认证出的同一个 userId，否则 user- 频道会 403。 */
  userId: string;
  onEvent: (raw: unknown) => void;
  /** 订阅彻底放弃时的一次性回调（调用方决定是否提示；默认什么都不做）。 */
  onGiveUp?: (reason: "unauthorized" | "retries-exhausted") => void;
  fetchImpl?: typeof fetch;
  /** 最多重连次数（默认 5），到顶即放弃且不刷屏。 */
  maxRetries?: number;
  /** 首次退避（默认 1000ms，指数增长到 30s 封顶）。 */
  initialBackoffMs?: number;
  /** 测试用：睡眠注入，避免真的等。 */
  sleep?: (ms: number) => Promise<void>;
};

export type CiDeploySubscription = {
  /** 幂等：中止在途请求 + 停掉重连循环（含打断退避等待），不再有任何回调。 */
  dispose(): void;
};

/**
 * 订阅 `GET {serverUrl}/api/events/user-{userId}`（服务端 handleEvents 的 SSE 端点，
 * 鉴权走 Authorization: Bearer，与 CLI 其它 HTTP 调用同款）。
 *
 * 所有失败都在内部吞掉：401/403 直接判终态（不再重连、不再提示）；
 * 其它错误按指数退避重连，次数用尽后调用一次 onGiveUp 并停止。
 * 返回的 dispose 是唯一出口——调用方（TUI 退出路径）必须调用它。
 */
export function startCiDeployEventStream(
  args: CiDeployStreamArgs,
): CiDeploySubscription {
  const fetchImpl = args.fetchImpl ?? fetch;
  const maxRetries = args.maxRetries ?? 5;
  const initialBackoffMs = args.initialBackoffMs ?? 1_000;
  const url = `${args.serverUrl.replace(/\/+$/, "")}/api/events/user-${encodeURIComponent(
    args.userId,
  )}`;

  let disposed = false;
  let controller: AbortController | null = null;
  // 退避等待的 timer 必须登记在册，dispose 才拦得住它：
  //  - sleepTimers：在途的 setTimeout（dispose 时 clearTimeout，不留活跃 timer）；
  //  - sleepWaiters：对应的 resolve（dispose 时立刻唤醒，让 run() 从
  //    `await sleep(...)` 返回、在 while 顶部看到 disposed 直接退出，
  //    而不是傻等整个 backoff——用户退出 TUI 时订阅必须当场停手）。
  // 自然到期时两处都会自我摘除，集合不会泄漏。
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const sleepWaiters = new Set<() => void>();
  const sleepWithRegisteredTimer = (ms: number) =>
    new Promise<void>((resolve) => {
      let settled = false;
      const wake = () => {
        if (settled) return;
        settled = true;
        sleepWaiters.delete(wake);
        resolve();
      };
      const timer = setTimeout(() => {
        timers.delete(timer);
        wake();
      }, ms);
      // 不因为这条后台订阅把进程钉在事件循环上（与 TUI 的其它后台计时器纪律一致）。
      (timer as { unref?: () => void }).unref?.();
      timers.add(timer);
      sleepWaiters.add(wake);
    });
  const sleep = args.sleep ?? sleepWithRegisteredTimer;

  const giveUp = (reason: "unauthorized" | "retries-exhausted") => {
    if (disposed) return;
    disposed = true;
    try {
      args.onGiveUp?.(reason);
    } catch {
      // 提示本身失败不改变「已放弃」这个事实。
    }
  };

  const run = async () => {
    let attempt = 0;
    while (!disposed) {
      controller = new AbortController();
      try {
        const response = await fetchImpl(url, {
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${args.authToken}`,
          },
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          giveUp("unauthorized");
          return;
        }
        if (!response.ok || !response.body) throw new Error("sse-not-ok");
        attempt = 0; // 建连成功即复位退避
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!disposed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { data, rest } = parseSseFrames(buffer);
          buffer = rest;
          for (const frame of data) {
            if (disposed) return;
            let parsed: unknown;
            try {
              parsed = JSON.parse(frame);
            } catch {
              continue; // 坏帧静默跳过，不影响后续事件
            }
            try {
              args.onEvent(parsed);
            } catch {
              // 消费侧异常绝不打断订阅。
            }
          }
        }
      } catch {
        // 网络错误 / 读流中断 / abort：落到下面的退避重连。
      }
      if (disposed) return;
      if (attempt >= maxRetries) {
        giveUp("retries-exhausted");
        return;
      }
      const backoff = Math.min(30_000, initialBackoffMs * 2 ** attempt);
      attempt += 1;
      await sleep(backoff);
    }
  };

  void run().catch(() => {
    // run() 内部已兜全部异常；这里只是最后一道保险，防止未处理 rejection。
  });

  return {
    dispose() {
      disposed = true;
      try {
        controller?.abort();
      } catch {
        // ignore
      }
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      // 唤醒在途退避：run() 立刻返回并在 while 顶部看到 disposed 退出。
      // 先复制再清空，避免 wake 内部 delete 影响遍历。
      for (const wake of [...sleepWaiters]) wake();
      sleepWaiters.clear();
    },
  };
}
