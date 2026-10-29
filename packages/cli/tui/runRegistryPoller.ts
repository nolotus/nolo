/**
 * 本地 run registry 轮询器——停靠区的第二条数据来路，且这一条不经过模型。
 *
 * P1 之后面板仍然只有一条来路：模型调 controlAgentRun，工具返回 JSON，解析后
 * 喂给 dock。这条路决定了「面板要动，模型就得轮询」，而每次轮询都在 transcript
 * 里留下一张状态卡片——用刷屏换可见性。
 *
 * 但执行者此刻在干什么这件事，本来就写在磁盘上：`~/.nolo/runs/<runId>.json`
 * 的 `activity.inFlight` 里有 `{ kind, name, sinceMs }`。TUI 直接读就行，不需要
 * 模型、不需要网络、不花 token、不产生任何 transcript 输出。
 *
 * 有意思的是这条路比模型那条看得更细：`controlAgentRun(status)` 的返回值里
 * 压根没有 `activity` 字段，所以「正在跑 Edit，已经 3 秒」这种信息，模型自己
 * 都拿不到，只有面板拿得到。
 *
 * 轮询器不改 dock 的任何规则：它只是往 P1 已经建好的 `update()` 入口里多灌
 * 一条流，合并、linger、退休、渲染全都复用。
 */

import { normalizeRunTitle } from "../../ai/tools/agent/runTitle";
import { type AgentRunSnapshot, readTimestamp } from "../client/agentRunSnapshot";
import { listRunRecords, type RunRecord } from "../agentRunControl";
import {
  isAgentNameFallback,
  isAgentRunTerminalStatus,
  resolveRunLabel,
} from "../../ai/tools/agent/agentRunDisplayHelpers";
import { TAIL_LINES_MAX } from "../../core/redactLogLines";
import { mergeRemoteTaskView, type RemoteTaskView } from "../../core/remoteTaskView";
import { remoteTaskUnsettled, type RemoteTaskCarrier } from "./runZoneLines";

/** 读一次 json 很便宜，可以贴着面板的重绘节奏走。 */
export const RUN_POLL_INTERVAL_MS = 1000;
/** Discovery is filesystem-heavy; docked runs still get their one-second poll. */
const DISCOVERY_EVERY_TICKS = 5;
/** A terminal record first seen by discovery gets one chance to render. */
const DISCOVERY_TERMINAL_LINGER_MS = 60_000;
/**
 * 记录静默多久之后才值得去问「这进程还在吗」。
 *
 * 孤儿判定走 checkStaleRun（工具路径用的同一个函数，不另写一套），而它对一个
 * 活着的进程会 fork 一次 `ps` 且是同步的——在 TUI 主线程上就是一次卡顿。所以
 * 触发条件不是「每 15 秒问一次」，而是「这条记录已经 15 秒没动静了」：健康的
 * run 每 2 秒就会把 activity 写回磁盘，永远不会触发；真正可疑的（进程被 OOM
 * 掉、崩了、没写终态就没了）第一时间就会被问到。
 */
export const RUN_RECONCILE_SILENCE_MS = 15_000;

/** 快照 + 远程任务证据载体（载体形状声明在 runZoneLines，两条渲染路径共用）。 */
export type RemoteAwareSnapshot = AgentRunSnapshot & RemoteTaskCarrier;

/** 控制面读通道送来的一次远程任务投影。 */
export type RemoteTaskSnapshot = RemoteTaskCarrier & {
  runId: string;
  remoteTask: RemoteTaskView;
};

/**
 * 远程任务的非模型取数通道（契约 §10.2 / M3）。
 *
 * 为什么需要它：远端任务在 `~/.nolo/runs/*.json` 里没有记录（它跑在服务端或
 * 另一台设备上），本机 registry 轮询天然看不见它；而可见性又不能靠模型调
 * controlAgentRun 轮询来换——那是用刷屏换可见性。所以 TUI 自己发一次控制面
 * 读请求（复用既有 control 读 API／客户端），不经过模型、不花 token、不在
 * transcript 里留任何卡片。
 */
