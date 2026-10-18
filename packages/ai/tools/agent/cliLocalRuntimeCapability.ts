// packages/ai/tools/agent/cliLocalRuntimeCapability.ts
//
// **唯一能力表**：`runtimeKey → 各宿主能否如实兑现`。
//
// 为什么单独一份：这项能力在仓库里曾被写了三份真值 ——
//   - `runtimeKeyDispatchGuard.ts` 的 `CLI_LOCAL_FULFILLABLE_RUNTIME_KEYS`
//   - `packages/cli/client/localDockerWorkload.ts` 的 `isDockerRuntimeKey` /
//     `isLocallyUnfulfillableRuntimeKey`
//   - `packages/cli/agentRunArgs.ts` 的 `isValidRuntimeKey`
// 三份各自演化过，docker 的短形式（裸 `docker` vs `docker:<id>`）正是踩过的那次：
// 同一 key 在一处放行、在另一处被拒，症状是「以为在沙盒里，其实落在宿主 cwd」。
// 现在只有这里可以写形态正则，其余模块只能 import 或从本表派生。
//
// 覆盖两件事，且**分开**表达（合并会再次丢掉其中一件）：
//   1. `fulfillableByCliLocal`：cli-local 派发通道（本机宿主进程内 spawn 子 run）
//      能不能如实兑现。不能兑现必须在派发前显式失败，禁止回落宿主。
//   2. `acceptedByCliArgs`：`nolo agent run --runtime-key <key>` 的参数校验是否接受。
//      参数层放行 ≠ 本机能兑现：`runtime-v1:...` 长形式属于「接受并转发给服务端」，
//      本机通道兑现不了它。
//
// 本模块必须保持零依赖（`packages/cli/agentRunArgs.ts` 等纯参数层也用），
// 不许 import 运行时/服务端代码。

/** 本机 CLI 能兑现的两种执行面。 */
export type CliLocalExecutionTarget = "host" | "docker-sandbox";

/** runtimeKey 的形态分类（用于报错文案与断言，不用于授权判定）。 */
export type RuntimeKeyKind =
  | "explicit-host"
  | "server"
  | "docker"
  | "docker-invalid"
  | "machine"
  | "machine-invalid"
  | "instabox"
  | "gcp"
  | "runtime-v1"
  | "unknown";

export type CliLocalRuntimeKeyCapability = {
  /** 原始输入（未 trim，报错文案要逐字回放用户给的那个）。 */
  readonly raw: string;
  /** trim 后的 key（空串表示「未指定」）。 */
  readonly key: string;
  readonly kind: RuntimeKeyKind;
  /**
   * cli-local 派发通道能否如实兑现。false → 派发前必须显式失败：
   * 零 spawn、零 run 记录、绝不回落宿主 cwd。
   */
  readonly fulfillableByCliLocal: boolean;
  /** 可兑现时子 run 的实际执行面；不可兑现为 null。 */
  readonly target: CliLocalExecutionTarget | null;
  /** 兑现需要本机 sbx 云沙盒（账户绑定 + 额度可核实）在开跑前通过闸门。 */
  readonly requiresDockerSandbox: boolean;
  /** `nolo agent run --runtime-key` 的参数校验是否接受该形态。 */
  readonly acceptedByCliArgs: boolean;
  /** 一句话说明（可操作、可贴进报错）。 */
  readonly note: string;
};

/**
 * docker 形态的唯一正则：裸 `docker`（缺省 runtimeId）与 `docker:<runtimeId>`。
 *
 * 注意与服务端的差异（实测，勿再对齐成「一致」）：服务端
 * `parseRuntimeKey("docker")` 是 `invalid_runtime_key`（runtimeTarget.ts /
 * runtimeTarget.test.ts:848），只接受 `docker:<id>` 与长形式
 * `runtime-v1:<scope>:<owner>:docker[:<id>]`。本机 CLI 接受裸 `docker` 是因为
 * 它由本机 sbx 通道（localDockerWorkload）自己兑现，不经服务端解析。
 */
