// packages/agent-runtime/toolArgumentGate.ts
//
// 分发前 tool 参数闸门：在 executor 接手之前，用工具的原始（未净化）
// schema 做必填存在性 + 基础类型检查，把结构错误的调用变成一条模型可自纠的
// tool 结果，而不是让它悄悄流进 executor 后被默认化/误报。
//
// 背景：Gemini 通道 functionCallingConfig 由 VALIDATED 改为 AUTO 后
// （2026-09-25，见 geminiNativeShared.ts），上游不再为模型生成的 args 把关；
// host 侧此前没有统一的 schema 级校验——invlaid JSON 被静默归一为 {}，
// 各 executor 用自己的方式解构，缺参/类型错的回执质量参差。
// 本闸门是收到共识范围内的一道「最小」补充：不引 ajv/zod，不校验嵌套组合子
// （oneOf/anyOf/allOf），只做两件高置信度的事——必填存在性、顶层类型。
//
// 范围（v1）：只接 agent-runtime 工具族（workspace + nolo workspace，
// 见 getAgentRuntimeToolParametersIndex）。ai/tools registry 的工具刻意
// 不接——它们有各自的前置 policy guard 与结构化结果契约，闸门抢先按
// schema 拦截会覆盖这些语义（实测：createTable 的 capture 确认守卫返回
// `{error: "knowledge_capture_requires_confirmation"}`，而 schema 的
// required 是 columns，闸门会先把缺列的调用拦下，丢掉守卫的语义）。
// registry 工具如需接入，应先逐个核对其 executor 的 soft-fail 契约。
//
// 契约（宁漏勿误）：
// - 参数在 executor 侧有已知别名（path 系 / oldText 系 / newText 系 /
//   command↔cmd）时，别名提供即视为已提供——别名表从 executor 侧单源导入。
// - number/integer 接受数字字符串（executor 普遍 Number() 宽松处理）。
// - JSON 不可解析时不在此处拦截（localLoop 的毒丸参数拦截已覆盖主路径，
//   execShell 还刻意接受裸字符串命令）；本闸门只在 args 是 JSON 对象时工作。
// - 不回显参数值（可能超长/敏感），只报字段名与类型名。
// - 纯逻辑，零 I/O；索引构建失败绝不影响分发（降级为跳过）。

import {
  PATH_FIELD_ALIASES,
  OLD_TEXT_FIELD_ALIASES,
  NEW_TEXT_FIELD_ALIASES,
  buildLocalWorkspaceOpenAiTools,
} from "./localWorkspaceTools";
import { WORKSPACE_TOOL_NAMES } from "./localWorkspaceToolDefs";
import {
  NOLO_WORKSPACE_TOOL_NAMES,
  buildNoloWorkspaceOpenAiTools,
} from "./noloWorkspaceTools";

export type ToolArgumentGateResult =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; message: string };

/**
 * 已知的等价字段组：组内任意一个字段有值，即视为组内其它字段已提供。
 * 每组都对应 executor 侧真实存在的别名解析——新增别名时两处都要动。
 * 这里的组只是「必填检查」的容忍表，不做值归一。
 *
 * 完整性约束：索引覆盖范围内（workspace + nolo workspace）凡是 executor
 * 用 `args.a ?? args.b` 链解析、且该字段出现在某工具 required 里的，都必须
 * 在此成组列出，否则别名调用会被误拦（review M1）。逐个来源注释如下：
 */
const FIELD_ALIAS_GROUPS: readonly (readonly string[])[] = [
  // localWorkspaceTools.ts:336 导出常量（readFile/writeFile/editFile/globFiles）
  PATH_FIELD_ALIASES,
  // localWorkspaceTools.ts:339-340 导出常量（editFile）
  OLD_TEXT_FIELD_ALIASES,
  NEW_TEXT_FIELD_ALIASES,
  // localWorkspaceTools.ts:733 `args.cmd || args.command`（launchProcess）；
  // launchProcess 的 required ["command"] 见 localWorkspaceToolDefs.ts:283。
  // 注：execShell 的 schema 无 required（command 在 executor 层强制，
  // capabilities/execShellCapability.ts:42 声明 cmd 兼容字段），本组对它不产生拦截。
  ["command", "cmd"],
  // localWorkspaceTools.ts:698-699 `args.pattern ?? args.glob`（globFiles）
  ["pattern", "glob"],
  // noloWorkspaceTools.ts:492 `args.dialog ?? args.dialogId ?? args.id`（readDialog）
  ["dialog", "dialogId", "id"],
  // noloWorkspaceTools.ts:545 `args.agent ?? args.agentKey ?? args.id`（readAgent）
  ["agent", "agentKey", "id"],
  // noloWorkspaceTools.ts:552 `args.space ?? args.spaceId ?? args.id`（readSpace）
  ["space", "spaceId", "id"],
  // noloWorkspaceTools.ts:561/567 `args.doc ?? args.docKey ?? args.pageKey ?? args.key`
  // （readDoc / readSkillDoc）
  ["doc", "docKey", "pageKey", "key"],
  // noloWorkspaceTools.node.ts:238 `parsed.name ?? parsed.skillName ?? parsed.skill`（loadSkill）
  ["name", "skillName", "skill"],
  // noloWorkspaceTools.ts:593 `args.table ?? args.tableId ?? args.metaKey`（queryTableRows）
  ["table", "tableId", "metaKey"],
];

