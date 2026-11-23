import React, { useEffect, useRef, useState } from "react";
import {
  MCP_PRESET_SPECS,
  getMcpPresetSpec,
  parseMcpServerCreateInput,
  parseMcpServerUpdateInput,
  type JsonValue,
  type McpConnectionSummary,
  type McpPresetId,
  type McpReadPolicy,
  type McpResult,
  type McpServerCreateInput,
  type McpServerUpdateInput,
} from "../../../agent-runtime/mcpConnectionSpecs";
import "./McpConnectionsPanel.css";

const API = "/api/mcp";
const ENCRYPTED_KEEP_PLACEHOLDER = "已加密保存，留空保持不变；输入新值将原子替换旧密文";

const ERROR_MESSAGES: Record<string, string> = {
  authentication_required: "请先登录后再管理 MCP 连接。",
  forbidden: "没有此连接的管理权限，请确认当前登录账号。",
  not_found: "未找到该连接，可能已被删除，请刷新列表。",
  revision_conflict: "连接已被其他操作修改，请刷新列表后重试。",
  placement_unavailable: "当前管理接口仅支持服务端公网 HTTPS 连接，未保存配置。",
  credential_unavailable: "受控凭据存储不可用，未保存配置。",
  limit_exceeded: "提交内容超出限制，请精简配置后重试。",
  invalid_input: "配置格式不符合要求，请检查名称、HTTPS 地址、认证方式与工具白名单。",
  network_denied: "远端地址被安全策略拒绝（服务端仅允许公网 HTTPS，拦截私网与重定向）。",
  transport_error: "无法连接到远端 MCP 服务，请检查服务地址、HTTPS 证书或服务运行状态。",
  timeout: "连接远端 MCP 服务超时，请稍后重试。",
};

export type DiscoveredMcpTool = {
  name: string;
  description?: string;
  argumentKeys: string[];
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  schemaCompatible: boolean;
};

export type DiscoveredMcpToolsResult = {
  connectionId: string;
  connectionRevision: number;
  tools: DiscoveredMcpTool[];
};

export function parseAllowedToolNames(raw: string | readonly string[] | undefined): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw) ? raw : String(raw).split(/[,\r\n]+/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of parts) {
    const trimmed = String(item).trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  );
}

/**
 * Parse audited `readPolicies` from either a JSON array of `{ toolName, arguments }`
 * or concise line rules (`toolName: argA, argB=false`; parameterless tools use `toolName:`).
 * Never generates wildcard argument bypasses: every permitted argument key must be explicitly declared.
 */
export function parseReadPoliciesInput(
  raw: string | readonly McpReadPolicy[] | undefined,
): McpReadPolicy[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return structuredClone(raw) as McpReadPolicy[];
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("参数审计策略 JSON 格式不合法，请检查括号与引号。");
    }
    if (!Array.isArray(parsed)) {
      throw new Error("参数审计策略 JSON 必须是数组。");
    }
    const seenTools = new Set<string>();
    const policies: McpReadPolicy[] = [];
    for (const entry of parsed) {
      if (
        !isPlainJsonObject(entry) ||
        typeof entry.toolName !== "string" ||
        !entry.toolName.trim() ||
        !isPlainJsonObject(entry.arguments)
      ) {
        throw new Error("每条参数审计策略必须包含非空 toolName 与 arguments 对象。");
      }
      const toolName = entry.toolName.trim();
      if (seenTools.has(toolName)) {
        throw new Error(`参数审计策略中存在重复工具名：${toolName}。`);
      }
      seenTools.add(toolName);
      const argsMap: Record<string, JsonValue[]> = {};
      for (const [argKey, argVals] of Object.entries(entry.arguments)) {
        if (!argKey || !Array.isArray(argVals)) {
          throw new Error(`工具 ${toolName} 的参数 ${argKey} 约束必须是 JSON 数组。`);
        }
        argsMap[argKey] = structuredClone(argVals) as JsonValue[];
      }
      policies.push({ toolName, arguments: argsMap });
    }
    return policies;
  }

  const seenTools = new Set<string>();
  const policies: McpReadPolicy[] = [];
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) {
      throw new Error(
        `参数审计策略行“${line}”格式有误，请使用“工具名: 参数1, 参数2=固定JSON值”（无参数工具写“工具名:”）。`,
      );
    }
    const toolName = line.slice(0, colonIdx).trim();
    if (!toolName) {
      throw new Error("参数审计策略中的工具名不能为空。");
    }
    if (seenTools.has(toolName)) {
      throw new Error(`参数审计策略中存在重复工具名：${toolName}。`);
    }
    seenTools.add(toolName);

    const rest = line.slice(colonIdx + 1).trim();
    const argsMap: Record<string, JsonValue[]> = {};
    if (rest) {
      for (const rawSpec of rest.split(",")) {
        const spec = rawSpec.trim();
        if (!spec) continue;
        const eqIdx = spec.indexOf("=");
        if (eqIdx === -1) {
          argsMap[spec] = [];
        } else {
          const argName = spec.slice(0, eqIdx).trim();
          const rawVal = spec.slice(eqIdx + 1).trim();
          if (!argName || !rawVal) {
            throw new Error(`工具 ${toolName} 的固定参数约束“${spec}”格式不完整。`);
          }
          let parsedVal: JsonValue;
          try {
            parsedVal = JSON.parse(rawVal) as JsonValue;
          } catch {
            throw new Error(
              `工具 ${toolName} 的参数 ${argName} 固定值必须是合法 JSON 字面量（例如 false、10、"inbox"）。`,
            );
          }
          argsMap[argName] = [...(argsMap[argName] ?? []), parsedVal];
        }
      }
    }
    policies.push({ toolName, arguments: argsMap });
  }
  return policies;
}