export const DOCKER_RUNTIME_KEY_RE = /^docker(?::.+)?$/;

/** 裸 docker 或 `docker:<runtimeId>`（id 非空）。唯一 docker 形态判定入口。 */
export function isDockerRuntimeKey(runtimeKey: string): boolean {
  const key = runtimeKey.trim();
  if (!DOCKER_RUNTIME_KEY_RE.test(key)) return false;
  if (key === "docker") return true;
  return key.slice("docker:".length).trim().length > 0;
}

/** 派生结论：该 key 是否正好是 docker 族（裸 docker 或合法 `docker:<id>`）。 */
export function cliLocalDockerCapabilityOf(
  runtimeKey: string,
): Pick<CliLocalRuntimeKeyCapability, "kind" | "fulfillableByCliLocal" | "target" | "requiresDockerSandbox" | "acceptedByCliArgs" | "note"> | null {
  const capability = resolveCliLocalRuntimeKeyCapability(runtimeKey);
  return capability.kind === "docker" ? capability : null;
}

const HOST_DEFAULT_NOTE =
  "未指定 runtimeKey：沿用派发方给定的落点（交互式 run 默认本机宿主执行）。";

/**
 * 唯一能力表查询。无副作用、无外部状态：同一 key 恒得同一结论
 * （与「绑定/配额此刻是否就绪」无关——那是 localDockerWorkload 开跑前闸门的
 * 职责，本表只回答「这个形态有没有可能被本机通道兑现」）。
 */
export function resolveCliLocalRuntimeKeyCapability(
  runtimeKey: unknown,
): CliLocalRuntimeKeyCapability {
  const raw = typeof runtimeKey === "string" ? runtimeKey : "";
  const key = raw.trim();
  const base = { raw, key } as const;

  if (!key) {
    return {
      ...base,
      kind: "explicit-host",
      fulfillableByCliLocal: true,
      target: "host",
      requiresDockerSandbox: false,
      acceptedByCliArgs: false, // 参数缺省，谈不上「接受某个形态」
      note: HOST_DEFAULT_NOTE,
    };
  }

  if (key === "local") {
    return {
      ...base,
      kind: "explicit-host",
      fulfillableByCliLocal: true,
      target: "host",
      requiresDockerSandbox: false,
      acceptedByCliArgs: true,
      note: "显式本机宿主执行（`--local` / `--runtime-key local`）。",
    };
  }

  if (key === "server") {
    return {
      ...base,
      kind: "server",
      fulfillableByCliLocal: false,
      target: null,
      requiresDockerSandbox: false,
      acceptedByCliArgs: true,
      note: "服务端落点由服务端 run 通道执行，本机 CLI 本地 run 无法兑现。",
    };
  }

  if (key === "docker" || key.startsWith("docker:")) {
    if (!isDockerRuntimeKey(key)) {
      return {
        ...base,
        kind: "docker-invalid",
        fulfillableByCliLocal: false,
        target: null,
        requiresDockerSandbox: true,
        acceptedByCliArgs: false,
        note: "docker:<runtimeId> 的 runtimeId 不能为空；改用 `docker`（本机 sbx 缺省运行时）或 `docker:<runtimeId>`。",
      };
    }
    return {
      ...base,
      kind: "docker",
      fulfillableByCliLocal: true,
      target: "docker-sandbox",
      requiresDockerSandbox: true,
      acceptedByCliArgs: true,
      note: "本机 sbx 云沙盒（docker / docker:<runtimeId>）：可兑现，但开跑前必须通过绑定 + 配额闸门，核实不过即显式失败。",
    };
  }

  if (key.startsWith("machine:")) {
    const machineId = key.slice("machine:".length).trim();
    return {
      ...base,
      kind: machineId ? "machine" : "machine-invalid",
      fulfillableByCliLocal: false,
      target: null,
      requiresDockerSandbox: false,
      acceptedByCliArgs: machineId.length > 0,
      note: machineId
        ? `machine:<machineId> 只能由那台机器上的 agent 进程执行，本机没有到 ${key} 的执行后端。`
        : "machine: 的 machineId 不能为空。",
    };
  }

  if (key === "instabox" || key.startsWith("instabox:")) {
    return {
      ...base,
      kind: "instabox",
      fulfillableByCliLocal: false,
      target: null,
      requiresDockerSandbox: false,
      // 参数层只放行裸 `instabox`（与改动前的 isValidRuntimeKey 逐字一致）；
      // 带 id 的形态走服务端长形式 `runtime-v1:<scope>:<owner>:instabox:<id>`，
      // 那种形态由下面的 runtime-v1 分支放行。
      acceptedByCliArgs: key === "instabox",
      note: "Instabox 后端由服务端 run 通道执行，本机 CLI 本地 run 无法兑现。",
    };
  }

  if (key === "gcp" || key.startsWith("gcp:")) {
    return {
      ...base,
      kind: "gcp",
      fulfillableByCliLocal: false,
      target: null,
      requiresDockerSandbox: false,
      acceptedByCliArgs: key === "gcp",
      note: "GCP 后端由服务端 run 通道执行，本机 CLI 本地 run 无法兑现。",
    };
  }

  if (key.startsWith("runtime-v1:")) {
    return {
      ...base,
      kind: "runtime-v1",
      // 长形式是服务端 catalog 的 key：CLI 参数层接受它并转发给服务端通道，
      // 但本机通道无法把它兑现成任何后端（本机 `--local` 路径没有 catalog 解析）。
      fulfillableByCliLocal: false,
      target: null,
      requiresDockerSandbox: false,
      acceptedByCliArgs: true,
      note: "runtime-v1: 长形式是服务端 catalog key：只能由服务端 run 通道执行，本机 CLI 本地 run 无法兑现。",
    };
  }

  return {
    ...base,
    kind: "unknown",
    fulfillableByCliLocal: false,
    target: null,
    requiresDockerSandbox: false,
    acceptedByCliArgs: false,
    note: `未知 runtimeKey 形态（可选：local | server | docker | docker:<runtimeId> | machine:<machineId> | instabox | gcp）。`,
  };
}

