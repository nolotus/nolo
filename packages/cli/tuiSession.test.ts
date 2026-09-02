import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import {
  DEFAULT_TUI_AGENT_KEY,
  applyTuiInputKey,
  completeSlashPrefix,
  createInitialTuiState,
  handleTuiInput,
  renderPrompt,
  renderTuiHelp,
  renderContextPanel,
  renderStatusLine,
  renderWelcome,
} from "./tui/session";
import { getCliLocale, setCliLocale, t } from "./tui/i18n";
// 窗口断言一律从 catalog 真值源推导（resolveAgentContextWindow），不钉硬编码魔数：
// catalog / 模型档位同步后此处自动跟随，测试只守「接线正确」这条不变量。
import { resolveAgentContextWindow } from "./client/tokenUsage";

describe("cli tui session", () => {
  // Assertions below are written against the English strings; pin the locale
  // so runs on zh-configured machines stay deterministic.
  const originalLocale = getCliLocale();
  beforeAll(() => setCliLocale("en"));
  afterAll(() => setCliLocale(originalLocale));

  test("Tab completes a unique slash-command prefix", () => {
    expect(completeSlashPrefix("/his")).toBe("/history ");
    expect(completeSlashPrefix("/lan")).toBe("/lang ");
    expect(applyTuiInputKey("/his", "\t").buffer).toBe("/history ");
    expect(applyTuiInputKey("/his", undefined, { name: "tab" }).buffer).toBe(
      "/history ",
    );
  });

  test("Tab extends ambiguous prefixes to the longest common prefix", () => {
    // /context and /ctx share "/c" with /compact, /copy, /customize — no progress.
    expect(completeSlashPrefix("/c")).toBeNull();
    // /switch and /agents share "/s" with /stop, /save — no progress.
    expect(completeSlashPrefix("/s")).toBeNull();
    // /sw uniquely resolves to /switch.
    expect(completeSlashPrefix("/sw")).toBe("/switch ");
    // /re used to be ambiguous between /render and /resume. /render is gone, so
    // /re now resolves outright — this asserts the removal actually reached the
    // command table, not just the renderer.
    expect(completeSlashPrefix("/re")).toBe("/resume ");
    expect(completeSlashPrefix("/res")).toBe("/resume ");
  });

  test("Tab never inserts a literal tab or fires outside slash commands", () => {
    expect(applyTuiInputKey("hello", "\t").buffer).toBe("hello");
    expect(applyTuiInputKey("/switch li", "\t").buffer).toBe("/switch li");
    expect(applyTuiInputKey("/zzz", "\t").buffer).toBe("/zzz");
    expect(completeSlashPrefix("not-slash")).toBeNull();
  });

  test("starts in an out-of-the-box nolo workspace", () => {
    const state = createInitialTuiState({ NOLO_CLI_GIT_STATUS: "0" });

    expect(state.agentName).toBe("nolo");
    expect(state.agentKey).toBe(DEFAULT_TUI_AGENT_KEY);
    expect(state.serverUrl).toBe("https://nolo.chat");
    expect(state.dialogLabel).toBe("new");
    expect(state.attachedDocs).toEqual([]);
    expect(state.modeLabel).toBe("auto");
    expect(renderStatusLine(state)).toContain("🏔");
    // auto-route is on by default but routes to a single flash tier, so the
    // status line shows the default agent name "nolo" instead of an "auto" label.
    expect(renderStatusLine(state)).toContain("nolo");
    expect(renderStatusLine(state)).toContain("🏔 nolo");
    // auto default routes to the built-in catalog agent; window follows the
    // catalog model (derived, not hardcoded). Chip shows a measured
    // system+tools estimate until the first provider usage report arrives.
    expect(state.contextWindow).toBe(
      resolveAgentContextWindow({ agentKey: DEFAULT_TUI_AGENT_KEY, agentName: "nolo" }),
    );
    expect(state.estimatedContextTokens).toBeGreaterThan(2_000);
    expect(renderStatusLine(state)).toMatch(/context: \d+(\.\d+)?% \([\d.]+k\/1M\)/);
    expect(renderStatusLine(state)).not.toContain("(0/");
    expect(renderStatusLine(state)).not.toContain("dialog ");
    expect(renderStatusLine(state)).not.toContain("docs ");
    expect(renderWelcome(state)).toContain("nolo");
    expect(renderWelcome(state)).toContain("server https://nolo.chat");
    expect(renderWelcome(state)).toContain("/help");
    expect(renderPrompt(state)).toBe("❯ ");
  });

  test("nolo keeps its catalog 1M window even with NOLO_AUTO_ROUTE=0", () => {
    // nolo 就是 DeepSeek V4 Flash Vision Exp（1M）；auto-route 开关只影响
    // dialogAgentMode，不再改窗口，启动态与 /switch 后保持一致。
    const state = createInitialTuiState({
      NOLO_CLI_GIT_STATUS: "0",
      NOLO_AUTO_ROUTE: "0",
    });
    expect(state.contextWindow).toBe(
      resolveAgentContextWindow({ agentKey: DEFAULT_TUI_AGENT_KEY, agentName: "nolo" }),
    );
    expect(state.estimatedContextTokens).toBeGreaterThan(2_000);
    expect(renderStatusLine(state)).toMatch(/context: \d+(\.\d+)?% \([\d.]+k\/1M\)/);
    expect(renderStatusLine(state)).not.toContain("(0/");
  });

  test("/switch nolo resolves the window from the catalog model", () => {
    const prev = process.env.NOLO_AUTO_ROUTE;
    process.env.NOLO_AUTO_ROUTE = "0";
    try {
      const state = createInitialTuiState({
        NOLO_CLI_GIT_STATUS: "0",
        NOLO_AUTO_ROUTE: "0",
        NOLO_AGENT: "agent-pub-custom",
        NOLO_AGENT_NAME: "custom",
      });
      const withWindow = { ...state, contextWindow: 512_000 };
      const switched = handleTuiInput("/switch nolo", withWindow);
      expect(switched.nextState.agentKey).toBe(DEFAULT_TUI_AGENT_KEY);
      expect(switched.nextState.contextWindow).toBe(
        resolveAgentContextWindow({ agentKey: DEFAULT_TUI_AGENT_KEY, agentName: "nolo" }),
      );
    } finally {
      if (prev === undefined) delete process.env.NOLO_AUTO_ROUTE;
      else process.env.NOLO_AUTO_ROUTE = prev;
    }
  });

  test("preserves an explicitly bound agent instead of default auto routing", () => {
    const state = createInitialTuiState({
      NOLO_AGENT: "agent-0e95801d90-luna",
      NOLO_AGENT_NAME: "GPT-5.6 Luna",
    });

    expect(state.agentKey).toBe("agent-0e95801d90-luna");
    expect(state.agentName).toBe("GPT-5.6 Luna");
    const result = handleTuiInput("继续处理当前代码", state);
    expect(result.action).toEqual({
      type: "chat",
      message: "继续处理当前代码",
      agentKey: "agent-0e95801d90-luna",
      runtimeMode: "auto",
    });
  });

  test("treats normal text as a chat action for the current agent", () => {
    const state = createInitialTuiState({
      NOLO_AGENT: "agent-pub-custom",
      NOLO_AGENT_NAME: "custom",
    });

    const result = handleTuiInput("帮我整理最近想法", state);

    expect(result.action).toEqual({
      type: "chat",
      message: "帮我整理最近想法",
      agentKey: "agent-pub-custom",
      runtimeMode: "auto",
    });
    expect(result.nextState).toEqual(state);
  });

  test("routes natural-language requests to the AI chat instead of CLI commands", () => {
    const state = createInitialTuiState({});

    expect(handleTuiInput("查最近 12 个对话", state).action).toMatchObject({
      type: "chat",
      message: "查最近 12 个对话",
    });
    expect(handleTuiInput("读取对话 01ARZ3NDEKTSV4RRFFQ69G5FAV", state).action).toMatchObject({
      type: "chat",
      message: "读取对话 01ARZ3NDEKTSV4RRFFQ69G5FAV",
    });
    expect(handleTuiInput("列出我的 agent", state).action).toMatchObject({
      type: "chat",
      message: "列出我的 agent",
    });
    expect(handleTuiInput("读取 agent frontend-implementer", state).action).toMatchObject({
      type: "chat",
      message: "读取 agent frontend-implementer",
    });
    expect(handleTuiInput("列出 space", state).action).toMatchObject({
      type: "chat",
      message: "列出 space",
    });
    expect(handleTuiInput("读取 space 01KKY77TT0DA9NY7TNW3R7255N", state).action).toMatchObject({
      type: "chat",
      message: "读取 space 01KKY77TT0DA9NY7TNW3R7255N",
    });
    expect(handleTuiInput("读取文档 page-user-1-notes", state).action).toMatchObject({
      type: "chat",
      message: "读取文档 page-user-1-notes",
    });
    expect(handleTuiInput("查询表 meta-user-1-01KWSK4Q4TESXQ06SW39JN2TTJ", state).action).toMatchObject({
      type: "chat",
      message: "查询表 meta-user-1-01KWSK4Q4TESXQ06SW39JN2TTJ",
    });
    expect(handleTuiInput("nolo 诊断一下", state).action).toMatchObject({
      type: "chat",
      message: "nolo 诊断一下",
    });
    expect(handleTuiInput("我当前登录的是谁", state).action).toMatchObject({
      type: "chat",
      message: "我当前登录的是谁",
    });
    expect(handleTuiInput("看下 nolo 版本", state).action).toMatchObject({
      type: "chat",
      message: "看下 nolo 版本",
    });
  });

  test("defaults display modes and supports /tools", () => {
    const state = createInitialTuiState({});
    // 450234264 display convergence removed the compact default; normal wins.
    // 单一显示模式后没有 toolDisplay 字段，/tools 只输出固定提示。

    // /tools 已随显示收敛停用：命令保留识别、不切状态，输出固定提示。
    const tools = handleTuiInput("/tools verbose", state);
    expect(tools.nextState).toBe(state);
    expect(tools.output).toBe(t("displayFixedHint"));
  });

  test("tracks runtime mode from env and sends it with chat actions", () => {
    const state = createInitialTuiState({
      NOLO_RUNTIME_MODE: "local",
      NOLO_AGENT: "frontend",
      NOLO_AGENT_NAME: "frontend",
    });

    const result = handleTuiInput("修一下通知面板", state);

    expect(state.runtimeMode).toBe("local");
    expect(result.action).toEqual({
      type: "chat",
      message: "修一下通知面板",
      agentKey: "frontend",
      runtimeMode: "local",
    });
    expect(renderContextPanel(state)).toContain("runtime  local");
  });

  test("/runtime switches between auto, local, and server modes", () => {
    const state = createInitialTuiState({});

    const local = handleTuiInput("/runtime local", state);
    expect(local.nextState.runtimeMode).toBe("local");
    expect(local.output).toContain("Runtime: local");

    const server = handleTuiInput("/runtime server", local.nextState);
    expect(server.nextState.runtimeMode).toBe("server");
    expect(server.output).toContain("Runtime: server");

    const invalid = handleTuiInput("/runtime offline", server.nextState);
    expect(invalid.nextState.runtimeMode).toBe("server");
    expect(invalid.output).toContain("Usage: /runtime <auto|local|server>");
  });

  test("continues the current dialog after the first turn records a dialog id", () => {
    const state = {
      ...createInitialTuiState({}),
      dialogId: "01KQHZ56KKMA7G2F755QXFA3QX",
      dialogLabel: "01KQHZ56KKMA7G2F755QXFA3QX",
    };

    const result = handleTuiInput("继续聊", state);

    expect(result.action).toEqual({
      type: "chat",
      message: "继续聊",
      agentKey: DEFAULT_TUI_AGENT_KEY,
      runtimeMode: "auto",
      continueDialogId: "01KQHZ56KKMA7G2F755QXFA3QX",
    });
    expect(renderStatusLine(state)).not.toContain("dialog ");
  });

  test("/clear clears the current dialog identity so the next turn does not continue it", () => {
    const state = {
      ...createInitialTuiState({}),
      dialogId: "01KQHZ56KKMA7G2F755QXFA3QX",
      dialogKey: "dialog-user-01KQHZ56KKMA7G2F755QXFA3QX",
      attachedDocs: ["notes"],
    };

    const result = handleTuiInput("/clear", state);

    expect(result.nextState.dialogId).toBeUndefined();
    expect(result.nextState.dialogKey).toBeUndefined();
    expect(result.nextState.attachedDocs).toEqual([]);
    expect(result.action).toEqual({
      type: "clear",
      dialogId: state.dialogId,
    });
    expect(result.output).toContain("Clearing");
  });

  test("/clear without a current dialog does not dispatch a deletion", () => {
    const result = handleTuiInput("/clear", createInitialTuiState({}));

    expect(result.action).toBeUndefined();
    expect(result.output).toContain("No current dialog");
  });

  test("/new clears the current dialog so the next turn starts fresh", () => {
    const state = {
      ...createInitialTuiState({}),
      dialogId: "01KQHZ56KKMA7G2F755QXFA3QX",
      dialogLabel: "01KQHZ56KKMA7G2F755QXFA3QX",
      attachedDocs: ["notes"],
    };

    const result = handleTuiInput("/new", state);

    expect(result.nextState.dialogId).toBeUndefined();
    expect(result.nextState.dialogLabel).toBe("new dialog");
    expect(result.nextState.attachedDocs).toEqual([]);
    expect(result.output).toContain("fresh dialog");
  });

  test("supports lightweight slash commands for switching agents and attaching docs", () => {
    const state = createInitialTuiState({});

    const agents = handleTuiInput("/agents", state);
    // 平台列表始终显示默认 agent 名 nolo（不再有合成的 auto 档位项）
    expect(agents.output).toContain("1  nolo");
    expect(agents.output).not.toContain("app-builder");

    const switched = handleTuiInput("/switch auto", state);
    // /switch auto 作为旧入口别名解析到默认 agent nolo（同 key）
    expect(switched.nextState.agentName).toBe("nolo");
    expect(switched.nextState.agentKey).toBe("agent-pub-01NOLOAPPBLD000000019KCKT0");
    expect(switched.output).toContain("Switched to nolo");
    expect(switched.output).toContain("Dialog kept");

    const attached = handleTuiInput("/doc attach product-plan", switched.nextState);
    expect(attached.nextState.attachedDocs).toEqual(["product-plan"]);
    expect(renderStatusLine(attached.nextState)).not.toContain("docs ");
  });

  test("/switch auto returns to the default agent (auto-route)", () => {
    const state = {
      ...createInitialTuiState({}),
      agentName: "Ollama Cloud",
      agentKey: "agent-0e95801d90-ollama-cloud",
    };

    const switched = handleTuiInput("/switch auto", state);

    expect(switched.nextState.agentKey).toBe(DEFAULT_TUI_AGENT_KEY);
    expect(switched.output).toContain("Switched to nolo");
    // 回到默认 key 后状态行显示默认 agent 名 nolo，而不是所选 agent 名
    expect(renderStatusLine(switched.nextState)).toContain("🏔 nolo");
    expect(renderStatusLine(switched.nextState)).not.toContain("Ollama Cloud");
  });

  test("renders compact status details with token usage", () => {
    const state = {
      ...createInitialTuiState({ NOLO_CLI_GIT_STATUS: "0" }),
      agentName: "app-builder",
      agentKey: "agent-pub-01APPBUILDER00000001YAII3I",
      turnTokens: {
        input: 12_400,
        output: 1_200,
        contextWindow: 512_000,
        remaining: 499_600,
      },
    };

    const status = renderStatusLine(state);

    expect(status).toContain("🏔");
    expect(status).toContain("app-builder");
    expect(status).toContain("context: 2.7% (13.6k/512k)");
    expect(status).not.toContain("dialog ");
    expect(status).not.toContain("docs ");
    expect(status).not.toContain("server:");
  });

  test("shows the default agent name on the status line while auto-route is on", () => {
    const state = createInitialTuiState({
      NOLO_CLI_GIT_STATUS: "0",
      NOLO_CLI_STATUS_MODE: "server",
    });

    const status = renderStatusLine(state);

    // 默认 agent（未显式选择）→ 显示默认 agent 名 nolo（不再显示 auto 档位标签）
    expect(status).toContain("🏔 nolo");
    expect(status).not.toContain("🏔 auto");
    // runtime mode 标签保留
    expect(status).toContain("server");
  });

  test("shows the default agent name without a duplicate runtime-mode label", () => {
    const state = createInitialTuiState({ NOLO_CLI_GIT_STATUS: "0" });
    const status = renderStatusLine(state);
    expect(status).toContain("🏔 nolo");
    expect(status).not.toContain("auto · auto");
  });

  test("hides the default runtime-mode auto label next to an explicitly selected model", () => {
    const state = createInitialTuiState({
      NOLO_CLI_GIT_STATUS: "0",
      NOLO_AGENT: "agent-pub-01GLM5000000000000000000000",
      NOLO_AGENT_NAME: "glm-5",
    });
    const status = renderStatusLine(state);
    // 显式选了模型 → 显示模型名；默认 runtime mode（auto）是噪声，不拼在后面
    expect(status).toContain("🏔 glm-5");
    expect(status).not.toContain(" · auto");
  });

  test("renders a workspace context panel with resources and next actions", () => {
    const state = {
      ...createInitialTuiState({
        NOLO_PROFILE: "default",
        NOLO_SERVER: "https://nolo.chat",
      }),
      dialogId: "01KQHZ56KKMA7G2F755QXFA3QX",
      dialogKey: "dialog-user-1-01KQHZ56KKMA7G2F755QXFA3QX",
      dialogLabel: "01KQHZ56KKMA7G2F755QXFA3QX",
      attachedDocs: ["product-plan", "pricing-rules"],
    };

    const result = handleTuiInput("/context", state);

    expect(result.nextState).toEqual(state);
    expect(result.output).toContain("Workspace context");
    expect(result.output).toContain("agent    nolo");
    expect(result.output).toContain(
      "dialog   dialog-user-1-01KQHZ56KKMA7G2F755QXFA3QX"
    );
    expect(result.output).toContain("docs     product-plan, pricing-rules");
    // Was "配置" — the panel's labels are localized now, so the English locale
    // this suite pins gets "profile" instead of a lone Chinese word.
    expect(result.output).toContain("profile  default");
    expect(result.output).toContain("tokens   in — out — left —");
    expect(result.output).toContain("server   https://nolo.chat");
    expect(result.output).toContain("/agents");
    expect(result.output).toContain("/doc attach");
    expect(result.output).toContain("/new");
  });

  test("removes /dialog instead of keeping a compatibility alias", () => {
    const state = createInitialTuiState({});
    const result = handleTuiInput("/dialog", state);

    expect(result.action).toBeUndefined();
    expect(result.output).toContain("Unknown command: /dialog");
    expect(renderTuiHelp()).not.toMatch(/^\s*\/dialog\b/m);
  });

  test("supports numeric switch targets from the built-in agent list", () => {
    const state = createInitialTuiState({});

    const result = handleTuiInput("/switch 1", state);

    expect(result.nextState.agentName).toBe("nolo");
    expect(result.output).toContain("Switched to nolo");
  });

  test("/switch without args opens the interactive picker action", () => {
    const result = handleTuiInput("/switch", createInitialTuiState({}));

    expect(result.action).toEqual({ type: "pick-agent" });
    expect(result.output).toBe("");
  });

  test("/switch list requests a text catalog action", () => {
    const result = handleTuiInput("/switch list", createInitialTuiState({}));

    expect(result.action).toEqual({ type: "list-agents" });
  });

  test("/switch <name> switches directly and keeps the dialog", () => {
    const state = {
      ...createInitialTuiState({}),
      dialogId: "01KQHZ56KKMA7G2F755QXFA3QX",
      dialogLabel: "01KQHZ56KKMA7G2F755QXFA3QX",
    };

    const result = handleTuiInput("/switch minimax-m3", state);

    expect(result.nextState.agentKey).toBe("agent-0e95801d90-minimax-m3");
    expect(result.nextState.runtimeMode).toBe("auto");
    expect(result.output).toContain("Dialog kept: 01KQHZ56KKMA7G2F755QXFA3QX");
  });

  test("renders help around the MVP command set", () => {
    const result = handleTuiInput("/help", createInitialTuiState({}));

    expect(result.output).toContain("/switch");
    expect(result.output).toContain("/switch list");
    expect(result.output).toContain("/agents");
    expect(result.output).toContain("/context");
    expect(result.output).toContain("/customize");
    expect(result.output).toContain("/doc attach <doc>");
    expect(result.output).toContain("/version");
    expect(result.output).toContain("/compact");
  });

  test("includes /update in the slash-command help", () => {
    expect(renderTuiHelp()).toContain("/update               Update the nolo CLI install");
  });

  test("returns a self-update action without mutating session state", () => {
    const state = {
      ...createInitialTuiState({ NOLO_PROFILE: "default" }),
      dialogId: "01KQHZ56KKMA7G2F755QXFA3QX",
      dialogLabel: "01KQHZ56KKMA7G2F755QXFA3QX",
      attachedDocs: ["notes"],
    };

    const result = handleTuiInput("/update", state);

    expect(result.nextState).toEqual(state);
    expect(result.output).toContain("Starting self-update");
    expect(result.action).toEqual({ type: "self-update" });
  });

  test("shows a built-in version and update hint inside the workspace", () => {
    const state = createInitialTuiState({ NOLO_CLI_VERSION: "0.1.3" });

    const result = handleTuiInput("/version", state);

    expect(renderWelcome(state)).toContain("nolo 0.1.3");
    expect(renderStatusLine(state)).not.toContain("version");
    expect(result.output).toContain("nolo 0.1.3");
    expect(result.output).toContain("nolo update");
  });

  test("keeps the welcome compact and command-oriented", () => {
    const state = createInitialTuiState({
      NOLO_CLI_VERSION: "0.1.3",
      NOLO_PROFILE: "default",
    });
    const welcome = renderWelcome(state);

    // 非空行 = scene 图案行数 + 1 版本/服务器行 + 1 提示行（/help 等）。
    // scene 图案（buildPlainScene / buildColoredScene）当前是 6 行：sky + 3 行
    // 山峰/NOLO 字 + 1 行海浪 + 1 行地面，合计 6 + 2 = 8。图案是仓库所有者
    // 保留的设计，若以后增删 scene 行，请同步更新这里的阈值（另一个测试
    // "renderWelcome scenes sky body, tree, and sea beside the mountain" 钉死了
    // scene 必须含这些元素，所以行数契约以 builder 实际输出为准，不能靠砍图案
    // 来满足阈值）。
    expect(welcome.split("\n").filter(Boolean).length).toBeLessThanOrEqual(8);
    expect(welcome).toContain("/help");
  });

  test("/compact advertises itself in help and emits a compact action", () => {
    const state = {
      ...createInitialTuiState({}),
      dialogId: "01OLD",
      dialogLabel: "01OLD",
    };

    const help = handleTuiInput("/help", state);
    expect(help.output).toContain("/compact");

    const result = handleTuiInput("/compact", state);
    expect(result.action).toEqual({
      type: "compact",
      dialogId: "01OLD",
    });
  });

  test("/compact returns no-op message when there is no current dialog", () => {
    const state = createInitialTuiState({});
    const result = handleTuiInput("/compact", state);
    expect(result.action).toBeUndefined();
    expect(result.output).toContain("nothing to compact");
  });

  test("/compact with extra text is rejected and does not compact", () => {
    const state = {
      ...createInitialTuiState({}),
      dialogId: "01OLD",
      dialogLabel: "01OLD",
    };
    const result = handleTuiInput("/compact anything", state);
    expect(result.action).toBeUndefined();
    expect(result.output).toContain("Unknown command");
    expect(result.output).not.toContain("Compacting");
  });

  test("/compact with trailing whitespace still triggers compact (trimmed)", () => {
    const state = {
      ...createInitialTuiState({}),
      dialogId: "01OLD",
      dialogLabel: "01OLD",
    };
    const result = handleTuiInput("  /compact  ", state);
    expect(result.action).toEqual({ type: "compact", dialogId: "01OLD" });
  });

  test("renderStatusLine displays the credits suffix once the session has spent platform credits", () => {
    const state = {
      ...createInitialTuiState({}),
      sessionCredits: 0.5,
      turnTokens: { input: 10_000, output: 2_000, credits: 0.1 },
    };
    const line = renderStatusLine(state);
    expect(line).toContain("⚡");
    // 显示的是会话累计，不是本轮（turnTokens.credits = 0.1）。
    expect(line).toContain("0.50 积分");
  });

  test("renderStatusLine hides the credits suffix when nothing platform-billed was accumulated", () => {
    // 自有 API：turnTokens.credits 是上游自报美元的 ×8 折算值，从不进会话累计
    // （sumPlatformCredits 只认 billing_unit === "credits"），所以不显示。
    const stateCustom = {
      ...createInitialTuiState({}),
      apiSource: "custom",
      turnTokens: { input: 10_000, output: 2_000, credits: 0.5 },
    };
    expect(renderStatusLine(stateCustom)).not.toContain("⚡");

    const stateNoCredits = {
      ...createInitialTuiState({}),
      apiSource: "platform",
      turnTokens: { input: 10_000, output: 2_000 },
    };
    expect(renderStatusLine(stateNoCredits)).not.toContain("⚡");
  });
});
