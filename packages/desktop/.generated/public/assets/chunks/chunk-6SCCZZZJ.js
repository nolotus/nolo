import {
  AgentPickerControl,
  useAgentPickerCandidates
} from "/public/assets/chunks/chunk-JUT5AJQ2.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  QUICK_CHAT_DEFAULT_TIER_AGENTS,
  runLlm,
  setSettings
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_APP_BUILDER_AGENT_KEY,
  BUILTIN_FEEDBACK_AGENT_KEY
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/QuickChatModeSelector.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var QuickChatModeSelector = ({
  mode: _mode,
  onModeChange: _onModeChange,
  surface = "default"
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const autoAgentId = useAppSelector(
    (state) => state.settings?.quickChatAutoAgentId
  ) || "";
  const { candidates } = useAgentPickerCandidates({
    activeAgentId: autoAgentId || null,
    limit: 30
  });
  const handleSelect = (0, import_react.useCallback)(
    (agentKey) => {
      dispatch(setSettings({ quickChatAutoAgentId: agentKey }));
    },
    [dispatch]
  );
  const pickerProps = (0, import_react.useMemo)(
    () => ({
      candidates,
      activeAgentKey: autoAgentId || null,
      onSelect: handleSelect,
      defaultOption: {
        label: t("quickChat.mode.auto", "\u81EA\u52A8"),
        description: t("quickChat.autoAgent.default", "\u9ED8\u8BA4")
      },
      hint: t("quickChat.autoAgent.label", "\u81EA\u52A8\u6A21\u5F0F Agent"),
      placeholderLabel: t("quickChat.mode.auto", "\u81EA\u52A8"),
      ariaLabel: autoAgentId ? void 0 : `${t("quickChat.mode.triggerLabel", "\u9009\u62E9\u5BF9\u8BDD\u6A21\u5F0F")}\uFF1A${t("quickChat.mode.auto", "\u81EA\u52A8")}`,
      className: "quick-chat-agent-picker"
    }),
    [autoAgentId, candidates, handleSelect, t]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: "quick-chat-mode-selector",
      "data-surface": surface,
      "data-mode": "auto",
      "data-auto-agent": autoAgentId ? "true" : void 0,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentPickerControl, { ...pickerProps })
    }
  );
};
var QuickChatModeSelector_default = QuickChatModeSelector;

// packages/app/pages/quickChatFlow.ts
var import_react2 = __toESM(require_react());

