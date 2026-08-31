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
    expect(prompt).toContain("先在普通回复文本里写清背景、理由与权衡再调用工具");
    expect(prompt).toContain("选项只承载适度信息：label 为短句、detail 至多一句话补充");
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

    expect(prompt).toContain("--- Agent 编排与协作");
    expect(prompt).toContain("按需派发 → 审查");
    // 通道路由要点并入协作段头部。
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
    // 分档与拆分纪律（协作段）——2026-08-31 起为两账判据（上下文账 / 并行账），步数门槛已废弃
    expect(prompt).toContain("分档标准");
    expect(prompt).toContain("两账判据");
    expect(prompt).toContain("上下文账命中 → 派发");
    expect(prompt).toContain("并行账命中 → 派发");
    expect(prompt).toContain("不为「凑数量」派发");
    expect(prompt).toContain("按独立领域拆，不按文件数量拆");
    expect(prompt).toContain("用户明确要求你亲自完成时按用户要求执行");
    expect(prompt).toContain("所有已验证派发通道均不可用");
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
    expect(prompt).toContain("原样复制其字段");
    expect(prompt).toContain("tools 字段只反映额外能力，不反映 coding 能力");
    expect(prompt).toContain("tools=[]");
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

  it("guides orchestrator agents with multi-agent deliberation and divergent guidance", async () => {
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

    expect(prompt).toContain("--- Agent 编排与协作");
    expect(prompt).toContain("发散模式（Divergent Mode）");
    expect(prompt).toContain("会商模式（Deliberation Mode）");
    expect(prompt).toContain("共识");
    expect(prompt).toContain("保留分歧");
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
    expect(prompt).toContain("拿不准是否值得记时，优先记");
    expect(prompt).toContain("禁止自行推理填补");
    expect(prompt).toContain("降权/归档覆盖");
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
    expect(prompt).toContain("先读 policy / knowledge");
    expect(prompt).toContain("提炼 current mission");
    expect(prompt).toContain("吸收 recent memory");
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
  it("generates compact TUI/mobile guidelines when viewport is narrow", async () => {
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
      viewport: { width: 375, height: 667 },
    });

    expect(prompt).toContain("--- 响应展示指南（窄屏 / TUI / 移动端） ---");
    expect(prompt).toContain("表格降级");
    expect(prompt).toContain("严禁使用 ≥4 列的大宽表");
    expect(prompt).toContain("缩进 2 空格");
    expect(prompt).not.toContain("表格与对比");
    expect(prompt).not.toContain("全景结构");
  });

  it("generates wide desktop guidelines when viewport is broad or default", async () => {
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
      viewport: { width: 1440, height: 900 },
    });

    expect(prompt).toContain("--- 响应展示指南（宽屏 / 桌面端） ---");
    expect(prompt).toContain("表格与对比");
    expect(prompt).toContain("全景结构");
    expect(prompt).not.toContain("严禁使用 ≥4 列的大宽表");
    expect(prompt).not.toContain("表格降级");
  });

  it("defaults to desktop guidelines when viewport is omitted in non-browser env", async () => {
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
    });

    expect(prompt).toContain("--- 响应展示指南（宽屏 / 桌面端） ---");
    expect(prompt).not.toContain("--- 响应展示指南（窄屏 / TUI / 移动端） ---");
  });

  it("triggers narrow-screen guidelines from contexts.viewport and contexts.isMobile", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();
    const baseAgentConfig = {
      userId: "user-1",
      provider: "openai",
      model: "gpt-4o-mini",
      useServerProxy: true,
      isPublic: false,
      updatedAt: new Date().toISOString(),
      createdAt: Date.now(),
    } as any;

    // contexts.viewport 窄屏 → 窄屏指南
    const viaViewport = buildSystemPrompt({
      agentConfig: baseAgentConfig,
      contexts: { viewport: { width: 320, height: 568 } },
    });
    expect(viaViewport).toContain("--- 响应展示指南（窄屏 / TUI / 移动端） ---");
    expect(viaViewport).toContain("表格降级");
    expect(viaViewport).not.toContain("--- 响应展示指南（宽屏 / 桌面端） ---");

    // contexts.isMobile=true → 窄屏指南
    const viaIsMobile = buildSystemPrompt({
      agentConfig: baseAgentConfig,
      contexts: { isMobile: true },
    });
    expect(viaIsMobile).toContain("--- 响应展示指南（窄屏 / TUI / 移动端） ---");
    expect(viaIsMobile).toContain("表格降级");
    expect(viaIsMobile).not.toContain("--- 响应展示指南（宽屏 / 桌面端） ---");

    // contexts.isMobile=false → 宽屏指南
    const viaIsMobileFalse = buildSystemPrompt({
      agentConfig: baseAgentConfig,
      contexts: { isMobile: false },
    });
    expect(viaIsMobileFalse).toContain("--- 响应展示指南（宽屏 / 桌面端） ---");
    expect(viaIsMobileFalse).not.toContain("--- 响应展示指南（窄屏 / TUI / 移动端） ---");

    // options.viewport 优先于 contexts.viewport
    const optionsOverride = buildSystemPrompt({
      agentConfig: baseAgentConfig,
      viewport: { width: 1440, height: 900 },
      contexts: { viewport: { width: 320, height: 568 } },
    });
    expect(optionsOverride).toContain("--- 响应展示指南（宽屏 / 桌面端） ---");
    expect(optionsOverride).not.toContain("--- 响应展示指南（窄屏 / TUI / 移动端） ---");
  });

  it("unlocks clarification mode when ask_user is available even with a custom prompt", async () => {
    const { buildSystemPrompt } = await loadPromptBuilders();

    // 无自定义 prompt → 澄清模式注入（既有基线）
    const noMainPrompt = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        tools: [],
      } as any,
    });
    expect(noMainPrompt).toContain("通过提问来澄清需求，而不是仓促给出答案");

    // 有自定义 prompt 但无 ask_user → 澄清模式被自定义 prompt 门控（维持旧行为）
    const mainPromptNoAsk = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        prompt: "你是测试助手。",
        tools: [],
      } as any,
    });
    expect(mainPromptNoAsk).not.toContain("通过提问来澄清需求，而不是仓促给出答案");

    // 有自定义 prompt 且有 ask_user → 澄清模式不再被门控（hasAskTool=true 路径）
    const mainPromptWithAsk = buildSystemPrompt({
      agentConfig: {
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o-mini",
        useServerProxy: true,
        isPublic: false,
        updatedAt: new Date().toISOString(),
        createdAt: Date.now(),
        prompt: "你是测试助手。",
        tools: ["ask_user"],
      } as any,
    });
    expect(mainPromptWithAsk).toContain("通过提问来澄清需求，而不是仓促给出答案");
    expect(mainPromptWithAsk).toContain("你是测试助手。");
  });

  it("enforces phase separation: user testing first and final review only when preparing to commit", async () => {
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

    // 1. 明确区分实现/测试阶段与准备提交阶段
    expect(prompt).toContain("阶段划分与独立审查");
    expect(prompt).toContain("严格区分「实现/构建/安装/用户测试/根据反馈迭代」与「准备提交/合并」阶段");

    // 2. UI/前端及需验收功能在实现阶段先交付可测试产物，不得触发或等待最终 review
    expect(prompt).toContain("不得触发或等待最终独立 review");
    expect(prompt).toContain("等待用户测试与反馈");

    // 3. 最终 review 只在用户明确确认准备提交时派发，通过后才提交
    expect(prompt).toContain("只有当用户明确确认准备提交/合并时，才派发最终 review");
    expect(prompt).toContain("用户确认准备提交 → startAgentRun(ephemeral:true) 派 reviewer");
    expect(prompt).toContain("无 review 不 commit");

    // 4. 保留安全关键审查与只读审计能力，但不阻塞用户测试
    expect(prompt).toContain("安全关键变更的必要审查不受影响");
    expect(prompt).toContain("独立的只读审计或用户明确要求的提前 review 可提前进行，但不得阻塞用户测试");

    // 5. 保留 review 证据硬门
    expect(prompt).toContain("review 证据硬门");
    expect(prompt).toContain("仅当 reviewer 返回可读的最终文本且明确含 APPROVE、无 CRITICAL/HIGH 才算通过");

    // 6. 验证旧的“改完即 review / 自动循环阻塞测试”表述不再存在
    expect(prompt).not.toContain("自动循环：改完 →");
    expect(prompt).not.toContain("改完 → startAgentRun(ephemeral:true) 派 reviewer 审 diff");
  });
});