export type RemoteTaskSource = {
  /** 一次控制面读。同步（缓存）或 Promise 均可，Promise 由轮询器挂回调。 */
  read(runIds: string[]): RemoteTaskSnapshot[] | Promise<RemoteTaskSnapshot[]>;
  /** 按需日志：只有显式 requestLogTail 才会被调用，tailLines 已由轮询器钳制。 */
  readLogTail?(runId: string, tailLines: number): string | undefined;
};

export type HttpRemoteTaskSourceDeps = {
  getServerUrl: () => string;
  getAuthToken?: () => string;
  fetchImpl?: typeof fetch;
};

/**
 * 构造基于服务端 control 端点（POST /api/agent/runs/control { action: "list" }）
 * 的非模型远程任务取数源（§10.2 / M3 / H5）。
 */
export function createHttpRemoteTaskSource(
  deps: HttpRemoteTaskSourceDeps
): RemoteTaskSource {
  const fetchFn = deps.fetchImpl ?? fetch;
  return {
    async read(_runIds: string[]): Promise<RemoteTaskSnapshot[]> {
      const serverUrl = deps.getServerUrl();
      if (!serverUrl) return [];
      const authToken = deps.getAuthToken ? deps.getAuthToken() : "";
      try {
        const response = await fetchFn(
          new URL("/api/agent/runs/control", serverUrl),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ action: "list" }),
            signal: AbortSignal.timeout(5_000),
          }
        );
        if (!response.ok) return [];
        const payload = (await response.json()) as any;
        if (!payload?.ok || !Array.isArray(payload?.data?.runs)) return [];
        const now = Date.now();
        const snapshots: RemoteTaskSnapshot[] = [];
        for (const item of payload.data.runs) {
          if (!item || !item.runId) continue;
          const remoteTask = item.remoteTask;
          if (!remoteTask || typeof remoteTask !== "object") continue;
          const hasEvidence =
            remoteTask.location?.status !== "unknown" ||
            remoteTask.process?.status !== undefined ||
            remoteTask.cleanup?.status !== undefined;
          snapshots.push({
            runId: item.runId,
            remoteTask,
            ...(hasEvidence ? { lastEvidenceAt: now } : {}),
          });
        }
        return snapshots;
      } catch {
        return [];
      }
    },
  };
}

export type RunRegistryPollerDeps = {
  /** 面板当前挂着哪些 run（dock.getRuns()）。 */
  getDockedRuns: () => RemoteAwareSnapshot[];
  /** 把读到的状态喂回 dock。 */
  update: (snapshot: RemoteAwareSnapshot) => void;
  /** 读一条 run 记录（纯文件读）。 */
  readRecord: (runId: string) => RunRecord | null | undefined;
  /** 可选：扫描本地 registry，供首轮发现尚未上板的 run。 */
  discoverRuns?: () => RunRecord[];
  /** 当前对话 ID；getter 必须每次读取，以支持会话中途切换对话。 */
  getCurrentDialogId?: () => string | null;
  /** 孤儿回收：pid 没了就把记录落成终态。返回 null 表示记录不存在。 */
  reconcile?: (runId: string) => RunRecord | null | undefined;
  /**
   * 每 tick 把成功读到的记录（含刚变成终态的）广播出去。终态唤醒观察器
   * （runCompletionWatcher）挂在上面。读不到记录的 run 不在其列（可能跑在
   * 服务端，本地 registry 里根本没有）。
   */
  onRecordsPolled?: (records: RunRecord[]) => void;
  /**
   * 第二条非模型来路：远程任务的取数通道。不传＝没有远端证据（面板照旧只报
   * 本机 registry 看得到的东西，绝不猜）。
   */
  remoteTasks?: RemoteTaskSource;
  now?: () => number;
  intervalMs?: number;
  reconcileSilenceMs?: number;
  setIntervalFn?: (cb: () => void, ms: number) => unknown;
  clearIntervalFn?: (handle: unknown) => void;
};

