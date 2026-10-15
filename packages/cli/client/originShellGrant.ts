/**
 * 分享 OAuth agent 的 shell 会话授权（块 D）。
 *
 * 触发场景：TUI 选了别人的 sshare agent（owner-required 派发：模型走分享者
 * 订阅、工具在本机执行）。本机用户首次让该 agent 跑 execShell / launchProcess
 * 之前必须显式确认——任意 shell 命令可读写本机该用户能访问的全部资源，
 * 不能因为「模型跑在别人的订阅上」就静默放行。
 *
 * 语义边界（与 destructive-shell guard / run-scoped surface 正交）：
 * - 默认拒绝：未授权的 shell 调用一律抛 `origin_authorization_required`，
 *   绝不 fail-open（headless / 无确认通道 = 拒绝，不是默认放行）。
 * - 一次性会话允许：允许后在**本 adapter 实例**内持续有效；撤销
 *   （revoke）立即生效，下一次 shell 调用重新弹确认。
 * - 上限不被覆盖：read-only 的 run-scoped surface（allowedToolNames /
 *   blockedToolNames 已在 executeLocalToolWithPolicy 的 runToolNames 断言里
 *   挡掉）与 policy shell-disabled（restricted mode 未声明 / NEVER_LOCAL）
 *   先跑——它们是 deny ceiling，本模块只在「policy 已放行」后追加会话门。
 * - 非 owner-required 场景不注入该模块 → 旧行为逐字不变。
 *
 * 撤销是同步状态翻转：executeTool 每次调用都重新 `isGranted()`，不存在
 * 异步传播延迟；TUI 侧用 /shell-revoke（或未来的设置面板）调 `revoke()`。
 */
import { isCommandExecutingTool } from "../../agent-runtime/localToolPolicy";

/**
 * 会话授权确认请求：交给宿主（TUI 确认对话框）渲染的展示负载。
 * 所有字段都是展示用身份快照，不是授权凭证；宿主不得据此推断权限。
 */
export type OriginShellGrantRequest = {
  /** 触发确认的分享 agent（rawRecord.name 优先，缺省 key）。 */
  agentName: string;
  agentKey: string;
  /** 分享者 userId（rawRecord.userId / ownerUserId），本机 ≠ 该值。 */
  ownerUserId: string;
  /** 本机展示名（detectMachineInfo 的 machineId / deviceName）。 */
  deviceId: string;
  deviceName?: string;
  /** 本机工作区快照（realpath-resolved 绝对路径）。 */
  workspaceRoot: string;
  /** 即将执行的 shell 工具名与命令（verbatim 展示，不截断）。 */
  toolName: string;
  command?: string;
};

export type OriginShellGrant = {
  /**
   * 当前是否已允许 shell 执行。每次 shell 调用前重查——撤销立即生效，
   * 没有缓存的「仍在允许期」快照。
   */
  isGranted(): boolean;
  /**
   * 首次 shell 调用前请求用户确认。宿主未提供确认通道（headless）时
   * 实现方必须 fail-closed 返回 false，不能默认放行。返回 true 后
   * isGranted() 立即为 true（直到 revoke）。
   */
  requestGrant(request: OriginShellGrantRequest): Promise<boolean>;
  /** 撤销已授予的 shell 权限；幂等。 */
  revoke(): void;
};

/**
 * 状态机实现：granted + generation 两个可变位。
 *
 * generation 是撤销 epoch——revoke 单调递增它。requestGrant 在发起前快照
 * generation，宿主确认返回后先比对：已变说明确认在途期间发生了 revoke，
 * 此时即使旧确认返回 true 也一律拒绝且不写 granted（在途确认不得覆盖
 * 撤销）。这堵住了「deferred confirm + revoke 后 resolve(true) → 重新打开
 * shell 权限」的竞态；撤销不要求终止已开始的命令，但必须让尚未放行的旧
 * 确认失效。
 */
export function createOriginShellGrant(deps: {
  confirm: (request: OriginShellGrantRequest) => Promise<boolean>;
}): OriginShellGrant {
  let granted = false;
  let generation = 0;
  return {
    isGranted: () => granted,
    requestGrant: async (request) => {
      if (granted) return true;
      const startGeneration = generation;
      // confirm 是宿主确认通道；缺省/返回 falsy 即拒绝（fail-closed）。
      const ok = await deps.confirm(request).catch(() => false);
      // 确认在途期间发生过 revoke → 旧确认失效，禁止恢复授权。
      if (generation !== startGeneration) {
        return false;
      }
      if (ok === true) {
        granted = true;
        return true;
      }
      return false;
    },
    revoke: () => {
      granted = false;
      generation += 1;
    },
  };
}

/**
 * 该工具调用是否需要 shell 会话授权。
 *
 * 判定与 executeLocalToolWithPolicy 的工具名归一化同源（isCommandExecutingTool
 * 已是保守超集：execShell / launchProcess / execBash / 任何名字含
 * shell|bash|command|terminal|script|exec 的工具）。宽判宁可拦一次非 shell
 * 调用让宿主确认，不可漏一个命令行。
 */
export function requiresShellSessionGrant(toolName: string): boolean {
  return isCommandExecutingTool(toolName);
}

/** 从工具调用参数里尽力提取展示用命令文本（不解析、不校验）。 */
export function extractShellCommandPreview(callArguments: unknown): string | undefined {
  let parsed: unknown = callArguments;
  if (typeof callArguments === "string") {
    try {
      parsed = JSON.parse(callArguments);
    } catch {
      // 非 JSON 字符串原样视为命令文本（execShell 允许 raw command 字符串）。
      return callArguments.trim() ? callArguments.trim() : undefined;
    }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const rec = parsed as Record<string, unknown>;
    const candidate =
      typeof rec.command === "string" ? rec.command
      : typeof rec.cmd === "string" ? rec.cmd
      : typeof rec.script === "string" ? rec.script
      : undefined;
    if (candidate?.trim()) return candidate.trim();
  }
  return undefined;
}
