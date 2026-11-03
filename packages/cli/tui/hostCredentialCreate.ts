/**
 * 宿主直接执行的凭据 create（不经 shell、不落 grant 文件）。
 *
 * 背景（2026-11 独立审查 HIGH）：把「用户批准」写成同 UID 可写的 JSON，再让 CLI
 * 读它自证已授权，等于谁都能伪造批准。所以这条路径**不落任何授权文件**：
 *
 *   真实批准事件（`resolveActionGate` 的 `approved === true`）
 *     → 宿主进程内立刻执行受限 create/verify（strict OS broker + 固定 BigModel 目标）
 *
 * 批准事实只存在于宿主内存里的这一次调用栈上；模型能提交的只有「一条命令」，
 * 命令本身不构成授权，`gate.id` 由宿主生成且只在本次 approve 后传入。
 *
 * 注意用词：这是**流程内**的批准事实，不是密码学证明。同 UID 能调试宿主或改本程序的
 * 进程可以伪造任何内存里的东西——本模块只保证「没有宿主 approve 的那次调用栈，
 * 就拿不到 hostResult」，不要读成不可伪造。
 *
 * 威胁边界（必须如实）：这挡住了「伪造授权文件 / 自己声明 confirmed / 换 URL 换关键」，
 * 但**不挡**同 UID 的任意 shell 进程读 OS 安全区、改本程序、调试宿主。要挡那一类
 * 需要限制模型进程的执行能力并把凭据服务隔离出去，本模块不声称做到。
 */

import {
  BIGMODEL_PROVIDER_TARGET,
  normalizeOrigin,
} from "agent-runtime/credentialUseGrant";
import { createStrictHostCredentialBroker } from "agent-runtime/desktopHostCredentialBroker";
import { readCommandActionGatePayload } from "agent-runtime/actionGate";
import type { LocalAgentActionGate } from "agent-runtime/localLoop";
import type { AgentRuntimeToolResult } from "../agentRuntimeLocal";
import { runAgentCreateCommand } from "../agentRecordCommands";

/** 本轮固定的模型（用户已确认的范围）。 */
export const HOST_CREDENTIAL_CREATE_MODEL = "glm-5.3-flash";

const VAULT_ID_PATTERN = /^vault-cred-[A-Za-z0-9]+$/;

export type HostCredentialCreateRequest = {
  agentName: string;
  model: string;
  providerUrl: string;
  vaultId: string;
  /** 用户批准的那条命令 argv（原样，用于审计文案）。 */
  command: string[];
};

function readFlag(tokens: string[], names: string[]): string | null {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const eq = token.indexOf("=");
    if (eq > 0) {
      const name = token.slice(0, eq);
      if (names.includes(name)) {
        const value = token.slice(eq + 1).trim();
        if (value) return value;
      }
      continue;
    }
    if (names.includes(token)) {
      const value = tokens[i + 1]?.trim();
      if (value && !value.startsWith("-")) return value;
    }
  }
  return null;
}

/**
 * 从**宿主刚批准的那条命令**里解析受限 create 意图。
 *
 * 只认固定范围：`nolo agent create <name>` + `--model glm-5.3-flash` +
 * `--custom-provider-url` 的 origin 必须是固定 BigModel 官方 origin +
 * `--api-key` 必须是裸 vault ID。任一不满足 → null（宿主什么都不做，交回原流程）。
 */
export function parseHostCredentialCreateRequest(
  gate: LocalAgentActionGate,
): HostCredentialCreateRequest | null {
  if (gate.kind !== "confirm") return null;
  const payload = readCommandActionGatePayload(gate.payload);
  if (!payload) return null;
  const command = payload.command.map((token) => String(token));
  const joined = command.join(" ");
  if (!/\bagent\b/.test(joined) || !/\bcreate\b/.test(joined)) return null;
  if (command.some((token) => token.includes("$nolo_cred:"))) return null;

  const createIndex = command.indexOf("create");
  const agentName = createIndex >= 0 ? command[createIndex + 1]?.trim() : "";
  if (!agentName || agentName.startsWith("-")) return null;

  const vaultId = readFlag(command, ["--api-key", "--provider-api-key"]);
  if (!vaultId || !VAULT_ID_PATTERN.test(vaultId)) return null;

  const model = readFlag(command, ["--model"]);
  if (model !== HOST_CREDENTIAL_CREATE_MODEL) return null;

  const providerUrl = readFlag(command, ["--custom-provider-url"]);
  if (!providerUrl) return null;
  const origin = normalizeOrigin(providerUrl);
  if (!origin || origin !== BIGMODEL_PROVIDER_TARGET.allowedOrigin) return null;

  return { agentName, model, providerUrl, vaultId, command };
}

