import type {
  GuidedAgentCapabilityId,
  GuidedAgentDraft,
  GuidedAgentReferenceChoice,
} from "./types";

export const GUIDED_AGENT_CREATION_ASSISTANT_SYSTEM_PROMPT = `你是 Nolo 的 AI 创建助手。

目标：通过对话理解用户想创建的 AI，先拆解能力资产，再输出结构化配置草稿。

核心原则：Agent = prompt + knowledge + tools + skills/workflows + eval 的可运行封装。
创建流程要帮助用户把专业经验拆到现有资产里。prompt 只负责角色、语气、规则和行为边界。

规则：
- 只生成草稿，不要创建真实 Agent 记录。
- 不要告诉用户你已经创建了 Agent。
- 优先询问用途、目标用户、风格、边界、能力、资料来源、公开状态。
- 拆解用户经验时，明确区分：
  - prompt：角色、语气、规则、禁忌和行为边界。
  - knowledge/references：资料来源、行业知识、空间文档、说明页。
  - tools：需要实际执行的动作。
  - skills/workflows：稳定流程、专家方法、操作步骤、可复用经验。
  - eval：成功样例、失败样例、验收问题、发布前检查。
- 默认用能力语言沟通，不要要求用户理解 tool id。
- 如果用户提到资料、知识库或当前空间，只推荐 references，必须等待用户确认后才选择。
- 如果用户提到稳定流程或专家方法，只放入 suggestedSkillIdeas / suggestedWorkflowIdeas；除非用户明确确认，不要创建 skill 文档。
- 如果用户提到验收、失败边界或真实案例，只生成 suggestedEvalCases；默认不要跑 live eval 或产生付费调用。
- 如果用户要创建“压缩图片 / 图片变小 / compress image / reduce image size”类 Agent，自动判断为 shell-backed 图片处理能力：
  - capabilityIds 包含 imageProcessing。
  - toolIds 包含 execShell。
  - prompt 要说明：用户上传图片后，使用 scripts/agent-tools/compressImage.ts 通过 execShell 压缩；运行时最近图片 URL 会写在工作区 nolo-latest-image-url.txt，可用 --input-url "$(cat nolo-latest-image-url.txt)"；没有图片时请求用户上传图片；不要编造文件链接。
  - assemblyNotes 用人话说明“这个 Agent 会用可执行脚本处理图片压缩。”，不要把 execShell、sharp 或 runtimeToolPolicy 当成普通用户要配置的选项。
  - suggestedEvalCases 至少包含上传大图返回更小可打开图片、没有图片时请求上传。
- 输出给系统的结构化草稿必须放在最后一个 JSON 代码块中。
- JSON 形状必须是 {"draft": {...}}。
- draft 字段包括 name, introduction, prompt, promptSummary, provider, model, isPublic, capabilityIds, toolIds, references, tags, unresolved。
- 可选非持久展示字段包括 assemblyNotes, suggestedSkillIdeas, suggestedWorkflowIdeas, suggestedEvalCases。它们只服务创建 UI 和下一步建议，不代表 Agent record 字段。
- 如果信息不足，把缺失项写进 unresolved，并继续追问。
`;

const extractJsonBlocks = (content: string): string[] => {
  const blocks: string[] = [];
  const pattern = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) != null) {
    blocks.push(match[1].trim());
  }
  return blocks;
};

export const parseGuidedAgentAssistantDraft = (
  content: string
): GuidedAgentDraft | null => {
  const blocks = extractJsonBlocks(content);
  const last = blocks[blocks.length - 1];
  if (!last) return null;

  try {
    const parsed = JSON.parse(last);
    const draft = parsed?.draft;
    if (!draft || typeof draft !== "object") return null;

    const sanitizeStringArray = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((x): x is string => typeof x === "string")
        : [];
    const sanitizeCapabilityIds = (value: unknown): GuidedAgentCapabilityId[] =>
      sanitizeStringArray(value).filter(
        (capability): capability is GuidedAgentCapabilityId =>
          capability === "webSearch" ||
          capability === "docs" ||
          capability === "tables" ||
          capability === "agents" ||
          capability === "apps" ||
          capability === "imageProcessing"
      );

    const rawRefs = Array.isArray(draft.references) ? draft.references : [];
    const sanitizedReferences: GuidedAgentReferenceChoice[] = rawRefs
      .filter((ref: unknown): ref is Record<string, unknown> =>
        ref !== null && typeof ref === "object"
      )
      .filter((r: Record<string, unknown>) => typeof r.dbKey === "string")
      .map((r: Record<string, unknown>) => {
        const choice: GuidedAgentReferenceChoice = {
          dbKey: String(r.dbKey),
          title: typeof r.title === "string" ? r.title : "",
          type: r.type === "instruction" ? "instruction" : "knowledge",
          selected: r.selected === true,
        };
        if (typeof r.reason === "string") {
          choice.reason = r.reason;
        }
        return choice;
      });

    return {
      name: String(draft.name || ""),
      introduction: String(draft.introduction || ""),
      prompt: String(draft.prompt || ""),
      promptSummary: String(draft.promptSummary || ""),
      provider: String(draft.provider || ""),
      model: String(draft.model || ""),
      isPublic: draft.isPublic === true,
      capabilityIds: sanitizeCapabilityIds(draft.capabilityIds),
      toolIds: sanitizeStringArray(draft.toolIds),
      references: sanitizedReferences,
      tags: sanitizeStringArray(draft.tags),
      unresolved: sanitizeStringArray(draft.unresolved),
      assemblyNotes: sanitizeStringArray(draft.assemblyNotes),
      suggestedSkillIdeas: sanitizeStringArray(draft.suggestedSkillIdeas),
      suggestedWorkflowIdeas: sanitizeStringArray(draft.suggestedWorkflowIdeas),
      suggestedEvalCases: sanitizeStringArray(draft.suggestedEvalCases),
    };
  } catch {
    return null;
  }
};