/** Lossless round-trip formatter for editing existing `readPolicies` in the settings UI. */
export function formatReadPoliciesInput(
  policies: readonly McpReadPolicy[] | undefined,
): string {
  if (!policies || policies.length === 0) return "";
  const canUseLineSyntax = policies.every(
    (policy) =>
      !/[:\r\n]/.test(policy.toolName) &&
      Object.entries(policy.arguments).every(
        ([argName, vals]) =>
          !/[,:=\s]/.test(argName) &&
          vals.every(
            (v) =>
              v === null ||
              typeof v === "boolean" ||
              typeof v === "number" ||
              (typeof v === "string" && !/[,\r\n]/.test(v)),
          ),
      ),
  );
  if (!canUseLineSyntax) {
    return JSON.stringify(policies, null, 2);
  }
  return policies
    .map((policy) => {
      const specs: string[] = [];
      for (const [argName, vals] of Object.entries(policy.arguments)) {
        if (vals.length === 0) {
          specs.push(argName);
        } else {
          for (const val of vals) {
            specs.push(`${argName}=${JSON.stringify(val)}`);
          }
        }
      }
      return specs.length > 0
        ? `${policy.toolName}: ${specs.join(", ")}`
        : `${policy.toolName}:`;
    })
    .join("\n");
}

function isValidHttpsUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.hash;
  } catch {
    return false;
  }
}

// Never propagate raw server exception text: it could echo sensitive URLs or tokens.
async function request<T>(
  server: string,
  token: string,
  path: string,
  signal: AbortSignal,
  body?: unknown,
  method?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${server.replace(/\/+$/, "")}${API}${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      cache: "no-store",
      signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error("请求未完成，请检查网络或登录状态；操作结果尚未确认，请刷新列表核对。");
  }
  let result: McpResult<T>;
  try {
    result = await response.json();
  } catch {
    throw new Error("管理接口返回异常，操作结果尚未确认，请刷新列表核对。");
  }
  if (!response.ok || !result || result.ok !== true) {
    const code = result && result.ok === false ? result.error?.code : undefined;
    throw new Error(
      (code && ERROR_MESSAGES[code]) ||
        (response.status === 401 ? "请先登录。" : "操作未成功，请刷新列表核对后重试。"),
    );
  }
  return result.value;
}

/**
 * Single atomic API write: POST /api/mcp/connections or PATCH /api/mcp/connections/:id.
 * Server encrypts endpoint + bearer credential and writes conn + sec rows in one LevelDB batch.
 */