// packages/agent-runtime/quickChatIntentCore.ts
var INTENT_MODEL = "deepseek-v4-flash";
var INTENT_PROVIDER = "nolo";
var QUICK_CHAT_INTENT_TIMEOUT_MS = 4e3;
var SHORT_GREETING_MAX_LENGTH = 20;
var SHORT_GREETING_PATTERN = /^(?:hi|hello|hey|hiya|yo|sup|howdy|嗨|哈喽|哈囉|你好|您好|在吗|在嘛|喂|早上好|中午好|下午好|晚上好|拜拜|再见|谢谢|thanks|thx|ok|好的|收到|了解)[!.。，、~～]?$/iu;
var VALID_QUICK_CHAT_SKILLS = /* @__PURE__ */ new Set([
  "table",
  "doc",
  "code",
  "pagebuilder"
]);
function isShortGreeting(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > SHORT_GREETING_MAX_LENGTH) return false;
  return SHORT_GREETING_PATTERN.test(trimmed);
}
var COMPLEXITY_SIMPLE_MAX_LENGTH = 80;
var COMPLEXITY_MEDIUM_MAX_LENGTH = 500;
var COMPLEXITY_KEYWORDS = /为什么|如何|分析|对比|比较|设计|架构|实现|原理|推导|评价|区别|关系|影响|优化|重构/;
var COMPLEXITY_CODE_BLOCK = /```[\s\S]*```/;
function estimateComplexity(text) {
  const trimmed = text.trim();
  const len = trimmed.length;
  if (len > COMPLEXITY_MEDIUM_MAX_LENGTH) return "complex";
  if (COMPLEXITY_CODE_BLOCK.test(trimmed)) return "complex";
  if (len > COMPLEXITY_SIMPLE_MAX_LENGTH) return "medium";
  if (COMPLEXITY_KEYWORDS.test(trimmed)) return "medium";
  return "simple";
}
var TIER_DESCRIPTIONS = {
  flash: "\u5FEB\u901F\u7B80\u5355\uFF1A\u95EE\u5019\u3001\u95F2\u804A\u3001\u5FEB\u901F\u95EE\u7B54\u3001\u7FFB\u8BD1\u3001\u77ED\u6587",
  balanced: "\u5E73\u8861\u63A8\u7406\uFF1A\u5206\u6790\u3001\u4E2D\u7B49\u957F\u5EA6\u5199\u4F5C\u3001\u4EE3\u7801\u3001\u63A8\u7406\uFF08\u5F53\u524D\u8DEF\u7531\u81F3 DeepSeek V4 Flash\uFF09",
  quality: "\u9AD8\u8D28\u91CF\u6DF1\u5EA6\uFF1A\u590D\u6742\u63A8\u7406\u3001\u957F\u6587\u3001\u67B6\u6784\u8BBE\u8BA1\u3001\u6DF1\u5EA6\u5206\u6790\uFF08\u5F53\u524D\u8DEF\u7531\u81F3 DeepSeek V4 Flash\uFF09"
};
function buildQuickChatIntentSystemPrompt(tierAgents) {
  const agentList = tierAgents.map((t) => `  - "${t.agentKey}"\uFF1A${t.description}`).join("\n");
  return `\u4F60\u662F\u4E00\u4E2A\u610F\u56FE\u8DEF\u7531\u5668\u3002\u6839\u636E\u7528\u6237\u6D88\u606F\uFF0C\u5224\u65AD\u5E94\u8BE5\u4EA4\u7ED9\u54EA\u4E2A agent \u5904\u7406\u3002

\u53EF\u9009 agent \u5217\u8868\uFF08agentKey \u4E0E\u63CF\u8FF0\uFF09\uFF1A
${agentList}

\u5224\u65AD\u539F\u5219\uFF08\u9ED8\u8BA4\u504F\u5411\u901A\u7528\u6863\u4F4D\uFF1B\u4E13\u804C agent \u5728\u660E\u786E\u5339\u914D\u65F6\u4F7F\u7528\uFF1B**\u7F16\u7801/\u672C\u5730\u4ED3\u5E93\u4EFB\u52A1\u8D70\u901A\u7528\u6863 balanced/quality**\uFF09\uFF1A
- \u9ED8\u8BA4\u60C5\u51B5\u4E0B\uFF0C**\u9664\u975E\u7528\u6237\u660E\u786E\u8868\u8FBE\u8981\u5EFA\u5E94\u7528/\u5EFA Agent/\u63D0\u4EA4\u53CD\u9988/\u591A Agent \u7F16\u6392**\uFF0C\u5426\u5219\u9009\u901A\u7528\u6863\u4F4D\uFF08flash/balanced/quality\uFF09\uFF1A
  - \u7B80\u5355\u95EE\u5019\u3001\u95F2\u804A\u3001\u5FEB\u901F\u95EE\u7B54\u3001\u7FFB\u8BD1\u3001\u77ED\u6587 \u2192 \u9009 flash \u6863
  - \u9700\u8981\u63A8\u7406\u3001\u5206\u6790\u3001\u4E2D\u7B49\u957F\u5EA6\u5199\u4F5C\u3001\u666E\u901A\u4EE3\u7801\u89E3\u91CA/\u67B6\u6784\u95EE\u7B54 \u2192 \u9009 balanced \u6863
  - \u590D\u6742\u63A8\u7406\u3001\u957F\u6587\u3001\u67B6\u6784\u8BBE\u8BA1\u3001\u6DF1\u5EA6\u5206\u6790 \u2192 \u9009 quality \u6863
  - **\u660E\u786E\u7F16\u7801\u4EFB\u52A1\uFF08\u5B9E\u73B0\u529F\u80FD\u3001\u4FEE bug\u3001refactor\u3001\u5199/\u8865\u6D4B\u8BD5\u3001\u8DD1 build/tests/ci\uFF09\u6216\u67E5\u770B\u672C\u673A\u4ED3\u5E93/\u4EE3\u7801\u72B6\u6001\uFF08git/\u5206\u652F/commit/\u672C\u5730\u4E0E\u8FDC\u7A0B\u5DEE\u8DDD/\u672A\u63D0\u4EA4\u6539\u52A8\u7B49\uFF09** \u2192 \u9009 balanced \u6216 quality \u6863\uFF08\u6309\u590D\u6742\u5EA6\uFF1B**\u4E0D\u8981\u9009 flash**\uFF09
- \u4E13\u804C agent \u8DEF\u7531\u89C4\u5219\uFF08\u6709\u660E\u786E\u5339\u914D\u65F6\u4F7F\u7528\uFF09\uFF1A
  - \u8981\u63D0\u4EA4/\u8BB0\u5F55 bug\u3001\u4F53\u9A8C\u95EE\u9898\u3001\u6570\u636E\u5F02\u5E38\u3001\u4EA7\u54C1\u5EFA\u8BAE\uFF0C\u6216\u53E3\u8BED\u5982\u300C\u60F3\u53CD\u9988\u4E00\u4E9B\u95EE\u9898\u300D\u300C\u53CD\u9988\u4E00\u4E0B\u300D\u2192 \u9009\u610F\u89C1\u53CD\u9988\u4E13\u804C agent
  - \u8981\u65B0\u5EFA\u6216\u5B9A\u5236 AI/Agent/\u667A\u80FD\u4F53\u52A9\u624B\uFF08\u542B\u914D\u7F6E\u5DE5\u5177\u3001\u77E5\u8BC6\u3001\u786E\u8BA4\u521B\u5EFA\uFF09\u2192 \u9009\u521B\u5EFA Agent \u4E13\u804C agent
  - \u8981\u505A/\u6539/\u53D1\u5E03\u7F51\u7AD9\u3001\u7F51\u9875\u3001\u5C0F\u5E94\u7528\u3001\u9884\u7EA6\u9875\u3001\u535A\u5BA2\u3001\u770B\u677F \u2192 \u9009\u5E94\u7528\u6784\u5EFA\u4E13\u804C agent
  - \u8981\u6D3E\u591A\u4E2A agent\u3001\u591A agent \u5E76\u884C\u3001\u62C6\u6210\u4EFB\u52A1\u540E\u53F0\u6267\u884C\u3001\u591A\u4E2A agent review\u3001\u8BA9\u4E0D\u540C agent \u8BA8\u8BBA/\u4F1A\u5546 \u2192 \u9009\u591A Agent \u7F16\u6392\u4E13\u804C agent\uFF08\u663E\u5F0F multi-agent \u4F18\u5148\uFF09
- **\u62FF\u4E0D\u51C6\u65F6**\uFF1A\u7EAF\u95F2\u804A\u9009 flash\uFF1B**\u82E5\u6CBE\u8FB9\u672C\u5730\u4ED3\u5E93/\u5F53\u524D\u4EE3\u7801\u72B6\u6001\uFF0C\u9009 balanced/quality**\u3002

\u5728\u7ED9\u51FA agentKey \u4E4B\u524D\uFF0C\u5148\u5728\u5FC3\u91CC\u533A\u5206\u5019\u9009\u6863\u4F4D\u7684\u8FB9\u754C\u518D\u7ED9\u7F6E\u4FE1\u5EA6\uFF1Abalanced \u4E0E quality \u7684\u8FB9\u754C\u5728\u4E8E\u590D\u6742\u5EA6/\u7BC7\u5E45/\u662F\u5426\u9700\u8981\u6DF1\u5EA6\u5206\u6790\uFF0C\u62FF\u4E0D\u51C6\u5C31\u7ED9\u4F4E confidence\u3002

\u540C\u65F6\u5224\u65AD\u672C\u8F6E\u6D88\u606F\u662F\u5426\u9700\u8981\u6302\u8F7D\u5BF9\u8C61\u64CD\u4F5C\u6280\u80FD\uFF08skills \u6570\u7EC4\uFF0C\u672A\u547D\u4E2D\u7ED9 []\uFF09\uFF1A
- \u7528\u6237\u8981\u65B0\u5EFA/\u6574\u7406/\u5F55\u5165/\u6279\u91CF\u5904\u7406\u8868\u683C\u6570\u636E\uFF08\u5EFA\u8868\u3001\u52A0\u884C\u3001\u6539\u5217\u3001\u6309\u6761\u4EF6\u6574\u7406\u6570\u636E\uFF09\u2192 skills \u542B "table"
- \u7528\u6237\u8981\u5199/\u6DA6\u8272/\u6539\u5199/\u7EED\u5199/\u6392\u7248\u4E00\u7BC7\u6587\u6863\u6216\u6587\u7AE0 \u2192 skills \u542B "doc"
- \u7528\u6237\u8981\u5199/\u6539/\u5B9E\u73B0/\u4FEE bug/refactor/\u8865\u6D4B\u8BD5/\u5BA1\u67E5\u5E76\u4FEE\u6539\u4EE3\u7801 \u2192 skills \u542B "code"\uFF08\u4EC5\u95EE\u901A\u7528\u77E5\u8BC6\u3001\u7EAF\u95F2\u804A\u3001\u53EA\u67E5\u770B git/\u4ED3\u5E93\u72B6\u6001\u800C\u4E0D\u4FEE\u6539\u4EE3\u7801\u65F6\u4E0D\u6302 "code"\uFF09
- \u7528\u6237\u60F3\u8981\u4E00\u4E2A\u53EF\u4EA4\u4E92\u7684\u53EF\u89C6\u5316\u9875\u9762/\u62A5\u544A/\u770B\u677F/\u4E3B\u9875/\u6559\u7A0B/\u5BF9\u6BD4\u9875/\u8BA1\u5212\u9875\uFF08\u5982"\u505A\u4E2A\u65E5\u62A5""\u505A\u4E00\u4E2A\u4E2A\u4EBA\u4E3B\u9875""\u505A\u4E2A\u9500\u552E\u770B\u677F""\u505A\u4E2A\u65B9\u6848\u5BF9\u6BD4\u9875""\u505A\u4E2A\u5B66\u4E60\u8BA1\u5212\u9875"\uFF09\u2192 skills \u542B "pagebuilder"
- \u666E\u901A\u95EE\u7B54/\u7EAF\u95F2\u804A/\u5EFA\u5E94\u7528 \u2192 skills \u4E3A []

\u53EA\u8F93\u51FA JSON\uFF0C\u4E0D\u8981\u8F93\u51FA\u5176\u4ED6\u5185\u5BB9\uFF1A
{"confidence": <0\u52301\u4E4B\u95F4\u7684\u5C0F\u6570\uFF0C\u8868\u793A\u4F60\u5BF9\u8FD9\u4E2A\u5206\u7C7B\u5224\u65AD\u7684\u628A\u63E1\u7A0B\u5EA6>, "agentKey": "<\u4ECE\u5217\u8868\u4E2D\u9009\u62E9\u7684 agentKey>", "skills": <\u5B57\u7B26\u4E32\u6570\u7EC4\uFF0C\u5143\u7D20\u53EA\u80FD\u662F ${[...VALID_QUICK_CHAT_SKILLS].map((s) => `"${s}"`).join(" | ")}\uFF0C\u672A\u547D\u4E2D\u7ED9 []>}`;
}
function parseQuickChatIntentResult(content, tierAgents) {
  try {
    const parsed = JSON.parse(content.trim());
    if (typeof parsed !== "object" || parsed === null || !("agentKey" in parsed)) return null;
    const key = parsed.agentKey;
    if (typeof key !== "string") return null;
    if (!tierAgents.some((t) => t.agentKey === key)) return null;
    const rawConfidence = parsed.confidence;
    const confidence = typeof rawConfidence === "number" && Number.isFinite(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 1 ? rawConfidence : void 0;
    const rawSkills = parsed.skills;
    let skills;
    if (Array.isArray(rawSkills)) {
      const filtered = [...new Set(rawSkills)].filter(
        (s) => typeof s === "string" && VALID_QUICK_CHAT_SKILLS.has(s)
      );
      if (filtered.length > 0) skills = filtered;
    }
    return { agentKey: key, confidence, skills };
  } catch {
    return null;
  }
}

// packages/ai/agent/quickChatIntentClassifier.ts
var QUICK_CHAT_DEBUG = false;
var QUICK_CHAT_INTENT_LLM_CONFIG = {
  apiSource: "platform",
  useServerProxy: true,
  provider: INTENT_PROVIDER,
  model: INTENT_MODEL
};
async function classifyQuickChatIntent(text, tierAgents, dispatch, resolveFallbackAgentKey, options = {}) {
  const fallback = () => resolveFallbackAgentKey();
  const timeoutMs = options.timeoutMs ?? QUICK_CHAT_INTENT_TIMEOUT_MS;
  if (!text.trim()) {
    return { agentKey: fallback(), classified: false };
  }
  if (isShortGreeting(text)) {
    const flashAgent = tierAgents.find((t) => t.tier === "flash");
    if (flashAgent) {
      QUICK_CHAT_DEBUG && console.log("[QuickChatIntent] short greeting \u2192 flash (skip LLM)");
      return { agentKey: flashAgent.agentKey, classified: true };
    }
  }
  const systemPrompt = buildQuickChatIntentSystemPrompt(tierAgents);
  const llmConfig = {
    ...QUICK_CHAT_INTENT_LLM_CONFIG,
    prompt: systemPrompt
  };
  try {
    const dispatched = dispatch(
      runLlm({
        llmConfig,
        content: text,
        isStreaming: false
      })
    );
    const llmPromise = typeof dispatched?.unwrap === "function" ? dispatched.unwrap() : typeof dispatched === "string" ? Promise.resolve(dispatched) : Promise.resolve("");
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(
          new Error(
            `[QuickChatIntent] classifier LLM timeout after ${timeoutMs}ms`
          )
        ),
        timeoutMs
      );
    });
    let content;
    try {
      content = await Promise.race([llmPromise, timeoutPromise]);
    } finally {
      if (timeoutHandle !== void 0) clearTimeout(timeoutHandle);
    }
    QUICK_CHAT_DEBUG && console.log("[QuickChatIntent] LLM content:", content);
    if (!content.trim()) {
      return { agentKey: fallback(), classified: false };
    }
    const parsed = parseQuickChatIntentResult(content, tierAgents);
    if (!parsed) {
      return { agentKey: fallback(), classified: false };
    }
    QUICK_CHAT_DEBUG && console.log("[QuickChatIntent] parsed:", parsed);
    return {
      agentKey: parsed.agentKey,
      classified: true,
      confidence: parsed.confidence,
      skills: parsed.skills
    };
  } catch (err) {
    QUICK_CHAT_DEBUG && console.log("[QuickChatIntent] error:", toErrorMessage(err));
    return { agentKey: fallback(), classified: false };
  }
}