export type HostCredentialCreateOutcome =
  | { handled: false }
  | { handled: true; ok: boolean; exitCode: number; summary: string };
/**
 * 在用户真实批准之后，由宿主进程内执行受限 create + verify。
 *
 * 关键点：
 * - 不写授权文件；批准事实就是这次调用的入参（`approvalGateId` 来自
 *   `resolveActionGate` 的 approved 分支，模型无法构造）；
 * - 用严格 OS broker（无明文文件回退）；
 * - provider 目标、模型、vault 源都在本函数里重新校验，命令里的其它参数不生效；
 * - 输出只回一句摘要，凭据明文不进 tool 结果。
 */
/**
 * 执行入口（导出）：把「被批准的命令」当幂等键，交给 `runHostCredentialCreateOnce`。
 * 同一 execShell 同时命中 onApproved 与 confirmDestructiveAction 时，只有第一次真正执行。
 */
export async function executeApprovedCredentialCreate(args: {
  gate: LocalAgentActionGate;
  approvalGateId: string;
  env: Record<string, string | undefined>;
  output?: { write(chunk: string): void };
  db?: unknown;
  now?: number;
}): Promise<AgentRuntimeToolResult | null> {
  const payload = readCommandActionGatePayload(args.gate.payload);
  const command = payload?.command ?? [];
  return await runHostCredentialCreateOnce({
    approvalGateId: args.approvalGateId,
    command,
    run: () => executeApprovedCredentialCreateOnce(args),
  });
}