export async function saveMcpConfiguration(input: {
  server: string;
  token: string;
  signal: AbortSignal;
  label: string;
  endpoint: string;
  credential: string;
  authKind: "none" | "bearer";
  enabled: boolean;
  allowedToolNames?: readonly string[] | string;
  readPolicies?: readonly McpReadPolicy[] | string;
  presetId?: McpPresetId;
  previous?: McpConnectionSummary;
}): Promise<McpConnectionSummary> {
  const label = input.label.trim();
  const endpoint = input.endpoint.trim();
  const credential = input.credential.trim();
  // The whitelist textarea is the ONLY source of granted tools. A policy entry never
  // grants a tool the user removed from the whitelist (see F3): that would silently
  // undo a revocation the user just performed.
  const explicitAllowed = parseAllowedToolNames(input.allowedToolNames);
  const allowedSet = new Set<string>(explicitAllowed);
  const parsedPolicies =
    input.readPolicies !== undefined ? parseReadPoliciesInput(input.readPolicies) : undefined;
  const resolvedPolicies =
    parsedPolicies !== undefined
      ? parsedPolicies
      : (input.previous?.readPolicies ?? []).filter((policy) =>
          allowedSet.has(policy.toolName),
        );
  const allowedToolNames = [...allowedSet];
  const outOfScopePolicy = resolvedPolicies.find(
    (policy) => !allowedSet.has(policy.toolName),
  );
  if (outOfScopePolicy) {
    throw new Error(
      `参数审计策略中的工具 ${outOfScopePolicy.toolName} 不在“允许调用的工具白名单”内；请把该工具加入白名单，或删除对应的策略行。`,
    );
  }
  const policyToolSet = new Set(resolvedPolicies.map((policy) => policy.toolName));
  const missingPolicyTool = allowedToolNames.find((toolName) => !policyToolSet.has(toolName));
  if (missingPolicyTool) {
    throw new Error(
      `工具 ${missingPolicyTool} 尚未配置只读参数审计策略（readPolicies）；请为每个白名单工具声明允许的参数（无参数工具写“${missingPolicyTool}:”）。`,
    );
  }

  if (!label) {
    throw new Error("请输入连接名称。");
  }

  if (!input.previous) {
    if (!endpoint || !isValidHttpsUrl(endpoint)) {
      throw new Error("请输入有效的公网 HTTPS 地址（不含用户名、密码或锚点）。");
    }
    if (input.authKind === "bearer" && !credential) {
      throw new Error("选择 Bearer 认证时必须填写 Bearer Token。");
    }
    const createBody: McpServerCreateInput = {
      label,
      enabled: input.enabled,
      ...(input.presetId ? { presetId: input.presetId } : {}),
      allowedToolNames,
      readPolicies: resolvedPolicies,
      authKind: input.authKind,
      endpoint,
      ...(input.authKind === "bearer" ? { credential } : {}),
    };
    const parsed = parseMcpServerCreateInput(createBody);
    if (!parsed.ok) {
      throw new Error(ERROR_MESSAGES[parsed.error.code] ?? ERROR_MESSAGES.invalid_input!);
    }
    return request<McpConnectionSummary>(
      input.server,
      input.token,
      "/connections",
      input.signal,
      parsed.value,
      "POST",
    );
  }

  const previous = input.previous;
  if (!endpoint && !previous.endpointConfigured) {
    throw new Error("当前连接尚未保存服务地址，请输入有效的公网 HTTPS 地址。");
  }
  if (endpoint && !isValidHttpsUrl(endpoint)) {
    throw new Error("请输入有效的公网 HTTPS 地址（不含用户名、密码或锚点）。");
  }
  if (
    input.authKind === "bearer" &&
    !credential &&
    (!previous.credentialConfigured || previous.authKind !== "bearer")
  ) {
    throw new Error("切换为 Bearer 认证且此前未保存令牌时，必须填写 Bearer Token。");
  }

  const effectivePresetId = previous.presetId ?? input.presetId;
  const updateBody: McpServerUpdateInput = {
    connectionId: previous.id,
    expectedRevision: previous.revision,
    label,
    enabled: input.enabled,
    ...(effectivePresetId ? { presetId: effectivePresetId } : {}),
    allowedToolNames,
    readPolicies: resolvedPolicies,
    authKind: input.authKind,
    ...(endpoint ? { endpoint } : {}),
    ...(input.authKind === "bearer" && credential ? { credential } : {}),
  };
  const parsed = parseMcpServerUpdateInput(updateBody);
  if (!parsed.ok) {
    throw new Error(ERROR_MESSAGES[parsed.error.code] ?? ERROR_MESSAGES.invalid_input!);
  }
  return request<McpConnectionSummary>(
    input.server,
    input.token,
    `/connections/${encodeURIComponent(previous.id)}`,
    input.signal,
    parsed.value,
    "PATCH",
  );
}

export async function setMcpConfigurationEnabled(input: {
  server: string;
  token: string;
  signal: AbortSignal;
  connection: McpConnectionSummary;
  enabled: boolean;
}): Promise<McpConnectionSummary> {
  return request<McpConnectionSummary>(
    input.server,
    input.token,
    `/connections/${encodeURIComponent(input.connection.id)}/enabled`,
    input.signal,
    { expectedRevision: input.connection.revision, enabled: input.enabled },
    "PATCH",
  );
}

export async function deleteMcpConfiguration(input: {
  server: string;
  token: string;
  signal: AbortSignal;
  connection: McpConnectionSummary;
}): Promise<{ deleted: true; id: string }> {
  return request<{ deleted: true; id: string }>(
    input.server,
    input.token,
    `/connections/${encodeURIComponent(input.connection.id)}`,
    input.signal,
    { expectedRevision: input.connection.revision },
    "DELETE",
  );
}