// packages/app/pages/quickChatFlow.ts
var QUICK_CHAT_GENERAL_TIER_AGENT_KEYS = /* @__PURE__ */ new Set([
  QUICK_CHAT_DEFAULT_TIER_AGENTS.flash,
  QUICK_CHAT_DEFAULT_TIER_AGENTS.balanced,
  QUICK_CHAT_DEFAULT_TIER_AGENTS.quality
]);
var QUICK_CHAT_LAUNCH_SPECIALISTS = {
  feedback: {
    agentKey: BUILTIN_FEEDBACK_AGENT_KEY,
    promptKey: "quickChat.chipFeedbackAgentPrompt",
    promptFallback: "\u6211\u8981\u53CD\u9988"
  }
};
var resolveQuickChatLaunchSpecialist = (slug) => {
  const key = asTrimmedString(slug);
  if (!key) return null;
  return QUICK_CHAT_LAUNCH_SPECIALISTS[key] ?? null;
};
var QUICK_CHAT_DEBUG2 = false;
var QUICK_CHAT_PERF_PREFIX = "[QuickChatPerf]";
var QUICK_CHAT_IMAGE_ONLY_PROMPT = "\u8BF7\u63CF\u8FF0\u8FD9\u5F20\u56FE\u7247\u3002";
var buildQuickChatFirstMessageText = (text, hasImages) => {
  const trimmedText = text.trim();
  return trimmedText || (hasImages ? QUICK_CHAT_IMAGE_ONLY_PROMPT : "");
};
var buildQuickChatExtraParts = (pendingFiles) => pendingFiles.map((pendingFile) => {
  if (pendingFile.type === "ocr_text" && pendingFile.ocrText) {
    return {
      type: "text",
      text: pendingFile.ocrText
    };
  }
  return {
    type: pendingFile.type,
    name: pendingFile.name,
    pageKey: pendingFile.pageKey,
    dialogKey: pendingFile.dialogKey
  };
});
var buildQuickChatRouteState = (text) => {
  const trimmedText = text.trim();
  return {
    isNew: true,
    quickChatFirstMessage: trimmedText ? {
      text: trimmedText
    } : void 0
  };
};
var formatQuickChatDialogTitle = (agentName, date = /* @__PURE__ */ new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${agentName || "Agent"}  ${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
var createQuickChatPerfEvent = (stage, startedAt, now, atMs, details = {}) => ({
  stage,
  elapsedMs: now - startedAt,
  ...typeof atMs === "number" ? { atMs } : {},
  ...details
});
var getQuickChatPerfNow = () => typeof performance !== "undefined" ? performance.now() : Date.now();
var logQuickChatPerf = (stage, startedAt, details = {}) => {
  if (!QUICK_CHAT_DEBUG2) return;
  const now = getQuickChatPerfNow();
  console.info(
    QUICK_CHAT_PERF_PREFIX,
    createQuickChatPerfEvent(
      stage,
      startedAt,
      now,
      typeof performance !== "undefined" ? now : void 0,
      details
    )
  );
};
function normalizeQuickChatMode(value) {
  if (value && typeof value === "object") {
    const mode = value.mode;
    if (mode === "auto") {
      return { mode: "auto" };
    }
    if (mode === "custom" || mode === "code" || mode === "research") {
      return { mode: "auto" };
    }
  }
  return { mode: "auto" };
}
function resolveQuickChatPlaceholderKind(mode, isEmptyState) {
  if (isEmptyState) return "empty";
  return "auto";
}
var QUICK_CHAT_PLACEHOLDER_META = {
  empty: {
    key: "quickChat.emptyPlaceholder",
    defaultValue: "\u76F4\u63A5\u8BF4\u4F60\u7684\u76EE\u6807\uFF0C\u6BD4\u5982\u300C\u5E2E\u6211\u6574\u7406\u4E00\u4E0B\u601D\u8DEF\u300D"
  },
  auto: {
    key: "quickChat.placeholderAuto",
    defaultValue: "\u8F93\u5165\u6D88\u606F\uFF0C\u81EA\u52A8\u5339\u914D\u6700\u4F18\u6A21\u578B"
  }
};
function resolveQuickChatPlaceholderMeta(mode, isEmptyState) {
  return QUICK_CHAT_PLACEHOLDER_META[resolveQuickChatPlaceholderKind(mode, isEmptyState)];
}
var QUICK_CHAT_SPECIALIST_ROUTE_OPTIONS = [
  {
    tier: "feedback",
    agentKey: BUILTIN_FEEDBACK_AGENT_KEY,
    description: "\u610F\u89C1\u53CD\u9988\uFF1A\u62A5 bug\u3001\u5D29\u6E83\u3001\u5361\u987F\u3001\u6570\u636E\u4E0D\u5BF9\u3001\u4F53\u9A8C\u95EE\u9898\u3001\u529F\u80FD\u5EFA\u8BAE\u3001\u8981\u8BB0\u5F55\u53CD\u9988"
  },
  {
    tier: "agentCreator",
    agentKey: BUILTIN_AGENT_CREATOR_AGENT_KEY,
    description: "\u521B\u5EFA Agent\uFF1A\u65B0\u5EFA/\u5B9A\u5236 AI \u52A9\u624B\u3001\u914D\u7F6E\u5DE5\u5177\u4E0E\u77E5\u8BC6\u3001\u751F\u6210\u8349\u7A3F\u5E76\u786E\u8BA4\u521B\u5EFA"
  },
  {
    tier: "appBuilder",
    agentKey: BUILTIN_APP_BUILDER_AGENT_KEY,
    description: "\u5E94\u7528\u6784\u5EFA\uFF1A\u505A\u7F51\u7AD9/\u5C0F\u5E94\u7528\u3001\u6539\u73B0\u6709\u5E94\u7528\u3001\u90E8\u7F72\u53D1\u5E03\u3001\u9884\u7EA6\u9875/\u535A\u5BA2/\u770B\u677F"
  }
];
var CODE_WORKSPACE_STATUS_PATTERN = /当前代码|代码什么状态|代码.{0,6}状态|仓库状态|项目状态|工作区状态|git\s*状态|git\s*status|\bgit\s+(?:status|log|diff|branch)\b|分支.{0,8}状态|未提交|有没有改动|改了什么|本地.{0,16}远程|远程.{0,16}本地|和远程|与远程|领先|落后|ahead|behind|origin\/|工作区|代码库|代码仓库|(?:看|查|查看|看一下|查一下).{0,10}(?:仓库|项目|git|分支|commit)|(?:仓库|项目|git|分支).{0,10}(?:状态|情况|差距)|\buncommitted\b|\bworking\s+tree\b|\brepo\s+status\b|\bcodebase\s+status\b/iu;
function detectCodeWorkspaceStatusIntent(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^(?:解释|讲解|说明).{0,8}(?:一下)?(?:这段|这个|下列|如下)?代码/.test(trimmed) || /\bexplain\s+(?:this|the|following)\s+code\b/i.test(trimmed)) {
    return false;
  }
  return CODE_WORKSPACE_STATUS_PATTERN.test(trimmed);
}
var CODE_TASK_INTENT_PATTERN = /(?:实现|开发|加).{0,12}?(?:功能|特性|feature)|修(?:一下|复)?(?:这个|该)?\s*(?:bug|BUG|缺陷)|修复bug|改(?:一下)?代码|修改代码|重构|写(?:一下)?(?:单元)?测试|补(?:一下)?测试|跑(?:一下)?(?:测试|构建|build|ci)|先(?:调查|检索|搜索|查看).{0,24}?(?:再|然后).{0,12}?(?:实现|开发|修复|重构)|(?:fix|implement|refactor).{0,16}?(?:bug|feature|code)?|\bwrite\s+tests?\b|\brun\s+(?:the\s+)?(?:tests?|build|ci)\b|\bverify\s+(?:the\s+)?(?:tests?|build|ci)\b|\binvestigate\b.{0,40}?\b(?:then\s+)?(?:implement|fix|refactor)\b/iu;
function detectCodeTaskIntent(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return CODE_TASK_INTENT_PATTERN.test(trimmed);
}
var QUICK_CHAT_SPECIALIST_REGEX = [
  {
    pattern: /意见反馈|反馈一下|我要反馈|想反馈|反馈一些|反馈问题|有些问题|遇到问题|提交反馈|报个bug|报bug|程序崩溃|一直崩溃|闪退|白屏|数据不对|数据缺失|体验很差|功能建议/iu,
    agentKey: BUILTIN_FEEDBACK_AGENT_KEY
  },
  {
    pattern: /创建.{0,16}?(?:AI|Agent|智能体|助手)|定制.{0,16}?(?:AI|Agent|智能体|助手)|帮我做(?:一个)?(?:AI|Agent|智能体|助手)|新建(?:AI|Agent|智能体)/iu,
    agentKey: BUILTIN_AGENT_CREATOR_AGENT_KEY
  },
  {
    pattern: /(?:做|建|搭).{0,24}?(?:网站|网页|小应用|落地页|预约|博客)|应用构建|部署(?:一下)?应用|改(?:一下)?(?:我的)?应用|首页改|发布(?:一下)?网站/iu,
    agentKey: BUILTIN_APP_BUILDER_AGENT_KEY
  }
];
function matchQuickChatSpecialistByRegex(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const { pattern, agentKey } of QUICK_CHAT_SPECIALIST_REGEX) {
    if (pattern.test(trimmed)) return agentKey;
  }
  return null;
}
var PAGEBUILDER_INTENT_REGEX = /(?:做|生成|帮我做|来一个|来个|搞个).{0,20}?(?:看板|dashboard|日报|周报|报表|报告|主页|个人主页|落地页|对比页|方案对比|竞品分析|计划页|学习计划|教程页|操作指南|onboarding|入职指南|SOP|仪表盘|可视化|交互页面|可交互)/iu;
function detectPageBuilderIntentByRegex(text) {
  return PAGEBUILDER_INTENT_REGEX.test(text.trim());
}
function buildQuickChatRouteOptions(resolveTierAgent) {
  const tierAgents = ["flash", "balanced", "quality"].map((tier) => ({
    tier,
    agentKey: resolveTierAgent(tier),
    description: TIER_DESCRIPTIONS[tier]
  }));
  return [...tierAgents, ...QUICK_CHAT_SPECIALIST_ROUTE_OPTIONS];
}
async function resolveQuickChatAgentKey({
  hasImages,
  text,
  resolveTierAgent,
  dispatch,
  mode = "auto"
}) {
  if (hasImages) return { agentKey: resolveTierAgent("image") };
  QUICK_CHAT_DEBUG2 && console.log("[QuickChatRoute] resolveQuickChatAgentKey", { hasImages, text: text.slice(0, 80), mode });
  const codeIntent = detectCodeTaskIntent(text) || detectCodeWorkspaceStatusIntent(text);
  if (!codeIntent) {
    const specialistEarly = matchQuickChatSpecialistByRegex(text);
    if (specialistEarly) {
      QUICK_CHAT_DEBUG2 && console.log("[QuickChatRoute] early specialist:", specialistEarly);
      return { agentKey: specialistEarly };
    }
  }
  const routeOptions = buildQuickChatRouteOptions(resolveTierAgent);
  const result = await classifyQuickChatIntent(
    text,
    routeOptions,
    dispatch,
    () => resolveQuickChatAgentKeyByRegex(text, resolveTierAgent)
  );
  QUICK_CHAT_DEBUG2 && console.log("[QuickChatRoute] classifier result:", result);
  let agentKey = result.agentKey;
  if (codeIntent && agentKey === resolveTierAgent("flash")) {
    agentKey = resolveTierAgent("balanced");
  }
  let skills = result.skills;
  if (!skills && !result.classified && detectPageBuilderIntentByRegex(text)) {
    skills = ["pagebuilder"];
  }
  return { agentKey, skills };
}
function resolveQuickChatAgentKeyByRegex(text, resolveTierAgent) {
  const codeIntent = detectCodeTaskIntent(text) || detectCodeWorkspaceStatusIntent(text);
  if (!codeIntent) {
    const specialist = matchQuickChatSpecialistByRegex(text);
    if (specialist) return specialist;
  }
  switch (estimateComplexity(text)) {
    case "complex":
      return resolveTierAgent("quality");
    case "medium":
      return resolveTierAgent("balanced");
    case "simple":
    default:
      return resolveTierAgent(codeIntent ? "balanced" : "flash");
  }
}
var QUICK_CHAT_MODE_STORAGE_KEY = "quickChatMode";
function readStoredQuickChatMode(storage = typeof sessionStorage !== "undefined" ? sessionStorage : null) {
  if (!storage) return { mode: "auto" };
  try {
    const stored = storage.getItem(QUICK_CHAT_MODE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const normalized = normalizeQuickChatMode(parsed);
      if (parsed && typeof parsed === "object" && parsed.mode === "custom") {
        persistQuickChatMode(normalized, storage);
      }
      return normalized;
    }
  } catch {
  }
  return { mode: "auto" };
}
function persistQuickChatMode(mode, storage = typeof sessionStorage !== "undefined" ? sessionStorage : null) {
  if (!storage) return;
  try {
    storage.setItem(QUICK_CHAT_MODE_STORAGE_KEY, JSON.stringify(mode));
  } catch {
  }
}
function useQuickChatMode() {
  const [mode, setMode] = (0, import_react2.useState)(() => readStoredQuickChatMode());
  const handleChange = (0, import_react2.useCallback)((nextMode) => {
    setMode(nextMode);
    persistQuickChatMode(nextMode);
  }, []);
  return [mode, handleChange];
}

export {
  QuickChatModeSelector_default,
  QUICK_CHAT_GENERAL_TIER_AGENT_KEYS,
  resolveQuickChatLaunchSpecialist,
  buildQuickChatFirstMessageText,
  buildQuickChatExtraParts,
  buildQuickChatRouteState,
  formatQuickChatDialogTitle,
  getQuickChatPerfNow,
  logQuickChatPerf,
  resolveQuickChatPlaceholderMeta,
  resolveQuickChatAgentKey,
  useQuickChatMode
};