/** cli-local 可兑现的 runtimeKey 形态（guard 的 allowlist 由本表派生，别再手写）。 */
export const CLI_LOCAL_FULFILLABLE_RUNTIME_KEYS = [
  "local",
  "docker",
  "docker:<id>",
] as const;

/**
 * 机械断言：allowlist 与形态判定的关系。
 * 允许列表里除 "local" 之外的每一项都必须真的是 docker 形态 —— 这条关系此前
 * 只存在于注释里，两份真值各自漂移。抛错即代表代码内部不自洽。
 */
export function assertCliLocalAllowlistMatchesCapabilityTable(): void {
  for (const entry of CLI_LOCAL_FULFILLABLE_RUNTIME_KEYS) {
    if (entry === "local") continue;
    const probe = entry === "docker" ? "docker" : "docker:probe-id";
    if (!isDockerRuntimeKey(probe)) {
      throw new Error(
        `CLI_LOCAL_FULFILLABLE_RUNTIME_KEYS 里的 "${entry}" 不是 docker 形态：allowlist 与 isDockerRuntimeKey 已漂移`,
      );
    }
    if (!resolveCliLocalRuntimeKeyCapability(probe).fulfillableByCliLocal) {
      throw new Error(
        `CLI_LOCAL_FULFILLABLE_RUNTIME_KEYS 里的 "${entry}" 在能力表里不可兑现：两处真值已漂移`,
      );
    }
  }
  if (!resolveCliLocalRuntimeKeyCapability("local").fulfillableByCliLocal) {
    throw new Error("能力表把 local 判成不可兑现：cli-local 通道连宿主执行都办不到");
  }
  // 反向：所有被判定可兑现的形态都必须出现在 allowlist 描述的能力面里。
  for (const probe of ["docker", "docker:probe-id", "local"]) {
    if (!resolveCliLocalRuntimeKeyCapability(probe).fulfillableByCliLocal) {
      throw new Error(`能力表与 allowlist 不一致：${probe} 应可兑现`);
    }
  }
}