export async function discoverMcpConfigurationTools(input: {
  server: string;
  token: string;
  signal: AbortSignal;
  connectionId: string;
}): Promise<DiscoveredMcpToolsResult> {
  return request<DiscoveredMcpToolsResult>(
    input.server,
    input.token,
    `/connections/${encodeURIComponent(input.connectionId)}/discover`,
    input.signal,
    undefined,
    "POST",
  );
}

// The link contract this section relies on: a client-side route target plus the
// card action styling. Declaring the props (instead of a bare `React.ElementType`)
// keeps the tag callable — an unparameterized `ElementType` is a union of every
// intrinsic tag and component, whose props collapse to `never`.
export type McpPresetLinkProps = {
  to: string;
  className?: string;
  children: React.ReactNode;
};

export const McpPresetEntries: React.FC<{
  LinkComponent: React.ComponentType<McpPresetLinkProps>;
}> = ({
  LinkComponent,
}) => (
  <>
    <div className="plugin-explore__section-head">
      <h2 className="plugin-explore__section-title">MCP 连接</h2>
      <p className="plugin-explore__section-desc">
        接入公网 HTTPS MCP 服务；工具调用经白名单过滤与每次调用确认门保护。
      </p>
    </div>
    <section className="plugin-card" data-testid="plugin-card-mcp">
      <header className="plugin-card__header">
        <h3 className="plugin-card__title">自定义 HTTPS MCP</h3>
      </header>
      <p className="plugin-card__desc">
        配置公网 HTTPS（Streamable HTTP）MCP 服务地址、Bearer 令牌与允许调用的工具白名单。
      </p>
      <div className="plugin-card__actions">
        <LinkComponent to="/plugins/mcp" className="plugin-card__configure">
          配置
        </LinkComponent>
      </div>
    </section>
    {MCP_PRESET_SPECS.map((preset) => (
      <section
        className="plugin-card"
        key={preset.id}
        data-testid={`plugin-card-mcp-${preset.id}`}
      >
        <header className="plugin-card__header">
          <h3 className="plugin-card__title">{preset.title}</h3>
        </header>
        <p className="plugin-card__desc">{preset.summary}</p>
        <div className="plugin-card__actions">
          <LinkComponent
            to={`/plugins/mcp-${preset.id}`}
            className="plugin-card__configure"
          >
            配置
          </LinkComponent>
        </div>
      </section>
    ))}
  </>
);

export default function McpConnectionsPanel({
  server,
  token,
  presetId,
}: {
  server: string;
  token: string | null | undefined;
  presetId?: McpPresetId;
}) {
  // Remount on server/token/preset change: aborts in-flight requests and drops sensitive inputs immediately.
  const identity = useRef({ server, token, presetId, generation: 0 });
  if (
    identity.current.server !== server ||
    identity.current.token !== token ||
    identity.current.presetId !== presetId
  ) {
    identity.current = {
      server,
      token,
      presetId,
      generation: identity.current.generation + 1,
    };
  }
  return (
    <McpSettings
      key={identity.current.generation}
      server={server}
      token={token}
      presetId={presetId}
    />
  );
}