export type RunRegistryPoller = {
  /** 有 run 上板时调用；已经在转、或已经 dispose 过，都什么都不做。 */
  ensureRunning(): void;
  /** Keep discovery alive for the duration of a turn, including before a run exists. */
  beginHold(): void;
  /** Release a turn hold; an empty poller stops on its next tick. */
  endHold(): void;
  /** 立刻走一轮（测试与首帧用）。 */
  poll(): void;
  /** 按需取日志切片：只读一次，且 tailLines 钳制到 TAIL_LINES_MAX。 */
  requestLogTail(runId: string, tailLines: number): void;
  /** 停表并忘掉去重状态；之后仍可被 ensureRunning 重新起表。 */
  stop(): void;
  /** 会话结束时调用：停表，且此后拒绝再起表。 */
  dispose(): void;
};

/**
 * RunRecord → 面板快照。
 *
 * 时间戳在 registry 里是 ISO 字符串，面板要的是 epoch millis。
 */
export function snapshotFromRunRecord(
  record: RunRecord,
  now: number
): AgentRunSnapshot {
  // `title` stays out of the label chain even though RunRecord carries it:
  // it already renders as snapshot.title (`title · name`); letting it win
  // the label too would print the same string twice in that slot. runId is
  // likewise out — it renders as the `#abc12345` suffix, not the name.
  const label = resolveRunLabel({
    agentName: record.agentName,
    agentKey: record.agentKey,
  });
  // 时间戳的「什么算有效」只有一份判定（readTimestamp：有限且 > 0），面板、
  // 卡片和这里共用，免得同一条记录在两个界面上一个显示年龄一个不显示。
  const startedAt = readTimestamp(record.startedAt);
  const endedAt = readTimestamp(record.endedAt);
  const activity = record.activity;
  const counters = activity?.counters;
  // 最后一次事件时刻：停滞判定（「次数不涨」）的唯一依据。
  const lastEventAtMs = activity?.lastEventAt ? Date.parse(activity.lastEventAt) : NaN;

  // inFlight.sinceMs 是「截至 activity.updatedAt 已经进行了多久」，是个采样值。
  // 换算回绝对起点后面板就能自己把秒数走下去，而不是每帧重复那个旧数字。
  let inFlight: AgentRunSnapshot["inFlight"] = null;
  const raw = activity?.inFlight;
  if (raw && !isAgentRunTerminalStatus(record.status)) {
    const updatedAt = activity?.updatedAt ? Date.parse(activity.updatedAt) : NaN;
    const base = Number.isFinite(updatedAt) ? updatedAt : now;
    const startedFrom = base - (Number.isFinite(raw.sinceMs) ? raw.sinceMs : 0);
    // 起点必须落在 (0, now] 里。坏掉的 sinceMs 或时钟回拨算出负数时，面板会把
    // 它当成 1970 年的时刻，渲染出「已进行 19900 天」；算出未来时刻则是负时长。
    // 两种都不如老老实实说「刚开始」。
    const usable =
      Number.isFinite(startedFrom) && startedFrom > 0 ? Math.min(startedFrom, now) : now;
    inFlight = { kind: raw.kind, name: raw.name, startedAt: usable };
  }

  const title = normalizeRunTitle(record.title);
  return {
    runId: record.runId,
    status: record.status,
    ...(!record.parentDialogId ? { unassigned: true } : {}),
    ...(isAgentNameFallback(label) ? {} : { agentName: label }),
    ...(title ? { title } : {}),
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(endedAt !== undefined ? { finishedAt: endedAt } : {}),
    ...(typeof counters?.toolCalls === "number" ? { toolCallCount: counters.toolCalls } : {}),
    // 纯推理 run（0 次工具调用）的心跳：模型调用次数 + 最后一次事件时刻。
    // 两者都来自记录里已有的字段，不新增任何采集。
    ...(typeof counters?.llmCalls === "number" ? { llmCallCount: counters.llmCalls } : {}),
    ...(Number.isFinite(lastEventAtMs) ? { lastEventAt: lastEventAtMs } : {}),
    // 收尾自报的平台积分 → dock 行「⚡ x.xx 积分」。
    ...(typeof record.credits === "number" && Number.isFinite(record.credits)
      ? { credits: record.credits }
      : {}),
    // note 在终态时是死因（"orphaned: process gone…"），非终态时只是备注。
    ...(record.note && isAgentRunTerminalStatus(record.status)
      ? { errorMessage: record.note }
      : {}),
    inFlight,
    logKey: "",
  };
}

