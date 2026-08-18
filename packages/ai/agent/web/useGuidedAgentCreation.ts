import React from "react";
import {
  buildAgentFormDataFromGuidedDraft,
  mergeGuidedAgentDraft,
  validateGuidedAgentDraft,
} from "ai/agent/guidedCreation/draft";
import { DEFAULT_MODEL } from "ai/llm/providers";
import type {
  GuidedAgentAssistantMessage,
  GuidedAgentCapabilityId,
  GuidedAgentDraft,
} from "ai/agent/guidedCreation/types";
import { mapCapabilityIdsToToolIds } from "ai/agent/guidedCreation/capabilities";
import { compactWhitespace } from "core/compactWhitespace";

const EMPTY_DRAFT: GuidedAgentDraft = {
  name: "",
  introduction: "",
  prompt: "",
  promptSummary: "",
  provider: DEFAULT_MODEL.provider,
  model: DEFAULT_MODEL.name,
  isPublic: false,
  capabilityIds: [],
  toolIds: [],
  references: [],
  tags: [],
  unresolved: ["用途", "回答风格", "能力"],
  assemblyNotes: [],
  suggestedSkillIdeas: [],
  suggestedWorkflowIdeas: [],
  suggestedEvalCases: [],
};

const QUESTIONS = [
  "你想让这个 AI 主要帮你完成什么？",
  "它主要服务谁？",
  "它需要哪些能力：联网搜索、读写文档、处理表格、调用其他 AI、创建应用或代码？",
  "有哪些资料、边界或禁区需要它遵守？",
  "这个 AI 是只给自己用，还是公开给别人使用？",
];

const textIncludes = (text: string, words: string[]) =>
  words.some((word) => text.includes(word));

const isImageCompressionGoal = (text: string) =>
  textIncludes(text.toLowerCase(), [
    "压缩图片",
    "图片压缩",
    "图片变小",
    "压小",
    "compress image",
    "image compression",
    "reduce image size",
  ]);

const inferCapabilityIds = (text: string): GuidedAgentCapabilityId[] => {
  const lower = text.toLowerCase();
  const ids: GuidedAgentCapabilityId[] = [];
  if (textIncludes(lower, ["搜索", "联网", "网页", "资料", "最新", "research", "search"])) {
    ids.push("webSearch");
  }
  if (textIncludes(lower, ["文档", "知识库", "页面", "资料", "doc", "docs", "knowledge"])) {
    ids.push("docs");
  }
  if (textIncludes(lower, ["表格", "数据", "记录", "table", "sheet", "csv"])) {
    ids.push("tables");
  }
  if (textIncludes(lower, ["多 agent", "多agent", "评审", "协作", "agent"])) {
    ids.push("agents");
  }
  if (textIncludes(lower, ["应用", "代码", "app", "code", "开发", "生成页面"])) {
    ids.push("apps");
  }
  if (isImageCompressionGoal(text)) {
    ids.push("imageProcessing");
  }
  return Array.from(new Set(ids));
};

const inferName = (text: string) => {
  const cleaned = compactWhitespace(
    text
      .replace(/[。！？!?,，；;：:]/g, " ")
      .replace(/\bAI\b/gi, "")
      .replace(/帮我创建|创建一个|创建|面向/g, ""),
  );
  if (!cleaned) return "";
  const purpose = cleaned.slice(0, 18);
  return `${purpose.replace(/\s+/g, "")}助手`;
};

const inferVisibility = (text: string): boolean | null => {
  const lower = text.toLowerCase();
  if (
    textIncludes(lower, [
      "自己用",
      "自用",
      "仅自己",
      "只给自己",
      "私有",
      "private",
      "内部用",
      "内部使用",
    ])
  ) {
    return false;
  }
  if (textIncludes(lower, ["公开", "分享", "public", "给别人", "发布"])) {
    return true;
  }
  return null;
};

const buildPrompt = (messages: GuidedAgentAssistantMessage[], draft: GuidedAgentDraft) => {
  const userNeeds = messages
    .flatMap((message) =>
      message.role === "user" ? [`- ${message.content}`] : [],
    )
    .join("\n");
  const imageCompressionBlock = draft.capabilityIds.includes("imageProcessing")
    ? [
        "",
        "图片压缩能力：",
        "- 如果用户上传了图片，使用 execShell 调用 scripts/agent-tools/compressImage.ts 压缩图片。",
        "- 运行时最近图片 URL 会写在工作区 nolo-latest-image-url.txt；优先用 --input-url \"$(cat nolo-latest-image-url.txt)\"。",
        "- 优先处理当前对话最近一张图片；没有图片时，请用户上传图片。",
        "- 压缩完成后，回复压缩前后大小、压缩比例和压缩后图片链接。",
        "- 不要编造文件链接；没有工具结果时说明需要重新上传或重试。",
      ].join("\n")
    : "";
  return [
    `你是${draft.name || "用户的专属 AI"}。`,
    "你需要先理解用户目标，再给出可执行、清晰、有边界的帮助。",
    "根据以下需求工作：",
    userNeeds || "- 尚未补充具体需求",
    "如果信息不足，先提出必要澄清问题；不要编造用户没有确认的资料来源。",
    imageCompressionBlock,
  ].join("\n");
};

