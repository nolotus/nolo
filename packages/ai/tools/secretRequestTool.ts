// packages/ai/tools/secretRequestTool.ts
//
// secret-request：模型向用户索要某个具名凭据（如 OPENAI_KEY）。
//
// 安全不变量（docs/plans/2026-11-04-secret-request-panel.md §4）：
// - 明文永不进入模型可见面。工具只负责「抬起一个 gate」，由宿主弹面板输入并
//   在宿主进程内写 core/secretsStore.setSecret(name, value)；值不经过工具参数、
//   不经过模型。本 executor 的返回值（宿主未回填时的兜底）也绝不索要或复述值。
// - 自定义字段（action / name）必须放在 payload 里面：readActionGate 只保留
//   id/kind/title/titleParams/body/payload，顶层自定义字段会被丢掉。
// - kind: "input" 目前没有宿主实现渲染（Block 1b 的活）；这里只保证 gate 形状。

/**
 * gate id 生成：**不能**静态 import `node:crypto`——这个模块会被打进 web bundle
 * （2026-11-04 pre-push web bundle 护栏实测：`Could not resolve "node:crypto"`）。
 * 用宿主/浏览器都有的 globalThis.crypto，缺失时退化为时间+随机串（id 只需唯一，不需密码学强度）。
 */
const randomGateId = (): string => {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof webCrypto?.randomUUID === "function") return webCrypto.randomUUID();
  // 随机段必须在前：调用方会 `.slice(0, 8)`，若时间戳在前会被整段保留、随机段被截掉，
  // 同毫秒内两个 gate 会拿到同一个 id（review 实测：Date.now().toString(36) 恰为 8 字符）。
  return `${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
};

import type { AgentRuntimeToolResult } from "agent-runtime/hostAdapter";

/** 具名凭据名约束：拒绝空白与路径穿越，避免与既有条目相互覆盖。 */
export const SECRET_REQUEST_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

export type SecretRequestArgs = {
  name: string;
  prompt?: string;
  purpose?: string;
};

/**
 * [Schema] 定义了 'secret-request' 工具的结构，供 LLM 调用。
 */
export const secretRequestFunctionSchema = {
  name: "secret-request",
  description:
    "向用户请求一个具名凭据（如 API key）。用户会在宿主面板中输入，凭据明文" +
    "由宿主写入本机 secret store，任何值都不会回到对话中；工具结果只告知是否" +
    "已保存。调用时只传凭据名（大写+下划线）与可选说明，绝不传任何凭据值。" +
    "结果返回后，用 `nolo secret run --with <name> -- <cmd>` 在受控通道消费。",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "凭据名称，必须匹配 ^[A-Z_][A-Z0-9_]*$（如 OPENAI_KEY）。这是用户在面板里看到的条目名。",
      },
      prompt: {
        type: "string",
        description: "面板上向用户展示的一句话说明（可选）。",
      },
      purpose: {
        type: "string",
        description: "为什么需要这个凭据的简短说明（可选），写进面板正文。",
      },
    },
    required: ["name"],
  },
};

const NAME_ERROR =
  "secret-request：name 必须匹配 ^[A-Z_][A-Z0-9_]*$（大写字母/下划线开头，仅含大写字母、数字与下划线）。";

/** 校验调用方传入的凭据名；不合法返回错误文案，合法返回 undefined。 */
export function validateSecretRequestName(name: unknown): string | null {
  if (typeof name !== "string" || name.length === 0) return NAME_ERROR;
  if (!SECRET_REQUEST_NAME_PATTERN.test(name)) return NAME_ERROR;
  return null;
}

/**
 * 构造抬 gate 的工具结果（宿主没回填前的原始结果）。
 * 独立导出：Block 1b 的 TUI 分支与测试都复用同一份 gate 形状。
 */
export function buildSecretRequestToolResult(
  args: SecretRequestArgs,
): AgentRuntimeToolResult {
  const payload: Record<string, unknown> = {
    action: "secret_request",
    name: args.name,
    masked: true,
    ...(args.prompt?.trim() ? { prompt: args.prompt.trim() } : {}),
  };
  const purpose = args.purpose?.trim();
  // 宿主中立措辞：这里只陈述「需要」，不断言「已请求/已保存」——
  // 没有 onActionGate 的宿主（服务端、无 TTY run）会把这条兜底原样交给模型，
  // 假成功会让模型直接去消费一个根本不存在的凭据。
  const fallbackContent = [
    `需要用户向本机 secret store 提供凭据 "${args.name}"（明文不会出现在对话里）。`,
    ...(purpose ? [`用途：${purpose}`] : []),
    "两种路径：如果当前宿主支持交互面板，会自动弹出输入界面；否则请用户在终端执行：nolo secret set " +
      args.name +
      " --prompt",
    "凭据保存后，用 nolo secret run --with " + args.name + " -- <cmd> 在受控通道消费，不要向用户索要明文。",
  ].join("\n");
  return {
    content: fallbackContent,
    metadata: {
      actionGate: {
        id: `gate-${randomGateId().slice(0, 8)}-secret-request-${args.name}`,
        kind: "input",
        title: `需要凭据 ${args.name}`,
        body: purpose?.trim() || "请在输入框中填写该凭据，内容仅保存在本机 secret store。",
        payload,
      },
      reason: "secret-request-pending-host-input",
    },
  };
}

/**
 * [Executor] 'secret-request' 的执行函数。
 * 非法 name → 普通工具错误（不抬 gate）；合法 name → 返回带
 * metadata.actionGate（kind: "input"）的结果，由 toolCallTransaction 的
 * buildActionGate 转成 LocalAgentActionGate 交给宿主；宿主回填最终结果
 * （{ stored: true, name } 形状）替换本结果。
 */
export async function secretRequestFunc(
  args: SecretRequestArgs,
  _thunkApi?: unknown,
): Promise<AgentRuntimeToolResult> {
  const nameError = validateSecretRequestName(args?.name);
  if (nameError) {
    throw new Error(nameError);
  }
  return buildSecretRequestToolResult({
    name: args.name,
    ...(args.prompt !== undefined ? { prompt: args.prompt } : {}),
    ...(args.purpose !== undefined ? { purpose: args.purpose } : {}),
  });
}