const TYPE_MATCHERS: Record<string, (value: unknown) => boolean> = {
  string: (value) => typeof value === "string",
  // 数字字符串视为可接受：executor 普遍 Number()/clamp 宽松处理，拦截会误报。
  number: (value) =>
    typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))),
  integer: (value) =>
    typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))),
  boolean: (value) =>
    typeof value === "boolean" || value === "true" || value === "false",
  object: (value) => typeof value === "object" && value !== null && !Array.isArray(value),
  array: (value) => Array.isArray(value),
};

function describeValueType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isAliasSatisfied(
  args: Record<string, unknown>,
  field: string,
): boolean {
  for (const group of FIELD_ALIAS_GROUPS) {
    if (!group.includes(field)) continue;
    if (group.some((alias) => args[alias] !== undefined)) return true;
  }
  return false;
}

function readRequiredFields(parameters: Record<string, unknown>): string[] {
  const required = parameters.required;
  if (!Array.isArray(required)) return [];
  return required.filter((field): field is string => typeof field === "string");
}

function readProperties(
  parameters: Record<string, unknown>,
): Record<string, unknown> {
  const properties = parameters.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return {};
  }
  return properties as Record<string, unknown>;
}

/**
 * 用工具的原始 parameters schema 校验一次 args。
 * `parameters` 不是合法的现代 schema 对象（或没有可检查的构造）时返回 ok——
 * 宁漏勿误，绝不因为 schema 形态陌生就拦调用。
 */
export function validateToolArguments(args: {
  toolName: string;
  rawArguments: string | undefined | null;
  parameters: unknown;
}): ToolArgumentGateResult {
  const { toolName, rawArguments, parameters } = args;
  if (
    !parameters ||
    typeof parameters !== "object" ||
    Array.isArray(parameters)
  ) {
    return { ok: true, args: {} };
  }
  const schema = parameters as Record<string, unknown>;
  const requiredFields = readRequiredFields(schema);
  const properties = readProperties(schema);
  if (requiredFields.length === 0 && Object.keys(properties).length === 0) {
    return { ok: true, args: {} };
  }

  const raw = typeof rawArguments === "string" ? rawArguments.trim() : "";
  let record: Record<string, unknown> = {};
  if (raw !== "") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 不可解析：交给既有路径（localLoop 毒丸拦截 / execShell 裸字符串语义）。
      return { ok: true, args: {} };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: true, args: {} };
    }
    record = parsed as Record<string, unknown>;
  }

  for (const field of requiredFields) {
    if (record[field] !== undefined) continue;
    if (isAliasSatisfied(record, field)) continue;
    return {
      ok: false,
      message: `${toolName} 参数校验失败：缺少必填参数 "${field}"。请补上后重新调用 ${toolName}。`,
    };
  }

  for (const [field, spec] of Object.entries(properties)) {
    const value = record[field];
    if (value === undefined || value === null) continue;
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) continue;
    const declared = (spec as { type?: unknown }).type;
    // 只处理显式声明的单类型；type 数组 / oneOf 等组合子一概跳过。
    if (typeof declared !== "string") continue;
    const matcher = TYPE_MATCHERS[declared];
    if (!matcher) continue;
    if (!matcher(value)) {
      return {
        ok: false,
        message: `${toolName} 参数校验失败：参数 "${field}" 应为 ${declared}，实际收到 ${describeValueType(value)}。请修正后重新调用 ${toolName}。`,
      };
    }
  }

  return { ok: true, args: record };
}

/** 从 OpenAI 形态的 tools 数组建 name → parameters 索引（缺 schema 的跳过）。 */
export function buildToolParametersIndex(
  tools: Iterable<unknown>,
): Map<string, unknown> {
  const index = new Map<string, unknown>();
  for (const tool of tools) {
    if (!tool || typeof tool !== "object") continue;
    const fn = (tool as { function?: unknown }).function;
    if (!fn || typeof fn !== "object") continue;
    const name = (fn as { name?: unknown }).name;
    const parameters = (fn as { parameters?: unknown }).parameters;
    if (typeof name === "string" && name && parameters !== undefined) {
      index.set(name, parameters);
    }
  }
  return index;
}

let cachedAgentRuntimeIndex: Map<string, unknown> | null = null;

/**
 * agent-runtime 自有工具族的 schema 索引（workspace 工具 + nolo workspace 工具）。
 * 纯声明构建、零 I/O，懒加载缓存；构建失败返回空表（闸门降级为跳过）。
 * 这是闸门 v1 的完整覆盖范围；registry 工具的排除原因见文件头「范围」。
 */
export function getAgentRuntimeToolParametersIndex(): Map<string, unknown> {
  if (cachedAgentRuntimeIndex) return cachedAgentRuntimeIndex;
  const index = new Map<string, unknown>();
  try {
    const workspaceTools = buildLocalWorkspaceOpenAiTools({
      toolNames: [...WORKSPACE_TOOL_NAMES],
      exposeShellTools: true,
    });
    for (const [name, parameters] of buildToolParametersIndex(workspaceTools)) {
      index.set(name, parameters);
    }
    const noloTools = buildNoloWorkspaceOpenAiTools({
      toolNames: [...NOLO_WORKSPACE_TOOL_NAMES],
    });
    for (const [name, parameters] of buildToolParametersIndex(noloTools)) {
      index.set(name, parameters);
    }
  } catch {
    // schema 构建失败绝不影响分发；空索引 = 闸门静默跳过。
  }
  // 空表也缓存：schema 构建是静态纯声明，失败为确定性结果，不重试。
  cachedAgentRuntimeIndex = index;
  return index;
}
