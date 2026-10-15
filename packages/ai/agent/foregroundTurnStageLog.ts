// packages/ai/agent/foregroundTurnStageLog.ts
//
// 前台 server-owned turn 的阶段耗时日志（latency 批次 2026-10-13）。
//
// 为什么必须是"一条人类可读字符串"：抓样本的日志连接器只保留 console 的文本
// 行，对象参数会被丢掉，所以上一轮 `console.info("[x]", { ms })` 读不到任何
// 耗时，8–17s 无法拆阶段。这里每一行都是扁平字符串，用 key=value / stage=+Xms
// 表达全部信息。
//
// 量级：每轮 **只打一条 SUMMARY**（含各阶段相对 t0 的 ms）。分阶段明细行需要
// 显式开启：`globalThis.__NOLO_FOREGROUND_TURN_STAGE_LOG__ = true`，或
// `localStorage["nolo.foregroundTurn.stageLog"] = "1"`。

export const FOREGROUND_TURN_STAGE_LOG_PREFIX = "[foregroundTurn][latency]";

export interface ForegroundTurnStageLog {
  /** 记录一个阶段；仅开启明细时额外打一行（mark 始终进 SUMMARY）。 */
  stage: (stage: string, detail?: string) => void;
  /** 每轮恰好一条：outcome + 各阶段 mark（相对 t0 的 ms）。 */
  summary: (outcome: string, detail?: string) => void;
}

const isStageLogEnabled = (): boolean => {
  try {
    if ((globalThis as any).__NOLO_FOREGROUND_TURN_STAGE_LOG__ === true) {
      return true;
    }
    const storage = (globalThis as any).localStorage;
    return typeof storage?.getItem === "function"
      ? storage.getItem("nolo.foregroundTurn.stageLog") === "1"
      : false;
  } catch {
    return false;
  }
};

export function createForegroundTurnStageLog(args: {
  turnKey: string;
  /**
   * Server run identity. On the server-owned Web foreground path this IS the
   * dialogId; emitted explicitly so samples can be attributed by runId instead
   * of inferring it from `loopKey`.
   */
  runId: string;
  dialogKey: string;
  dialogId: string;
  /** 本轮运行归属 base（`/api/agent/run` 的目标 server）。 */
  base: string;
}): ForegroundTurnStageLog {
  const t0 = Date.now();
  const identity =
    `turn=${args.turnKey} runId=${args.runId} dialogId=${args.dialogId} ` +
    `dialogKey=${args.dialogKey} base=${args.base}`;
  const marks: string[] = [];

  return {
    stage: (stage, detail) => {
      const at = Date.now() - t0;
      marks.push(`${stage}=+${at}ms`);
      if (!isStageLogEnabled()) return;
      console.info(
        `${FOREGROUND_TURN_STAGE_LOG_PREFIX} stage=${stage} t=+${at}ms ` +
          `${identity}${detail ? ` ${detail}` : ""}`,
      );
    },
    summary: (outcome, detail) => {
      console.info(
        `${FOREGROUND_TURN_STAGE_LOG_PREFIX} SUMMARY outcome=${outcome} ` +
          `total=+${Date.now() - t0}ms ${identity} ` +
          `marks=[${marks.join(" ")}]${detail ? ` ${detail}` : ""}`,
      );
    },
  };
}
