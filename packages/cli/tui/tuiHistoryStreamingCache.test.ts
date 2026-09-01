/**
 * 流式渲染增量 splice 缓存的等价性回归测试（H1）。
 *
 * getStreamingTurnLines 的快路径（append-splice）输出必须与全量
 * renderTurnBlock 逐行一致。守卫命中的可疑内容（fence/数学块/表格/\r）
 * 会触发全量渲染回退，天然一致；本测试覆盖安全路径 + 可疑路径 + 非
 * 追加路径，均要求与全量渲染逐行相等。
 */
import { describe, expect, test } from "bun:test";

import {
  createTurnHistory,
  startTurn,
  applyOutputChunkToCurrentTurn,
  getStreamingTurnLinesForTest,
  renderTurnBlock,
  resetStreamingTurnCache,
  type TurnHistory,
} from "./tuiHistory";

// 注意：不要在本文件模块级改 process.env（NOLO_CLI_COLOR 等）——bun test 同进程
// 跨文件共享 env，会污染其他渲染断言（曾致全目录合跑 6 个无关 fail）。
// 本测试对 splice/全量两侧都显式传 colorEnabled=true，无需全局色开关。
const CW = 119;

function makeHistory(seedTurns: number): TurnHistory {
  const history = createTurnHistory();
  for (let t = 0; t < seedTurns; t++) {
    startTurn(history, t % 2 === 0 ? "user" : "assistant");
    history.currentContent +=
      Array.from(
        { length: 6 },
        (_, i) => `turn ${t} line ${i}: lorem ipsum transcript padding`
      ).join("\n") + "\n";
    // 直接 finalize：模拟既有历史
    (history as any).turns.push({
      role: history.currentRole!,
      content: history.currentContent,
    });
    history.currentRole = null;
    history.currentContent = "";
    history.currentBlocks = [];
  }
  startTurn(history, "assistant");
  return history;
}

function expectSpliceEqualsFull(
  history: TurnHistory,
  label: string
): void {
  const spliced = getStreamingTurnLinesForTest(
    history.currentRole!,
    history.currentContent,
    CW,
    true,
    "test-theme"
  );
  const full = renderTurnBlock(
    history.currentRole!,
    history.currentContent,
    CW,
    true
  );
  const same =
    spliced.length === full.length &&
    spliced.every((line, index) => line === full[index]);
  if (!same) {
    const diffAt = spliced.findIndex((line, index) => line !== full[index]);
    throw new Error(
      `${label}: splice 与全量渲染不一致（row ${diffAt}: ${JSON.stringify(
        spliced[diffAt]?.slice(0, 80)
      )} vs ${JSON.stringify(full[diffAt]?.slice(0, 80))}）`
    );
  }
}

describe("streaming splice cache equivalence (H1)", () => {
  test("tool block 流（单 \\n 块尾）逐帧 splice 与全量渲染一致", () => {
    resetStreamingTurnCache();
    const history = makeHistory(0);
    applyOutputChunkToCurrentTurn(history, "Working on it...\n\n");
    for (let i = 0; i < 12; i++) {
      applyOutputChunkToCurrentTurn(
        history,
        `› tool ${i}\n  ├ sample output line a ${i}\n  ├ sample output line b ${i}\n  └ sample output line c ${i}\n`,
        "tool"
      );
      expectSpliceEqualsFull(history, `tool frame ${i}`);
    }
  });

  test("文本 delta 流（跨行 append、段落边界）逐帧一致", () => {
    resetStreamingTurnCache();
    const history = makeHistory(0);
    const deltas = [
      "分析如下：\n",
      "第一点，性能与可读性并重。\n\n",
      "## 结论\n",
      "分段渲染的等价性依赖 LINE-LOCAL 高亮。\n",
      "- 列表项一\n",
      "- 列表项二\n\n",
      "收尾正文。\n",
    ];
    for (const [i, delta] of deltas.entries()) {
      applyOutputChunkToCurrentTurn(history, delta);
      expectSpliceEqualsFull(history, `text frame ${i}`);
    }
  });

  test("可疑内容守卫：fence/表格/数学块回退全量且一致", () => {
    resetStreamingTurnCache();
    const history = makeHistory(0);
    applyOutputChunkToCurrentTurn(history, "before\n\n");
    const suspiciousChunks = [
      "```ts\nconst x = 1;\n```\n",
      "| a | b |\n|---|---|\n| 1 | 2 |\n",
      "$$E=mc^2$$\n",
      "normal tail\n",
    ];
    for (const [i, chunk] of suspiciousChunks.entries()) {
      applyOutputChunkToCurrentTurn(history, chunk);
      expectSpliceEqualsFull(history, `suspicious frame ${i}`);
    }
  });

  test("含 \\r 的终端输出（进度条重写）回退全量且一致", () => {
    resetStreamingTurnCache();
    const history = makeHistory(0);
    applyOutputChunkToCurrentTurn(history, "start\n");
    const frames = ["downloading 10%\r", "downloading 50%\r", "done 100%\n"];
    for (const [i, chunk] of frames.entries()) {
      applyOutputChunkToCurrentTurn(history, chunk);
      expectSpliceEqualsFull(history, `cr frame ${i}`);
    }
  });

  test("20 turn 历史 + 60 tool 事件长 turn 逐帧一致（无累积漂移）", () => {
    resetStreamingTurnCache();
    const history = makeHistory(20);
    applyOutputChunkToCurrentTurn(history, "Working...\n\n");
    for (let i = 0; i < 60; i++) {
      applyOutputChunkToCurrentTurn(
        history,
        `› readFile src/s_${i}.ts\n  ├ ok line a ${i}\n  └ ok line b ${i}\n`,
        "tool"
      );
      expectSpliceEqualsFull(history, `long frame ${i}`);
    }
  });
});
