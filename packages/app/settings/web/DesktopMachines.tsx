import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "app/routing";
import {
  LuArrowRight,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCopy,
  LuLaptop,
  LuPlay,
  LuRefreshCw,
  LuTerminal,
  LuTrash2,
} from "react-icons/lu";
import Button from "render/web/ui/Button";
import { useToken } from "identity";
import { useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { getIsDesktopApp } from "app/utils/env";
import { startDesktopLocalConnectorFromSession } from "app/utils/desktopLocalConnectorClient";
import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import { normalizeServerOrigin } from "core/serverOrigin";
import { asTrimmedString } from "core/trimmedString";
import { projectMachineSummary } from "./machineStatus";
import ExternalReaderStateCenter from "./ExternalReaderStateCenter";

type MachineSummary = {
  machineId: string;
  name: string;
  platform: string;
  arch: string;
  capabilities: string[];
  connectorStatus?: "connected" | "disconnected";
  status: "online" | "offline";
  lastSeenAt: number;
};

type MachineListResponse = {
  machines?: MachineSummary[];
};

type MachineTokenResponse = {
  ok?: boolean;
  apiKey?: string;
  error?: string;
};

type MachineSmokeResponse = {
  ok?: boolean;
  machineId?: string;
  cliProvider?: string;
  content?: string;
  model?: string;
  diagnostics?: {
    executable?: string;
    elapsedMs?: number;
  } | null;
  error?: string;
};

type CommandPlatform = "posix" | "windows";
type SmokeCliProvider = "codex" | "copilot" | "claude" | "agy" | "gemini" | "qoder" | "opencode" | "grok" | "kimi";

const CLI_CAPABILITIES = [
  { key: "codex-cli", label: "Codex", provider: "codex" },
  { key: "copilot-cli", label: "Copilot", provider: "copilot" },
  { key: "claude-code", label: "Claude", provider: "claude" },
  { key: "agy-cli", label: "Antigravity", provider: "agy" },
  { key: "qoder-cli", label: "Qoder", provider: "qoder" },
  { key: "gemini-cli", label: "Gemini", provider: "gemini" },
  { key: "opencode-cli", label: "OpenCode", provider: "opencode" },
  { key: "grok-cli", label: "Grok", provider: "grok" },
  { key: "kimi-cli", label: "Kimi Code", provider: "kimi" },
] satisfies Array<{
  key: string;
  label: string;
  provider: SmokeCliProvider;
}>;

type SmokeState = {
  key: string;
  status: "running" | "success" | "error";
  message: string;
};

const SMOKE_MARKER = "NOLO_MACHINE_SMOKE_OK";
const MACHINE_REFRESH_INTERVAL_MS = 15_000;
const MACHINE_CLOCK_TICK_MS = 5_000;

const SMOKE_PROVIDER_LABEL: Record<SmokeCliProvider, string> = {
  codex: "Codex",
  copilot: "Copilot",
  claude: "Claude",
  agy: "Antigravity",
  qoder: "Qoder",
  gemini: "Gemini",
  kimi: "Kimi Code",
  opencode: "OpenCode",
  grok: "Grok",
};

const SMOKE_SUCCESS_MESSAGES: Record<SmokeCliProvider, string> = {
  codex: "Codex responded successfully.",
  copilot: "Copilot responded successfully.",
  claude: "Claude responded successfully.",
  agy: "Antigravity responded successfully.",
  qoder: "Qoder responded successfully.",
  gemini: "Gemini responded successfully.",
  kimi: "Kimi Code responded successfully.",
  opencode: "OpenCode responded successfully.",
  grok: "Grok responded successfully.",
};

const SMOKE_UNVERIFIED_MESSAGES: Record<SmokeCliProvider, string> = {
  codex: "Codex returned a response, but the content did not contain the expected marker.",
  copilot: "Copilot returned a response, but the content did not contain the expected marker.",
  claude: "Claude returned a response, but the content did not contain the expected marker.",
  agy: "Antigravity returned a response, but the content did not contain the expected marker.",
  qoder: "Qoder returned a response, but the content did not contain the expected marker.",
  gemini: "Gemini returned a response, but the content did not contain the expected marker.",
  kimi: "Kimi Code returned a response, but the content did not contain the expected marker.",
  opencode: "OpenCode returned a response, but the content did not contain the expected marker.",
  grok: "Grok returned a response, but the content did not contain the expected marker.",
};

function errorMessageFromResponse(data: { error?: unknown }, fallback: string) {
  if (typeof data.error === "string") return data.error;
  if (data.error && typeof data.error === "object" && "message" in data.error) {
    const message = (data.error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function formatRelativeSeen(lastSeenAt: number) {
  if (!Number.isFinite(lastSeenAt) || lastSeenAt <= 0) return "unknown";
  const diffMs = Math.max(0, Date.now() - lastSeenAt);
  const diffSeconds = Math.round(diffMs / 1000);
  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(lastSeenAt).toLocaleString();
}

function formatSmokeDiagnostics(diagnostics: MachineSmokeResponse["diagnostics"]) {
  if (!diagnostics) return "";
  const parts = [
    asOptionalTrimmedString(diagnostics.executable) ?? null,
    Number.isFinite(diagnostics.elapsedMs)
      ? `${Math.round(Number(diagnostics.elapsedMs))}ms`
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? ` ${parts.join(" · ")}` : "";
}

function statusTone(machine: MachineSummary) {
  if (machine.status !== "online") return "offline";
  if (machine.connectorStatus !== "connected") return "warning";
  return "online";
}

function detectDefaultPlatform(): CommandPlatform {
  if (typeof navigator === "undefined") return "posix";
  const platform = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  return platform.includes("windows") || platform.includes("win32") ? "windows" : "posix";
}

function installNoloCli(args: {
  apiKey: string;
  platform: CommandPlatform;
  serverBase: string;
}) {
  if (args.platform === "windows") {
    const escapedServerBase = args.serverBase.replace(/'/g, "''");
    const escapedApiKey = args.apiKey.replace(/'/g, "''");
    const escapedInstallScriptUrl = `${args.serverBase}/api/machines/install.ps1`.replace(/'/g, "''");
    return `powershell -ExecutionPolicy Bypass -Command "& ([ScriptBlock]::Create((Invoke-RestMethod '${escapedInstallScriptUrl}'))) -ServerUrl '${escapedServerBase}' -MachineKey '${escapedApiKey}'"`;
  }

  return `curl -fsSL "${args.serverBase}/api/machines/install.sh" | bash -s -- --server-url "${args.serverBase}" --machine-key "${args.apiKey}"`;
}

const DesktopMachines: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<MachineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [machineApiKey, setMachineApiKey] = useState<string | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [connectCommandError, setConnectCommandError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [commandPlatform, setCommandPlatform] = useState<CommandPlatform>(() => detectDefaultPlatform());
  const [smokeState, setSmokeState] = useState<SmokeState | null>(null);
  const [disconnectingMachineId, setDisconnectingMachineId] = useState<string | null>(null);
  const [machineClock, setMachineClock] = useState(() => Date.now());
  const [desktopConnectorState, setDesktopConnectorState] = useState<
    "idle" | "starting" | "started" | "skipped" | "error"
  >("idle");
  const [desktopConnectorError, setDesktopConnectorError] = useState<string | null>(null);
  const currentToken = useToken();
  const currentServer = useAppSelector(selectCurrentServer);
  const isDesktop = getIsDesktopApp();

  const serverBase = useMemo(() => {
    const configured = normalizeServerOrigin(currentServer);
    if (configured) return configured;
    return typeof window !== "undefined" ? window.location.origin : "";
  }, [currentServer]);
  const externalReaderServerBase = useMemo(() => {
    if (isDesktop && typeof window !== "undefined") {
      return window.location.origin;
    }
    return serverBase;
  }, [isDesktop, serverBase]);
  const connectCommand = useMemo(() => {
    if (!machineApiKey) return "";
    return installNoloCli({
      apiKey: machineApiKey,
      platform: commandPlatform,
      serverBase,
    });
  }, [commandPlatform, machineApiKey, serverBase]);
  const desktopConnectorStatus = useMemo(() => {
    if (!isDesktop) return null;
    if (desktopConnectorState === "starting") {
      return {
        tone: "info",
        icon: <LuClock aria-hidden="true" />,
        title: t("settings.machines.desktopConnector.starting.title", "正在连接这台电脑"),
        message: t(
          "settings.machines.desktopConnector.starting.message",
          "Nolo Desktop 正在用当前登录账号启动本机后台连接。"
        ),
      };
    }
    if (desktopConnectorState === "started") {
      return {
        tone: "success",
        icon: <LuCircleCheck aria-hidden="true" />,
        title: t("settings.machines.desktopConnector.started.title", "本机后台连接已启动"),
        message: t(
          "settings.machines.desktopConnector.started.message",
          "这台电脑会自动出现在下面的电脑列表里。"
        ),
      };
    }
    if (desktopConnectorState === "skipped") {
      return {
        tone: "success",
        icon: <LuCircleCheck aria-hidden="true" />,
        title: t(
          "settings.machines.desktopConnector.skipped.title",
          "本机后台连接已在运行"
        ),
        message: t(
          "settings.machines.desktopConnector.skipped.message",
          "如果列表还没刷新出来，可以手动刷新或复制下面命令兜底连接。"
        ),
      };
    }
    if (desktopConnectorState === "error") {
      return {
        tone: "warning",
        icon: <LuCircleX aria-hidden="true" />,
        title: t("settings.machines.desktopConnector.error.title", "本机后台连接启动失败"),
        message:
          desktopConnectorError ||
          t(
            "settings.machines.desktopConnector.error.message",
            "可以重试，或复制下面命令在终端里手动连接。"
          ),
      };
    }
    return null;
  }, [desktopConnectorError, desktopConnectorState, isDesktop]);

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${serverBase}/api/machines`, {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json().catch(() => ({})) as MachineListResponse & { error?: string };
      if (!response.ok) {
        if (isDesktop && response.status === 401) {
          setMachines([]);
          setError(null);
          return;
        }
        throw new Error(errorMessageFromResponse(data, "Failed to load connected computers"));
      }
      setMachines(Array.isArray(data.machines) ? data.machines : []);
      setError(null);
    } catch (fetchError) {
      if (isDesktop) {
        setMachines([]);
        setError(null);
        return;
      }
      setError(toErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [currentToken, isDesktop, serverBase]);

  useEffect(() => {
    if (currentToken) void fetchMachines();
  }, [currentToken, fetchMachines]);

  useEffect(() => {
    if (!currentToken) return undefined;
    const interval = window.setInterval(() => {
      void fetchMachines();
    }, MACHINE_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [currentToken, fetchMachines]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMachineClock(Date.now());
    }, MACHINE_CLOCK_TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  const startDesktopConnector = useCallback(async () => {
    if (!isDesktop || !currentToken || !serverBase) return;
    setDesktopConnectorState("starting");
    setDesktopConnectorError(null);
    const result = await startDesktopLocalConnectorFromSession({
      serverUrl: serverBase,
      authToken: currentToken,
    });
    if (result.ok) {
      setDesktopConnectorState(result.status === "started" ? "started" : "skipped");
      setDesktopConnectorError(null);
      setTimeout(() => void fetchMachines(), 1200);
      return;
    }
    setDesktopConnectorState("error");
    setDesktopConnectorError(result.error || "Failed to start desktop connector");
  }, [currentToken, fetchMachines, isDesktop, serverBase]);

  useEffect(() => {
    if (!isDesktop || !currentToken || !serverBase || desktopConnectorState !== "idle") return;
    void startDesktopConnector();
  }, [currentToken, desktopConnectorState, isDesktop, serverBase, startDesktopConnector]);

  const sortedMachines = useMemo(
    () =>
      machines
        .map((machine) => projectMachineSummary(machine, machineClock))
        .sort((a, b) => b.lastSeenAt - a.lastSeenAt),
    [machineClock, machines]
  );

  const createConnectScript = useCallback(async () => {
    if (!currentToken) {
      setConnectCommandError(t("settings.machines.loginRequired", "请先登录后再生成连接命令。"));
      return;
    }

    setCreatingToken(true);
    setConnectCommandError(null);
    try {
      const response = await fetch(`${serverBase}/api/machines/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ name: "Nolo daemon" }),
      });
      const data = await response.json().catch(() => ({})) as MachineTokenResponse;
      if (!response.ok || !data.apiKey) {
        throw new Error(errorMessageFromResponse(data, "Failed to create machine token"));
      }
      setMachineApiKey(data.apiKey);
      setCopied(false);
      setConnectCommandError(null);
    } catch (tokenError) {
      setConnectCommandError(toErrorMessage(tokenError));
    } finally {
      setCreatingToken(false);
    }
  }, [currentToken, serverBase]);

  const copyConnectScript = useCallback(async () => {
    if (!connectCommand || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(connectCommand);
    setCopied(true);
  }, [connectCommand]);

  const runMachineSmoke = useCallback(async (machineId: string, cliProvider: SmokeCliProvider) => {
    const key = `${machineId}:${cliProvider}`;
    setSmokeState({
      key,
      status: "running",
      message: t("settings.machines.smokeRunning", "正在测试 {{label}}...", {
        label: SMOKE_PROVIDER_LABEL[cliProvider],
      }),
    });

    try {
      const response = await fetch(`${serverBase}/api/machines/smoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ machineId, cliProvider }),
      });
      const data = await response.json().catch(() => ({})) as MachineSmokeResponse;
      if (!response.ok || !data.ok) {
        throw new Error(errorMessageFromResponse(data, t("settings.machines.smokeFailed", "测试失败")));
      }
      const content = asTrimmedString(data.content);
      const diagnostics = formatSmokeDiagnostics(data.diagnostics);
      setSmokeState({
        key,
        status: content.includes(SMOKE_MARKER) ? "success" : "error",
        message: content.includes(SMOKE_MARKER)
          ? `${SMOKE_SUCCESS_MESSAGES[cliProvider]}${diagnostics}`
          : `${SMOKE_UNVERIFIED_MESSAGES[cliProvider]} 返回：${content || "(empty)"}`,
      });
    } catch (smokeError) {
      setSmokeState({
        key,
        status: "error",
        message:
          smokeError instanceof Error
            ? smokeError.message
            : t("settings.machines.smokeFailed", "测试失败"),
      });
    }
  }, [currentToken, serverBase]);

  const disconnectMachine = useCallback(async (machine: MachineSummary) => {
    const confirmed = typeof window === "undefined"
      ? true
      : window.confirm(t(
          "settings.machines.disconnectConfirm",
          "移除 {{name}}？这会撤销当前连接脚本的密钥。",
          { name: machine.name },
        ));
    if (!confirmed) return;

    setDisconnectingMachineId(machine.machineId);
    try {
      const response = await fetch(`${serverBase}/api/machines/${encodeURIComponent(machine.machineId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        throw new Error(errorMessageFromResponse(data, "Failed to disconnect computer"));
      }
      setMachines((current) => current.filter((item) => item.machineId !== machine.machineId));
      setSmokeState((current) =>
        current?.key.startsWith(`${machine.machineId}:`) ? null : current
      );
      setError(null);
    } catch (disconnectError) {
      setError(toErrorMessage(disconnectError));
    } finally {
      setDisconnectingMachineId(null);
    }
  }, [currentToken, serverBase, t]);

  const openAgentCreateForm = useCallback((machine: MachineSummary, cliProvider: SmokeCliProvider) => {
    const params = new URLSearchParams({
      apiSource: "cli",
      cliProvider,
      machineId: machine.machineId,
      machineName: machine.name,
    });
    navigate(`/create/agent?${params.toString()}`);
  }, [navigate]);

  if (!currentToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="desktop-machines-page">
      <div className="desktop-machines-header">
        <div>
          <h1 className="page-title">{t("settings.machines.title", "电脑")}</h1>
          <p className="desktop-machines-subtitle">
              {t(
                "settings.machines.subtitle",
                "在要连接的电脑上运行下面命令，Nolo 会按需安装 nolo-cli，并连接这台电脑上的 CLI 能力。"
              )}
            </p>
        </div>
        <div className="desktop-machines-actions">
          <Button
            variant="secondary"
            icon={<LuRefreshCw aria-hidden="true" />}
            loading={loading}
            onClick={() => void fetchMachines()}
          >
            {t("common.refresh", "刷新")}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="desktop-machine-alert desktop-machine-alert--error">
          {error}
        </div>
      ) : null}

      {desktopConnectorStatus ? (
        <div className={`desktop-machine-alert desktop-machine-alert--${desktopConnectorStatus.tone}`}>
          {desktopConnectorStatus.icon}
          <div className="desktop-machine-alert__body">
            <strong>{desktopConnectorStatus.title}</strong>
            <p>{desktopConnectorStatus.message}</p>
          </div>
          {desktopConnectorState === "error" ? (
            <Button
              variant="secondary"
              icon={<LuRefreshCw aria-hidden="true" />}
              onClick={() => void startDesktopConnector()}
            >
              {t("common.retry", "重试")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <ExternalReaderStateCenter currentToken={currentToken} serverBase={externalReaderServerBase} isDesktop={isDesktop} />

      <div className="desktop-machine-connect">
        <div className="desktop-machine-connect__header">
          <div>
            <strong>{t("settings.machines.connectCommand.title", "安装 nolo 并连接新电脑")}</strong>
            <p>
              {t(
                "settings.machines.connectCommand.cliDesc",
                "选择目标电脑的系统，然后复制命令到那台电脑运行。它会按需安装 nolo-cli，然后执行 nolo connect。"
              )}
            </p>
          </div>
          <div className="desktop-machine-connect__actions">
            <div className="desktop-machine-platform-tabs" role="tablist" aria-label={t("settings.machines.connectCommand.platformLabel", "连接命令系统")}>
              <button
                type="button"
                role="tab"
                aria-selected={commandPlatform === "posix"}
                className={commandPlatform === "posix" ? "is-active" : ""}
                onClick={() => {
                  setCommandPlatform("posix");
                  setCopied(false);
                }}
              >
                Mac / Linux
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={commandPlatform === "windows"}
                className={commandPlatform === "windows" ? "is-active" : ""}
                onClick={() => {
                  setCommandPlatform("windows");
                  setCopied(false);
                }}
              >
                Windows
              </button>
            </div>
            <Button
              variant="secondary"
              icon={<LuCopy aria-hidden="true" />}
              disabled={!connectCommand}
              onClick={() => void copyConnectScript()}
            >
              {copied ? t("common.copied", "已复制") : t("common.copy", "复制")}
            </Button>
            <Button
              variant="secondary"
              loading={creatingToken}
              onClick={() => void createConnectScript()}
            >
              {machineApiKey
                ? t("settings.machines.rotateCommand", "重新生成密钥")
                : t("settings.machines.generateCommand", "生成密钥")}
            </Button>
          </div>
        </div>
        {connectCommandError ? (
          <div className="desktop-machine-command-error">
            {connectCommandError}
          </div>
        ) : null}
        <pre>{connectCommand || t("settings.machines.commandEmpty", "需要连接另一台电脑时，先生成密钥再复制命令。")}</pre>
      </div>

      {!loading && sortedMachines.length === 0 ? (
        <div className="desktop-machine-empty">
          <LuLaptop size={22} aria-hidden="true" />
          <div>
            <strong>{t("settings.machines.empty.title", "还没有连接的电脑")}</strong>
            <p>
              {t(
                "settings.machines.empty.desc",
                "上面的命令运行成功后，这里会显示电脑状态和可用的本机 CLI Agent。"
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="desktop-machine-list">
        {sortedMachines.map((machine) => {
          const tone = statusTone(machine);
          const online = tone === "online";
          const connected = machine.connectorStatus === "connected";
          const availableCapabilities = CLI_CAPABILITIES.filter((capability) =>
            machine.capabilities.includes(capability.key)
          );
          return (
            <article key={machine.machineId} className={`desktop-machine desktop-machine--${tone}`}>
              <div className="desktop-machine__main">
                <div className="desktop-machine__icon">
                  <LuLaptop size={20} aria-hidden="true" />
                </div>
                <div className="desktop-machine__body">
                  <div className="desktop-machine__title-row">
                    <h2>{machine.name}</h2>
                    <div className="desktop-machine__title-actions">
                      <span className="desktop-machine__badge">
                        {online
                          ? t("settings.machines.connected", "已连接")
                          : tone === "warning"
                            ? t("settings.machines.onlineNoWs", "电脑在线，等待任务通道")
                            : t("settings.machines.offline", "离线")}
                      </span>
                      <Button
                        variant="secondary"
                        icon={<LuTrash2 aria-hidden="true" />}
                        loading={disconnectingMachineId === machine.machineId}
                        onClick={() => void disconnectMachine(machine)}
                      >
                        {t("settings.machines.disconnect", "移除")}
                      </Button>
                    </div>
                  </div>
                  <div className="desktop-machine__meta">
                    <span>{machine.platform}/{machine.arch}</span>
                    <span>{t("settings.machines.lastSeen", "最近")} {formatRelativeSeen(machine.lastSeenAt)}</span>
                  </div>
                </div>
              </div>

              <div className="desktop-machine__connection">
                <span>
                  {online ? <LuCircleCheck aria-hidden="true" /> : <LuCircleX aria-hidden="true" />}
                  {online ? t("settings.machines.computerReachable", "电脑在线") : t("settings.machines.computerOffline", "电脑离线")}
                </span>
                <span>
                  {connected ? <LuCircleCheck aria-hidden="true" /> : <LuClock aria-hidden="true" />}
                  {connected ? t("settings.machines.readyForTasks", "可接收任务") : t("settings.machines.waitingForDaemon", "等待后台连接")}
                </span>
              </div>

              <div className="desktop-machine__agents">
                {CLI_CAPABILITIES.map((capability) => {
                  const available = machine.capabilities.includes(capability.key);
                  const smokeKey = `${machine.machineId}:${capability.provider}`;
                  const isRunning =
                    smokeState?.key === smokeKey && smokeState.status === "running";
                  return (
                    <div
                      key={capability.key}
                      className={`desktop-machine-agent ${available ? "desktop-machine-agent--available" : "desktop-machine-agent--missing"}`}
                    >
                      <div className="desktop-machine-agent__main">
                        <div className="desktop-machine-agent__label">
                          <LuTerminal aria-hidden="true" />
                          <span>{capability.label}</span>
                        </div>
                        <p>
                          {available
                            ? t(
                                `settings.machines.cliHelp`,
                                "使用这台电脑上的 {{label}} CLI 执行任务。",
                                { label: capability.label }
                              )
                            : t("settings.machines.cliMissing", "这台电脑还没有检测到这个 CLI。")}
                        </p>
                      </div>
                      {available && connected ? (
                        <div className="desktop-machine-agent__actions">
                          <Button
                            variant="primary"
                            icon={<LuArrowRight aria-hidden="true" />}
                            onClick={() => openAgentCreateForm(machine, capability.provider)}
                          >
                            {t("settings.machines.createAgent", "创建 AI")}
                          </Button>
                          <Button
                            variant="secondary"
                            icon={<LuPlay aria-hidden="true" />}
                            loading={isRunning}
                            onClick={() => void runMachineSmoke(machine.machineId, capability.provider)}
                          >
                            {t("settings.machines.testCli", "测试")}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {connected && availableCapabilities.length === 0 ? (
                <div className="desktop-machine__hint">
                {t("settings.machines.noCliHint", "这台电脑已连接，但还没有检测到 Codex、Copilot、Claude、Qoder 或 Gemini。安装 CLI 后重启连接脚本即可自动识别。")}
                </div>
              ) : null}

              {smokeState?.key.startsWith(`${machine.machineId}:`) ? (
                <div className={`desktop-machine__smoke-result desktop-machine__smoke-result--${smokeState.status}`}>
                  {smokeState.status === "success" ? <LuCircleCheck aria-hidden="true" /> : <LuCircleX aria-hidden="true" />}
                  <span>{smokeState.message}</span>
                </div>
              ) : null}

            </article>
          );
        })}
      </div>
    </div>
  );
};

export default DesktopMachines;
