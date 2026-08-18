import { describe, expect, it } from "bun:test";

let moduleVersion = 0;

const loadPromptBuilders = async () =>
  import(`./buildSystemPrompt`);

const loadReferenceRuntime = async () =>
  import(`ai/skills/referenceRuntime`);

describe("buildSystemPrompt", () => {
  it("keeps runtime orchestration policy in the code prompt layer", async () => {
    const skill = await Bun.file(".agents/skills/nolo-plan/SKILL.md").text();

    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["startAgentRun", "controlAgentRun", "listAgents"],
      } as any,
    });

    expect(skill).toContain("buildSystemPrompt.ts");
    expect(skill).toContain("本文件只保留注入层**没有**的 bun-nolo 项目特有规则");
    expect(skill).not.toContain("非平凡任务默认派发");
    expect(skill).not.toContain("默认并发使用多个 agent");
    expect(skill).not.toContain("上下文最小化");
    expect(skill).not.toContain("review 默认派中档低价模型");
    expect(skill).not.toContain("高端模型硬门");
    expect(prompt).toContain("分档标准");
    expect(prompt).toContain("不为「凑数量」派发");
    expect(prompt).toContain("按独立领域拆，不按文件数量拆");
    expect(prompt).toContain("上下文最小化");
    expect(prompt).toContain("顶档模型");
  });

  it("includes recent app working memory when provided", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["appList", "appRead", "appDeploy"],
      } as any,
      contexts: {
        appWorkingMemory:
          "这些信息来自当前对话里最近的 app 工具调用。\n- 最近一次关键 app 操作: appRead，appId=01APP123",
      },
    });

    expect(prompt).toContain("--- 最近应用工作记忆 ---");
    expect(prompt).toContain("最近一次关键 app 操作: appRead");
  });

  it("includes recalled memory overlay when provided", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["rememberMemory"],
      } as any,
      contexts: {
        memoryOverlay:
          "--- Memory Overlay ---\n[Semantic]\n- 用户长期偏好/事实：用户是网站创建者 nolotus",
      },
    });

    expect(prompt).toContain("--- Memory Overlay ---");
    expect(prompt).toContain("用户是网站创建者 nolotus");
  });

  it("includes proactive working summaries separately from passive dialog summaries", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
      } as any,
      contexts: {
        dialogSummary: "关键事实档案\n- 已压缩的旧上下文",
      },
    });

    expect(prompt).toContain("--- 历史对话摘要 ---");
    expect(prompt).toContain("已压缩的旧上下文");
  });

  it("exposes structured prompt layers without changing prompt content", async () => {
    const { buildSystemPrompt, buildSystemPromptContext } = await loadPromptBuilders();
    const options = {
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        name: "Nolo",
        tools: ["rememberMemory", "read"],
      } as any,
      contexts: {
        userGlobalPrompt: "偏好先给结论。",
        appWorkingMemory: "最近 app 是 app-123。",
      },
      now: new Date("2026-06-03T17:52:01.675Z"),
      timeZone: "Asia/Shanghai",
    };

    const prompt = buildSystemPrompt(options);
    const compiled = buildSystemPromptContext(options);
    const layers = compiled.layers as Array<{ id: string; charCount: number; content: string }>;

    expect(compiled.content).toBe(prompt);
    expect(layers.map((layer) => layer.id)).toContain("identity");
    expect(layers.map((layer) => layer.id)).toContain("memory-capture");
    expect(layers.map((layer) => layer.id)).toContain("user-global-prompt");
    expect(layers.map((layer) => layer.id)).toContain("app-working-memory");
    expect(layers.every((layer) => layer.charCount === layer.content.length)).toBe(true);
  });

  it("生产层序不得让 static/session 层掉出稳定前缀", async () => {
    const { buildSystemPromptContext } = await loadPromptBuilders();
    // 把尽可能多的层同时点亮：工具触发的指令段、用户全局偏好、space、
    // 参考资料、memory overlay、editing context、dialog summary 等。
    // 任何一个 static/session 层被排到 turn 层之后都会被 misorderedLayerIds 抓到。
    const compiled = buildSystemPromptContext({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        name: "Nolo",
        prompt: "你是测试助手。",
        tools: [
          "startAgentRun",
          "controlAgentRun",
          "listAgents",
          "ask_user",
          "fetchWebpage",
          "exa_search",
          "createDoc",
          "rememberMemory",
          "updateSelf",
          "updateAgent",
        ],
      } as any,
      contexts: {
        userGlobalPrompt: "偏好先给结论。",
        appWorkingMemory: "最近 app 是 app-123。",
        memoryOverlay: "用户偏好精简回复。",
        dialogSummary: "关键事实档案",
        botInstructionsContext: "规则文档",
        botKnowledgeContext: "知识文档",
        currentInputContext: "本轮输入引用",
        historyContext: "历史引用",
        editingContext: "正在编辑 README.md",
        spaceContext: "当前 Space：测试空间",
      },
      now: new Date("2026-06-03T17:52:01.675Z"),
      timeZone: "Asia/Shanghai",
    });

    // 稳定前缀非空（否则这条断言会因为整体降级而假通过）。
    expect(compiled.cacheProfile.stablePrefixLayerIds.length).toBeGreaterThan(5);
    expect(compiled.cacheProfile.misorderedLayerIds).toEqual([]);
  });

  it("puts full current time into a turn-scoped layer instead of the identity block", async () => {
    const { buildSystemPromptContext } = await loadPromptBuilders();
    const compiled = buildSystemPromptContext({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        name: "Nolo",
      } as any,
      now: new Date("2026-06-03T17:52:01.675Z"),
      timeZone: "Asia/Shanghai",
    });

    const identity = compiled.layers.find((layer: { id: string }) => layer.id === "identity");
    const currentTime = compiled.layers.find((layer: { id: string }) => layer.id === "current-time");

    expect(identity?.content).not.toContain("当前时间:");
    expect(currentTime?.cacheScope).toBe("turn");
    // Hour precision, not minute: the block sits in the dynamic suffix, so a
    // per-minute change would invalidate the downstream cache breakpoint on
    // nearly every turn. See toHourPrecision in currentTimeContext.ts.
    expect(currentTime?.content).toContain("当前本地时间: 2026-06-04 01:00");
    expect(currentTime?.content).not.toContain("01:52");
    expect(currentTime?.content).toContain("本地时区: Asia/Shanghai");
    expect(currentTime?.content).toContain("UTC 时间: 2026-06-03T17:00");
  });

  it("includes skill guidance when runtime skill hints exist", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["read"],
        recommendedSkillHints: ["web-research", "space-recall"],
        skillPromptPatches: ["优先先搜后读，避免直接打开重浏览器。"],
      } as any,
    });

    expect(prompt).toContain("--- 技能提示 ---");
    expect(prompt).toContain("web-research");
    expect(prompt).toContain("优先先搜后读");
  });

  it("includes docs discovery guidance in web access instructions", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["exa_search", "fetchWebpage", "browser_openSession"],
      } as any,
    });

    expect(prompt).not.toContain("你拥有访问互联网的强大能力");
    expect(prompt).toContain("陌生 docs 站");
    expect(prompt).toContain("不要直接猜子路径");
    expect(prompt).toContain("/llms.txt");
    expect(prompt).toContain("规范化 URL");
  });

  it("keeps menu interaction guidance separate from choice tool capability", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["ask_user"],
      } as any,
    });

    expect(prompt).toContain("--- 交互说明");
    expect(prompt).toContain("纯文本消息");
    expect(prompt).toContain("先在普通回复文本里写清背景、理由或权衡");
    expect(prompt).toContain("禁止把长段解释或权衡塞进 choices/detail");
    expect(prompt).not.toContain("当你希望用户在几个互斥选项之间做选择时");
  });

  it("keeps web access guidance without repeating X post tool routing", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["read_x_post", "fetchWebpage"],
      } as any,
    });

    expect(prompt).toContain("--- 网页访问能力");
    expect(prompt).toContain("用户已给明确 URL");
    expect(prompt).not.toContain("X/Twitter status 链接");
    expect(prompt).not.toContain("read_x_post");
  });

  it("includes web access guidance when only read_x_post is available", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["read_x_post"],
      } as any,
    });

    expect(prompt).toContain("--- 网页访问能力");
    expect(prompt).not.toContain("read_x_post");
  });

  it("no longer injects table share guidance into system prompt", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["createTable", "shareTable", "addTableRow"],
      } as any,
    });

    expect(prompt).not.toContain("--- 表格创建与分享 ---");
    expect(prompt).not.toContain("社区分享");
  });

  it("keeps agent orchestration routing guidance without repeated tool capability lines", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["startAgentRun", "runStreamingAgent"],
      } as any,
    });

    expect(prompt).toContain("--- Agent 编排与协作 ---");
    // 本段只保留通道路由 / 工作流 / 不可逆操作；派发时机与选人纪律分别在
    // 「多 Agent 协作」和「多 Agent 编排（后台 Run）」段，避免三处重复。
    expect(prompt).toContain("自动路由");
    expect(prompt).toContain("serverBase");
    expect(prompt).toContain("wait:false");
    expect(prompt).toContain("wait:true");
    expect(prompt).toContain("不限于代码任务");
    expect(prompt).toContain("游戏设计、电影策划、写作、运营、研究");
    expect(prompt).not.toContain("使用 callAgent");
    expect(prompt).not.toContain("使用 runStreamingAgent 工具");
  });

  it("injects background-run orchestration discipline when startAgentRun/controlAgentRun are available", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["startAgentRun", "controlAgentRun", "listAgents"],
      } as any,
    });

    expect(prompt).toContain("--- 多 Agent 编排（后台 Run） ---");
    // 盯梢纪律：同步优先 / 等终态 / 省 token 的状态检查 / 异常才拉日志
    expect(prompt).toContain("异步派发后立即收尾，等终态通知");
    expect(prompt).toContain("tailLines:0");
    expect(prompt).toContain("tailLines:30");
    expect(prompt).toContain("stop 之前先看日志");
    // 分档与拆分纪律（协作段）
    expect(prompt).toContain("分档标准");
    expect(prompt).toContain("逻辑步骤 <5 且只读/搜/改 ≤2 个文件");
    expect(prompt).toContain("跨 3 个以上独立领域");
    expect(prompt).toContain("不为「凑数量」派发");
    expect(prompt).toContain("按独立领域拆，不按文件数量拆");
    expect(prompt).toContain("用户明确要求你亲自完成时按用户要求执行");
    expect(prompt).toContain("所有已验证通道都不可用");
    expect(prompt).toContain("上下文最小化");
    expect(prompt).toContain("只传完成该子任务所需的最小工作集");
    expect(prompt).not.toContain("不可拆只说明它是**一个**子任务");
    expect(prompt).not.toContain("自写的例外**仅限三种");
    // 三档判断与「默认不派发」曾是两段互相矛盾的表述，合并后只保留分档口径。
    expect(prompt).not.toContain("默认不派发、不并发");
    expect(prompt).toContain("isFavorite");
    expect(prompt).toContain("顶档模型");
    expect(prompt).toContain("review 证据硬门");
    expect(prompt).toContain("messagesCount=0");
    expect(prompt).toContain("可读性/可搜索性");
    expect(prompt).toContain("review context contract");
    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toContain("docs/product-positioning.md");
    expect(prompt).toContain("深 review 达标线");
    expect(prompt).toContain("用户点名不受此限");
    expect(prompt).toContain("已有失败证据后的升级");
    expect(prompt).toContain("只认 listAgents 返回的记录");
    expect(prompt).toContain("tools 字段只反映额外能力，不反映 coding 能力");
    expect(prompt).toContain("tools=[]");
    expect(prompt).toContain("原样复制 listAgents / readAgent 返回的字段");
  });

  it("keeps background-run orchestration discipline out when no orchestration tools exist", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["read", "exa_search"],
      } as any,
    });

    expect(prompt).not.toContain("--- 多 Agent 编排（后台 Run） ---");
    expect(prompt).not.toContain("等终态通知");
  });

  it("keeps prompt-update guidance out of doc knowledge guidance", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["read", "createDoc", "updateDoc"],
      } as any,
    });

    expect(prompt).toContain("--- 知识管理 ---");
    expect(prompt).not.toContain("你拥有 read / createDoc / updateDoc 能力");
    // 断言语义要点而非逐字文案，避免措辞微调导致误报
    expect(prompt).toContain("references");
    expect(prompt).toContain("createDoc");
    expect(prompt).toContain("mention 是指针");
    expect(prompt).toContain("read({ dbKey })");
    expect(prompt).toContain("可复用信息");
    expect(prompt).toContain("updateAgent 加入 references");
    expect(prompt).toContain("updateDoc 补 @mention");
    expect(prompt).not.toContain("直接写进 prompt");
  });

  it("keeps prompt-update guidance out of doc knowledge guidance", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["read", "createDoc", "updateDoc"],
      } as any,
    });

    expect(prompt).toContain("--- 知识管理 ---");
    expect(prompt).toContain("references");
    expect(prompt).toContain("createDoc");
    expect(prompt).toContain("mention 是指针");
    expect(prompt).toContain("read({ dbKey })");
    expect(prompt).toContain("可复用信息");
    expect(prompt).toContain("updateAgent 加入 references");
    expect(prompt).toContain("updateDoc 补 @mention");
    expect(prompt).not.toContain("直接写进 prompt");
  });

  it("includes safe email registration workflow guidance when browser and email tools are available", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: [
          "browser_openSession",
          "browser_closeSession",
          "browser_probePage",
          "browser_typeText",
          "browser_click",
          "browser_readContent",
          "email_provision_identity",
          "email_wait_for",
          "email_extract_verification",
        ],
      } as any,
    });

    expect(prompt).toContain("--- 邮箱验证码注册流程 ---");
    expect(prompt).toContain("用户明确指定");
    expect(prompt).toContain("不要持久化密码");
    expect(prompt).toContain("CAPTCHA");
  });

  it("treats user-provided urls as authoritative when web and code tools are present", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["fetchWebpage", "readFile", "applyEdit"],
      } as any,
    });

    // 核心语义：用户给的 URL 优先直抓、不先搜索、降级要说明原因
    expect(prompt).toContain("先直接 fetch 这些 URL");
    expect(prompt).toContain("不要先搜索或猜备用网址");
    expect(prompt).toContain("最高优先级的网页真值");
    expect(prompt).toContain("说明降级原因");
  });

  it("shares skill guidance prompt assembly with runtime helpers", async () => {
    const { buildSkillGuidancePromptBlock } = await loadReferenceRuntime();
    const block = buildSkillGuidancePromptBlock({
      title: "--- 技能提示 ---",
      recommendedSkillHints: ["web-research", "web-research", "space-recall"],
      skillPromptPatches: ["优先先搜后读。", "优先先搜后读。"],
    });

    expect(block).toContain("--- 技能提示 ---");
    expect(block).toContain("web-research、space-recall");
    expect(block.match(/优先先搜后读。/g)?.length).toBe(1);
  });

  it("does not treat explicit remember requests as self-evolution triggers", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["updateSelf"],
      } as any,
    });

    expect(prompt).toContain("Agent 自我更新能力");
    expect(prompt).not.toContain("你拥有 updateSelf 权限，可以修改自己的配置");
    expect(prompt).not.toContain('用户说"记住"');
    expect(prompt).not.toContain("[未更新，原因：xxx]");
    expect(prompt).not.toContain("[已更新知识]");
  });

  it("includes generic agent maintenance guidance when updateAgent is available", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["updateAgent"],
      } as any,
    });

    expect(prompt).toContain("Agent 维护能力");
    expect(prompt).toContain("更新指定的 Agent");
    expect(prompt).toContain("高风险维护操作");
  });

  it("guides orchestrator agents to hand off visual page requests to the page builder", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["runStreamingAgent"],
      } as any,
    });

    expect(prompt).toContain("--- 页面生成助手 handoff");
    expect(prompt).toContain("agent-pub-01PAGEBUILDR00000000FT7R9G");
    expect(prompt).toContain("信息展示");
    expect(prompt).toContain("数据分析");
    expect(prompt).toContain("决策比较");
    expect(prompt).toContain("不要把普通问答");
  });

  it("includes quiet memory capture guidance when rememberMemory is available", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["rememberMemory"],
      } as any,
    });

    expect(prompt).toContain("--- 长期记忆 ---");
    expect(prompt).toContain("默认静默执行");
    expect(prompt).toContain("不要复制整段对话");
    // §9.4 分层决策：scope 按内容性质选，不固定优先某一层
    expect(prompt).toContain("scope 按内容性质选，不固定优先某一层");
    expect(prompt).toContain("与当前 Agent 挂钩的有效做法");
    // 放宽保守门槛：从"帮助不明显就不要调用"改为"拿不准时优先记"，
    // 避免模型几乎总能找到"不明显"理由而从不调用 rememberMemory。
    expect(prompt).toContain("拿不准是否值得记时，优先记");
    expect(prompt).not.toContain("帮助不明显就不要调用");
    expect(prompt).not.toContain("仅当当前 dialog 已绑定 space 且属于共享共识时才传 scope=space");
  });

  it("includes startup protocol guidance for policy mission and recent memory", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["checkEnv", "execShell", "rememberMemory"],
      } as any,
    });

    expect(prompt).toContain("--- 启动协议 ---");
    expect(prompt).toContain("1. 先读取 policy / knowledge");
    expect(prompt).toContain("2. 再提炼 current mission");
    expect(prompt).toContain("3. 再吸收 recent memory");
    expect(prompt).toContain("checkEnv({ check: 'context' })");
  });


  it("no longer injects agent creation draft guidance into system prompt", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["prepareAgentDraft"],
      } as any,
    });

    expect(prompt).not.toContain("--- Agent 创建草稿流程 ---");
    expect(prompt).not.toContain("prepareAgentDraft");
  });

  it("includes context layer contract when memory and doc tooling are available", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["rememberMemory", "read", "createDoc", "updateDoc"],
      } as any,
    });

    expect(prompt).toContain("--- 知识存储约定 ---");
    expect(prompt).toContain("1. memory layer");
    expect(prompt).toContain("2. knowledge layer");
    expect(prompt).toContain("3. doc layer");
    expect(prompt).toContain("mission / runbook / incident / checkpoint");
  });

  it("includes natural memory use guidance when memory overlay contains identity memories", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["rememberMemory"],
      } as any,
      contexts: {
        memoryOverlay:
          "--- Memory Overlay ---\n[Semantic]\n- 用户长期偏好/事实：用户是 nolotus，也是网站创建者",
      },
    });

    expect(prompt).toContain("--- 记忆使用方式 ---");
    // 记忆使用的五条核心语义：优先级、自然体现、KV 路径定位、当前输入覆盖、推断型限制
    expect(prompt).toContain("记忆是个性化增强层");
    expect(prompt).toContain("开场称呼、上下文确认、回答结构、取舍标准");
    expect(prompt).toContain("不要每句机械称呼用户");
    expect(prompt).toContain("KV 路径和时间线定位");
    expect(prompt).toContain("不要只按语义相似度捞一条");
    expect(prompt).toContain("不要把旧记忆当更高真值");
    expect(prompt).toContain("推断型记忆（inferred）只用于把握语气、状态和未完成事项");
    expect(prompt).toContain("不要说成“你明确告诉过我”");
  });

  it("includes memory use guidance as session-scope when agent has memory tools", async () => {
    const { buildSystemPromptContext } = await loadPromptBuilders();
    const compiled = buildSystemPromptContext({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["rememberMemory"],
      } as any,
    });

    // Guidance is now session-scope and injected when memory tools exist,
    // even without memory overlay content. This keeps it in the stable
    // prefix so the 92-token fixed text doesn't cause cache miss every turn.
    const guidanceLayer = compiled.layers.find((l) => l.id === "memory-use-guidance");
    expect(guidanceLayer?.cacheScope).toBe("session");
    expect(guidanceLayer?.content).toContain("--- 记忆使用方式 ---");
  });

  it("does not include memory use guidance when agent has no memory tools", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const prompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: ["readFile", "writeFile"],
      } as any,
    });

    expect(prompt).not.toContain("--- 记忆使用方式 ---");
  });
});