const buildNextQuestion = (draft: GuidedAgentDraft) => {
  if (!draft.name || !draft.prompt) return QUESTIONS[1];
  if (draft.capabilityIds.length === 0) return QUESTIONS[2];
  if (!draft.introduction) return QUESTIONS[3];
  if (draft.unresolved.includes("公开状态")) return QUESTIONS[4];
  return "配置草稿已经可创建。你还想补充哪些资料或使用边界？";
};

const createAssistantDraft = (
  messages: GuidedAgentAssistantMessage[],
  current: GuidedAgentDraft
) => {
  const userText = messages
    .flatMap((message) => (message.role === "user" ? [message.content] : []))
    .join("\n");
  const capabilityIds = Array.from(
    new Set([...current.capabilityIds, ...inferCapabilityIds(userText)])
  );
  const name = current.name || inferName(userText);
  const inferredVisibility = inferVisibility(userText);
  const isPublic = inferredVisibility ?? current.isPublic;
  const unresolved = [
    !name ? "name" : "",
    !userText.trim() ? "prompt" : "",
    capabilityIds.length === 0 ? "能力" : "",
    current.introduction || userText.length > 24 ? "" : "introduction",
    inferredVisibility !== null ? "" : "公开状态",
  ].filter(Boolean);
  const next: GuidedAgentDraft = mergeGuidedAgentDraft(current, {
    name,
    introduction:
      current.introduction ||
      (userText.trim()
        ? `面向你的需求，帮助整理、判断并执行：${userText.trim().slice(0, 70)}`
        : ""),
    promptSummary: userText.trim()
      ? `围绕“${userText.trim().slice(0, 46)}”提供结构化帮助，必要时先追问。`
      : "",
    capabilityIds,
    toolIds: mapCapabilityIdsToToolIds(capabilityIds),
    isPublic,
    tags: Array.from(new Set([...current.tags, ...capabilityIds])),
    unresolved,
    assemblyNotes: isImageCompressionGoal(userText)
      ? Array.from(new Set([
          ...(current.assemblyNotes ?? []),
          "这个 Agent 会用可执行脚本处理图片压缩。",
        ]))
      : current.assemblyNotes,
    suggestedEvalCases: isImageCompressionGoal(userText)
      ? Array.from(new Set([
          ...(current.suggestedEvalCases ?? []),
          "上传一张大图，应返回更小且可打开的图片。",
          "没有图片时，应要求用户上传图片，而不是编造文件链接。",
        ]))
      : current.suggestedEvalCases,
  });
  return mergeGuidedAgentDraft(next, {
    prompt: buildPrompt(messages, next),
  });
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useGuidedAgentCreation = (initialDraft?: Partial<GuidedAgentDraft> | null) => {
  const [draft, setDraft] = React.useState<GuidedAgentDraft>(() =>
    initialDraft ? mergeGuidedAgentDraft(EMPTY_DRAFT, initialDraft) : EMPTY_DRAFT
  );
  const [messages, setMessages] = React.useState<GuidedAgentAssistantMessage[]>([
    {
      id: "assistant-initial",
      role: "assistant",
      content: initialDraft?.name
        ? "我已经带入了当前对话整理出的草稿。你可以继续补充要求，或直接预览并创建。"
        : QUESTIONS[0],
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(async () => {
    const content = input.trim();
    if (!content || isThinking) return;

    setInput("");
    setError(null);
    setIsThinking(true);

    const userMessage: GuidedAgentAssistantMessage = {
      id: createId(),
      role: "user",
      content,
    };

    try {
      const nextMessages = [...messages, userMessage];
      const nextDraft = createAssistantDraft(nextMessages, draft);
      const assistantMessage: GuidedAgentAssistantMessage = {
        id: createId(),
        role: "assistant",
        content: buildNextQuestion(nextDraft),
      };
      setMessages([...nextMessages, assistantMessage]);
      setDraft(nextDraft);
    } catch {
      setError("暂时没能整理这段需求，请换一种说法再试。");
    } finally {
      setIsThinking(false);
    }
  }, [draft, input, isThinking, messages]);

  const toggleReference = React.useCallback((dbKey: string, selected: boolean) => {
    setDraft((current) =>
      mergeGuidedAgentDraft(current, {
        references: current.references.map((reference) =>
          reference.dbKey === dbKey ? { ...reference, selected } : reference
        ),
      })
    );
  }, []);

  const validation = validateGuidedAgentDraft(draft);
  const formInitialValues = React.useMemo(
    () => buildAgentFormDataFromGuidedDraft(draft),
    [draft]
  );

  return {
    draft,
    messages,
    input,
    setInput,
    submit,
    isThinking,
    error,
    validation,
    formInitialValues,
    toggleReference,
  };
};
