import { toErrorMessage } from "core/errorMessage";
import type { MachineHeartbeat } from "connector-experimental/protocol";
import type { CliKvDb } from "./client/hybridRecordStore";
import type { EnvLike } from "./cliEnvHelpers";
import type { CliFetchImpl } from "./cliFetch";

export type OutputLike = { write(chunk: string): unknown };

export type SmokeWebSocketOptions = {
  headers: Record<string, string>;
  onMessage: (message: string) => void | Promise<void>;
  onOpen: () => void | Promise<void>;
  sentMessages: string[];
};

export type LocalCliExecutor = (
  provider: string,
  prompt: string,
  options: {
    model?: string;
    timeout?: number;
    cwd?: string;
    yolo?: boolean;
    reasoningEffort?: "low" | "medium" | "high" | "xhigh" | "max" | "ultra";
  }
) => Promise<{ text: string; raw?: string; elapsed?: number }>;

export type LocalRuntimeProbeResult = {
  ok: boolean;
  dbPath: string;
  authorityDriver?: string;
  authorityEndpoint?: string;
  authorityMetadataPath?: string;
  authorityHealthPath?: string;
  authorityHealthy?: boolean;
  authorityError?: string;
  agentFound: boolean;
  agentKey?: string;
  error?: string;
};

export type AgentCommandDeps = {
  env?: EnvLike;
  output?: OutputLike;
  error?: OutputLike;
  db?: CliKvDb;
  /**
   * 凭据 broker 注入（测试用）。生产缺省走严格宿主安全存储
   * （`createStrictHostCredentialBroker`），不回退明文文件。
   */
  credentialBroker?: import("agent-runtime/credentialBroker").CredentialBroker;
  /**
   * 宿主可信确认通道（TUI / desktop 注入）。返回值只能由宿主产生；
   * CLI 批处理模式不提供 → 拿不到 grant，本机凭据一律不外发。
   */
  confirmCredentialUse?: (
    gate: import("agent-runtime/actionGate").ActionGate,
  ) => Promise<import("agent-runtime/actionGate").ActionGateResult>;
  /** 当前设备 id（写进 grant，模型不可提供）。 */
  deviceId?: string;
  /**
   * 宿主在**真实批准之后**传入的批准事件（`ActionGate.id`）。
   * 只有宿主进程内调用链能提供；CLI 独立进程没有它 → 本机凭据一律不外发。
   */
  hostApproval?: { gateId: string };
  fetchImpl?: CliFetchImpl;
  fallbackFetchImpl?: CliFetchImpl;
  machineInfo?: () => MachineHeartbeat;
  connectWebSocket?: (url: string, options: SmokeWebSocketOptions) => Promise<void>;
  executeCli?: LocalCliExecutor;
  connectorRunMessageHandler?: (
    machine: MachineHeartbeat,
    message: string,
    pushMessage: (response: string) => void,
    executeCli: LocalCliExecutor,
    env: EnvLike,
    fetchImpl: CliFetchImpl
  ) => Promise<void>;
  localRuntimeProbe?: (env: EnvLike) => Promise<LocalRuntimeProbeResult>;
  /** dialog 本地读取注入（测试用；CLI-home 缺省通过 authority broker 读取）。 */
  readLocalDialog?: (args: {
    dialogKey: string;
    dialogId: string;
    limit: number;
  }) => Promise<{ meta: any; msgs: any[] }>;
  /** dialog 回退候选库读取注入（测试用；缺省按 dbPath 临时开库读取）。 */
  readLocalDialogAtDbPath?: (args: {
    dbPath: string;
    dialogKey: string;
    dialogId: string;
    limit: number;
  }) => Promise<{ meta: any; msgs: any[] }>;
};

async function getDefaultCliDb() {
  const { getDefaultCliLocalRuntimeDb } = await import("./localRuntimeDb");
  return getDefaultCliLocalRuntimeDb();
}

function createNullCliDb(): CliKvDb {
  return {
    get: async () => {
      throw new Error("local cache unavailable");
    },
    put: async () => undefined,
    del: async () => undefined,
    batch: async () => undefined,
    iterator: () => {
      throw new Error("local cache unavailable");
    },
  };
}

export async function getReadableCliDb(output: OutputLike) {
  try {
    return await getDefaultCliDb();
  } catch (error) {
    output.write(
      `[nolo] local agent cache unavailable; falling back to remote reads only: ${toErrorMessage(error)}\n`
    );
    return createNullCliDb();
  }
}
