import type { AgentRuntimeRequestedMode } from "../agentRuntimeLocal";
import type { TurnTokenUsage } from "../client/tokenUsage";
import type { CliUpdateInfo } from "../updateCommands";
import type { AttachedImage } from "./pasteImage";
import type { GitStatus } from "./gitStatus";

export type ThinkingDisplayMode = "show" | "hide";

export type TuiState = {
  agentKey: string;
  agentName: string;
  dialogId?: string;
  /**
   * dialogLabel 是状态/窗口标题用的显示名（title 优先、回退 id）；
   * dialogTitle 只在服务端真的产出标题时才有值，供状态栏独立标题段使用
   * （无标题时该段不渲染）。
   */
  dialogTitle?: string;
  dialogKey?: string;
  dialogOwnerId?: string;
  dialogLabel: string;
  profileName: string;
  serverUrl: string;
  cliVersion?: string;
  /**
   * npm registry 异步检查结果：当前通道有新版本时非空，欢迎页据此提示
   * /update 升级。null / undefined 表示无更新或检查不可用（离线等），
   * 一律不打扰用户。
   */
  updateAvailable?: CliUpdateInfo;
  /**
   * 用于解析 paste 行里的相对路径。workspace 启动时从 process.cwd() 取。
   * 保留在 state 里是为了让 handleTuiInput 这种纯函数也能做路径解析。
   */
  cwd: string;
  /**
   * `/cd` 切换前的旧目录（仅当发生过切换时存在）。`/cd -` 回退到该目录；
   * 回退成功后清空，避免再次 `/cd -` 反复横跳（语义：`-` 只回溯一步）。
   */
  prevCwd?: string;
  /**
   * 最近一次 `/cd` 切换产生的切换消息，作为 turn-scope 上下文注入 agent
   * 下一轮输入（agent 与用户同时知情）。被下一个真实 turn 消费后清除；
   * 若在 turn 运行中切换（busy 路径），该消息会一直保留到下一个 turn 被读取。
   */
  pendingCwdNotice?: string;
  attachedDocs: string[];
  /**
   * Skill refs attached to the workspace via /skill attach.
   * Each entry is a dbKey (page-xxx) or a bare skill name resolved
   * against .agents/skills/<name>/SKILL.md.
   * Passed to buildSkillContextBlocks on every chat turn so the agent
   * sees the skill content in system context blocks.
   * /new clears these, same semantics as attachedDocs.
   */
  attachedSkills: string[];
  /**
   * 暂存 / paste 行解析到的图片附件。
   * 提交 chat 时会消费这些,转成 imageUrls 一起送出去。
   * /new 时清空,跟 attachedDocs 同语义。
   */
  attachedImages: AttachedImage[];
  runtimeMode: AgentRuntimeRequestedMode;
  /**
   * 显示在状态栏里的模式标签,默认等于 runtimeMode。
   * 可通过 NOLO_CLI_STATUS_MODE 覆盖,例如设置为 high。
   */
  modeLabel: string;
  /** Platform response language used by both the real turn and context estimate. */
  userLanguage?: string;
  gitStatus?: GitStatus;
  /**
   * Session-only reasoning display preference. This controls terminal chrome
   * only: reasoning generation, transport, persistence, and billing remain
   * unchanged when hidden.
   */
  thinkingDisplay: ThinkingDisplayMode;
  turnTokens?: TurnTokenUsage;
  /**
   * 本对话在**本次 TUI 会话内**累计消耗的平台积分（每轮 turnCredits 相加）。
   *
   * 为什么本地累加而不是读服务端 `dialog.totalCost`：后者是异步投影——CLI 本地
   * loop 先把 token 明细写在本地、随后才远端同步，服务端再据此累加 totalCost。
   * 每轮结束立刻去读，读到的往往是上一轮的数（甚至首轮读到 0 而整行不显示）。
   * 逐次调用的 cost 本来就在 usageRecords 里、CLI 手上就有，本地加即精确且无延迟。
   *
   * 只统计平台计费调用（billing_unit === "credits"）：自有 API / 订阅制（cli）
   * 不扣平台积分，不进这个口径。
   */
  sessionCredits?: number;
  /**
   * 续聊已有对话时，从服务端 `dialog.totalCost` 读到的历史累计，作为显示基数。
   * 与 sessionCredits 语义不相交：base = 本次会话之前烧掉的，sessionCredits =
   * 本次会话烧掉的，状态行显示两者之和。仅在 attach 对话时 seed 一次，
   * 之后不再被异步读取覆盖（否则会把本会话的量重复计一遍）。
   */
  dialogCreditsBase?: number;
  /**
   * Measured estimate of built-in system+tools context (AGENTS.md, guidance,
   * skill index, tool schemas). Used by the status chip until provider usage
   * arrives in turnTokens.
   */
  estimatedContextTokens?: number;
  /** Resolved from agentName at init / agent-switch; fallback when turnTokens has no contextWindow. */
  contextWindow?: number;
  /**
   * 会话级记忆缓存——对话开始时加载一次，后续轮次复用。
   * /new 或切换对话时清空，下一轮重新加载。
   * null = 已加载但无记忆；undefined = 尚未加载。
   */
  cachedMemoryOverlay?: string | null;
  /**
   * 会话级权限自动化——true 时 TUI 的 confirmDestructiveAction 跳过确认弹窗，
   * 直接放行破坏性 shell 命令与工作区外部文件访问。仅影响 TUI 的确认回调，
   * actionGate（handoff/input 类）不受影响。通过 /auto <on|off> 切换，
   * 默认 off（undefined 视同 off），不持久化，/new / 切换对话也不清除，
   * 仅随当前 TUI 进程存活。
   */
  autoConfirm?: boolean;
};

export type TuiAction =
  | {
      type: "chat";
      message: string;
      agentKey: string;
      runtimeMode: AgentRuntimeRequestedMode;
      continueDialogId?: string;
      /**
       * 行内或 /attach 命令解析到的图片绝对路径。
       * 这里只携带路径,workspace loop 会异步读成 data URL 后拼 imageUrls。
       * 失败(ENOENT/超过大小/不是图片)的会被丢弃,留在 message 里给用户文本。
       */
      imagePaths?: string[];
    }
  | {
      type: "compact";
      dialogId: string;
    }
  | {
      type: "self-update";
    }
  | {
      type: "theme-refresh";
    }
  | {
      type: "cwd-refresh";
      /**
       * 切换成功后要写入对话历史的切换消息（agent 下一 turn 可读到），
       * 格式与 /switch 的切换消息同语义。缺省时（如仅重测 gitStatus）
       * 不写对话历史。
       */
      switchMessage?: string;
    }
  | {
      type: "shell-command";
      command: string;
    }
  | {
      type: "pick-agent";
    }
  | {
      type: "list-agents";
    }
  | {
      type: "pick-dialog";
    }
  | {
      type: "set-locale";
      locale: "zh" | "en";
    }
  | {
      type: "copy-last";
    }
  | {
      type: "copy-all";
    }
  | {
      type: "set-mouse";
      enabled: boolean;
    }
  | {
      type: "set-math";
      enabled: boolean;
    }
  | {
      type: "set-altscreen";
      enabled: boolean;
    }
  | {
      type: "clear";
      dialogId?: string;
    }
  | {
      type: "exit";
    };

export type TuiInputResult = {
  nextState: TuiState;
  output: string;
  action?: TuiAction;
};

export type TuiKeyInfo = {
  name?: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
};

export type TuiInputKeyResult = {
  buffer: string;
  cursorPos?: number;
  submit?: string;
  abort?: boolean;
  redraw?: boolean;
};