/** 把确认框里的命令字符串切成 argv（支持简单引号，够 NOLO 命令用；不追求完整 shell 语义）。 */
export function tokenizeApprovedCommandText(commandText: string): string[] {
  const text = typeof commandText === "string" ? commandText : "";
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (const char of text) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === " " || char === "\t" || char === "\n") {
      if (current) tokens.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * 执行前确认点用：确认框给的是命令**字符串**（`PermissionRequest.command`）。
 * 走同一套解析/校验/执行与 `executeApprovedCredentialCreate` 完全一致，
 * 只是先切成 argv。返回 null 表示这条命令不在宿主代执行范围内。
 */
/**
 * 生产确认回调的**唯一入口**：命令文本 → argv → 幂等执行。
 * 两条确认通道（resolveActionGate.onApproved / confirmDestructiveAction）都必须经由这里，
 * 不允许再绕过去重直调底层执行函数。
 */
export async function runApprovedCredentialCommand(args: {
  commandText: string;
  approvalEventId: string;
  env: Record<string, string | undefined>;
  db?: unknown;
}): Promise<AgentRuntimeToolResult | null> {
  const command = tokenizeApprovedCommandText(args.commandText);
  if (command.length === 0) return null;
  return await runHostCredentialCreateOnce({
    approvalGateId: args.approvalEventId,
    command,
    run: () =>
      executeApprovedCredentialCreateOnce({
        gate: {
          id: args.approvalEventId,
          kind: "confirm",
          title: "Use pasted API key for this agent?",
          payload: { command },
        } as LocalAgentActionGate,
        approvalGateId: args.approvalEventId,
        env: args.env,
        ...(args.db ? { db: args.db } : {}),
      }),
  });
}

/**
 * 执行前确认点用：确认框给的是命令**字符串**（`PermissionRequest.command`）。
 * 与 `runApprovedCredentialCommand` 同一个去重入口（不再直调底层执行）。
 */
export async function executeApprovedCredentialCreateFromCommandText(args: {
  commandText: string;
  approvalEventId: string;
  env: Record<string, string | undefined>;
  db?: unknown;
}): Promise<AgentRuntimeToolResult | null> {
  return await runApprovedCredentialCommand(args);
}

/**
 * 同一「规范化命令」在窗口内只真正执行一次，重复命中复用同一成功结果
 * （防双击 / 双通道各跑一遍）。
 *
 * 幂等键**只用命令哈希**，不含 approvalEventId：两条确认通道给的 gate id 不同，
 * 若把 id 放进键，同一条命令就会被执行两次。
 * 失败**不进缓存**：同一次批准失败后允许重试。
 */
export const HOST_CREDENTIAL_CREATE_DEDUPE_WINDOW_MS = 2 * 60 * 1000;

type CachedHostCreate = {
  promise: Promise<AgentRuntimeToolResult | null>;
  expiresAt: number;
};

const hostCreateCache = new Map<string, CachedHostCreate>();

export function resetHostCredentialCreateDedupeForTests(): void {
  hostCreateCache.clear();
}

function normalizedCommandKey(command: readonly string[]): string {
  return command.map((token) => String(token).trim()).filter(Boolean).join(" ");
}

/**
 * 唯一执行入口：两条确认通道（resolveActionGate.onApproved / confirmDestructiveAction）
 * 都收敛到这里。
 */
export function runHostCredentialCreateOnce(args: {
  approvalGateId: string;
  command: readonly string[];
  run: () => Promise<AgentRuntimeToolResult | null>;
  /** 窗口覆盖（测试用）。 */
  windowMs?: number;
  now?: number;
}): Promise<AgentRuntimeToolResult | null> {
  const now = args.now ?? Date.now();
  const key = normalizedCommandKey(args.command);
  const cached = hostCreateCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;
  if (cached) hostCreateCache.delete(key);

  const windowMs = args.windowMs ?? HOST_CREDENTIAL_CREATE_DEDUPE_WINDOW_MS;
  const promise = args.run();
  hostCreateCache.set(key, { promise, expiresAt: now + windowMs });
  void promise.catch(() => {
    // 失败不缓存：同一批准后允许重试（成功结果才在窗口内复用）。
    const entry = hostCreateCache.get(key);
    if (entry && entry.promise === promise) hostCreateCache.delete(key);
  });
  return promise;
}

async function executeApprovedCredentialCreateOnce(args: {
  gate: LocalAgentActionGate;
  approvalGateId: string;
  env: Record<string, string | undefined>;
  output?: { write(chunk: string): void };
  db?: unknown;
  now?: number;
}): Promise<AgentRuntimeToolResult | null> {
  const request = parseHostCredentialCreateRequest(args.gate);
  if (!request) return null;
  if (!args.approvalGateId || args.approvalGateId !== args.gate.id) {
    // 形态守卫，非签名验证：这里只确认调用方给的 id 与 gate 自带的 id 一致，
    // 防止"拿 A 的批准去执行 B"。它不证明这次批准真的发生过——真实批准事实
    // 由宿主在 approved 分支里传入（流程内事实，见文件头威胁边界）。
    return {
      content: "host credential create refused: approval-gate-mismatch",
      metadata: {
        hostExecuted: true,
        actionGateResult: { gateId: args.gate.id, status: "failed", output: "approval-gate-mismatch" },
      },
    };
  }

  let deviceId = "";
  try {
    const { detectMachineInfo } = await import("connector-experimental/machineInfo");
    const machine = await detectMachineInfo({ probeLaunchable: false });
    deviceId = typeof machine?.machineId === "string" ? machine.machineId : "";
  } catch {
    deviceId = "";
  }

  const chunks: string[] = [];
  const output = { write: (chunk: string) => chunks.push(String(chunk)) };
  // 规范化后的 argv：只保留被批准的字段，命令里其它参数一律不生效。
  // `--verify` 只在用户批准的原命令里出现过才加（不擅自扩大批准范围）。
  const approvedVerify = request.command.includes("--verify");
  const canonicalArgs = [
    "create",
    request.agentName,
    "--model",
    request.model,
    "--custom-provider-url",
    request.providerUrl,
    "--api-key",
    request.vaultId,
    ...(approvedVerify ? ["--verify"] : []),
  ];

  const exitCode = await runAgentCreateCommand(canonicalArgs, {
    env: args.env as never,
    output: output as never,
    ...(args.db ? { db: args.db as never } : {}),
    credentialBroker: createStrictHostCredentialBroker(),
    deviceId,
    hostApproval: { gateId: args.approvalGateId },
  });

  const ok = exitCode === 0;
  const summary = ok
    ? `created ${request.agentName} with ${request.model} against ${BIGMODEL_PROVIDER_TARGET.allowedOrigin}`
    : `host credential create failed (exit ${exitCode}); credential not sent to any other origin`;
  // 真实工具结果：`hostExecuted` 让运行时不执行原工具；失败明确标 failed。
  return {
    content: summary,
    metadata: {
      hostExecuted: true,
      exitCode,
      actionGateResult: {
        gateId: args.approvalGateId,
        status: ok ? "completed" : "failed",
        output: "host-executed",
      },
    },
  };
}
