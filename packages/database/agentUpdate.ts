import { noloRequest, TIMEOUT } from "./requests";
import { API_ENDPOINTS } from "./config";
import { isLevelNotFoundError } from "./levelNotFoundError";

export type AgentUpdateFailure = {
  kind: "network" | "forbidden" | "conflict" | "validation" | "server";
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  privateSaved?: boolean;
  agent?: any;
};

export class AgentUpdateError extends Error implements AgentUpdateFailure {
  kind: AgentUpdateFailure["kind"];
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string>;
  privateSaved?: boolean;
  agent?: any;
  constructor(failure: AgentUpdateFailure) {
    super(failure.message ?? "Agent 保存失败");
    this.name = "AgentUpdateError";
    this.kind = failure.kind;
    Object.assign(this, failure);
  }
}

export const agentUpdateFailure = (error: unknown): AgentUpdateFailure => {
  const value = error instanceof AgentUpdateError ? error : new AgentUpdateError({
    kind: "server", message: error instanceof Error ? error.message : "Agent 保存失败",
  });
  // Redux 默认只保留 Error 的少数字段，必须显式走 rejectWithValue 保住错误契约。
  return { kind: value.kind, status: value.status, code: value.code,
    fieldErrors: value.fieldErrors, message: value.message,
    ...(value.privateSaved ? { privateSaved: true, agent: value.agent } : {}) };
};

export async function agentRequest(
  server: string, state: any, path: string, method: string, body?: unknown,
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await noloRequest(server, {
      url: `${API_ENDPOINTS.DATABASE}/${path}`, method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }, state, controller.signal);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AgentUpdateError({
        kind: response.status === 403 ? "forbidden" : response.status === 409 ? "conflict"
          : response.status === 400 ? "validation" : "server",
        status: response.status,
        code: result.code ?? result.error,
        fieldErrors: result.fieldErrors,
        message: result.message ?? `Agent 请求失败 (${response.status})`,
      });
    }
    return result;
  } catch (error) {
    if (error instanceof AgentUpdateError) throw error;
    // 超时可能发生在服务端落库之后，不能误称「未保存」，也不能自动重试。
    throw new AgentUpdateError({ kind: "network", code: controller.signal.aborted ? "timeout" : "network_error",
      message: "未确认保存结果，请检查连接并核实服务端记录后再操作" });
  } finally {
    clearTimeout(timeout);
  }
}

export async function updateAgentRecord(options: {
  server: string; state: any; dbKey: string; changes: Record<string, unknown>;
  localDb?: { get(key: string): Promise<any>; put(key: string, value: any): Promise<void> };
}): Promise<any> {
  const { server, state, dbKey, changes } = options;
  if (dbKey.startsWith("agent-local-")) {
    // 设备私有数据不得上传；这条兼容路径没有服务端时间保证，也不能用 UI 旧快照补记录。
    if (!options.localDb) throw new AgentUpdateError({ kind: "conflict", code: "missing_local_database", message: "本地存储不可用，无法保存 Agent" });
    let previous: any;
    // 保持现有前端 kind 契约：本地存储状态冲突复用 conflict，以 code/message 区分。
    const storageFailure = () => new AgentUpdateError({
      kind: "conflict", code: "local_storage_error", message: "本地存储读写失败，未确认 Agent 保存结果，请检查设备存储后重试",
    });
    try { previous = await options.localDb.get(dbKey); } catch (error) {
      if (!isLevelNotFoundError(error)) throw storageFailure();
    }
    if (!previous) throw new AgentUpdateError({ kind: "conflict", code: "local_agent_missing", message: "本地 Agent 不存在" });
    const merge = (base: any, patch: any): any => {
      const result = { ...base };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete result[key];
        else if (value !== undefined) result[key] = typeof value === "object" && !Array.isArray(value) ? merge(result[key], value) : value;
      }
      return result;
    };
    const saved = merge(previous, { ...changes, isPublic: false, userId: "local" });
    saved.updatedAt = Date.now();
    // 本地记录的唯一持久化责任在此；调用方只更新 Redux，不再重复写入。
    try { await options.localDb.put(dbKey, saved); } catch { throw storageFailure(); }
    return saved;
  }
  // 直接等待 PATCH 的合并结果，避开旧请求层吞失败、以及成功后再读快照的竞争窗口。
  const result = await agentRequest(server, state, `patch/${encodeURIComponent(dbKey)}`, "PATCH", changes);
  if (!result.data || typeof result.data !== "object") {
    throw new AgentUpdateError({ kind: "server", code: "invalid_agent_response", message: "服务端未返回权威 Agent 记录" });
  }
  return result.data;
}