function McpSettings({
  server,
  token,
  presetId,
}: {
  server: string;
  token: string | null | undefined;
  presetId?: McpPresetId;
}) {
  const preset = presetId ? getMcpPresetSpec(presetId) : undefined;
  const defaultAuthKind = preset?.defaultAuthKind ?? "none";

  const [connections, setConnections] = useState<McpConnectionSummary[]>([]);
  const [previous, setPrevious] = useState<McpConnectionSummary | undefined>(undefined);
  const [labelValue, setLabelValue] = useState(preset?.title ?? "");
  const [allowedToolsInput, setAllowedToolsInput] = useState("");
  const [readPoliciesInput, setReadPoliciesInput] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [authKind, setAuthKind] = useState<"none" | "bearer">(defaultAuthKind);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [discoveredTools, setDiscoveredTools] = useState<DiscoveredMcpTool[]>([]);
  const [discoveringId, setDiscoveringId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  const aliveRef = useRef(true);
  const activeAbortRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const endpointInputRef = useRef<HTMLInputElement | null>(null);
  const credentialInputRef = useRef<HTMLInputElement | null>(null);

  const clearSensitiveInputs = () => {
    if (endpointInputRef.current) endpointInputRef.current.value = "";
    if (credentialInputRef.current) credentialInputRef.current.value = "";
  };

  const resetFormToCreate = () => {
    clearSensitiveInputs();
    setPrevious(undefined);
    setDiscoveredTools([]);
    setLabelValue(preset?.title ?? "");
    setAllowedToolsInput("");
    setReadPoliciesInput("");
    setEnabled(false);
    setAuthKind(defaultAuthKind);
  };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
      clearSensitiveInputs();
      formRef.current?.reset();
    };
  }, []);

  useEffect(() => {
    if (!token || !server) return;
    const controller = new AbortController();
    setLoading(true);
    request<McpConnectionSummary[]>(server, token, "/connections", controller.signal)
      .then((value) => {
        if (!controller.signal.aborted && aliveRef.current) {
          setConnections(value);
          setError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted && aliveRef.current) {
          setError("无法读取连接列表，请检查登录状态、服务器地址或网络后刷新。");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && aliveRef.current) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [server, token, reload]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !server || busy || loading || activeAbortRef.current) return;

    const endpoint = endpointInputRef.current?.value ?? "";
    const credential = credentialInputRef.current?.value ?? "";
    // Sensitive values are read once from uncontrolled DOM inputs and cleared immediately.
    clearSensitiveInputs();

    const controller = new AbortController();
    activeAbortRef.current = controller;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await saveMcpConfiguration({
        server,
        token,
        signal: controller.signal,
        label: labelValue,
        endpoint,
        credential,
        authKind,
        enabled,
        allowedToolNames: allowedToolsInput,
        readPolicies: readPoliciesInput,
        presetId: previous?.presetId ?? presetId,
        previous,
      });
      if (!aliveRef.current || controller.signal.aborted) return;
      setNotice("配置已加密保存；尚未验证远端连接或发现工具。");
      setConfirmDeleteId(null);
      resetFormToCreate();
      setReload((value) => value + 1);
    } catch (failure) {
      if (aliveRef.current && !controller.signal.aborted) {
        setError(
          failure instanceof Error && !(failure instanceof TypeError)
            ? failure.message
            : "保存未完成，请核对配置后重新输入敏感信息。",
        );
      }
    } finally {
      if (aliveRef.current) {
        activeAbortRef.current = null;
        setBusy(false);
      }
    }
  }

  async function handleToggle(connection: McpConnectionSummary) {
    if (!token || !server || busy || loading || activeAbortRef.current) return;
    const controller = new AbortController();
    activeAbortRef.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await setMcpConfigurationEnabled({
        server,
        token,
        signal: controller.signal,
        connection,
        enabled: !connection.enabled,
      });
      if (!aliveRef.current || controller.signal.aborted) return;
      setConnections((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      setPrevious((current) => (current?.id === updated.id ? updated : current));
      setNotice(updated.enabled ? "配置已启用；不代表已验证连接。" : "配置已禁用。");
    } catch (failure) {
      if (aliveRef.current && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "启停未完成，请刷新列表核对。");
      }
    } finally {
      if (aliveRef.current) {
        activeAbortRef.current = null;
        setBusy(false);
      }
    }
  }

  async function handleDelete(connection: McpConnectionSummary) {
    if (!token || !server || busy || loading || activeAbortRef.current) return;
    const controller = new AbortController();
    activeAbortRef.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteMcpConfiguration({
        server,
        token,
        signal: controller.signal,
        connection,
      });
      if (!aliveRef.current || controller.signal.aborted) return;
      setConnections((current) => current.filter((row) => row.id !== connection.id));
      setConfirmDeleteId(null);
      if (previous?.id === connection.id) {
        resetFormToCreate();
      }
      setNotice("连接及其关联加密凭据已删除。");
    } catch (failure) {
      if (aliveRef.current && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "删除未完成，请刷新列表核对。");
      }
    } finally {
      if (aliveRef.current) {
        activeAbortRef.current = null;
        setBusy(false);
      }
    }
  }

  function handleEdit(connection: McpConnectionSummary) {
    clearSensitiveInputs();
    setConfirmDeleteId(null);
    setDiscoveredTools([]);
    setPrevious(connection);
    setLabelValue(connection.label);
    setAllowedToolsInput(connection.allowedToolNames.join(", "));
    setReadPoliciesInput(formatReadPoliciesInput(connection.readPolicies));
    setEnabled(connection.enabled);
    setAuthKind(connection.authKind === "bearer" ? "bearer" : "none");
    setError("");
    setNotice("");
    labelInputRef.current?.focus();
  }

  async function handleDiscover(connection: McpConnectionSummary) {
    if (!token || !server || busy || loading || activeAbortRef.current) return;
    handleEdit(connection);
    const controller = new AbortController();
    activeAbortRef.current = controller;
    setBusy(true);
    setDiscoveringId(connection.id);
    setError("");
    setNotice("");
    try {
      const discovered = await discoverMcpConfigurationTools({
        server,
        token,
        signal: controller.signal,
        connectionId: connection.id,
      });
      if (!aliveRef.current || controller.signal.aborted) return;
      setDiscoveredTools(discovered.tools);
      setNotice(
        discovered.tools.length
          ? `已发现 ${discovered.tools.length} 个远端工具；勾选后点「保存更新」即可生效。`
          : "连接成功，但远端服务未返回可用工具。",
      );
    } catch (failure) {
      if (aliveRef.current && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "发现远端工具失败，请检查地址与令牌。");
      }
    } finally {
      if (aliveRef.current) {
        activeAbortRef.current = null;
        setDiscoveringId(null);
        setBusy(false);
      }
    }
  }

  function toggleDiscoveredTool(tool: DiscoveredMcpTool, checked: boolean) {
    let currentPolicies: McpReadPolicy[];
    try {
      currentPolicies = parseReadPoliciesInput(readPoliciesInput);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? `${failure.message}（请先修正参数审计策略草稿，再勾选或取消工具）`
          : "当前参数审计策略草稿格式有误，请先修正后再操作。",
      );
      return;
    }

    const currentAllowed = parseAllowedToolNames(allowedToolsInput);
    const nextAllowed = checked
      ? [...new Set([...currentAllowed, tool.name])]
      : currentAllowed.filter((name) => name !== tool.name);

    const nextPolicies = checked
      ? currentPolicies.some((policy) => policy.toolName === tool.name)
        ? currentPolicies
        : [
            ...currentPolicies,
            {
              toolName: tool.name,
              arguments: Object.fromEntries(tool.argumentKeys.map((key) => [key, [] as JsonValue[]])),
            },
          ]
      : currentPolicies.filter((policy) => policy.toolName !== tool.name);

    setError("");
    setAllowedToolsInput(nextAllowed.join(", "));
    setReadPoliciesInput(formatReadPoliciesInput(nextPolicies));
  }

  function handleSelectAllCompatibleTools() {
    let currentPolicies: McpReadPolicy[];
    try {
      currentPolicies = parseReadPoliciesInput(readPoliciesInput);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? `${failure.message}（请先修正参数审计策略草稿，再补选工具）`
          : "当前参数审计策略草稿格式有误，请先修正后再操作。",
      );
      return;
    }

    const compatible = discoveredTools.filter((tool) => tool.schemaCompatible);
    const currentAllowed = parseAllowedToolNames(allowedToolsInput);
    const nextAllowed = [...new Set([...currentAllowed, ...compatible.map((tool) => tool.name)])];
    const existingPolicyNames = new Set(currentPolicies.map((policy) => policy.toolName));
    const addedPolicies: McpReadPolicy[] = compatible
      .filter((tool) => !existingPolicyNames.has(tool.name))
      .map((tool) => ({
        toolName: tool.name,
        arguments: Object.fromEntries(tool.argumentKeys.map((key) => [key, [] as JsonValue[]])),
      }));

    setError("");
    setAllowedToolsInput(nextAllowed.join(", "));
    setReadPoliciesInput(formatReadPoliciesInput([...currentPolicies, ...addedPolicies]));
  }

  const endpointKeepExisting = Boolean(previous?.endpointConfigured);
  const credentialKeepExisting = Boolean(
    previous && previous.credentialConfigured && previous.authKind === "bearer",
  );

  return (
    <section
      className="plugin-card plugin-card--full mcp-settings"
      aria-label="MCP 连接配置"
      data-testid="mcp-connections-panel"
    >
      <div className="mcp-settings__intro">
        <h1 className="plugin-card__title">{preset?.title ?? "自定义 HTTPS MCP"}</h1>
        <p className="plugin-card__desc">
          {preset?.summary ??
            "管理服务端公网 HTTPS（Streamable HTTP）MCP 连接；保存配置不会立即发起网络连接，调用外部工具前须命中白名单并通过确认门。"}
        </p>
        {preset && <p className="mcp-settings__note">{preset.note}</p>}
      </div>

      {!token ? (
        <p className="plugin-unauth-prompt" role="status">
          请先登录后管理连接。
        </p>
      ) : !server ? (
        <p className="plugin-alert plugin-alert--error" role="alert">
          未配置服务器，无法管理连接。
        </p>
      ) : (
        <>
          <div className="mcp-settings__section">
            <div className="mcp-settings__heading">
              <h2 className="mcp-settings__subtitle">已保存配置</h2>
              <button
                type="button"
                className="mcp-settings__btn"
                disabled={busy || loading}
                onClick={() => setReload((value) => value + 1)}
              >
                刷新列表
              </button>
            </div>
            {loading ? (
              <p className="mcp-settings__empty" role="status">
                正在读取…
              </p>
            ) : !connections.length ? (
              <p className="mcp-settings__empty">暂无已保存的 MCP 连接。</p>
            ) : (
              <ul className="mcp-settings__list">
                {connections.map((connection) => {
                  const editable =
                    connection.placement.kind === "server" &&
                    connection.transportKind === "streamable-http" &&
                    connection.authKind !== "oauth" &&
                    (!presetId || connection.presetId === presetId);
                  const isServerPlacement = connection.placement.kind === "server";
                  const confirmingDelete = confirmDeleteId === connection.id;
                  return (
                    <li key={connection.id} className="mcp-settings__item">
                      <div className="mcp-settings__item-main">
                        <div className="mcp-settings__item-title">
                          <strong>{connection.label}</strong>
                          <span
                            className={`plugin-badge ${
                              connection.enabled
                                ? "plugin-badge--configured"
                                : "plugin-badge--unconfigured"
                            }`}
                          >
                            {connection.enabled ? "配置已启用" : "配置已禁用"}
                          </span>
                        </div>
                        <p className="mcp-settings__item-meta">
                          {connection.enabled ? "配置已启用" : "配置已禁用"} · 未验证连接 · 认证：
                          {connection.authKind === "bearer" ? "Bearer" : connection.authKind === "oauth" ? "OAuth" : "无"} · r
                          {connection.revision}
                        </p>
                        <p className="mcp-settings__item-tools">
                          允许工具白名单：
                          {connection.allowedToolNames.length > 0
                            ? connection.allowedToolNames.join(", ")
                            : "未配置（默认不允许调用任何工具）"}
                        </p>
                        {!editable && (
                          <p className="mcp-settings__item-meta">此入口暂不支持编辑该配置。</p>
                        )}
                      </div>
                      <div className="mcp-settings__item-actions">
                        <button
                          type="button"
                          className="mcp-settings__btn"
                          disabled={busy || loading || !editable}
                          onClick={() => void handleDiscover(connection)}
                        >
                          {discoveringId === connection.id ? "正在发现…" : "发现工具"}
                        </button>
                        <button
                          type="button"
                          className="mcp-settings__btn"
                          disabled={busy || loading || !editable}
                          onClick={() => handleEdit(connection)}
                        >
                          编辑配置
                        </button>
                        <button
                          type="button"
                          className="mcp-settings__btn"
                          disabled={busy || loading || !isServerPlacement}
                          onClick={() => void handleToggle(connection)}
                        >
                          {connection.enabled ? "禁用配置" : "启用配置"}
                        </button>
                        {confirmingDelete ? (
                          <>
                            <button
                              type="button"
                              className="mcp-settings__btn mcp-settings__btn--danger-confirm"
                              disabled={busy || loading || !isServerPlacement}
                              onClick={() => void handleDelete(connection)}
                            >
                              确认删除
                            </button>
                            <button
                              type="button"
                              className="mcp-settings__btn"
                              disabled={busy || loading}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              取消删除
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="mcp-settings__btn mcp-settings__btn--danger"
                            disabled={busy || loading || !isServerPlacement}
                            onClick={() => setConfirmDeleteId(connection.id)}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mcp-settings__section">
            <form
              ref={formRef}
              onSubmit={handleSave}
              autoComplete="off"
              className="mcp-settings__form"
            >
              <h2 className="mcp-settings__subtitle">
                {previous ? `编辑 ${previous.label}` : "新建连接"}
              </h2>
              {previous && (
                <p className="mcp-settings__hint">
                  已保存的加密地址与令牌不会明文回显；留空保持原密文不变，填写新值将在同一次提交中原子替换并清理旧密文。
                </p>
              )}
              <fieldset disabled={busy || loading} className="mcp-settings__fieldset">
                <label className="mcp-settings__field">
                  <span>连接名称</span>
                  <input
                    ref={labelInputRef}
                    name="label"
                    className="plugin-form-input"
                    required
                    maxLength={160}
                    value={labelValue}
                    onChange={(event) => setLabelValue(event.target.value)}
                    placeholder={preset?.title ?? "例如：团队知识库 MCP"}
                  />
                </label>

                <label className="mcp-settings__field">
                  <span>HTTPS 服务地址（Endpoint）</span>
                  <input
                    ref={endpointInputRef}
                    name="endpoint"
                    type="password"
                    className="plugin-form-input"
                    required={!endpointKeepExisting}
                    maxLength={16384}
                    autoComplete="new-password"
                    spellCheck={false}
                    autoCapitalize="none"
                    placeholder={
                      endpointKeepExisting
                        ? ENCRYPTED_KEEP_PLACEHOLDER
                        : preset?.endpointPlaceholder ?? "https://example.com/mcp"
                    }
                  />
                </label>

                <label className="mcp-settings__field">
                  <span>认证方式</span>
                  <select
                    name="authKind"
                    className="mcp-settings__select"
                    value={authKind}
                    onChange={(event) =>
                      setAuthKind(event.target.value as "none" | "bearer")
                    }
                  >
                    <option value="none">无额外认证（None）</option>
                    <option value="bearer">Bearer Token</option>
                  </select>
                </label>

                {authKind === "bearer" && (
                  <label className="mcp-settings__field">
                    <span>Bearer Token</span>
                    <input
                      ref={credentialInputRef}
                      name="credential"
                      type="password"
                      className="plugin-form-input"
                      required={!credentialKeepExisting}
                      maxLength={16384}
                      autoComplete="new-password"
                      spellCheck={false}
                      autoCapitalize="none"
                      placeholder={
                        credentialKeepExisting
                          ? ENCRYPTED_KEEP_PLACEHOLDER
                          : "输入长期访问令牌（保存后加密存储，不回显）"
                      }
                    />
                  </label>
                )}

                {discoveredTools.length > 0 && (
                  <div className="mcp-settings__discover">
                    <div className="mcp-settings__heading">
                      <span className="mcp-settings__discover-title">
                        远端工具清单（{discoveredTools.length}）
                      </span>
                      <button
                        type="button"
                        className="mcp-settings__btn"
                        onClick={handleSelectAllCompatibleTools}
                      >
                        补选全部兼容工具
                      </button>
                    </div>
                    <ul className="mcp-settings__discover-list">
                      {discoveredTools.map((tool) => {
                        const selected = parseAllowedToolNames(allowedToolsInput).includes(tool.name);
                        return (
                          <li key={tool.name} className="mcp-settings__discover-item">
                            <label className="mcp-settings__check">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={!tool.schemaCompatible}
                                onChange={(event) => toggleDiscoveredTool(tool, event.target.checked)}
                              />
                              <span>
                                <strong>{tool.name}</strong>
                                {tool.readOnlyHint === true ? "（只读）" : tool.readOnlyHint === false ? "（可写，需确认）" : ""}
                                {!tool.schemaCompatible ? " [Schema 暂不兼容]" : ""}
                              </span>
                            </label>
                            {tool.description && (
                              <p className="mcp-settings__item-meta">{tool.description}</p>
                            )}
                            <p className="mcp-settings__item-meta">
                              参数：{tool.argumentKeys.length ? tool.argumentKeys.join(", ") : "无参数"}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <label className="mcp-settings__field">
                  <span>允许调用的工具白名单（逗号或换行分隔）</span>
                  <textarea
                    name="allowedToolNames"
                    className="mcp-settings__textarea"
                    value={allowedToolsInput}
                    onChange={(event) => setAllowedToolsInput(event.target.value)}
                    placeholder="例如：search_messages, read_message（留空表示不允许调用任何工具）"
                  />
                  <span className="mcp-settings__hint">
                    仅白名单内的工具名可被模型请求调用；未列入白名单的工具一律拒绝执行。
                  </span>
                </label>

                <label className="mcp-settings__field">
                  <span>只读参数审计策略（readPolicies）</span>
                  <textarea
                    name="readPolicies"
                    className="mcp-settings__textarea"
                    value={readPoliciesInput}
                    onChange={(event) => setReadPoliciesInput(event.target.value)}
                    placeholder={"每行一个工具策略，例如：\nsearch_messages: query, limit\nread_message: messageId, markRead=false\nlist_folders:"}
                  />
                  <span className="mcp-settings__hint">
                    每个白名单工具均须显式声明允许传入的参数名（支持固定值如 markRead=false，无参数工具写“工具名:”，也支持标准 JSON 数组）；未声明的参数一律拒绝。
                  </span>
                </label>

                <label className="mcp-settings__check">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                  />
                  <span>启用配置（不会立即发起连接）</span>
                </label>

                <div className="mcp-settings__actions">
                  {previous && (
                    <button
                      type="button"
                      className="mcp-settings__btn"
                      onClick={() => {
                        setError("");
                        setNotice("");
                        resetFormToCreate();
                      }}
                    >
                      取消编辑
                    </button>
                  )}
                  <button type="submit" className="plugin-btn-save">
                    {busy ? "正在保存…" : previous ? "保存更新" : "保存配置"}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </>
      )}

      {error && (
        <p className="plugin-alert plugin-alert--error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mcp-settings__status" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
