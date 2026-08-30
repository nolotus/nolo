// ── S4 迁移：TUI 渲染三件套（renderHistoryToOutput / paintSyncedFrame /
// scheduleRender）及其共享节流状态（flushPendingRender）已从
// readlineWorkspace.ts 原样迁入本模块。渲染是输出字节序列敏感区：以下四个
// 函数体为逐行搬移，仅把闭包可变绑定（fixedInput / buffer / cursorPos）改写
// 为 host 上的 getter 直通读取（S2 模式的可变引用语义，禁止快照），ANSI 拼接
// 与重绘时序零改动。
// 依赖方向单向：本模块 → tuiHistory / tuiSelection / tuiRawInput；
// 本模块禁止回指 readlineWorkspace.ts。
import { renderHistory, type TurnHistory } from "./tuiHistory";
import type { TuiSelectionState } from "./tuiSelection";
import type { FixedInputController } from "./tuiRawInput";

/**
 * 渲染集群的宿主依赖。`fixedInput` / `buffer` / `cursorPos` 在
 * runTuiWorkspace 作用域内是可变 let 绑定（交互 composer 安装时会整体替换
 * fixedInput，流式回调会改写草稿与光标），因此经 getter 属性动态直通，
 * 每次读取都拿到当前值；`output` / `history` / `selectionState` 是稳定
 * 引用，直接传值。
 */
export interface TuiRenderHost {
  readonly output: NodeJS.WritableStream;
  readonly history: TurnHistory;
  readonly selectionState: TuiSelectionState;
  readonly fixedInput: FixedInputController;
  readonly buffer: string;
  readonly cursorPos: number;
}

/**
 * 每个 runTuiWorkspace 实例调用一次。renderScheduled / renderTimer /
 * syncingLayout 是渲染集群私有状态，必须随工厂闭包按实例隔离——测试/
 * 嵌入方可能在同进程重叠运行多个 workspace，提升为模块级变量会串扰节流
 * 与防重入卫兵（行为变化）。
 */
export function createTuiRender(host: TuiRenderHost) {
  const { output, history, selectionState } = host;
  // Coalesce streaming chunks into ~30fps frames; keystroke composer repaints
  // go through fixedInput.repaint directly and are unaffected; flushPendingRender
  // remains immediate for turn boundaries.
  const RENDER_THROTTLE_MS = 33;
  let renderScheduled = false;
  let renderTimer: ReturnType<typeof setTimeout> | null = null;
  // 防重入卫兵：onInputLinesChange → renderHistoryToOutput → 若 composer 重绘
  // 又触发 onInputLinesChange → 无限递归把 CPU 打满。重入时直接 return。
  let syncingLayout = false;

  const flushPendingRender = () => {
    if (renderTimer !== null) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
    if (!renderScheduled) return;
    renderScheduled = false;
    paintSyncedFrame();
  };

  const paintSyncedFrame = () => {
    if (host.fixedInput.isPaused()) return;
    // Begin terminal sync update + hide cursor. Terminals without 2026
    // support silently ignore the sequence; cursor hide is a universal
    // fallback that still reduces visible flicker.
    output.write("\x1b[?2026h\x1b[?25l");
    try {
      // Reuse renderHistoryToOutput so synced frames carry the active
      // selection highlight (a wheel scroll now repaints through here and must
      // not drop a drag-selection the user made) and share its re-entry guard.
      renderHistoryToOutput();
      if (host.fixedInput.active)
        host.fixedInput.repaint(host.buffer, host.cursorPos);
    } finally {
      output.write("\x1b[?25h\x1b[?2026l");
    }
  };

  const scheduleRender = () => {
    if (renderScheduled) return;
    renderScheduled = true;
    renderTimer = setTimeout(() => {
      renderScheduled = false;
      renderTimer = null;
      paintSyncedFrame();
    }, RENDER_THROTTLE_MS);
  };

  const renderHistoryToOutput = () => {
    // A dialog (picker / confirm) owns the screen while paused. Repainting the
    // transcript underneath it erases the frame — mid-turn confirms streamed
    // tokens over the prompt, so it flashed and vanished while still holding
    // the keyboard, and the turn looked hung.
    if (host.fixedInput.isPaused()) return;
    if (syncingLayout) return;
    syncingLayout = true;
    try {
      renderHistory(
        output,
        history,
        host.fixedInput.getInputLines(),
        selectionState,
      );
    } finally {
      syncingLayout = false;
    }
  };

  return { renderHistoryToOutput, scheduleRender, flushPendingRender };
}