/**
 * 去重指纹：只包含「变了就该重画」的字段。
 *
 * 年龄和 inFlight 的秒数都由 dock 的 tick 自己走，不进指纹——否则每秒都判定
 * 为「变了」，每个 run 每秒触发一次整块 composer 重绘，白白把重绘量翻几倍。
 */
function fingerprint(snapshot: AgentRunSnapshot): string {
  return JSON.stringify([
    snapshot.status,
    snapshot.agentName ?? "",
    snapshot.title ?? "",
    (snapshot as any).unassigned ?? false,
    snapshot.toolCallCount ?? -1,
    // 模型调用次数与事件时刻都是「变了就该重画」：纯推理 run 的心跳靠它们。
    snapshot.llmCallCount ?? -1,
    snapshot.lastEventAt ?? 0,
    snapshot.errorMessage ?? "",
    snapshot.finishedAt ?? 0,
    snapshot.credits ?? -1,
    snapshot.inFlight ? [snapshot.inFlight.kind, snapshot.inFlight.name, snapshot.inFlight.startedAt] : null,
  ]);
}

export function createRunRegistryPoller(deps: RunRegistryPollerDeps): RunRegistryPoller {
  const now = deps.now ?? (() => Date.now());
  const intervalMs = deps.intervalMs ?? RUN_POLL_INTERVAL_MS;
  const reconcileSilenceMs = deps.reconcileSilenceMs ?? RUN_RECONCILE_SILENCE_MS;
  const setIntervalFn = deps.setIntervalFn ?? ((cb, ms) => setInterval(cb, ms));
  const clearIntervalFn =
    deps.clearIntervalFn ??
    ((handle) => clearInterval(handle as ReturnType<typeof setInterval>));

  let timer: unknown = null;
  let disposed = false;
  let holdCount = 0;
  let tickCount = 0;
  let discoveredRecords: RunRecord[] = [];
  const lastEmitted = new Map<string, string>();
  const lastReconciledAt = new Map<string, number>();
  // Dock 退场后仍保留终态 tombstone，避免下一次 discovery 把它复活。
  const retiredRunIds = new Set<string>();
  /**
   * 已经上过板、但因为归属不是当前对话而被摘下面板的 runId。
   *
   * 摘掉不等于忘掉：用户切回原对话时下一 tick 就得能重新上板，而那时没有谁
   * 会来把轮询器叫醒（模型不轮询、也没有新 run 上板），所以名单里这些 run
   * 仍然占着读取名单，轮询器也就还转着。记录转终态或读不到记录后放开——
   * 那时候没有「切回去该看到的活跃 run」可言了。
   *
   * 关于「缺归属的记录怎么处理」的取舍：这里和不 belongsToCurrentDialog 的
   * discovered 走同一条判据，缺 parentDialogId 一样算「不属于当前对话」。代价
   * 是明确的——确实属于本对话、但归属没盖上的 run 在对话号已知期间用户看不到
   * （新会话首轮 spawn 后回填失败、记录写坏等）。选择隐藏而不是「没归属就先
   * 留着」，是因为后者会把一条真属于别的对话的活跃 run 继续挂在面板上，那正是
   * 这次要修的跨对话泄漏；而回填这一侧本来就有既有通道：tuiTurnRunner 在 turn
   * 结束拿到 dialogId 后调 backfillRunRecordParentDialog 补盖章，接管走那次
   * 回填的 run 下一 tick 就会重新上板（归属一变，判据就通过）。
   *
   * 轮询器自己不给缺归属的记录盖章：面板上挂着只说明「本会话曾把它上板」，
   * 证明不了它属于此刻的对话（用户可能刚从这个 run 的对话切走），乱盖会把
   * 终态唤醒的投递（processTerminalResume 依赖 owner.dialogId）指向错的对话，
   * 比「暂时看不见」糟得多。
   */
  const scopedOut = new Set<string>();

  const stop = () => {
    if (timer !== null) {
      clearIntervalFn(timer);
      timer = null;
    }
    lastEmitted.clear();
    lastReconciledAt.clear();
    discoveredRecords = [];
    tickCount = 0;
  };

  /** 记录最后一次有动静的时刻：activity 在跑就用它，否则退回 run 的起点。 */
  const freshnessOf = (record: RunRecord): number => {
    return readTimestamp(record.activity?.updatedAt) ?? readTimestamp(record.startedAt) ?? 0;
  };

  const poll = () => {
    const at = now();
    // 终态 run 不必再读：它的记录不会再变，dock 的 linger 会自己送它下板。
    const dockedRuns = deps.getDockedRuns();
    const dockedActive = dockedRuns.filter(
      (run) => run.runId && !isAgentRunTerminalStatus(run.status)
    );
    const dockedIds = new Set(dockedRuns.map((run) => run.runId));
    tickCount += 1;
    if (deps.discoverRuns && (tickCount - 1) % DISCOVERY_EVERY_TICKS === 0) {
      try {
        discoveredRecords = deps.discoverRuns();
      } catch {
        // Discovery is optional IO; a transient registry read must not break the TUI.
      }
    }
    const discovered = discoveredRecords;
    const currentDialogId = deps.getCurrentDialogId?.() ?? null;
    /**
     * 对话号已知时才做归属裁剪。
     *
     * 新会话首轮 state.dialogId 要等 turn 结束才生成，在那之前「不属于任何
     * 对话」只是暂时的：此刻不该把面板上已有的 run 摘掉（它正是本会话刚要看
     * 的），保持旧行为。
     */
    const scopeActive = Boolean(deps.getCurrentDialogId) && currentDialogId !== null;
    // 对话号退回未知（宿主重置了会话）：没有归属可谈，观察名单跟着作废，
    // 否则轮询器会被一份再也不会匹配的名单拖着空转，面板却一直空着。
    if (!scopeActive) scopedOut.clear();
    // The dock is conversation-scoped: only records explicitly parented to the
    // current dialog may enter it, stay on it, or refresh it. In particular, an
    // unassigned record is not a safe fallback here; P1 tool-results already
    // provide the runs that the current conversation explicitly asked to show.
    // Reading the getter on every poll also makes switching conversations take
    // effect on the next tick.
    const belongsToCurrentDialog = (record: RunRecord) =>
      !deps.getCurrentDialogId ||
      (currentDialogId !== null && record.parentDialogId === currentDialogId);
    const discoveredActive = discovered.filter((record) =>
      record.runId &&
      !dockedIds.has(record.runId) &&
      !retiredRunIds.has(record.runId) &&
      !isAgentRunTerminalStatus(record.status) &&
      belongsToCurrentDialog(record)
    );
    // 从未上过板的终态记录也给 dock 一次展示机会；超出窗口才墓碑化。
    const discoveredTerminal = discovered.filter((record) => {
      if (!record.runId || dockedIds.has(record.runId) || retiredRunIds.has(record.runId)) return false;
      if (!isAgentRunTerminalStatus(record.status) || !belongsToCurrentDialog(record)) return false;
      const endedAt = readTimestamp(record.endedAt);
      return endedAt !== undefined && at - endedAt <= DISCOVERY_TERMINAL_LINGER_MS;
    });
    for (const record of discovered) {
      if (
        record.runId &&
        isAgentRunTerminalStatus(record.status) &&
        belongsToCurrentDialog(record) &&
        !discoveredTerminal.includes(record)
      ) {
        retiredRunIds.add(record.runId);
      }
    }
    const active = [
      ...dockedActive,
      // 被摘下面板的 run 照样占着读取名单：一是切回原对话时下一 tick 就能重新
      // 上板，二是它们还活着的时候不能让轮询器停表——停了就再没人盯着它们。
      ...[...scopedOut].map((runId) => ({ runId, status: "running" }) as AgentRunSnapshot),
      ...discoveredActive,
      ...discoveredTerminal.map((record) => ({ runId: record.runId, status: record.status } as AgentRunSnapshot)),
    ];
    // 远程任务的轮询名单由远端取数通道维护：本机 registry 里没有它的记录，
    // 「有没有本地记录」不该决定表停不停——停了就再没人盯着远端了。
    for (const runId of remoteTracked.keys()) {
      if (!active.some((run) => run.runId === runId)) {
        active.push({ runId, status: "running" } as AgentRunSnapshot);
      }
    }
    if (active.length === 0 && holdCount === 0) {
      stop();
      return;
    }

    const alive = new Set<string>();
    // 本 tick 成功读到的记录：去重跳过（fingerprint 没变）不等于没读到，
    // 观察者（终态唤醒）需要看到每一条读到的记录来做自己的转变检测。
    const polled: RunRecord[] = [];
    for (const run of active) {
      alive.add(run.runId);
      // 轮询器跑在 TUI 的主循环上，任何一条 run 的读取出岔子都不该把整个界面
      // 带走。眼下注入的 readRunRecord/checkStaleRun 自己就吞掉了所有 IO 与
      // JSON 异常，这层守卫是给未来的注入者留的，不是在补今天的洞。
      let record: RunRecord | null | undefined;
      try {
        record = deps.readRecord(run.runId);
        // 记录静默太久才去问 pid 还在不在——那一步会同步 fork 一次 ps。健康的
        // run 每 2 秒写一次 activity，走不到这里；真死了的第一轮就会被问到。
        // lastReconciledAt 只是防抖：进程真没了的话记录会被落成终态，下一轮
        // 就被上面的 active 过滤掉了，不会反复问。
        if (
          deps.reconcile &&
          record &&
          !isAgentRunTerminalStatus(record.status) &&
          at - freshnessOf(record) >= reconcileSilenceMs &&
          at - (lastReconciledAt.get(run.runId) ?? 0) >= reconcileSilenceMs
        ) {
          lastReconciledAt.set(run.runId, at);
          record = deps.reconcile(run.runId) ?? record;
        }
      } catch {
        continue;
      }
      // 读不到记录不代表 run 没了：这条 run 可能跑在服务端、根本不在本地
      // registry 里。本地读不到就交给原来那条路（模型轮询），不动面板。
      // 读不到记录就无从判归属（可能跑在服务端、本地 registry 里根本没有，
      // 或者记录还没落盘）：面板保持原样，不在这里摘——摘了会在记录落盘前
      // 把刚上板的 run 闪掉，dock 的 stale 兜底会收拾真正失联的那些。
      if (!record) {
        // 已经摘下面板的 run 读不到记录了：没有「切回去该看到的活跃 run」，
        // 放开观察，别让轮询器为它一直转。
        scopedOut.delete(run.runId);
        continue;
      }
      // Discovery and polling use the same conversation scope. P1 tool-results
      // enter through update() directly and are intentionally not filtered here;
      // this guard only prevents the filesystem stream from crossing dialogs.
      if (deps.getCurrentDialogId && !belongsToCurrentDialog(record)) {
        // 已经上过板但不属于当前对话的 run：此前这层裁剪只管「不再刷新」，
        // 于是它一直占着面板直到终态 linger 结束。现在把它摘掉。
        if (scopeActive) {
          if (!scopedOut.has(run.runId)) {
            scopedOut.add(run.runId);
            // 去重表也得忘掉它：切回原对话时指纹多半和摘除前一样，留着的话
            // 这一条就再也不会重新上板。
            lastEmitted.delete(run.runId);
            // `not_found` 是 dock 既有的「忘掉这条 run」信号（只摘除、不留
            // 墓碑），切回去还能再上板。dock 侧没有任何对话概念，摘除与重新
            // 上板都只能由这里驱动。
            deps.update({ runId: run.runId, status: "not_found", logKey: "" });
          }
          // 终态了就没有「切回去该看到的活跃 run」，放开观察，让轮询器在
          // 面板清空后照旧自己停表。
          if (isAgentRunTerminalStatus(record.status)) scopedOut.delete(run.runId);
        }
        continue;
      }
      // 归属回到当前对话（切回来了，或归属事后被回填）：照常落下去重新上板。
      scopedOut.delete(run.runId);
      polled.push(record);

      const snapshot = snapshotFromRunRecord(record, at);
      const mark = fingerprint(snapshot);
      if (lastEmitted.get(run.runId) === mark) continue;
      lastEmitted.set(run.runId, mark);
      deps.update(snapshot);
    }

    // 已经下板的 run 不必再占着去重表。
    for (const runId of [...lastEmitted.keys()]) {
      if (!alive.has(runId)) lastEmitted.delete(runId);
    }
    for (const runId of [...lastReconciledAt.keys()]) {
      if (!alive.has(runId)) lastReconciledAt.delete(runId);
    }

    // 观察者出岔子不该带走轮询器——它跑在 TUI 主循环上。
    if (polled.length > 0 && deps.onRecordsPolled) {
      try {
        deps.onRecordsPolled(polled);
      } catch {
        /* observer errors must not take down the poll loop */
      }
    }

    // 本机 registry 读完之后，顺手问一次控制面读通道。这一步不是模型调用：
    // 没有 tool-result，没有 transcript 卡片，面板要动不需要模型去轮询。
    pollRemote();
  };

  /** 已从控制面读通道看到的远程任务（含远端独占、本机没有记录的 run）。 */
  const remoteTracked = new Map<string, RemoteTaskSnapshot>();
  /** 远端已收敛但还没从面板摘掉的 run（见 applyRemote 的退休规则）。 */
  const remoteSettledSeen = new Set<string>();
  let remoteReadInFlight = false;

  /**
   * 把一次远端读数落进 dock。
   *
   * 只覆盖远程字段：status 与本机字段仍由本机 registry 和 P1 tool-result 决定，
   * 两条来路在同一个 update() 里合并（dock 的 remote 字段是「粘」的），谁都不
   * 覆盖谁。
   */
  const applyRemote = (list: RemoteTaskSnapshot[]) => {
    remoteReadInFlight = false;
    const docked = new Map(deps.getDockedRuns().map((run) => [run.runId, run]));
    for (const item of list) {
      if (!item || !item.runId) continue;
      const prev = remoteTracked.get(item.runId);
      // 远端投影是增量下发的：缺字段 ≠ 撤回，合并规则只有 core 里那一份。
      const mergedRemote = prev
        ? mergeRemoteTaskView(prev.remoteTask, item.remoteTask)
        : item.remoteTask;
      const lastEvidenceAt = item.lastEvidenceAt ?? prev?.lastEvidenceAt;
      const logTail = item.logTail ?? prev?.logTail;
      const snapshot: RemoteTaskSnapshot = {
        runId: item.runId,
        remoteTask: mergedRemote,
        ...(lastEvidenceAt !== undefined ? { lastEvidenceAt } : {}),
        ...(logTail !== undefined ? { logTail } : {}),
      };
      remoteTracked.set(item.runId, snapshot);
      const dockedRun = docked.get(item.runId);
      // 本机记录带的字段优先；远端独占的 run 连 status 都没有，只能借用
      // 「running」这个占位（面板不会因此显示活跃转轮：远程证据未知时渲染层
      // 用的是静态标记，见 runZoneLines.remoteTaskClock / runZoneLeadIcon）。
      deps.update({
        ...(dockedRun ?? { status: "running", logKey: "" }),
        runId: item.runId,
        remoteTask: snapshot.remoteTask,
        ...(snapshot.lastEvidenceAt !== undefined
          ? { lastEvidenceAt: snapshot.lastEvidenceAt }
          : {}),
        ...(snapshot.logTail !== undefined ? { logTail: snapshot.logTail } : {}),
      } as RemoteAwareSnapshot);
    }

    // 远端收敛（进程停了、清理不是「未确认」）之后：本机记录还在跑就交给本机
    // 那条路；本机也终态了或压根没有本机记录，就让面板再留一帧「已停止/远端
    // stopped」，下一轮才摘（摘除不留墓碑，重新上板仍然可能）。
    for (const [runId, snapshot] of [...remoteTracked]) {
      if (remoteTaskUnsettled(snapshot)) {
        remoteSettledSeen.delete(runId);
        continue;
      }
      const dockedRun = docked.get(runId);
      if (dockedRun && !isAgentRunTerminalStatus(dockedRun.status)) {
        remoteSettledSeen.delete(runId);
        continue;
      }
      if (!remoteSettledSeen.has(runId)) {
        remoteSettledSeen.add(runId);
        continue;
      }
      remoteTracked.delete(runId);
      remoteSettledSeen.delete(runId);
      if (!dockedRun) deps.update({ runId, status: "not_found", logKey: "" });
    }
  };

  /**
   * 非模型取数的一拍。
   *
   * 读失败不是「远端什么都没有了」：这一拍没有证据，面板就不该动——失联时
   * 保持上一帧（外加越走越旧的心跳/年龄）才是唯一不撒谎的呈现。
   */
  const pollRemote = () => {
    const source = deps.remoteTasks;
    if (!source || remoteReadInFlight) return;
    const runIds = [
      ...new Set([...deps.getDockedRuns().map((run) => run.runId), ...remoteTracked.keys()]),
    ].filter((runId) => Boolean(runId));
    let result: RemoteTaskSnapshot[] | Promise<RemoteTaskSnapshot[]>;
    try {
      result = source.read(runIds);
    } catch {
      return;
    }
    if (result && typeof (result as Promise<RemoteTaskSnapshot[]>).then === "function") {
      remoteReadInFlight = true;
      (result as Promise<RemoteTaskSnapshot[]>).then(
        (list) => {
          try {
            applyRemote(list ?? []);
          } catch {
            remoteReadInFlight = false;
          }
        },
        () => {
          remoteReadInFlight = false;
        }
      );
      return;
    }
    try {
      applyRemote((result as RemoteTaskSnapshot[]) ?? []);
    } catch {
      /* 远端投影出岔子不该带走轮询器——它跑在 TUI 主循环上 */
    }
  };

  /**
   * 按需取日志切片（§9.2）。
   *
   * 日志不是轮询的产物：每 tick 拉一次尾巴既贵又会把转录区吃满，而面板要的
   * 只是「最后一屏」。所以轮询一拍都不碰日志，只有显式请求才读一次，且
   * tailLines 钳制到 TAIL_LINES_MAX——上限只有一份，在 core 里。
   */
  const requestLogTail = (runId: string, tailLines: number) => {
    const source = deps.remoteTasks;
    if (!source?.readLogTail || !runId) return;
    const limit =
      Number.isFinite(tailLines) && tailLines > 0
        ? Math.min(Math.floor(tailLines), TAIL_LINES_MAX)
        : TAIL_LINES_MAX;
    let tail: string | undefined;
    try {
      tail = source.readLogTail(runId, limit);
    } catch {
      return;
    }
    if (typeof tail !== "string") return;
    const prev = remoteTracked.get(runId);
    const remoteTask = prev?.remoteTask ?? { runId, location: { status: "unknown" as const } };
    const snapshot: RemoteTaskSnapshot = {
      runId,
      remoteTask,
      ...(prev?.lastEvidenceAt !== undefined ? { lastEvidenceAt: prev.lastEvidenceAt } : {}),
      logTail: tail,
    };
    remoteTracked.set(runId, snapshot);
    const dockedRun = deps.getDockedRuns().find((run) => run.runId === runId);
    deps.update({
      ...(dockedRun ?? { status: "running", logKey: "" }),
      runId,
      remoteTask,
      ...(snapshot.lastEvidenceAt !== undefined ? { lastEvidenceAt: snapshot.lastEvidenceAt } : {}),
      logTail: tail,
    } as RemoteAwareSnapshot);
  };

  const ensureRunning = () => {
    // stop() 是可逆的（没有活跃 run 时自己停表，有新 run 再起），dispose()
    // 不是：会话都退出了，迟到的 tool-result 不该再把表开起来。
    if (disposed || timer !== null) return;
    timer = setIntervalFn(poll, intervalMs);
  };

  return {
    ensureRunning,
    beginHold() {
      if (disposed) return;
      holdCount += 1;
      ensureRunning();
    },
    endHold() {
      if (holdCount > 0) holdCount -= 1;
    },
    poll,
    requestLogTail,
    stop,
    dispose() {
      disposed = true;
      remoteTracked.clear();
      remoteSettledSeen.clear();
      stop();
    },
  };
}
